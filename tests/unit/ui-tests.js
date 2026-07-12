/**
 * UI module tests (jsdom)
 *
 * The emulator UI and the legacy phase console are split into separate
 * modules; these tests cover the seams: file-picker promise settlement
 * (including canceled dialogs) and the legacy module's lazy-load surface.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { readPickedFile } from "@ui/emulator-ui.js";

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
