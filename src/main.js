/**
 * TRS-80 Model III Emulator - Main Entry Point
 * Development version with console output
 */

import { TRS80System, CPU_CLOCK_HZ } from "./system/trs80-system.js";
import { VideoSystem } from "./peripherals/video.js";
import {
  parseCas,
  fastLoadBasic,
  fastLoadSystem,
} from "./peripherals/cas-format.js";
import { DiskImage } from "./peripherals/disk-image.js";
import { LIBRARY } from "./data/library.js";

// Console output helper
const consoleDiv = document.getElementById("console");

// ---------------------------------------------------------------------------
// Emulator tab: a real Model III booting its real ROM
// ---------------------------------------------------------------------------

const emulator = {
  system: null,
  video: null,
  running: false,
  rafId: null,
  lastFrameTime: 0,
  keydownHandler: null,
  keyupHandler: null,
  blurHandler: null,
  intervalId: null,
  holds: new Map(), // physical code -> { pressedAt, timer, key }
};

// The ROM scans and debounces the keyboard, so a key must stay down in
// the matrix for a few scan passes to register. Synthetic key events and
// very fast taps can release sooner than that — enforce a minimum hold.
const MIN_KEY_HOLD_MS = 80;

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
  window.__trs80 = emulator; // debug/inspection handle (console + tooling)

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

  // Apply the saved screen size
  let savedScale = null;
  try {
    savedScale = localStorage.getItem("trs80-scale");
  } catch {
    savedScale = null;
  }
  if (savedScale) {
    window.setScreenScale(savedScale);
    const scaleSelect = document.getElementById("scale-select");
    if (scaleSelect) {
      scaleSelect.value = savedScale;
    }
  }

  document.getElementById("emulator-reset").addEventListener("click", () => {
    emulator.system.reset();
    setEmulatorStatus(
      emulator.system.io.fdc.anyDiskMounted()
        ? "Reset — booting from drive 0"
        : "Reset — booting ROM BASIC"
    );
  });

  // Populate the library picker
  const librarySelect = document.getElementById("library-select");
  if (librarySelect && librarySelect.childElementCount === 0) {
    for (const entry of LIBRARY) {
      const option = document.createElement("option");
      option.value = entry.id;
      option.textContent = entry.title;
      librarySelect.appendChild(option);
    }
  }

  return emulator.system;
}

function setEmulatorStatus(text) {
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

// Close the menu when clicking anywhere outside it
document.addEventListener("click", (e) => {
  const menu = document.getElementById("machine-menu");
  const panel = document.getElementById("machine-menu-panel");
  if (menu && panel && !panel.hidden && !menu.contains(e.target)) {
    window.toggleMachineMenu(true);
  }
});

window.toggleTheaterMode = function () {
  const on = document.body.classList.toggle("theater");
  const label = document.getElementById("menu-theater-label");
  if (label) {
    label.textContent = on ? "Exit full screen" : "Full screen";
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

async function readPickedFile(inputId) {
  const input = document.getElementById(inputId);
  return new Promise((resolve) => {
    input.onchange = async () => {
      const file = input.files[0];
      input.value = ""; // same file can be picked again later
      if (!file) return resolve(null);
      resolve({ name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) });
    };
    input.click();
  });
}

window.menuLoadCas = async function () {
  window.toggleMachineMenu(true);
  if (!emulator.system) return;
  const picked = await readPickedFile("cas-file");
  if (!picked) return;
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

window.menuLoadLibrary = async function () {
  window.toggleMachineMenu(true);
  if (!emulator.system) return;
  const select = document.getElementById("library-select");
  const entry = LIBRARY.find((e) => e.id === select?.value);
  if (!entry) return;
  setEmulatorStatus(`Typing "${entry.title}" into BASIC…`);
  await new Promise((r) => setTimeout(r, 30)); // let the status paint
  emulator.system.typeText("NEW\n");
  emulator.system.typeText(entry.text);
  emulator.system.typeText("RUN\n");
  setEmulatorStatus(`${entry.title} — running`);
};

window.menuPasteBasic = async function () {
  window.toggleMachineMenu(true);
  if (!emulator.system) return;
  try {
    const text = await navigator.clipboard.readText();
    if (!text) {
      setEmulatorStatus("Clipboard is empty");
      return;
    }
    setEmulatorStatus(`Typing ${text.length} characters…`);
    await new Promise((r) => setTimeout(r, 30));
    const skipped = emulator.system.typeText(
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
  emulator.system.runTStates(Math.round((elapsedMs / 1000) * CPU_CLOCK_HZ));

  if (emulator.system.memory.videoDirty) {
    emulator.system.memory.videoDirty = false;
    emulator.video.renderScreen(emulator.system.memory);
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

function startEmulatorLoop() {
  if (emulator.running) {
    return;
  }
  emulator.running = true;
  emulator.lastFrameTime = performance.now();
  emulator.system.memory.videoDirty = true; // force first paint
  emulator.rafId = requestAnimationFrame(emulatorFrame);
  emulator.intervalId = setInterval(emulatorHeartbeat, 100);

  // Keyboard: window-level so no element needs focus, but leave form
  // fields (other tabs' inputs) alone.
  const isFormField = (el) =>
    el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA");
  emulator.keydownHandler = (e) => {
    if (isFormField(e.target)) return;
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
    if (isFormField(e.target)) return;
    if (matrixRelease(e.key, e.code)) {
      e.preventDefault();
    }
  };
  window.addEventListener("keydown", emulator.keydownHandler);
  window.addEventListener("keyup", emulator.keyupHandler);

  // Window blur only (alt-tab, cmd-tab, clicking another window): a
  // hidden-but-automated tab can still legitimately receive key events,
  // so visibilitychange must NOT wipe the matrix.
  emulator.blurHandler = () => releaseAllMatrixKeys();
  window.addEventListener("blur", emulator.blurHandler);
}

function stopEmulatorLoop() {
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

// Screen size: "fit" scales to the available space; a numeric scale pins
// the 512x192 screen to that multiple (1x reads like a real 12" CRT).
window.setScreenScale = function (value) {
  try {
    localStorage.setItem("trs80-scale", value);
  } catch {
    // preference just won't persist
  }
  const well = document.getElementById("crt-well");
  if (!well) return;
  if (value === "fit") {
    well.style.width = "";
    well.removeAttribute("data-fixed-scale");
  } else {
    const scale = parseFloat(value);
    if (!Number.isFinite(scale) || scale <= 0) return;
    well.style.width = `min(${Math.round(512 * scale)}px, 100%)`;
    well.setAttribute("data-fixed-scale", value);
  }
};

// The View dropdown: the emulator is the product; the phase consoles are
// kept around to verify each build phase still passes.
window.selectDevView = function (value) {
  switch (value) {
    case "emulator":
      window.showEmulatorTab();
      break;
    case "design":
      window.showDesignDoc();
      break;
    case "phase1":
      window.runCPUTest();
      break;
    case "phase2":
      window.runMemoryTest();
      break;
    case "phase3":
      window.runPhase3Test();
      break;
    case "phase4":
      window.runPhase4Test();
      break;
    case "phase5":
      window.runPhase5Test();
      break;
    case "phase6":
      window.runPhase6Test();
      break;
  }
};

function log(message, type = "info") {
  const logEntry = document.createElement("div");
  logEntry.className = `log ${type}`;

  // Check if message contains HTML (like our BASIC source links)
  const timePrefix = `[${new Date().toLocaleTimeString()}] `;
  if (
    message.includes("<span") ||
    message.includes("<a") ||
    message.includes("onclick")
  ) {
    // Message contains HTML - use innerHTML
    logEntry.innerHTML = timePrefix + message;
  } else {
    // Plain text - use textContent for safety
    logEntry.textContent = timePrefix + message;
  }

  consoleDiv.appendChild(logEntry);
  // Don't auto-scroll - keep scroll position at top so user can scroll down to view content

  // Also log to browser console (strip HTML for console)
  const plainMessage = message.replace(/<[^>]*>/g, "");
  if (type === "error") {
    console.error(plainMessage);
  } else if (type === "success") {
    console.log(`✅ ${plainMessage}`);
  } else {
    console.log(plainMessage);
  }
}

// Make log function available globally for button clicks
window.log = log;

// BASIC Program Modal Functions
window.showBasicModal = function (title, source, results = null) {
  const modal = document.getElementById("basic-modal");
  const modalHeader = document.getElementById("basic-modal-header");
  const titleDiv = document.getElementById("basic-modal-title");
  const sourcePre = document.getElementById("basic-modal-source");
  const resultsContainer = document.getElementById(
    "basic-modal-results-container"
  );
  const resultsPre = document.getElementById("basic-modal-results");

  if (
    !modal ||
    !modalHeader ||
    !titleDiv ||
    !sourcePre ||
    !resultsContainer ||
    !resultsPre
  ) {
    console.error("Modal elements not found");
    return;
  }

  // Update header based on whether results are present
  if (results) {
    modalHeader.textContent = "BASIC Program Source Code & Results";
  } else {
    modalHeader.textContent = "BASIC Program Source Code";
  }

  titleDiv.innerHTML = `<h3 style="color: #0ff; margin-bottom: 10px;">${title}</h3>`;
  // Source is already unescaped from data attribute
  sourcePre.textContent = source;

  // Show results if provided
  if (results) {
    resultsPre.textContent = results;
    resultsContainer.style.display = "block";
  } else {
    resultsContainer.style.display = "none";
  }

  modal.style.display = "block";
};

window.closeBasicModal = function () {
  const modal = document.getElementById("basic-modal");
  if (modal) modal.style.display = "none";
};

// Graphics Modal Functions
window.showGraphicsModal = function (title, source, graphicsData = null) {
  const modal = document.getElementById("graphics-modal");
  const modalHeader = document.getElementById("graphics-modal-header");
  const titleDiv = document.getElementById("graphics-modal-title");
  const sourcePre = document.getElementById("graphics-modal-source");
  const canvas = document.getElementById("graphics-modal-canvas");

  if (!modal || !modalHeader || !titleDiv || !sourcePre || !canvas) {
    console.error("Graphics modal elements not found");
    return;
  }

  modalHeader.textContent = "Graphics Display & Source Code";
  titleDiv.innerHTML = `<h3 style="color: #0ff; margin-bottom: 10px;">${title}</h3>`;
  sourcePre.textContent = source;

  // Render graphics if provided
  if (graphicsData) {
    const ctx = canvas.getContext("2d");
    const scale = 4;
    canvas.width = 128 * scale;
    canvas.height = 48 * scale;

    // Fill background
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw pixels
    ctx.fillStyle = "#00FF00"; // TRS-80 green
    for (let y = 0; y < 48; y++) {
      for (let x = 0; x < 128; x++) {
        if (graphicsData[y] && graphicsData[y][x] === 1) {
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }
  } else {
    // Clear canvas
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  modal.style.display = "block";
};

window.closeGraphicsModal = function () {
  const modal = document.getElementById("graphics-modal");
  if (modal) modal.style.display = "none";
};

// Event delegation for BASIC source links
// Use capture phase to ensure we catch the event
document.addEventListener(
  "click",
  function (event) {
    // Check if clicked element or its parent is a basic-link
    let target = event.target;
    while (target && target !== document.body) {
      if (target.classList && target.classList.contains("basic-link")) {
        event.preventDefault();
        event.stopPropagation();
        const title =
          target.getAttribute("data-basic-title") || "BASIC Program";
        let source = target.getAttribute("data-basic-source") || "";
        const results = target.getAttribute("data-basic-results") || null;
        // Decode HTML entities
        source = source
          .replace(/&#10;/g, "\n")
          .replace(/&#13;/g, "\r")
          .replace(/&quot;/g, '"');
        let decodedResults = null;
        if (results) {
          decodedResults = results
            .replace(/&#10;/g, "\n")
            .replace(/&#13;/g, "\r")
            .replace(/&quot;/g, '"');
        }
        showBasicModal(title, source, decodedResults);
        return;
      }
      target = target.parentElement;
    }

    // Close modal when clicking outside of it
    const modal = document.getElementById("basic-modal");
    if (event.target === modal) {
      closeBasicModal();
      return;
    }

    // Close modal when clicking close button
    if (event.target.classList && event.target.classList.contains("close")) {
      closeBasicModal();
      closeGraphicsModal();
      return;
    }

    // Handle graphics links
    let graphicsTarget = event.target;
    while (graphicsTarget && graphicsTarget !== document.body) {
      if (
        graphicsTarget.classList &&
        graphicsTarget.classList.contains("graphics-link")
      ) {
        event.preventDefault();
        event.stopPropagation();
        const title =
          graphicsTarget.getAttribute("data-graphics-title") ||
          "Graphics Display";
        let source = graphicsTarget.getAttribute("data-graphics-source") || "";
        const graphicsDataStr =
          graphicsTarget.getAttribute("data-graphics-data");

        // Decode HTML entities
        source = source
          .replace(/&#10;/g, "\n")
          .replace(/&#13;/g, "\r")
          .replace(/&quot;/g, '"');

        // Parse graphics data if provided (JSON string)
        let graphicsData = null;
        if (graphicsDataStr) {
          try {
            graphicsData = JSON.parse(graphicsDataStr);
          } catch (e) {
            console.error("Failed to parse graphics data:", e);
          }
        }

        showGraphicsModal(title, source, graphicsData);
        return;
      }
      graphicsTarget = graphicsTarget.parentElement;
    }

    // Close graphics modal when clicking outside
    const graphicsModal = document.getElementById("graphics-modal");
    if (event.target === graphicsModal) {
      closeGraphicsModal();
      return;
    }
  },
  true
); // Use capture phase

// Show design document function
window.showDesignDoc = async function () {
  showTab("design-doc");
  const contentDiv = document.getElementById("design-doc-content");
  if (contentDiv && !contentDiv.dataset.loaded) {
    try {
      const response = await fetch("/TRS80-COMPLETE-BUILD-PROMPT.html");
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      contentDiv.innerHTML = doc.body.innerHTML;
      contentDiv.dataset.loaded = "true";
    } catch (error) {
      contentDiv.innerHTML = `<p style="color: #f00;">Error loading design document: ${error.message}</p>`;
    }
  }
};

// Z80 CPU Test function - Runs all Phase 1 tests via dynamic import
window.runCPUTest = async function () {
  // Always show console first when running tests
  showTab("console");

  // Clear any previous test output
  consoleDiv.innerHTML = "";
  // Reset scroll position to top
  consoleDiv.scrollTop = 0;

  log("═══════════════════════════════════════════════════════════", "info");
  log("Z80 CPU Comprehensive Test Suite - Phase 1", "info");
  log("═══════════════════════════════════════════════════════════", "info");
  log("");
  log("🚀 Starting Phase 1: Z80 CPU Test Suite...", "info");
  log("📥 Loading Z80 CPU test runner...", "info");
  log("");

  try {
    // Import the browser test runner
    const { runAllPhase1Tests } = await import("./browser-test-runner.js");
    const results = await runAllPhase1Tests(log);

    log("═══════════════════════════════════════════════════════════", "info");
    log("📊 Test Results Summary:", "info");
    log(`  Total Tests: ${results.total}`, "info");
    log(
      `  ✅ Passed: ${results.passed}`,
      results.passed === results.total ? "success" : "info"
    );
    log(
      `  ❌ Failed: ${results.failed}`,
      results.failed > 0 ? "error" : "success"
    );
    log("");

    if (results.errors.length > 0) {
      log(
        "═══════════════════════════════════════════════════════════",
        "error"
      );
      log("❌ Test Failures:", "error");
      log(
        "═══════════════════════════════════════════════════════════",
        "error"
      );
      log("");
      results.errors.forEach((err, idx) => {
        const testName = err.test || "Unknown test";
        const suiteName = err.suite || "Unknown suite";
        log(
          `  ┌─ Failure #${
            idx + 1
          } ────────────────────────────────────────────┐`,
          "error"
        );
        log(`  │ Suite: ${suiteName.padEnd(50)} │`, "error");
        log(`  │ Test:  ${testName.padEnd(50)} │`, "error");
        const errorMsg = (err.error || "Unknown error").substring(0, 50);
        log(`  │ Error: ${errorMsg.padEnd(50)} │`, "error");
        if (err.name) {
          log(`  │ Type:  ${err.name.padEnd(50)} │`, "error");
        }
        if (err.stack) {
          log(`  │ Stack Trace:`, "error");
          const stackLines = err.stack.split("\n").slice(0, 8);
          stackLines.forEach((line, lineIdx) => {
            if (lineIdx > 0) {
              // Skip first line (error message)
              const trimmed = line.trim().substring(0, 55);
              log(`  │   ${trimmed.padEnd(55)} │`, "error");
            }
          });
        }
        log(
          `  └───────────────────────────────────────────────────────────────┘`,
          "error"
        );
        log("");
      });
      log(
        "═══════════════════════════════════════════════════════════",
        "error"
      );
      log("");
    }

    if (results.failed === 0 && results.total > 0) {
      log("✅ All tests passed!", "success");
    } else if (results.total === 0) {
      log("⚠️  No tests were executed", "error");
    } else {
      log(`⚠️  ${results.failed} test(s) failed. See errors above.`, "error");
    }

    log("═══════════════════════════════════════════════════════════", "info");
    log(
      "💡 Note: For complete 130-test coverage, run: yarn test:run tests/unit/cpu-tests.js",
      "info"
    );
    log("═══════════════════════════════════════════════════════════", "info");

    // Ensure scroll position stays at top after all content is loaded
    // Use multiple strategies to ensure scroll stays at top
    requestAnimationFrame(() => {
      consoleDiv.scrollTop = 0;
      // Also set after a small delay to catch any late DOM updates
      setTimeout(() => {
        consoleDiv.scrollTop = 0;
      }, 100);
    });

    return results;
  } catch (error) {
    log(`❌ Fatal Error: ${error.message}`, "error");
    log(error.stack, "error");
    return {
      total: 0,
      passed: 0,
      failed: 1,
      errors: [{ suite: "Setup", error: error.message }],
    };
  }
};

// Memory System Test function - Runs all Phase 2 tests via dynamic import
window.runMemoryTest = async function () {
  // Always show console first when running tests
  showTab("console");

  // Clear any previous test output
  consoleDiv.innerHTML = "";
  // Reset scroll position to top
  consoleDiv.scrollTop = 0;

  log("═══════════════════════════════════════════════════════════", "info");
  log("Memory System Comprehensive Test Suite - Phase 2", "info");
  log("═══════════════════════════════════════════════════════════", "info");
  log("");
  log("🚀 Starting Phase 2: Memory System Test Suite...", "info");
  log("📥 Loading Memory System test runner...", "info");
  log("");

  try {
    // Import the browser test runner
    const { runAllPhase2Tests } = await import(
      "./browser-test-runner-phase2.js"
    );
    const results = await runAllPhase2Tests(log);

    log("═══════════════════════════════════════════════════════════", "info");
    log("📊 Test Results Summary:", "info");
    log(`  Total Tests: ${results.total}`, "info");
    log(
      `  ✅ Passed: ${results.passed}`,
      results.passed === results.total ? "success" : "info"
    );
    log(
      `  ❌ Failed: ${results.failed}`,
      results.failed > 0 ? "error" : "success"
    );
    log("");

    if (results.errors.length > 0) {
      log(
        "═══════════════════════════════════════════════════════════",
        "error"
      );
      log("❌ Test Failures:", "error");
      log(
        "═══════════════════════════════════════════════════════════",
        "error"
      );
      log("");
      results.errors.forEach((err, idx) => {
        const testName = err.test || "Unknown test";
        const suiteName = err.suite || "Unknown suite";
        log(
          `  ┌─ Failure #${
            idx + 1
          } ────────────────────────────────────────────┐`,
          "error"
        );
        log(`  │ Suite: ${suiteName.padEnd(50)} │`, "error");
        log(`  │ Test:  ${testName.padEnd(50)} │`, "error");
        const errorMsg = (err.error || "Unknown error").substring(0, 50);
        log(`  │ Error: ${errorMsg.padEnd(50)} │`, "error");
        if (err.name) {
          log(`  │ Type:  ${err.name.padEnd(50)} │`, "error");
        }
        if (err.stack) {
          log(`  │ Stack Trace:`, "error");
          const stackLines = err.stack.split("\n").slice(0, 8);
          stackLines.forEach((line, lineIdx) => {
            if (lineIdx > 0) {
              // Skip first line (error message)
              const trimmed = line.trim().substring(0, 55);
              log(`  │   ${trimmed.padEnd(55)} │`, "error");
            }
          });
        }
        log(
          `  └───────────────────────────────────────────────────────────────┘`,
          "error"
        );
        log("");
      });
      log(
        "═══════════════════════════════════════════════════════════",
        "error"
      );
      log("");
    }

    if (results.failed === 0 && results.total > 0) {
      log("✅ All tests passed!", "success");
    } else if (results.total === 0) {
      log("⚠️  No tests were executed", "error");
    } else {
      log(`⚠️  ${results.failed} test(s) failed. See errors above.`, "error");
    }

    log("═══════════════════════════════════════════════════════════", "info");
    log(
      "💡 Note: For complete 28-test coverage, run: yarn test:run tests/unit/memory-tests.js",
      "info"
    );
    log("═══════════════════════════════════════════════════════════", "info");

    // Ensure scroll position stays at top after all content is loaded
    // Use multiple strategies to ensure scroll stays at top
    requestAnimationFrame(() => {
      consoleDiv.scrollTop = 0;
      // Also set after a small delay to catch any late DOM updates
      setTimeout(() => {
        consoleDiv.scrollTop = 0;
      }, 100);
    });

    return results;
  } catch (error) {
    log(`❌ Fatal Error: ${error.message}`, "error");
    log(error.stack, "error");
    return {
      total: 0,
      passed: 0,
      failed: 1,
      errors: [{ suite: "Setup", error: error.message }],
    };
  }
};

// Cassette & I/O System Test function - Runs all Phase 3 tests via dynamic import
window.runPhase3Test = async function () {
  // Always show console first when running tests
  showTab("console");

  // Clear any previous test output
  consoleDiv.innerHTML = "";
  // Reset scroll position to top
  consoleDiv.scrollTop = 0;

  log("═══════════════════════════════════════════════════════════", "info");
  log("Cassette & I/O System Comprehensive Test Suite - Phase 3", "info");
  log("═══════════════════════════════════════════════════════════", "info");
  log("");
  log("🚀 Starting Phase 3: Cassette & I/O System Test Suite...", "info");
  log("📥 Loading Phase 3 test runner...", "info");
  log("");

  try {
    // Import the browser test runner
    const { runAllPhase3Tests } = await import(
      "./browser-test-runner-phase3.js"
    );
    const results = await runAllPhase3Tests(log);

    log("═══════════════════════════════════════════════════════════", "info");
    log("📊 Test Results Summary:", "info");
    log(`  Total Tests: ${results.total}`, "info");
    log(
      `  ✅ Passed: ${results.passed}`,
      results.passed === results.total ? "success" : "info"
    );
    log(
      `  ❌ Failed: ${results.failed}`,
      results.failed > 0 ? "error" : "success"
    );
    log("");

    if (results.errors.length > 0) {
      log(
        "═══════════════════════════════════════════════════════════",
        "error"
      );
      log("❌ Test Failures:", "error");
      log(
        "═══════════════════════════════════════════════════════════",
        "error"
      );
      log("");
      results.errors.forEach((err, idx) => {
        const testName = err.test || "Unknown test";
        const suiteName = err.suite || "Unknown suite";
        log(
          `  ┌─ Failure #${
            idx + 1
          } ────────────────────────────────────────────┐`,
          "error"
        );
        log(`  │ Suite: ${suiteName.padEnd(50)} │`, "error");
        log(`  │ Test:  ${testName.padEnd(50)} │`, "error");
        const errorMsg = (err.error || "Unknown error").substring(0, 50);
        log(`  │ Error: ${errorMsg.padEnd(50)} │`, "error");
        if (err.name) {
          log(`  │ Type:  ${err.name.padEnd(50)} │`, "error");
        }
        if (err.stack) {
          log(`  │ Stack Trace:`, "error");
          const stackLines = err.stack.split("\n").slice(0, 8);
          stackLines.forEach((line, lineIdx) => {
            if (lineIdx > 0) {
              // Skip first line (error message)
              const trimmed = line.trim().substring(0, 55);
              log(`  │   ${trimmed.padEnd(55)} │`, "error");
            }
          });
        }
        log(
          `  └───────────────────────────────────────────────────────────────┘`,
          "error"
        );
        log("");
      });
      log(
        "═══════════════════════════════════════════════════════════",
        "error"
      );
      log("");
    }

    if (results.failed === 0 && results.total > 0) {
      log("✅ All tests passed!", "success");
    } else if (results.total === 0) {
      log("⚠️  No tests were executed", "error");
    } else {
      log(`⚠️  ${results.failed} test(s) failed. See errors above.`, "error");
    }

    log("═══════════════════════════════════════════════════════════", "info");
    log(
      "💡 Note: For complete 37-test coverage, run: yarn test:run tests/unit/cassette-tests.js tests/unit/io-tests.js",
      "info"
    );
    log("═══════════════════════════════════════════════════════════", "info");

    // Ensure scroll position stays at top after all content is loaded
    // Use multiple strategies to ensure scroll stays at top
    requestAnimationFrame(() => {
      consoleDiv.scrollTop = 0;
      // Also set after a small delay to catch any late DOM updates
      setTimeout(() => {
        consoleDiv.scrollTop = 0;
      }, 100);
    });

    return results;
  } catch (error) {
    log(`❌ Fatal Error: ${error.message}`, "error");
    log(error.stack, "error");
    return {
      total: 0,
      passed: 0,
      failed: 1,
      errors: [{ suite: "Setup", error: error.message }],
    };
  }
};

// BASIC Program Execution Test function - Runs all Phase 4 tests via dynamic import
window.runPhase4Test = async function () {
  // Always show console first when running tests
  showTab("console");

  // Clear any previous test output
  consoleDiv.innerHTML = "";
  // Reset scroll position to top
  consoleDiv.scrollTop = 0;

  log("═══════════════════════════════════════════════════════════", "info");
  log("BASIC Program Execution Comprehensive Test Suite - Phase 4", "info");
  log("═══════════════════════════════════════════════════════════", "info");
  log("");
  log("🚀 Starting Phase 4: BASIC Program Execution Test Suite...", "info");
  log("📥 Loading Phase 4 test runner...", "info");
  log("");

  try {
    // Import the browser test runner
    const { runAllPhase4Tests } = await import(
      "./browser-test-runner-phase4.js"
    );
    const results = await runAllPhase4Tests(log);

    log("═══════════════════════════════════════════════════════════", "info");
    log("📊 Test Results Summary:", "info");
    log(`  Total Tests: ${results.total}`, "info");
    log(
      `  ✅ Passed: ${results.passed}`,
      results.passed === results.total ? "success" : "info"
    );
    log(
      `  ❌ Failed: ${results.failed}`,
      results.failed > 0 ? "error" : "success"
    );
    log("");

    if (results.errors.length > 0) {
      log(
        "═══════════════════════════════════════════════════════════",
        "error"
      );
      log("❌ Test Failures:", "error");
      log(
        "═══════════════════════════════════════════════════════════",
        "error"
      );
      log("");
      results.errors.forEach((err, idx) => {
        const testName = err.test || "Unknown test";
        const suiteName = err.suite || "Unknown suite";
        log(
          `  ┌─ Failure #${
            idx + 1
          } ────────────────────────────────────────────┐`,
          "error"
        );
        log(`  │ Suite: ${suiteName.padEnd(50)} │`, "error");
        log(`  │ Test:  ${testName.padEnd(50)} │`, "error");
        const errorMsg = (err.error || "Unknown error").substring(0, 50);
        log(`  │ Error: ${errorMsg.padEnd(50)} │`, "error");
        if (err.name) {
          log(`  │ Type:  ${err.name.padEnd(50)} │`, "error");
        }
        if (err.stack) {
          log(`  │ Stack Trace:`, "error");
          const stackLines = err.stack.split("\n").slice(0, 8);
          stackLines.forEach((line, lineIdx) => {
            if (lineIdx > 0) {
              // Skip first line (error message)
              const trimmed = line.trim().substring(0, 55);
              log(`  │   ${trimmed.padEnd(55)} │`, "error");
            }
          });
        }
        log(
          `  └───────────────────────────────────────────────────────────────┘`,
          "error"
        );
        log("");
      });
      log(
        "═══════════════════════════════════════════════════════════",
        "error"
      );
      log("");
    }

    if (results.failed === 0 && results.total > 0) {
      log("✅ All tests passed!", "success");
    } else if (results.total === 0) {
      log("⚠️  No tests were executed", "error");
    } else {
      log(`⚠️  ${results.failed} test(s) failed. See errors above.`, "error");
    }

    log("═══════════════════════════════════════════════════════════", "info");
    log(
      "💡 Note: For complete 45-test coverage, run: yarn test:run tests/unit/basic-program-tests.js",
      "info"
    );
    log("═══════════════════════════════════════════════════════════", "info");

    // Ensure scroll position stays at top after all content is loaded
    // Use multiple strategies to ensure scroll stays at top
    requestAnimationFrame(() => {
      consoleDiv.scrollTop = 0;
      // Also set after a small delay to catch any late DOM updates
      setTimeout(() => {
        consoleDiv.scrollTop = 0;
      }, 100);
    });

    return results;
  } catch (error) {
    log(`❌ Fatal Error: ${error.message}`, "error");
    log(error.stack, "error");
    return {
      total: 0,
      passed: 0,
      failed: 1,
      errors: [{ suite: "Setup", error: error.message }],
    };
  }
};

// Phase 5 Video Display Test function
window.runPhase5Test = async function () {
  showTab("console");
  consoleDiv.innerHTML = "";
  consoleDiv.scrollTop = 0;

  log("═══════════════════════════════════════════════════════════", "info");
  log("Video Display System Comprehensive Test Suite - Phase 5", "info");
  log("═══════════════════════════════════════════════════════════", "info");
  log("");
  log("🚀 Starting Phase 5: Video Display System Test Suite...", "info");
  log("📥 Loading Phase 5 test runner...", "info");
  log("");

  try {
    const { runAllPhase5Tests } = await import(
      "./browser-test-runner-phase5.js"
    );
    const results = await runAllPhase5Tests(log);

    log("═══════════════════════════════════════════════════════════", "info");
    log("📊 Test Results Summary:", "info");
    log(`  Total Tests: ${results.total}`, "info");
    log(
      `  ✅ Passed: ${results.passed}`,
      results.passed === results.total ? "success" : "info"
    );
    log(
      `  ❌ Failed: ${results.failed}`,
      results.failed > 0 ? "error" : "success"
    );
    log("");

    if (results.errors.length > 0) {
      log(
        "═══════════════════════════════════════════════════════════",
        "error"
      );
      log("❌ Test Failures:", "error");
      log(
        "═══════════════════════════════════════════════════════════",
        "error"
      );
      log("");
      results.errors.forEach((err, idx) => {
        const testName = err.test || "Unknown test";
        const suiteName = err.suite || "Unknown suite";
        log(
          `  ┌─ Failure #${
            idx + 1
          } ────────────────────────────────────────────┐`,
          "error"
        );
        log(`  │ Suite: ${suiteName.padEnd(50)} │`, "error");
        log(`  │ Test:  ${testName.padEnd(50)} │`, "error");
        const errorMsg = (err.error || "Unknown error").substring(0, 50);
        log(`  │ Error: ${errorMsg.padEnd(50)} │`, "error");
        log(
          `  └───────────────────────────────────────────────────────────────┘`,
          "error"
        );
        log("");
      });
    }

    if (results.failed === 0 && results.total > 0) {
      log("✅ All tests passed!", "success");
    } else if (results.total === 0) {
      log("⚠️  No tests were executed", "error");
    } else {
      log(`⚠️  ${results.failed} test(s) failed. See errors above.`, "error");
    }

    log("═══════════════════════════════════════════════════════════", "info");
    log(
      "💡 Note: Click 'View Graphics & Source' links to see graphics and BASIC code",
      "info"
    );
    log("═══════════════════════════════════════════════════════════", "info");

    requestAnimationFrame(() => {
      consoleDiv.scrollTop = 0;
      setTimeout(() => {
        consoleDiv.scrollTop = 0;
      }, 100);
    });

    return results;
  } catch (error) {
    log(`❌ Fatal Error: ${error.message}`, "error");
    log(error.stack, "error");
    return {
      total: 0,
      passed: 0,
      failed: 1,
      errors: [{ suite: "Setup", error: error.message }],
    };
  }
};

// Phase 6 Command-Line Interface Test function
window.runPhase6Test = async function () {
  // Show Phase 6 container
  showTab("phase6");

  const phase6Container = document.getElementById("phase6-container");
  const phase6Terminal = document.getElementById("phase6-terminal");
  const phase6Input = document.getElementById("phase6-input");
  const phase6Prompt = document.getElementById("phase6-prompt");

  // Clear terminal - RESET everything
  phase6Terminal.innerHTML = "";

  // Reset prompt
  if (phase6Prompt) {
    phase6Prompt.textContent = "";
  }

  // Ensure input is enabled and visible - CRITICAL for input to work
  if (phase6Input) {
    phase6Input.disabled = false;
    phase6Input.readOnly = false;
    phase6Input.style.display = "block";
    phase6Input.style.visibility = "visible";
    phase6Input.style.opacity = "1";
    phase6Input.value = "";
    phase6Input.placeholder = "";
    phase6Input.removeAttribute("readonly");
    // Force focus immediately
    phase6Input.focus();
  }

  // Clear any existing command line instance - we'll create a fresh one
  window.trs80CmdLine = null;

  // Create log function for Phase 6 terminal
  function terminalLog(message, type = "info") {
    const line = document.createElement("div");
    line.className = `terminal-line ${type}`;

    // Handle HTML content (for links, etc.)
    if (
      message.includes("<span") ||
      message.includes("<a") ||
      message.includes("onclick")
    ) {
      line.innerHTML = message;
    } else {
      line.textContent = message;
    }

    phase6Terminal.appendChild(line);
    // Auto-scroll to bottom
    phase6Terminal.scrollTop = phase6Terminal.scrollHeight;
  }

  // Set up input handler immediately (before cmdLine is created)
  let cmdLine = null;

  const handleInput = async (e) => {
    // Check if we're in edit mode
    if (cmdLine && cmdLine.editMode) {
      // Get the character to insert
      let char = null;
      if (e.key.length === 1) {
        char = e.shiftKey ? e.key.toUpperCase() : e.key.toLowerCase();
      } else if (e.key === " ") {
        char = " ";
      }

      const handled = await cmdLine.handleEditInput(e.key, char);
      if (handled) {
        e.preventDefault();
        // Update the input field value to reflect the edit buffer
        if (cmdLine.editBuffer !== undefined) {
          phase6Input.value = cmdLine.editBuffer;
          setTimeout(() => {
            phase6Input.setSelectionRange(
              cmdLine.editCursor,
              cmdLine.editCursor
            );
          }, 10);
        }
        return;
      }
    }

    // Handle BREAK/Escape key to stop running program
    if (
      (e.key === "Escape" || e.key === "Break") &&
      cmdLine &&
      cmdLine.programRunning
    ) {
      e.preventDefault();
      await cmdLine.handleBREAK();
      setTimeout(() => phase6Input.focus(), 10);
      return;
    }

    if (e.key === "Enter") {
      const command = phase6Input.value.trim();
      phase6Input.value = "";

      if (command && cmdLine) {
        // Check if it's a BREAK command
        if (command.toUpperCase() === "BREAK" && cmdLine.programRunning) {
          await cmdLine.handleBREAK();
        } else {
          // Don't update prompt here - let the command handler do it
          await cmdLine.processCommand(command);
        }
        // Refocus input after command
        setTimeout(() => phase6Input.focus(), 10);
      } else if (command && !cmdLine) {
        terminalLog(
          `Command not available yet. Please wait for initialization.`,
          "error"
        );
        setTimeout(() => phase6Input.focus(), 10);
      } else {
        // Empty command - just refocus
        setTimeout(() => phase6Input.focus(), 10);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (cmdLine) {
        const prevCmd = cmdLine.getPreviousCommand();
        if (prevCmd) {
          phase6Input.value = prevCmd;
        }
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (cmdLine) {
        const nextCmd = cmdLine.getNextCommand();
        if (nextCmd) {
          phase6Input.value = nextCmd;
        } else {
          phase6Input.value = "";
          cmdLine.historyIndex = cmdLine.commandHistory.length;
        }
      }
    }
  };

  // Attach event listener immediately - remove old listeners first
  phase6Input.removeEventListener("keydown", handleInput);
  phase6Input.addEventListener("keydown", handleInput);

  // Also handle keypress for better compatibility
  phase6Input.addEventListener("keypress", (e) => {
    // Allow all keypresses through
    if (e.key === "Enter") {
      e.preventDefault();
      handleInput(e);
    }
  });

  // Make sure input can receive focus and clicks
  phase6Input.setAttribute("tabindex", "0");

  // Add click handler to ensure focus works
  phase6Input.addEventListener("click", () => {
    phase6Input.focus();
  });

  // Add focus handler to ensure it stays focused
  phase6Input.addEventListener("blur", () => {
    // Re-focus if we lose focus (unless user clicked elsewhere intentionally)
    setTimeout(() => {
      if (phase6Container && phase6Container.style.display !== "none") {
        phase6Input.focus();
      }
    }, 100);
  });

  // Initialize command-line interface
  try {
    const { runAllPhase6Tests, TRS80CommandLine } = await import(
      "./browser-test-runner-phase6.js"
    );

    // Don't run tests automatically - just boot into BASIC
    // The tests can be run separately if needed

    // Always create a fresh command-line interface (reset on each Phase 6 activation)
    // This simulates pressing the reset button on the TRS-80
    const consoleDiv = document.getElementById("console");
    cmdLine = new TRS80CommandLine(terminalLog, phase6Terminal);
    window.trs80CmdLine = cmdLine;

    // Update command-line interface to use Phase 6 terminal
    cmdLine.logFn = terminalLog;
    cmdLine.container = phase6Terminal;
    cmdLine.onPromptUpdate = (prompt) => {
      phase6Prompt.textContent = prompt;
    };
    cmdLine.onBootComplete = () => {
      phase6Prompt.textContent = "READY";
      // Focus input after a short delay to ensure it's ready
      setTimeout(() => {
        phase6Input.disabled = false;
        phase6Input.readOnly = false;
        phase6Input.focus();
        // Force focus with click as well
        phase6Input.click();
      }, 200);
    };

    // Override requestInput to handle INPUT statements
    if (cmdLine.interpreter) {
      cmdLine.requestInput = async (prompt) => {
        return new Promise((resolve) => {
          // Show prompt
          terminalLog(prompt, "info");

          // Create a temporary input handler
          const inputHandler = async (e) => {
            if (e.key === "Enter") {
              const value = phase6Input.value.trim();
              phase6Input.value = "";
              phase6Input.removeEventListener("keydown", inputHandler);
              resolve(value);
            }
          };

          phase6Input.addEventListener("keydown", inputHandler);
          phase6Input.focus();
        });
      };
    }

    // Set up edit mode change handler
    cmdLine.onEditModeChange = (inEditMode, lineNumber, lineContent) => {
      if (inEditMode) {
        phase6Prompt.textContent = `${lineNumber}`;
        phase6Input.value = lineContent || "";
        phase6Input.placeholder = `Editing line ${lineNumber} - Use arrow keys, spacebar, or type to edit. Press Enter to save, Esc to cancel.`;
        // Set cursor to end
        setTimeout(() => {
          phase6Input.setSelectionRange(
            phase6Input.value.length,
            phase6Input.value.length
          );
        }, 10);
      } else {
        phase6Prompt.textContent = "READY";
        phase6Input.placeholder = "";
        phase6Input.value = "";
        phase6Input.focus();
      }
    };

    // Set up edit display update handler
    cmdLine.onEditDisplayUpdate = (displayText) => {
      // Update the input field to show the edit state
      const lineMatch = displayText.match(/^(\d+)\s+(.+)$/);
      if (lineMatch) {
        const lineContent = lineMatch[2];
        // Replace underscore with actual cursor position
        const cursorPos = lineContent.indexOf("_");
        if (cursorPos !== -1) {
          const beforeCursor = lineContent.substring(0, cursorPos);
          const afterCursor = lineContent.substring(cursorPos + 1);
          phase6Input.value = beforeCursor + afterCursor;
          // Set cursor position
          setTimeout(() => {
            phase6Input.setSelectionRange(cursorPos, cursorPos);
          }, 10);
        }
      }
    };

    // Wait for boot to complete before showing help
    // Help will be shown after boot sequence completes
  } catch (error) {
    terminalLog(`❌ Fatal Error: ${error.message}`, "error");
    terminalLog(error.stack, "error");
    // Still enable input even if there's an error
    setTimeout(() => {
      phase6Input.disabled = false;
      phase6Input.focus();
    }, 100);
  }
};

// View management - ensure only one view is visible at a time
function showTab(tabName) {
  const machineStage = document.getElementById("machine-stage");
  const console = document.getElementById("console");
  const designDocContainer = document.getElementById("design-doc-container");
  const phase6Container = document.getElementById("phase6-container");

  // Hide all views first
  if (machineStage) machineStage.style.display = "none";
  if (console) console.style.display = "none";
  if (designDocContainer) designDocContainer.style.display = "none";
  if (phase6Container) phase6Container.style.display = "none";

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

// Initial console messages (visible when a phase view is selected)
log("TRS-80 Model III Emulator - Development Console", "success");
log(
  "Use the View dropdown (top right) to run the Phase 0-6 build-verification consoles; pick Emulator to return to the machine.",
  "info"
);

// Dev/debug hook: lets the console (and automated checks) inspect the
// live machine — e.g. __trs80.system.screenText().
window.__trs80 = emulator;

// Launch straight into the machine: a 48K cassette Model III, powered on.
window.showEmulatorTab();
