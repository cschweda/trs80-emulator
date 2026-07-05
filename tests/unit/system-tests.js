/**
 * TRS80System Integration Tests
 *
 * Exercises the full machine wiring with a tiny synthetic ROM: unmask the
 * RTC via port 0xE0, EI, HALT; the 30 Hz heartbeat must wake the CPU,
 * vector through 0x0038, increment a RAM counter, acknowledge via port
 * 0xEC, and resume. One emulated second therefore counts ~30 ticks.
 */

import { describe, it, expect } from "vitest";
import { TRS80System, CPU_CLOCK_HZ, RTC_HZ } from "@system/trs80-system.js";

function buildInterruptCounterRom() {
  const rom = new Uint8Array(0x3800);
  let a = 0;
  const emit = (...bytes) => {
    for (const b of bytes) rom[a++] = b;
  };

  // Main program at 0x0000
  emit(0x3e, 0x04); //       LD A,0x04     ; RTC bit
  emit(0xd3, 0xe0); //       OUT (0xE0),A  ; unmask RTC interrupts
  emit(0xfb); //             EI
  emit(0x76); //             HALT          ; wait for heartbeat
  emit(0x18, 0xfb); //       JR -5         ; back to EI, halt again

  // ISR at 0x0038 (IM 1 vector)
  a = 0x0038;
  emit(0xf5); //             PUSH AF
  emit(0x21, 0x00, 0x40); // LD HL,0x4000
  emit(0x34); //             INC (HL)      ; count the tick
  emit(0xdb, 0xec); //       IN A,(0xEC)   ; acknowledge the RTC interrupt
  emit(0xf1); //             POP AF
  emit(0xfb); //             EI
  emit(0xed, 0x4d); //       RETI

  return rom;
}

describe("TRS80System", () => {
  it("wires CPU fetches through the memory map", () => {
    const rom = new Uint8Array(0x3800);
    rom[0x0000] = 0x3e; // LD A,0x42
    rom[0x0001] = 0x42;
    rom[0x0002] = 0x76; // HALT

    const system = new TRS80System({ romData: rom });
    system.runTStates(50);

    expect(system.cpu.registers.A).toBe(0x42);
    expect(system.cpu.halted).toBe(true);
  });

  it("delivers ~30 RTC interrupts per emulated second", () => {
    const system = new TRS80System({
      romData: buildInterruptCounterRom(),
    });

    system.runSeconds(1);

    const ticks = system.memory.readByte(0x4000);
    expect(ticks).toBeGreaterThanOrEqual(29);
    expect(ticks).toBeLessThanOrEqual(31);
  });

  it("reset returns to a clean boot state with a blank screen", () => {
    const system = new TRS80System({
      romData: buildInterruptCounterRom(),
    });
    system.runSeconds(0.2);
    system.memory.writeByte(0x3c00, 0x41);

    system.reset();

    expect(system.cpu.registers.PC).toBe(0x0000);
    expect(system.cpu.halted).toBe(false);
    expect(system.memory.readByte(0x3c00)).toBe(0x20); // spaces
    expect(system.io.intLatch).toBe(0);
  });

  it("screenText renders 16 rows of 64 columns", () => {
    const system = new TRS80System({
      romData: new Uint8Array(0x3800),
    });
    system.reset();
    const text = "READY";
    for (let i = 0; i < text.length; i++) {
      system.memory.writeByte(0x3c00 + i, text.charCodeAt(i));
    }

    const screen = system.screenText();

    expect(screen).toHaveLength(16);
    expect(screen[0]).toHaveLength(64);
    expect(screen[0].startsWith("READY")).toBe(true);
  });

  it("exposes the machine constants the UI needs", () => {
    expect(CPU_CLOCK_HZ).toBe(2027520);
    expect(RTC_HZ).toBe(30);
  });

  it("runs a full emulated second in reasonable wall time", () => {
    const system = new TRS80System({
      romData: buildInterruptCounterRom(),
    });

    const start = performance.now();
    system.runSeconds(1);
    const elapsed = performance.now() - start;

    // 2M T-states must emulate well under real time or the browser
    // loop can never keep up. Generous bound for slow CI machines.
    expect(elapsed).toBeLessThan(2000);
  });
});

describe("TRS80System.typeText", () => {
  it("types a BASIC program into the real ROM and runs it", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const romData = new Uint8Array(
      fs.readFileSync(path.resolve(process.cwd(), "public/assets/model3.rom"))
    );
    const system = new TRS80System({ romData });
    system.cpu.strictMode = true;
    system.reset();

    // Boot to READY: answer Cass? and Memory Size? with separate ENTERs
    const pressEnter = () => {
      system.keyboard.keyDown("Enter", "boot-enter");
      system.runTStates(200000);
      system.keyboard.keyUp("boot-enter");
      system.runTStates(100000);
    };
    system.runSeconds(1);
    pressEnter();
    system.runSeconds(0.5);
    pressEnter();
    system.runSeconds(2);
    expect(system.screenText().join("\n")).toContain("READY");

    const skipped = system.typeText('10 PRINT "T-OK"\nRUN\n');
    system.runSeconds(0.3);

    expect(skipped).toBe(0);
    expect(system.screenText().join("\n")).toContain("T-OK");
  });
});
