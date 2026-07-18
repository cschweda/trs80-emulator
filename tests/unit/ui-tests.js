/**
 * UI module tests (jsdom)
 *
 * The emulator UI and the legacy phase console are split into separate
 * modules; these tests cover the seams: file-picker promise settlement
 * (including canceled dialogs) and the legacy module's lazy-load surface.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  readPickedFile,
  emulator,
  startEmulatorLoop,
  stopEmulatorLoop,
  onUiModalOpen,
  turboActive,
  initTurbo,
} from "@ui/emulator-ui.js";
import { KeyboardMatrix } from "@peripherals/keyboard.js";

// A minimal stand-in for TRS80System: just enough surface for
// startEmulatorLoop() and the matrix press/release path to run without
// booting the real ROM. keyDown/keyUp are spied so tests can assert on
// whether a dispatched window keyboard event ever reached them.
function fakeSystem() {
  return {
    memory: { videoDirty: false },
    cpu: { cycles: 0 },
    io: { drainSound: () => [] },
    keyboard: {
      keyDown: vi.fn(() => true),
      keyUp: vi.fn(() => true),
      reset: vi.fn(),
    },
    runTStates: vi.fn(() => 0),
  };
}

// stepMachine() paints through emulator.video, which only initEmulator()
// ever assigns — and that needs a real ROM fetch. Without this stub the very
// first frame dies on null.renderScreen(), because startEmulatorLoop() forces
// videoDirty = true.
function fakeVideo() {
  return { renderScreen: vi.fn() };
}

describe("readPickedFile", () => {
  beforeEach(() => {
    document.body.innerHTML = `<input type="file" id="test-file" hidden />`;
  });

  it("resolves null when the picker is canceled", async () => {
    // input.click() opens nothing in jsdom, so the promise's fate is
    // decided entirely by the events we dispatch.
    const promise = readPickedFile("test-file");
    const input = document.getElementById("test-file");
    input.dispatchEvent(new Event("cancel"));
    await expect(promise).resolves.toBeNull();
  });

  it("resolves with name and bytes when a file is chosen", async () => {
    const promise = readPickedFile("test-file");
    const input = document.getElementById("test-file");
    // jsdom's File lacks arrayBuffer(); the implementation only needs
    // name + arrayBuffer, so a minimal stand-in keeps the test honest.
    const file = {
      name: "game.cas",
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    };
    Object.defineProperty(input, "files", {
      value: [file],
      configurable: true,
    });
    input.dispatchEvent(new Event("change"));

    const picked = await promise;
    expect(picked.name).toBe("game.cas");
    expect(Array.from(picked.bytes)).toEqual([1, 2, 3]);
  });

  it("can be called again after a cancel (handlers are cleaned up)", async () => {
    const first = readPickedFile("test-file");
    const input = document.getElementById("test-file");
    input.dispatchEvent(new Event("cancel"));
    await first;

    const second = readPickedFile("test-file");
    input.dispatchEvent(new Event("cancel"));
    await expect(second).resolves.toBeNull();
  });
});

describe("menuBootDos (drive 0 DOS picker)", () => {
  // Real image bytes so DiskImage parses: a tiny 10x10 JV1
  const diskBytes = () => new Uint8Array(10 * 10 * 256);

  function fakeBootSystem() {
    return {
      mountDisk: vi.fn(),
      reset: vi.fn(),
      io: { fdc: { drives: [null, null, null, null] } },
    };
  }

  beforeEach(() => {
    document.body.innerHTML = `
      <select id="dos-select"></select>
      <div id="emulator-status"></div>
      <div id="menu-disk0-status"></div>
      <div id="menu-disk1-status"></div>
      <div id="machine-menu"><button id="machine-menu-button"></button>
        <div id="machine-menu-panel" hidden></div></div>
      <input type="file" id="dsk-file" hidden />
    `;
    emulator.system = fakeBootSystem();
  });

  afterEach(() => {
    emulator.system = null;
    vi.unstubAllGlobals();
  });

  it("fetches a bundled DOS, mounts drive 0, and resets to boot", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        arrayBuffer: async () => diskBytes().buffer,
      }))
    );
    const select = document.getElementById("dos-select");
    select.innerHTML = `<option value="trsdos13" selected>TRSDOS 1.3</option>`;

    await window.menuBootDos();

    expect(fetch).toHaveBeenCalledWith("/disks/trsdos13.dsk");
    expect(emulator.system.mountDisk).toHaveBeenCalledTimes(1);
    const [drive, image] = emulator.system.mountDisk.mock.calls[0];
    expect(drive).toBe(0);
    expect(image.format).toBe("jv1");
    expect(emulator.system.reset).toHaveBeenCalled();
    expect(document.getElementById("emulator-status").textContent).toContain(
      "TRSDOS 1.3"
    );
  });

  it("reports a fetch failure without resetting the machine", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404 })));
    const select = document.getElementById("dos-select");
    select.innerHTML = `<option value="ldos531" selected>LDOS</option>`;

    await window.menuBootDos();

    expect(emulator.system.mountDisk).not.toHaveBeenCalled();
    expect(emulator.system.reset).not.toHaveBeenCalled();
    expect(document.getElementById("emulator-status").textContent).toContain(
      "Could not fetch"
    );
  });

  it("the custom option goes through the .dsk picker then boots", async () => {
    const select = document.getElementById("dos-select");
    select.innerHTML = `<option value="custom" selected>Custom .dsk…</option>`;

    const promise = window.menuBootDos();
    const input = document.getElementById("dsk-file");
    Object.defineProperty(input, "files", {
      value: [
        { name: "mydisk.dsk", arrayBuffer: async () => diskBytes().buffer },
      ],
      configurable: true,
    });
    input.dispatchEvent(new Event("change"));
    await promise;

    const [drive, image] = emulator.system.mountDisk.mock.calls[0];
    expect(drive).toBe(0);
    expect(image.name).toBe("mydisk.dsk");
    expect(emulator.system.reset).toHaveBeenCalled();
  });

  it("a canceled custom picker leaves the machine untouched", async () => {
    const select = document.getElementById("dos-select");
    select.innerHTML = `<option value="custom" selected>Custom .dsk…</option>`;

    const promise = window.menuBootDos();
    document.getElementById("dsk-file").dispatchEvent(new Event("cancel"));
    await promise;

    expect(emulator.system.mountDisk).not.toHaveBeenCalled();
    expect(emulator.system.reset).not.toHaveBeenCalled();
  });

  it("an unparseable custom image is reported, not mounted", async () => {
    const select = document.getElementById("dos-select");
    select.innerHTML = `<option value="custom" selected>Custom .dsk…</option>`;

    const promise = window.menuBootDos();
    const input = document.getElementById("dsk-file");
    Object.defineProperty(input, "files", {
      value: [
        // 1000 bytes: not a sector multiple, not JV3 — DiskImage throws
        { name: "bad.dsk", arrayBuffer: async () => new Uint8Array(1000).buffer },
      ],
      configurable: true,
    });
    input.dispatchEvent(new Event("change"));
    await promise;

    expect(emulator.system.mountDisk).not.toHaveBeenCalled();
    expect(emulator.system.reset).not.toHaveBeenCalled();
    expect(document.getElementById("emulator-status").textContent).toContain(
      "Could not mount"
    );
  });
});

describe("library loading under a booted DOS", () => {
  afterEach(() => {
    emulator.system = null;
  });

  it("menuLoadLibrary reboots to cassette BASIC before loading", async () => {
    document.body.innerHTML = `
      <select id="library-select"><option value="guess" selected>Guess</option></select>
      <div id="emulator-status"></div>
      <div id="menu-disk0-status"></div><div id="menu-disk1-status"></div>
      <div id="machine-menu"><button id="machine-menu-button"></button>
        <div id="machine-menu-panel" hidden></div></div>
    `;
    emulator.system = {
      io: { fdc: { anyDiskMounted: () => true, drives: [null, null, null, null] } },
      bootToCassetteBasic: vi.fn(() => true),
      typeText: vi.fn(() => 0),
    };

    await window.menuLoadLibrary();

    expect(emulator.system.bootToCassetteBasic).toHaveBeenCalledTimes(1);
    expect(emulator.system.typeText).toHaveBeenCalled(); // then the game typed in
  });

  it("menuLoadLibrary loads directly when no disk is mounted", async () => {
    document.body.innerHTML = `
      <select id="library-select"><option value="guess" selected>Guess</option></select>
      <div id="emulator-status"></div>
      <div id="machine-menu"><button id="machine-menu-button"></button>
        <div id="machine-menu-panel" hidden></div></div>
    `;
    emulator.system = {
      io: { fdc: { anyDiskMounted: () => false, drives: [null, null, null, null] } },
      bootToCassetteBasic: vi.fn(() => true),
      typeText: vi.fn(() => 0),
    };

    await window.menuLoadLibrary();

    expect(emulator.system.bootToCassetteBasic).not.toHaveBeenCalled();
    expect(emulator.system.typeText).toHaveBeenCalled();
  });
});

describe("modal key isolation (changelog must not leak keys into the machine)", () => {
  afterEach(() => {
    stopEmulatorLoop(); // cancels rAF/interval, removes the window listeners
    emulator.system = null;
    emulator.video = null;
    document.body.innerHTML = "";
  });

  it("does not forward keydown/keyup to the keyboard while the changelog modal is open", () => {
    document.body.innerHTML =
      '<div id="changelog-modal" style="display: block;"></div>';
    emulator.system = fakeSystem();
    emulator.video = fakeVideo();
    startEmulatorLoop();

    // Escape maps to BREAK (src/peripherals/keyboard.js) — exactly the
    // keystroke that must not reach a running BASIC program while the
    // changelog is open for reading.
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", code: "Escape" })
    );
    window.dispatchEvent(
      new KeyboardEvent("keyup", { key: "Escape", code: "Escape" })
    );

    expect(emulator.system.keyboard.keyDown).not.toHaveBeenCalled();
    expect(emulator.system.keyboard.keyUp).not.toHaveBeenCalled();
  });

  it("still forwards keys once the modal is closed (control case)", () => {
    document.body.innerHTML =
      '<div id="changelog-modal" style="display: none;"></div>';
    emulator.system = fakeSystem();
    emulator.video = fakeVideo();
    startEmulatorLoop();

    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "a", code: "KeyA" })
    );

    expect(emulator.system.keyboard.keyDown).toHaveBeenCalledWith(
      "a",
      "KeyA"
    );
  });

  it("onUiModalOpen releases any matrix key the user was mid-holding", () => {
    emulator.system = fakeSystem();
    emulator.video = fakeVideo();
    emulator.holds.set("KeyA", { pressedAt: performance.now(), timer: null });

    onUiModalOpen();

    expect(emulator.holds.size).toBe(0);
    expect(emulator.system.keyboard.reset).toHaveBeenCalled();
  });
});

describe("legacy console module", () => {
  it("exposes selectLegacyView and registers the phase runners", async () => {
    document.body.innerHTML = `<div id="console"></div>`;
    const legacy = await import("@ui/legacy-console.js");
    expect(typeof legacy.selectLegacyView).toBe("function");
    for (const fn of [
      "showDesignDoc",
      "runCPUTest",
      "runMemoryTest",
      "runPhase3Test",
      "runPhase4Test",
      "runPhase5Test",
      "runPhase6Test",
    ]) {
      expect(typeof window[fn], `window.${fn}`).toBe("function");
    }
  });
});

describe("turbo mode", () => {
  const backtick = (type, opts = {}) =>
    new KeyboardEvent(type, { key: "`", code: "Backquote", ...opts });

  afterEach(() => {
    stopEmulatorLoop();
    emulator.system = null;
    emulator.video = null;
    emulator.turboHeld = false;
    emulator.turboLatched = false;
    document.body.innerHTML = "";
  });

  it("engages while the key is held and drops the moment it is released", () => {
    emulator.system = fakeSystem();
    emulator.video = fakeVideo();
    startEmulatorLoop();

    window.dispatchEvent(backtick("keydown"));
    expect(turboActive()).toBe(true);

    window.dispatchEvent(backtick("keyup"));
    expect(turboActive()).toBe(false);
  });

  it("never reaches the keyboard matrix (the TRS-80 has no backtick key)", () => {
    emulator.system = fakeSystem();
    emulator.video = fakeVideo();
    startEmulatorLoop();

    window.dispatchEvent(backtick("keydown"));
    window.dispatchEvent(backtick("keyup"));

    expect(emulator.system.keyboard.keyDown).not.toHaveBeenCalled();
    expect(emulator.system.keyboard.keyUp).not.toHaveBeenCalled();
  });

  it("a modified backtick (e.g. Cmd+`) also never reaches the keyboard matrix", () => {
    // A modified backtick no longer returns early — it falls through to the
    // matrix path. Safe only because KEY_MAP has no backtick entry. Pin it.
    //
    // This uses the REAL KeyboardMatrix instead of fakeSystem()'s keyboard
    // stub: that stub's keyDown always returns true, so it can't tell us
    // anything about KEY_MAP — it would report a hold was taken even though
    // the real matrix takes none. Only the real class ties this test to the
    // actual "no backtick entry" fact, so a future KEY_MAP change that added
    // one would be caught here.
    emulator.system = fakeSystem();
    emulator.system.keyboard = new KeyboardMatrix();
    const keyDownSpy = vi.spyOn(emulator.system.keyboard, "keyDown");
    emulator.video = fakeVideo();
    startEmulatorLoop();

    window.dispatchEvent(backtick("keydown", { metaKey: true }));
    window.dispatchEvent(backtick("keyup", { metaKey: true }));

    expect(keyDownSpy).toHaveBeenCalledWith("`", "Backquote");
    expect(keyDownSpy.mock.results[0].value).toBe(false);
    expect(emulator.holds.size).toBe(0);
  });

  it("stays engaged across the auto-repeat of a held key", () => {
    // The turbo check must sit BEFORE the e.repeat early-return in the
    // keydown handler. Blur clears the hold while the key is still
    // physically down; only a repeat keydown can arrive next, and it must
    // still re-affirm turbo. Swap those two ifs and this goes false.
    emulator.system = fakeSystem();
    emulator.video = fakeVideo();
    startEmulatorLoop();

    window.dispatchEvent(backtick("keydown"));
    window.dispatchEvent(new Event("blur")); // hold cleared, key still down
    expect(turboActive()).toBe(false);

    window.dispatchEvent(backtick("keydown", { repeat: true }));

    expect(turboActive()).toBe(true);
    expect(emulator.system.keyboard.keyDown).not.toHaveBeenCalled();
  });

  it("does not engage while a form field has focus", () => {
    document.body.innerHTML = '<input id="field" />';
    emulator.system = fakeSystem();
    emulator.video = fakeVideo();
    startEmulatorLoop();

    document
      .getElementById("field")
      .dispatchEvent(backtick("keydown", { bubbles: true }));

    expect(turboActive()).toBe(false);
  });

  it("does not engage while the changelog modal is open", () => {
    document.body.innerHTML =
      '<div id="changelog-modal" style="display: block;"></div>';
    emulator.system = fakeSystem();
    emulator.video = fakeVideo();
    startEmulatorLoop();

    window.dispatchEvent(backtick("keydown"));

    expect(turboActive()).toBe(false);
  });

  it("does not engage when Cmd is held (macOS 'cycle windows' shortcut)", () => {
    emulator.system = fakeSystem();
    emulator.video = fakeVideo();
    startEmulatorLoop();

    window.dispatchEvent(backtick("keydown", { metaKey: true }));

    expect(turboActive()).toBe(false);
  });

  it("does not engage when Ctrl is held", () => {
    emulator.system = fakeSystem();
    emulator.video = fakeVideo();
    startEmulatorLoop();

    window.dispatchEvent(backtick("keydown", { ctrlKey: true }));

    expect(turboActive()).toBe(false);
  });

  it("does not engage when Alt is held", () => {
    emulator.system = fakeSystem();
    emulator.video = fakeVideo();
    startEmulatorLoop();

    window.dispatchEvent(backtick("keydown", { altKey: true }));

    expect(turboActive()).toBe(false);
  });

  it("DOES engage when Shift is held (same physical key, not a system shortcut)", () => {
    // Pins that the modifier gate isn't over-broad: Shift+` is the same
    // physical key a player may reach while already holding Shift in a
    // game, and Shift has no OS-level meaning for backtick.
    emulator.system = fakeSystem();
    emulator.video = fakeVideo();
    startEmulatorLoop();

    window.dispatchEvent(backtick("keydown", { shiftKey: true }));

    expect(turboActive()).toBe(true);
  });

  it("releases on keyup even when a form field has focus", () => {
    // Engaging is gated on focus; releasing must NOT be. If focus moved
    // mid-hold, a gated keyup would strand the machine at 10x forever.
    document.body.innerHTML = '<input id="field" />';
    emulator.system = fakeSystem();
    emulator.video = fakeVideo();
    startEmulatorLoop();

    window.dispatchEvent(backtick("keydown"));
    expect(turboActive()).toBe(true);

    document
      .getElementById("field")
      .dispatchEvent(backtick("keyup", { bubbles: true }));

    expect(turboActive()).toBe(false);
  });

  it("blur drops a held key but keeps an explicit latch", () => {
    // Alt-tab mid-hold: the keyup never arrives, so the hold must be
    // dropped here — but a latch the user deliberately set must survive.
    emulator.system = fakeSystem();
    emulator.video = fakeVideo();
    startEmulatorLoop();
    emulator.turboLatched = true;

    window.dispatchEvent(backtick("keydown"));
    window.dispatchEvent(new Event("blur"));

    expect(emulator.turboHeld).toBe(false);
    expect(emulator.turboLatched).toBe(true);
    expect(turboActive()).toBe(true);
  });

  it("opening the changelog drops a held key but keeps an explicit latch", () => {
    emulator.system = fakeSystem();
    emulator.video = fakeVideo();
    startEmulatorLoop();
    emulator.turboLatched = true;

    window.dispatchEvent(backtick("keydown"));
    onUiModalOpen();

    expect(emulator.turboHeld).toBe(false);
    expect(emulator.turboLatched).toBe(true);
  });

  it("stopping the loop drops a held key (its keyup would never arrive)", () => {
    emulator.system = fakeSystem();
    emulator.video = fakeVideo();
    startEmulatorLoop();

    window.dispatchEvent(backtick("keydown"));
    stopEmulatorLoop();

    expect(emulator.turboHeld).toBe(false);
  });

  it("survives a real frame of the loop (the fake machine is complete)", async () => {
    // The other tests are synchronous, so afterEach cancels the rAF and the
    // heartbeat before either can fire — which means an incomplete fake would
    // never be caught. This one lets a tick actually land.
    emulator.system = fakeSystem();
    emulator.video = fakeVideo();
    startEmulatorLoop();

    await new Promise((resolve) => setTimeout(resolve, 250));

    expect(emulator.system.runTStates).toHaveBeenCalled();
    expect(emulator.video.renderScreen).toHaveBeenCalled();
  });

  it("is off on a fresh load and persists nothing", () => {
    expect(emulator.turboHeld).toBe(false);
    expect(emulator.turboLatched).toBe(false);
    expect(localStorage.getItem("trs80-turbo")).toBeNull();
  });
});

describe("turbo pill (status bar)", () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<button type="button" id="status-bar-turbo" aria-pressed="false">⏩ Turbo</button>';
    emulator.turboHeld = false;
    emulator.turboLatched = false;
    initTurbo();
  });

  afterEach(() => {
    stopEmulatorLoop();
    emulator.system = null;
    emulator.video = null;
    emulator.turboHeld = false;
    emulator.turboLatched = false;
    document.body.innerHTML = "";
  });

  it("latches turbo on click and unlatches on a second click", () => {
    const pill = document.getElementById("status-bar-turbo");

    pill.click();
    expect(emulator.turboLatched).toBe(true);
    expect(turboActive()).toBe(true);
    // Turbo is deliberately NOT persisted — the Sound toggle in this same
    // module does persist, and copying that pattern here is exactly the
    // regression this pins. A latched turbo surviving a reload would make
    // an arcade game look broken rather than fast.
    expect(localStorage.getItem("trs80-turbo")).toBeNull();
    expect(Object.keys(localStorage).some((k) => /turbo/i.test(k))).toBe(false);

    pill.click();
    expect(emulator.turboLatched).toBe(false);
    expect(turboActive()).toBe(false);
    expect(Object.keys(localStorage).some((k) => /turbo/i.test(k))).toBe(false);
  });

  it("lights up and announces itself pressed while latched", () => {
    const pill = document.getElementById("status-bar-turbo");

    pill.click();

    expect(pill.classList.contains("on")).toBe(true);
    expect(pill.getAttribute("aria-pressed")).toBe("true");
    expect(pill.textContent).toContain("10×");
  });

  it("lights up for a held key too, not just the latch", () => {
    const pill = document.getElementById("status-bar-turbo");
    emulator.system = fakeSystem();
    emulator.video = fakeVideo();
    startEmulatorLoop();

    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "`", code: "Backquote" })
    );
    expect(pill.classList.contains("on")).toBe(true);
    expect(pill.getAttribute("aria-pressed")).toBe("true");

    window.dispatchEvent(
      new KeyboardEvent("keyup", { key: "`", code: "Backquote" })
    );
    expect(pill.classList.contains("on")).toBe(false);
    expect(pill.getAttribute("aria-pressed")).toBe("false");
  });

  it("goes dark and reads 'Turbo' when off", () => {
    const pill = document.getElementById("status-bar-turbo");

    expect(pill.classList.contains("on")).toBe(false);
    expect(pill.getAttribute("aria-pressed")).toBe("false");
    expect(pill.textContent).toContain("Turbo");
    expect(pill.textContent).not.toContain("10×");
  });

  it("escape hatch: clicking the pill turns turbo off even when turboHeld is stuck true", () => {
    // Simulates the swallowed keyup: macOS does not deliver keyup for a
    // non-modifier key held with Command, so turboHeld can get stuck true
    // with no keyup ever coming to clear it. This is the regression test
    // for the actual user-visible bug — before the fix, the click handler
    // only toggled turboLatched, so turboActive() (turboHeld || turboLatched)
    // stayed true and the pill stayed lit no matter how many times it was
    // clicked, leaving the user stuck at 10x with an apparently-dead button.
    const pill = document.getElementById("status-bar-turbo");
    emulator.turboHeld = true;

    pill.click();

    expect(turboActive()).toBe(false);
    expect(emulator.turboHeld).toBe(false);
    expect(pill.classList.contains("on")).toBe(false);
    expect(pill.getAttribute("aria-pressed")).toBe("false");
  });

  it("clicking the pill turns turbo OFF even when it was engaged by the key", () => {
    // Deliberate trade-off. From (held=true, latched=false) a single click
    // cannot mean both "turn it off" (the hold is stuck because a keyup was
    // lost) and "latch it on" (the user is really holding the key) — the two
    // states are indistinguishable to the code. We chose OFF, because that
    // keeps the pill a working escape hatch. A genuine hold is unharmed: its
    // auto-repeat keydown re-engages turbo within ~30 ms.
    // The casualty is hold-then-latch; the workaround (release, then click)
    // is immediate. Do NOT "simplify" this back to `latched = !latched`.
    const pill = document.getElementById("status-bar-turbo");
    emulator.turboHeld = true;
    emulator.turboLatched = false;

    pill.click();

    expect(emulator.turboHeld).toBe(false);
    expect(emulator.turboLatched).toBe(false);
    expect(turboActive()).toBe(false);
  });

  it("initTurbo() is idempotent: a second call does not attach a duplicate listener", () => {
    // Two listeners on the same pill would each toggle state on one click,
    // netting to a no-op — the same "pill looks dead" symptom as the bug
    // above, from a different cause. The dataset guard in initTurbo() must
    // prevent a second wiring.
    const pill = document.getElementById("status-bar-turbo");
    initTurbo(); // beforeEach already wired this same pill once

    pill.click();

    expect(emulator.turboLatched).toBe(true);
    expect(turboActive()).toBe(true);
    expect(pill.classList.contains("on")).toBe(true);
  });
});
