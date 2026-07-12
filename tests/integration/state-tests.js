/**
 * Save-state acceptance tests
 *
 * A state serialized from a running machine (through an actual JSON
 * round-trip, exactly like the file/localStorage paths) must restore
 * into a fresh system as the same machine: same screen, same registers,
 * same BASIC program in RAM, same mounted disks - and it must keep
 * running afterwards.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { TRS80System, CPU_CLOCK_HZ } from "@system/trs80-system.js";
import { serializeState, restoreState } from "@system/state.js";
import { DiskImage } from "@peripherals/disk-image.js";
import { buildJV1 } from "../unit/disk-image-tests.js";

const ROM_PATH = path.resolve(process.cwd(), "public/assets/model3.rom");
const romData = new Uint8Array(fs.readFileSync(ROM_PATH));

function runUntilScreen(system, text, maxSeconds = 5) {
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

function jsonRoundTrip(state) {
  return JSON.parse(JSON.stringify(state));
}

describe("Save states", () => {
  it("restores screen, registers, and a typed BASIC program", () => {
    const a = new TRS80System({ romData });
    a.cpu.strictMode = true;
    a.reset();
    bootToReady(a);
    a.typeText('10 PRINT "SAVED STATE"\n');
    a.typeText("20 GOTO 10\n");

    const state = jsonRoundTrip(serializeState(a));

    const b = new TRS80System({ romData });
    b.cpu.strictMode = true;
    restoreState(b, state);

    expect(b.screenText()).toEqual(a.screenText());
    for (const reg of ["A", "F", "B", "C", "D", "E", "H", "L", "SP", "PC", "I", "R"]) {
      expect(b.cpu.registers[reg], `register ${reg}`).toBe(a.cpu.registers[reg]);
    }
    expect(b.cpu.cycles).toBe(a.cpu.cycles);

    // The restored machine must actually RUN: LIST the program
    b.typeText("LIST\n");
    b.runSeconds(0.5);
    const screen = b.screenText().join("\n");
    expect(screen).toContain('10 PRINT "SAVED STATE"');
    expect(screen).toContain("20 GOTO 10");
  });

  it("keeps executing a running program across the round-trip", () => {
    const a = new TRS80System({ romData });
    a.cpu.strictMode = true;
    a.reset();
    bootToReady(a);
    // CLS wipes the echoed source line so "DONE" can only come from
    // PRINT. Level II runs ~2.1ms per empty FOR/NEXT pass, so 1000
    // iterations is ~2.1 emulated seconds - comfortably straddling the
    // 0.2s snapshot point below.
    a.typeText('10 CLS:FOR I=1 TO 1000:NEXT:PRINT "DONE"\nRUN\n');
    a.runSeconds(0.2); // mid-loop, nowhere near DONE
    expect(a.screenText().join("\n")).not.toContain("DONE");

    const b = new TRS80System({ romData });
    b.cpu.strictMode = true;
    restoreState(b, jsonRoundTrip(serializeState(a)));

    expect(runUntilScreen(b, "DONE", 10)).toBe(true);
  });

  it("restores mounted disks including in-memory writes", () => {
    const a = new TRS80System({ romData });
    const image = new DiskImage(buildJV1({ tracks: 35, spt: 10 }), "test.dsk");
    a.mountDisk(0, image);
    // A session-local write that only lives in the in-memory image
    image.writeSector(3, 0, 4, new Uint8Array(256).fill(0xab));

    const b = new TRS80System({ romData });
    restoreState(b, jsonRoundTrip(serializeState(a)));

    const restored = b.io.fdc.drives[0];
    expect(restored).not.toBeNull();
    expect(restored.name).toBe("test.dsk");
    expect(restored.format).toBe("jv1");
    const sector = restored.readSector(3, 0, 4);
    expect(sector.every((byte) => byte === 0xab)).toBe(true);
  });

  it("rejects states from another machine or version", () => {
    const system = new TRS80System({ romData });
    expect(() => restoreState(system, { machine: "c64" })).toThrow(
      /Not a TRS-80/
    );
    expect(() =>
      restoreState(system, { machine: "trs80-model3", version: 99 })
    ).toThrow(/version/);
  });
});
