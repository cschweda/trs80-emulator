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
} from "@ui/emulator-ui.js";

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

describe("modal key isolation (changelog must not leak keys into the machine)", () => {
  // A minimal stand-in for TRS80System: just enough surface for
  // startEmulatorLoop() and the matrix press/release path to run without
  // booting the real ROM. keyDown/keyUp are spied so the tests can assert
  // on whether a dispatched window keyboard event ever reached them.
  function fakeSystem() {
    return {
      memory: { videoDirty: false },
      keyboard: {
        keyDown: vi.fn(() => true),
        keyUp: vi.fn(() => true),
        reset: vi.fn(),
      },
    };
  }

  afterEach(() => {
    stopEmulatorLoop(); // cancels rAF/interval, removes the window listeners
    emulator.system = null;
    document.body.innerHTML = "";
  });

  it("does not forward keydown/keyup to the keyboard while the changelog modal is open", () => {
    document.body.innerHTML =
      '<div id="changelog-modal" style="display: block;"></div>';
    emulator.system = fakeSystem();
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
