/**
 * TRS-80 Model III Emulator - the emulator view and MACHINE menu
 *
 * Owns the live machine (init, run loop, keyboard bridge), the MACHINE
 * menu actions (reset, cassette/disk/library loading, paste), the screen
 * font/scale preferences, and view switching (showTab). The legacy phase
 * consoles live in legacy-console.js behind a dynamic import.
 */

import { TRS80System, CPU_CLOCK_HZ } from "@system/trs80-system.js";
import { VideoSystem } from "@peripherals/video.js";
import {
  parseCas,
  fastLoadBasic,
  fastLoadSystem,
} from "@peripherals/cas-format.js";
import { parseCmd, fastLoadCmd } from "@peripherals/cmd-format.js";
import { DiskImage } from "@peripherals/disk-image.js";
import { SoundDriver } from "@peripherals/sound.js";
import { serializeState, restoreState } from "@system/state.js";
import { LIBRARY } from "@data/library.js";
import { DOS_LIBRARY } from "@data/dos-library.js";
import { normalizeScale, wellLayout } from "@ui/screen-layout.js";
import { setupTouchInput } from "@ui/touch-input.js";
import {
  TURBO_SPEED,
  TURBO_FRAME_MS,
  frameBudgetTStates,
  runSliced,
} from "@ui/turbo.js";

// ---------------------------------------------------------------------------
// Emulator tab: a real Model III booting its real ROM
// ---------------------------------------------------------------------------

export const emulator = {
  system: null,
  video: null,
  sound: new SoundDriver(),
  running: false,
  rafId: null,
  lastFrameTime: 0,
  keydownHandler: null,
  keyupHandler: null,
  blurHandler: null,
  intervalId: null,
  holds: new Map(), // physical code -> { pressedAt, timer, key }
  turboHeld: false, // the turbo key is physically down (momentary)
  turboLatched: false, // the status-bar pill was clicked (session only)
};

// The ROM scans and debounces the keyboard, so a key must stay down in
// the matrix for a few scan passes to register. Synthetic key events and
// very fast taps can release sooner than that — enforce a minimum hold.
const MIN_KEY_HOLD_MS = 80;

// The TRS-80 has no backtick key, so the matrix can never want it. Match
// on e.code (physical position) — the matrix keys off e.key, so the two
// cannot collide. F12 is not an option: browsers reserve it for DevTools
// and preventDefault() does not suppress it, and on macOS the F-row is
// media keys that never reach the page.
const TURBO_KEY = "Backquote";

/** Turbo is on if the key is held OR the status-bar pill is latched. */
export function turboActive() {
  return emulator.turboHeld || emulator.turboLatched;
}

function setTurboHeld(held) {
  if (emulator.turboHeld === held) return;
  emulator.turboHeld = held;
  updateTurboIndicator();
}

function updateTurboIndicator() {
  const pill = document.getElementById("status-bar-turbo");
  if (!pill) return;
  const on = turboActive();
  pill.textContent = on ? `⏩ TURBO ${TURBO_SPEED}×` : "⏩ Turbo";
  pill.classList.toggle("on", on);
  // The question this control answers is "is turbo on?", so a held key
  // reads as pressed too — not just the latch.
  pill.setAttribute("aria-pressed", on ? "true" : "false");
}

/**
 * Wire the status-bar turbo pill: a session-only latch. Touch has no key
 * to hold, and nobody should be *required* to hold a key down, so the
 * pill is how turbo stays reachable — but it is never persisted, because
 * a turbo that survived a reload is exactly the silent 10x this design
 * exists to prevent.
 */
export function initTurbo() {
  const pill = document.getElementById("status-bar-turbo");
  if (!pill || pill.dataset.turboWired) return;
  pill.dataset.turboWired = "1";
  pill.addEventListener("click", () => {
    // The pill is the visible truth: if turbo is on by ANY route, clicking it
    // turns it off. That keeps it a working off switch even when a keyup was
    // lost (macOS swallows keyup for a key held with Command). If the key
    // genuinely IS still down, its auto-repeat keydown re-engages turbo within
    // ~30 ms, so this can't fight a real hold.
    const on = turboActive();
    emulator.turboHeld = false;
    emulator.turboLatched = !on;
    updateTurboIndicator();
  });
  updateTurboIndicator();
}

function matrixPress(key, code) {
  const pending = emulator.holds.get(code);
  if (pending?.timer) {
    clearTimeout(pending.timer);
  }
  const handled = emulator.system.keyboard.keyDown(key, code);
  if (handled) {
    emulator.holds.set(code, { pressedAt: performance.now(), timer: null });
  }
  return handled;
}

function matrixRelease(key, code) {
  const hold = emulator.holds.get(code);
  if (!hold) {
    return false;
  }
  const release = () => {
    emulator.holds.delete(code);
    emulator.system.keyboard.keyUp(code);
  };
  const heldFor = performance.now() - hold.pressedAt;
  if (heldFor >= MIN_KEY_HOLD_MS) {
    release();
  } else {
    hold.timer = setTimeout(release, MIN_KEY_HOLD_MS - heldFor);
  }
  return true;
}

// Release every held matrix key and cancel pending minimum-hold timers.
// Used when leaving the emulator and when the window loses focus: the
// browser won't deliver keyup events we miss while unfocused/hidden, so
// anything still down would stay stuck in the matrix.
function releaseAllMatrixKeys() {
  for (const hold of emulator.holds.values()) {
    if (hold.timer) clearTimeout(hold.timer);
  }
  emulator.holds.clear();
  emulator.system.keyboard.reset();
}

// Exposed for other in-page modals (currently just the changelog — see
// src/ui/changelog.js) to call the instant they open: releases any
// matrix key the user was mid-holding, the same cleanup already used
// when the window loses focus (commit 0636b94), so a modal can't leave
// a stuck key behind for the rest of the session. changelog.js calls
// this one small hook instead of reaching into the key-hold machinery
// above directly.
export function onUiModalOpen() {
  if (emulator.system) releaseAllMatrixKeys();
  setTurboHeld(false); // the modal swallows keydown, so it'd swallow the keyup
}

async function initEmulator() {
  if (emulator.system) {
    return emulator.system;
  }

  const response = await fetch("/assets/model3.rom");
  if (!response.ok) {
    throw new Error(`ROM fetch failed: HTTP ${response.status}`);
  }
  const romData = new Uint8Array(await response.arrayBuffer());

  emulator.system = new TRS80System({ romData });
  emulator.video = new VideoSystem(document.getElementById("emulator-screen"));

  // Apply the saved sound preference (default: on; audio starts on the
  // first user gesture — browsers refuse autoplay before one).
  try {
    emulator.sound.enabled = localStorage.getItem("trs80-sound") !== "0";
  } catch {
    // default on
  }
  updateSoundMenuLabel();

  // Apply the saved font preference (default is the TRS-80 style)
  let savedFont = null;
  try {
    savedFont = localStorage.getItem("trs80-font");
  } catch {
    savedFont = null;
  }
  if (savedFont && savedFont !== emulator.video.fontName) {
    emulator.video.setFont(savedFont);
  }
  const fontSelect = document.getElementById("font-select");
  if (fontSelect) {
    fontSelect.value = emulator.video.fontName;
  }

  // Apply the saved screen size ("fit" from older builds means "fill")
  let savedScale = null;
  try {
    savedScale = localStorage.getItem("trs80-scale");
  } catch {
    savedScale = null;
  }
  window.setScreenScale(savedScale);

  const versionEl = document.getElementById("status-bar-version");
  if (versionEl) versionEl.textContent = `v${__APP_VERSION__}`;

  document.getElementById("emulator-reset").addEventListener("click", () => {
    emulator.system.reset();
    setEmulatorStatus(
      emulator.system.io.fdc.anyDiskMounted()
        ? "Reset — booting from drive 0"
        : "Reset — booting ROM BASIC"
    );
  });

  // Phones/tablets: tap-to-type through the soft keyboard, plus the
  // on-screen strip for BREAK/CLEAR/arrows/ENTER.
  setupTouchInput({
    input: document.getElementById("touch-input"),
    tapTarget: document.getElementById("machine-stage"),
    keysBar: document.getElementById("touch-keys"),
    press: matrixPress,
    release: matrixRelease,
  });

  // Populate the drive-0 DOS picker: bundled systems plus a custom slot
  const dosSelect = document.getElementById("dos-select");
  if (dosSelect && dosSelect.childElementCount === 0) {
    for (const entry of DOS_LIBRARY) {
      const option = document.createElement("option");
      option.value = entry.id;
      option.textContent = entry.title;
      dosSelect.appendChild(option);
    }
    const custom = document.createElement("option");
    custom.value = "custom";
    custom.textContent = "Custom .dsk…";
    dosSelect.appendChild(custom);
  }

  // Populate the library picker: games first, then the BASIC classics
  const librarySelect = document.getElementById("library-select");
  if (librarySelect && librarySelect.childElementCount === 0) {
    const groups = new Map(); // label -> <optgroup>
    for (const entry of LIBRARY) {
      const label = entry.group || "BASIC classics";
      if (!groups.has(label)) {
        const optgroup = document.createElement("optgroup");
        optgroup.label = label;
        librarySelect.appendChild(optgroup);
        groups.set(label, optgroup);
      }
      const option = document.createElement("option");
      option.value = entry.id;
      option.textContent = entry.title;
      groups.get(label).appendChild(option);
    }
  }

  return emulator.system;
}

export function setEmulatorStatus(text) {
  const status = document.getElementById("emulator-status");
  if (status) {
    status.textContent = text;
  }
  const barStatus = document.getElementById("dev-bar-status");
  if (barStatus) {
    barStatus.textContent = text;
  }
}

// ------------------------- MACHINE menu -----------------------------------

window.toggleMachineMenu = function (forceClose = false) {
  const button = document.getElementById("machine-menu-button");
  const panel = document.getElementById("machine-menu-panel");
  if (!button || !panel) return;
  const open = forceClose ? false : panel.hidden;
  panel.hidden = !open;
  button.setAttribute("aria-expanded", String(open));
};

// Close the menu when clicking anywhere outside it. Every click is also
// a user gesture, which is what WebAudio needs to (re)start.
document.addEventListener("click", (e) => {
  emulator.sound.ensureRunning();
  const menu = document.getElementById("machine-menu");
  const panel = document.getElementById("machine-menu-panel");
  if (menu && panel && !panel.hidden && !menu.contains(e.target)) {
    window.toggleMachineMenu(true);
  }
});

window.toggleMachineCase = function () {
  const on = document.body.classList.toggle("case");
  try {
    localStorage.setItem("trs80-case", on ? "1" : "0");
  } catch {
    // preference just won't persist
  }
  const label = document.getElementById("menu-case-label");
  if (label) {
    label.textContent = on ? "Hide machine case" : "Show machine case";
  }
  window.toggleMachineMenu(true);
};

window.menuReset = function () {
  if (emulator.system) {
    emulator.system.reset();
    setEmulatorStatus("Reset — booting ROM BASIC");
  }
  window.toggleMachineMenu(true);
};

// ---- Cassette (.cas), disks (.dsk), and the program library ----

export async function readPickedFile(inputId) {
  const input = document.getElementById(inputId);
  return new Promise((resolve) => {
    const done = (result) => {
      input.onchange = null;
      input.oncancel = null;
      resolve(result);
    };
    input.onchange = async () => {
      const file = input.files[0];
      input.value = ""; // same file can be picked again later
      if (!file) return done(null);
      done({ name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) });
    };
    // Dismissed pickers fire "cancel"; without this the promise would
    // hang forever and the menu action could never be retried.
    input.oncancel = () => done(null);
    input.click();
  });
}

// Cassette-world loaders (library, .cas tapes, pasted BASIC) need the
// machine sitting in cassette BASIC at READY. Under a booted DOS the
// typed RUN goes to the DOS prompt instead (NEWDOS answers it with
// DIRECTORY READ ERROR) — so eject and reboot to BASIC first. The whole
// dance is emulated inline; it costs a blink of wall clock.
function ensureCassetteBasic() {
  if (!emulator.system.io.fdc.anyDiskMounted()) return true;
  setEmulatorStatus("Ejecting disks — rebooting to cassette BASIC…");
  const ok = emulator.system.bootToCassetteBasic();
  refreshDiskMenu();
  if (!ok) {
    setEmulatorStatus("Could not reach cassette BASIC — try Reset");
  }
  return ok;
}

window.menuLoadCas = async function () {
  window.toggleMachineMenu(true);
  if (!emulator.system) return;
  const picked = await readPickedFile("cas-file");
  if (!picked) return;
  if (!ensureCassetteBasic()) return;
  const statusEl = document.getElementById("menu-cassette-status");
  try {
    const parsed = parseCas(picked.bytes);
    if (parsed.kind === "basic") {
      fastLoadBasic(emulator.system, parsed);
      emulator.system.typeText("RUN\n");
      setEmulatorStatus(`Loaded BASIC tape "${picked.name}" — running`);
    } else {
      fastLoadSystem(emulator.system, parsed);
      const warn = parsed.checksumErrors
        ? ` (${parsed.checksumErrors} checksum errors)`
        : "";
      setEmulatorStatus(
        `Loaded SYSTEM tape "${parsed.name || picked.name}"${warn} — jumped to entry`
      );
    }
    if (statusEl) statusEl.textContent = `Tape: ${picked.name}`;
  } catch (err) {
    setEmulatorStatus(`Could not load ${picked.name}: ${err.message}`);
  }
};

/**
 * Boot drive 0 from the DOS picker: a bundled system image (fetched on
 * demand) or a user-picked .dsk. Mounting alone never reboots — this
 * action's whole meaning is "put it in drive 0 and boot it", so it
 * resets the machine, which is exactly how the real hardware behaves
 * with a disk in the drive.
 */
window.menuBootDos = async function () {
  window.toggleMachineMenu(true);
  if (!emulator.system) return;
  const select = document.getElementById("dos-select");
  const choice = select?.value;

  let image;
  let label;
  let note = "";
  if (choice === "custom") {
    const picked = await readPickedFile("dsk-file");
    if (!picked) return;
    try {
      image = new DiskImage(picked.bytes, picked.name);
    } catch (err) {
      setEmulatorStatus(`Could not mount ${picked.name}: ${err.message}`);
      return;
    }
    label = picked.name;
  } else {
    const entry = DOS_LIBRARY.find((e) => e.id === choice);
    if (!entry) return;
    setEmulatorStatus(`Fetching ${entry.title}…`);
    try {
      const response = await fetch(entry.file);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      image = new DiskImage(
        new Uint8Array(await response.arrayBuffer()),
        entry.file.split("/").pop()
      );
    } catch (err) {
      setEmulatorStatus(`Could not fetch ${entry.title}: ${err.message}`);
      return;
    }
    label = entry.title;
    note = entry.note;
  }

  emulator.system.mountDisk(0, image);
  emulator.system.reset();
  refreshDiskMenu();
  setEmulatorStatus(`Booting ${label} from drive 0${note ? ` — ${note}` : ""}`);
};

window.menuMountDisk = async function (driveNumber) {
  window.toggleMachineMenu(true);
  if (!emulator.system) return;
  const picked = await readPickedFile("dsk-file");
  if (!picked) return;
  try {
    const image = new DiskImage(picked.bytes, picked.name);
    emulator.system.mountDisk(driveNumber, image);
    const el = document.getElementById(`menu-disk${driveNumber}-status`);
    if (el) {
      el.textContent = `${driveNumber}: ${picked.name} (${image.format}, ${image.trackCount()} trk)`;
    }
    setEmulatorStatus(
      `Drive ${driveNumber}: ${picked.name} mounted — press RESET to boot`
    );
  } catch (err) {
    setEmulatorStatus(`Could not mount ${picked.name}: ${err.message}`);
  }
};

window.menuEjectDisks = function () {
  if (!emulator.system) return;
  emulator.system.ejectDisk(0);
  emulator.system.ejectDisk(1);
  for (const n of [0, 1]) {
    const el = document.getElementById(`menu-disk${n}-status`);
    if (el) el.textContent = `${n}: empty`;
  }
  setEmulatorStatus("Drives ejected — reset boots cassette BASIC");
  window.toggleMachineMenu(true);
};

// Type a listing line-by-line, yielding to the event loop between lines
// so the tab stays responsive (status paints, frames render, input
// works). Between lines the machine simply keeps running, exactly as it
// would under a fast human typist. Returns the number of characters
// with no matrix mapping (skipped), like system.typeText.
async function typeTextChunked(text, opts = {}) {
  const lines = text.split("\n");
  let skipped = 0;
  for (let i = 0; i < lines.length; i++) {
    const isLast = i === lines.length - 1;
    const line = isLast ? lines[i] : lines[i] + "\n";
    if (line) {
      skipped += emulator.system.typeText(line, opts);
    }
    if (!isLast) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  return skipped;
}

window.menuLoadLibrary = async function () {
  window.toggleMachineMenu(true);
  if (!emulator.system) return;
  const select = document.getElementById("library-select");
  const entry = LIBRARY.find((e) => e.id === select?.value);
  if (!entry) return;
  if (!ensureCassetteBasic()) return;
  if (entry.kind === "file") {
    await loadLibraryFile(entry);
    return;
  }
  setEmulatorStatus(`Typing "${entry.title}" into BASIC…`);
  emulator.system.typeText("NEW\n");
  await typeTextChunked(entry.text);
  emulator.system.typeText("RUN\n");
  setEmulatorStatus(`${entry.title} — running`);
};

// Fetch a public/programs file and load it by format. ML programs jump
// straight to their entry; BASIC ones get an auto-RUN.
async function loadLibraryFile(entry) {
  setEmulatorStatus(`Fetching ${entry.title}…`);
  let bytes;
  try {
    const response = await fetch(entry.file);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    bytes = new Uint8Array(await response.arrayBuffer());
  } catch (err) {
    setEmulatorStatus(`Could not fetch ${entry.title}: ${err.message}`);
    return;
  }
  try {
    if (entry.format === "cmd") {
      fastLoadCmd(emulator.system, parseCmd(bytes));
      setEmulatorStatus(
        `${entry.title} — running${entry.note ? ` (${entry.note})` : ""}`
      );
    } else if (entry.format === "cas") {
      const parsed = parseCas(bytes);
      if (parsed.kind === "basic") {
        fastLoadBasic(emulator.system, parsed);
        emulator.system.typeText("RUN\n");
      } else {
        fastLoadSystem(emulator.system, parsed);
      }
      const warn = parsed.checksumErrors
        ? ` (${parsed.checksumErrors} checksum errors)`
        : "";
      setEmulatorStatus(
        `${entry.title} — running${warn}${entry.note ? ` (${entry.note})` : ""}`
      );
    } else if (entry.format === "bas") {
      const text = new TextDecoder().decode(bytes).replace(/\r\n?/g, "\n");
      setEmulatorStatus(`Typing ${entry.title}…`);
      emulator.system.typeText("NEW\n");
      // Big listing: the ROM needs extra post-ENTER time per line or it
      // eats the next line's first characters (see typeText).
      await typeTextChunked(text.endsWith("\n") ? text : text + "\n", {
        enterTStates: 1500000,
      });
      emulator.system.typeText("RUN\n");
      setEmulatorStatus(
        `${entry.title} — running${entry.note ? ` (${entry.note})` : ""}`
      );
    } else {
      setEmulatorStatus(`Unknown library format "${entry.format}"`);
    }
  } catch (err) {
    setEmulatorStatus(`Could not load ${entry.title}: ${err.message}`);
  }
}

window.menuPasteBasic = async function () {
  window.toggleMachineMenu(true);
  if (!emulator.system) return;
  try {
    const text = await navigator.clipboard.readText();
    if (!text) {
      setEmulatorStatus("Clipboard is empty");
      return;
    }
    if (!ensureCassetteBasic()) return;
    setEmulatorStatus(`Typing ${text.length} characters…`);
    const skipped = await typeTextChunked(
      text.endsWith("\n") ? text : text + "\n"
    );
    setEmulatorStatus(
      skipped
        ? `Pasted (${skipped} unmappable characters skipped)`
        : "Pasted into BASIC"
    );
  } catch {
    setEmulatorStatus("Clipboard not available (permission denied?)");
  }
};

// ------------------------- Save states & export ---------------------------

function downloadBytes(name, bytes, type = "application/octet-stream") {
  const blob = new Blob([bytes], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function refreshDiskMenu() {
  for (const n of [0, 1]) {
    const el = document.getElementById(`menu-disk${n}-status`);
    if (!el) continue;
    const disk = emulator.system.io.fdc.drives[n];
    el.textContent = disk
      ? `${n}: ${disk.name} (${disk.format}, ${disk.trackCount()} trk)`
      : `${n}: empty`;
  }
}

const QUICKSAVE_KEY = "trs80-quicksave";

window.menuQuickSave = function () {
  window.toggleMachineMenu(true);
  if (!emulator.system) return;
  try {
    const json = JSON.stringify(serializeState(emulator.system));
    localStorage.setItem(QUICKSAVE_KEY, json);
    setEmulatorStatus(
      `State saved (${(json.length / 1024).toFixed(0)} KB) — Quick load resumes it, even after a reload`
    );
  } catch (err) {
    // Usually the localStorage quota with big disk images mounted
    setEmulatorStatus(`Could not quick-save: ${err.message} — try Export instead`);
  }
};

window.menuQuickLoad = function () {
  window.toggleMachineMenu(true);
  if (!emulator.system) return;
  let json = null;
  try {
    json = localStorage.getItem(QUICKSAVE_KEY);
  } catch {
    json = null;
  }
  if (!json) {
    setEmulatorStatus("No quick-saved state yet");
    return;
  }
  try {
    restoreState(emulator.system, JSON.parse(json));
    refreshDiskMenu();
    setEmulatorStatus("State restored — carrying on where you left off");
  } catch (err) {
    setEmulatorStatus(`Could not restore state: ${err.message}`);
  }
};

window.menuExportState = function () {
  window.toggleMachineMenu(true);
  if (!emulator.system) return;
  try {
    const json = JSON.stringify(serializeState(emulator.system));
    const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
    downloadBytes(`trs80-state-${stamp}.json`, json, "application/json");
    setEmulatorStatus("State exported");
  } catch (err) {
    setEmulatorStatus(`Could not export state: ${err.message}`);
  }
};

window.menuImportState = async function () {
  window.toggleMachineMenu(true);
  if (!emulator.system) return;
  const picked = await readPickedFile("state-file");
  if (!picked) return;
  try {
    const state = JSON.parse(new TextDecoder().decode(picked.bytes));
    restoreState(emulator.system, state);
    refreshDiskMenu();
    setEmulatorStatus(`State "${picked.name}" restored`);
  } catch (err) {
    setEmulatorStatus(`Could not restore ${picked.name}: ${err.message}`);
  }
};

window.menuExportDisk = function (driveNumber) {
  window.toggleMachineMenu(true);
  if (!emulator.system) return;
  const disk = emulator.system.io.fdc.drives[driveNumber];
  if (!disk) {
    setEmulatorStatus(`Drive ${driveNumber} is empty — nothing to export`);
    return;
  }
  downloadBytes(disk.name, disk.bytes);
  setEmulatorStatus(
    `Drive ${driveNumber} exported as "${disk.name}" (including this session's writes)`
  );
};

function updateSoundMenuLabel() {
  const label = document.getElementById("menu-sound-label");
  if (label) {
    label.textContent = emulator.sound.enabled
      ? "Sound: on (cassette port)"
      : "Sound: off";
  }
}

window.toggleSound = function () {
  const on = !emulator.sound.enabled;
  emulator.sound.setEnabled(on); // menu click is a gesture: safe to start
  try {
    localStorage.setItem("trs80-sound", on ? "1" : "0");
  } catch {
    // preference just won't persist
  }
  updateSoundMenuLabel();
  window.toggleMachineMenu(true);
};

window.menuCassette = function (motorOn) {
  const statusEl = document.getElementById("menu-cassette-status");
  if (!emulator.system) return;
  const cassette = emulator.system.io.cassette;
  cassette.control(motorOn ? 0x01 : 0x00);
  if (statusEl) {
    const tape = cassette.tapeData?.length
      ? `tape: ${cassette.tapeData.length} bytes`
      : "no tape loaded";
    statusEl.textContent = `Motor ${motorOn ? "ON" : "OFF"} — ${tape}`;
  }
};

function stepMachine(now) {
  // Budget real elapsed time in T-states, capped at 4 frames so a
  // backgrounded tab doesn't come back with seconds of catch-up.
  const elapsedMs = Math.min(now - emulator.lastFrameTime || 16, 66);
  emulator.lastFrameTime = now;

  const turbo = turboActive();
  const fromCycle = emulator.system.cpu.cycles;
  const budget = frameBudgetTStates(
    elapsedMs,
    CPU_CLOCK_HZ,
    turbo ? TURBO_SPEED : 1
  );

  if (turbo) {
    // 660 ms of emulated time in one blocking call would drop frames on a
    // slow device. Slice it against a wall-clock deadline instead: what
    // doesn't fit is simply time the machine doesn't experience.
    runSliced(
      budget,
      (slice) => emulator.system.runTStates(slice),
      () => performance.now(),
      performance.now() + TURBO_FRAME_MS
    );
  } else {
    emulator.system.runTStates(budget);
  }

  emulator.sound.pump(
    emulator.system,
    fromCycle,
    emulator.system.cpu.cycles,
    CPU_CLOCK_HZ,
    { silent: turbo } // see sound.js: chunks are sized by emulated time
  );

  if (emulator.system.memory.videoDirty) {
    emulator.system.memory.videoDirty = false;
    emulator.video.renderScreen(
      emulator.system.memory,
      emulator.system.columns32
    );
  }
}

function emulatorFrame(now) {
  if (!emulator.running) {
    return;
  }
  stepMachine(now);
  emulator.rafId = requestAnimationFrame(emulatorFrame);
}

// Chrome suspends requestAnimationFrame when the window is hidden or
// fully occluded, which would freeze the machine (and its clock). This
// timer keeps the CPU running whenever rAF goes quiet; painting still
// only happens on visible frames.
function emulatorHeartbeat() {
  if (!emulator.running) {
    return;
  }
  const now = performance.now();
  if (now - emulator.lastFrameTime > 150) {
    stepMachine(now);
  }
}

export function startEmulatorLoop() {
  if (emulator.running) {
    return;
  }
  emulator.running = true;
  emulator.lastFrameTime = performance.now();
  emulator.system.memory.videoDirty = true; // force first paint
  emulator.rafId = requestAnimationFrame(emulatorFrame);
  emulator.intervalId = setInterval(emulatorHeartbeat, 100);

  // Keyboard: window-level so no element needs focus, but leave form
  // fields (other tabs' inputs) alone — and while an in-page modal (the
  // changelog) is open, so reading it can't type into the machine or
  // have Escape map to BREAK (see keyboard.js) and kill a running program.
  const isFormField = (el) =>
    el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA");
  const isUiModalOpen = () => {
    const modal = document.getElementById("changelog-modal");
    return !!modal && modal.style.display === "block";
  };
  emulator.keydownHandler = (e) => {
    if (isFormField(e.target) || isUiModalOpen()) return;
    // Any keystroke is a user gesture: (re)start audio if it's enabled
    emulator.sound.ensureRunning();
    // Turbo is momentary. Engaging it is gated by the guard above — in a
    // form field you're typing a backtick, not driving the machine. This
    // sits before the e.repeat check so a held key keeps re-affirming it.
    // Cmd+` is macOS "cycle windows"; Ctrl/Alt+` aren't turbo either. Do NOT
    // gate on shiftKey: Shift+` is the same physical key, and a player may be
    // holding Shift in a game while reaching for turbo.
    if (e.code === TURBO_KEY && !e.metaKey && !e.ctrlKey && !e.altKey) {
      setTurboHeld(true);
      e.preventDefault();
      return;
    }
    if (e.repeat) {
      // Matrix key is already down; just swallow the auto-repeat
      if (emulator.holds.has(e.code)) e.preventDefault();
      return;
    }
    if (matrixPress(e.key, e.code)) {
      e.preventDefault();
    }
  };
  emulator.keyupHandler = (e) => {
    // Releasing the turbo key ALWAYS drops turbo, whatever has focus —
    // deliberately NOT gated the way keydown is. If focus moved mid-hold,
    // a gated keyup would strand the machine at 10x with no way back.
    if (e.code === TURBO_KEY) {
      setTurboHeld(false);
      e.preventDefault();
      return;
    }
    if (isFormField(e.target) || isUiModalOpen()) return;
    if (matrixRelease(e.key, e.code)) {
      e.preventDefault();
    }
  };
  window.addEventListener("keydown", emulator.keydownHandler);
  window.addEventListener("keyup", emulator.keyupHandler);

  // Window blur only (alt-tab, cmd-tab, clicking another window): a
  // hidden-but-automated tab can still legitimately receive key events,
  // so visibilitychange must NOT wipe the matrix.
  emulator.blurHandler = () => {
    releaseAllMatrixKeys();
    setTurboHeld(false); // alt-tab mid-hold: the keyup will never arrive
  };
  window.addEventListener("blur", emulator.blurHandler);
}

export function stopEmulatorLoop() {
  if (!emulator.running) {
    return;
  }
  emulator.running = false;
  if (emulator.rafId !== null) {
    cancelAnimationFrame(emulator.rafId);
    emulator.rafId = null;
  }
  if (emulator.intervalId !== null) {
    clearInterval(emulator.intervalId);
    emulator.intervalId = null;
  }
  window.removeEventListener("keydown", emulator.keydownHandler);
  window.removeEventListener("keyup", emulator.keyupHandler);
  window.removeEventListener("blur", emulator.blurHandler);
  releaseAllMatrixKeys(); // no stuck keys on return
  setTurboHeld(false); // ...and no stuck turbo: the listeners are gone
}

window.showEmulatorTab = async function () {
  showTab("emulator");
  try {
    await initEmulator();
  } catch (err) {
    setEmulatorStatus(`Could not start: ${err.message}`);
    return;
  }
  setEmulatorStatus("48K · cassette BASIC · 2.03 MHz");
  startEmulatorLoop();
};

// Screen font preference: "trs80" (authentic style, default) or "modern"
window.setScreenFont = function (name) {
  try {
    localStorage.setItem("trs80-font", name);
  } catch {
    // private browsing — preference just won't persist
  }
  if (emulator.video && emulator.video.setFont(name) && emulator.system) {
    emulator.system.memory.videoDirty = true; // repaint with new glyphs
  }
};

// Screen size: "fill" stretches to the window, "ratio" letterboxes at the
// authentic 4:3 CRT proportion, and a numeric scale pins a fixed 4:3 size
// (1× = 512×384 CSS px). Legacy saved "fit" means "fill".
window.setScreenScale = function (value) {
  const scale = normalizeScale(value);
  try {
    localStorage.setItem("trs80-scale", scale);
  } catch {
    // private browsing — preference just won't persist
  }
  const well = document.getElementById("crt-well");
  if (!well) return;
  const layout = wellLayout(scale);
  well.dataset.scale = layout.mode;
  if (layout.mode === "fixed") {
    well.style.setProperty("--scale-w", layout.width);
    well.style.setProperty("--scale-h", layout.height);
  } else {
    well.style.removeProperty("--scale-w");
    well.style.removeProperty("--scale-h");
  }
  const select = document.getElementById("scale-select");
  if (select && select.value !== scale) {
    select.value = scale;
  }
};


// View management - ensure only one view is visible at a time
export function showTab(tabName) {
  const machineStage = document.getElementById("machine-stage");
  const console = document.getElementById("console");
  const designDocContainer = document.getElementById("design-doc-container");
  const phase6Container = document.getElementById("phase6-container");

  // Hide all views first
  if (machineStage) machineStage.style.display = "none";
  if (console) console.style.display = "none";
  if (designDocContainer) designDocContainer.style.display = "none";
  if (phase6Container) phase6Container.style.display = "none";

  // Touch key strip follows the emulator view; empty string defers to
  // the coarse-pointer media query (never shows on mouse machines).
  const touchKeys = document.getElementById("touch-keys");
  if (touchKeys) {
    touchKeys.style.display = tabName === "emulator" ? "" : "none";
  }

  // Leaving the emulator pauses the machine (no CPU burn while testing)
  if (tabName !== "emulator" && emulator.system) {
    stopEmulatorLoop();
  }

  // Show the requested view
  if (tabName === "emulator") {
    if (machineStage) machineStage.style.display = "flex";
  } else if (tabName === "console") {
    if (console) {
      console.style.display = "block";
      console.focus();
      console.scrollTop = 0;
    }
  } else if (tabName === "design-doc") {
    if (designDocContainer) designDocContainer.style.display = "block";
  } else if (tabName === "phase6") {
    if (phase6Container) {
      phase6Container.style.display = "flex";
      const input = document.getElementById("phase6-input");
      if (input) {
        input.disabled = false;
        setTimeout(() => {
          input.focus();
        }, 200);
      }
    }
  }

  // Keep the dropdown honest when a runner switches views itself
  const viewSelect = document.getElementById("view-select");
  if (viewSelect && tabName === "emulator") {
    viewSelect.value = "emulator";
  }
}
