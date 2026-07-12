/**
 * 32-Column Mode Acceptance Tests
 *
 * The real ROM is the ground truth here (verified by probing it):
 * PRINT CHR$(23) makes the ROM raise bit 2 of the port 0xEC mode
 * register (0x28 -> 0x2C at boot defaults) and re-lay the screen with
 * characters at EVEN video addresses; the hardware then displays those
 * even-address bytes double-wide, 32 per row. CLS drops back to
 * 64-column mode (bit 2 clear).
 */

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, beforeEach } from "vitest";
import { TRS80System, CPU_CLOCK_HZ } from "@system/trs80-system.js";
import { MODE_32COL_BIT } from "@core/io.js";

const ROM_PATH = path.resolve(process.cwd(), "public/assets/model3.rom");
const romData = new Uint8Array(fs.readFileSync(ROM_PATH));

function runUntilScreen(system, text, maxSeconds = 3) {
  const sliceTStates = Math.round(CPU_CLOCK_HZ / 20);
  const slices = Math.ceil((maxSeconds * CPU_CLOCK_HZ) / sliceTStates);
  for (let i = 0; i < slices; i++) {
    if (system.screenText().join("\n").includes(text)) return true;
    system.runTStates(sliceTStates);
  }
  return system.screenText().join("\n").includes(text);
}

function typeKey(system, key, code = key) {
  system.keyboard.keyDown(key, code);
  system.runTStates(Math.round(CPU_CLOCK_HZ * 0.1));
  system.keyboard.keyUp(code);
  system.runTStates(Math.round(CPU_CLOCK_HZ * 0.05));
}

function bootToReady(system) {
  expect(runUntilScreen(system, "Cass?")).toBe(true);
  typeKey(system, "Enter");
  expect(runUntilScreen(system, "Memory Size")).toBe(true);
  typeKey(system, "Enter");
  expect(runUntilScreen(system, "READY", 5)).toBe(true);
}

describe("32-column mode (real ROM)", () => {
  let system;

  beforeEach(() => {
    system = new TRS80System({ romData });
    system.cpu.strictMode = true;
    system.reset();
    bootToReady(system);
  });

  it("PRINT CHR$(23) sets the mode bit and the system reports 32 columns", () => {
    expect(system.columns32).toBe(false);

    system.typeText("PRINT CHR$(23)\n");
    system.runSeconds(0.3);

    expect(system.io.modeRegister & MODE_32COL_BIT).toBe(MODE_32COL_BIT);
    expect(system.columns32).toBe(true);
  });

  it("mode changes mark the display dirty so the renderer repaints", () => {
    system.memory.videoDirty = false;
    system.typeText("PRINT CHR$(23)\n");
    system.runSeconds(0.3);
    expect(system.memory.videoDirty).toBe(true);
  });

  it("the ROM lays 32-column text at even video addresses", () => {
    system.typeText("PRINT CHR$(23)\n");
    system.runSeconds(0.3);

    // Find READY spread as R _ E _ A _ D _ Y in raw video RAM
    const vram = system.memory.videoRam;
    let spread = false;
    for (let row = 0; row < 16; row++) {
      const base = row * 64;
      for (let col = 0; col + 8 < 64; col++) {
        if (
          vram[base + col] === 0x52 && // R
          vram[base + col + 2] === 0x45 && // E
          vram[base + col + 4] === 0x41 && // A
          vram[base + col + 6] === 0x44 && // D
          vram[base + col + 8] === 0x59 // Y
        ) {
          spread = true;
        }
      }
    }
    expect(spread).toBe(true);
  });

  it("CLS returns to 64-column mode", () => {
    system.typeText("PRINT CHR$(23)\n");
    system.runSeconds(0.3);
    expect(system.columns32).toBe(true);

    system.typeText("CLS\n");
    system.runSeconds(0.3);
    expect(system.columns32).toBe(false);
  });
});
