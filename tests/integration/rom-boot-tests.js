/**
 * ROM Boot Acceptance Tests
 *
 * Boots the REAL 14K Model III ROM through the emulated machine, exactly
 * like pressing the orange reset button on a non-disk Model III:
 *
 *   Cass?           (ENTER selects 1500 baud)
 *   Memory Size?    (ENTER gives BASIC all 48K)
 *   Radio Shack Model III Basic
 *   READY
 *   >
 *
 * These tests are the definition of "the emulator works": if they pass,
 * the machine runs genuine Microsoft Level II BASIC out of ROM.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, beforeEach } from "vitest";
import { TRS80System, CPU_CLOCK_HZ } from "@system/trs80-system.js";

// vitest runs with the repo root as cwd; jsdom's import.meta.url is not
// a file: URL, so resolve from cwd instead.
const ROM_PATH = path.resolve(process.cwd(), "public/assets/model3.rom");
const romData = new Uint8Array(fs.readFileSync(ROM_PATH));

function screenString(system) {
  return system.screenText().join("\n");
}

function screenContains(system, text) {
  return screenString(system).toLowerCase().includes(text.toLowerCase());
}

/**
 * Run until `text` appears on screen or `maxSeconds` of emulated time
 * pass. Returns true when found. Checks every 50 emulated ms so we don't
 * overshoot prompts.
 */
function runUntilScreen(system, text, maxSeconds = 3) {
  const sliceTStates = Math.round(CPU_CLOCK_HZ / 20);
  const slices = Math.ceil((maxSeconds * CPU_CLOCK_HZ) / sliceTStates);
  for (let i = 0; i < slices; i++) {
    if (screenContains(system, text)) {
      return true;
    }
    system.runTStates(sliceTStates);
  }
  return screenContains(system, text);
}

/**
 * Hold a key long enough for the ROM's scan-and-debounce to register it
 * (a few 30 Hz heartbeats), then release and let the ROM settle.
 */
function typeKey(system, key, code = key) {
  system.keyboard.keyDown(key, code);
  system.runTStates(Math.round(CPU_CLOCK_HZ * 0.1));
  system.keyboard.keyUp(code);
  system.runTStates(Math.round(CPU_CLOCK_HZ * 0.05));
}

function typeText(system, text) {
  for (const ch of text) {
    typeKey(system, ch, `char:${ch}`);
  }
}

function bootToReady(system) {
  expect(runUntilScreen(system, "Cass?")).toBe(true);
  typeKey(system, "Enter");
  expect(runUntilScreen(system, "Memory Size")).toBe(true);
  typeKey(system, "Enter");
  expect(runUntilScreen(system, "READY", 5)).toBe(true);
}

describe("Model III ROM boot (non-disk machine)", () => {
  let system;

  beforeEach(() => {
    system = new TRS80System({ romData });
    system.cpu.strictMode = true; // any missing opcode must fail loudly
    system.reset();
  });

  it("reaches the Cass? prompt from a cold start", () => {
    const found = runUntilScreen(system, "Cass?");

    if (!found) {
      // Surface the actual screen to make boot-stall diagnosis instant
      console.log("Screen at timeout:\n" + screenString(system));
      console.log(
        "PC=0x" + system.cpu.registers.PC.toString(16).padStart(4, "0")
      );
    }
    expect(found).toBe(true);
  });

  it("answers the prompts and lands at READY with the BASIC banner", () => {
    bootToReady(system);

    expect(screenContains(system, "Model III Basic")).toBe(true);
  });

  it("executes an immediate PRINT statement", () => {
    bootToReady(system);

    typeText(system, "PRINT 2+2");
    typeKey(system, "Enter");
    system.runSeconds(0.5);

    // Every keystroke must have registered (the ROM echoes the input)...
    expect(screenContains(system, "PRINT 2+2")).toBe(true);
    // ...and BASIC printed the result on its own line (Level II shows
    // non-negative numbers with a leading space).
    const resultLine = system
      .screenText()
      .find((line) => line.trim() === "4");
    expect(resultLine).toBeDefined();
  });
});
