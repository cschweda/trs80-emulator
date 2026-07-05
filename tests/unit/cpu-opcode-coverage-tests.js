/**
 * Z80 Base Opcode Coverage & Missing-Instruction Tests
 *
 * The CPU's silent-NOP fallback for unimplemented opcodes means a missing
 * handler shows up as wrong program behavior, not an error. These tests
 * pin down the two known-missing instructions (LD (HL),A and RET NZ) and
 * assert full base-table coverage so no opcode can silently regress again.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Z80CPU } from "@core/z80cpu.js";

function makeCpuWithRam() {
  const cpu = new Z80CPU();
  const ram = new Uint8Array(0x10000);
  cpu.readMemory = (addr) => ram[addr & 0xffff];
  cpu.writeMemory = (addr, value) => {
    ram[addr & 0xffff] = value & 0xff;
  };
  return { cpu, ram };
}

describe("Missing base opcodes", () => {
  let cpu, ram;

  beforeEach(() => {
    ({ cpu, ram } = makeCpuWithRam());
  });

  it("0x77 - LD (HL), A stores accumulator at address HL", () => {
    ram[0x0000] = 0x77;
    cpu.registers.A = 0x5a;
    cpu.HL = 0x4200;

    const cycles = cpu.executeInstruction();

    expect(ram[0x4200]).toBe(0x5a);
    expect(cpu.registers.PC).toBe(0x0001);
    expect(cycles).toBe(7);
  });

  it("0xC0 - RET NZ returns when Z flag is clear", () => {
    ram[0x0100] = 0xc0;
    // Return address 0x1234 on the stack (little-endian)
    ram[0x8000] = 0x34;
    ram[0x8001] = 0x12;
    cpu.registers.PC = 0x0100;
    cpu.registers.SP = 0x8000;
    cpu.flagZ = 0;

    const cycles = cpu.executeInstruction();

    expect(cpu.registers.PC).toBe(0x1234);
    expect(cpu.registers.SP).toBe(0x8002);
    expect(cycles).toBe(11);
  });

  it("0xC0 - RET NZ falls through when Z flag is set", () => {
    ram[0x0100] = 0xc0;
    cpu.registers.PC = 0x0100;
    cpu.registers.SP = 0x8000;
    cpu.flagZ = 1;

    const cycles = cpu.executeInstruction();

    expect(cpu.registers.PC).toBe(0x0101);
    expect(cpu.registers.SP).toBe(0x8000);
    expect(cycles).toBe(5);
  });
});

describe("Base opcode table coverage", () => {
  it("defines a handler for every documented base opcode", () => {
    const cpu = new Z80CPU();
    // Prefix bytes are dispatched before the handler table is consulted.
    const prefixes = new Set([0xcb, 0xdd, 0xed, 0xfd]);
    const missing = [];

    for (let op = 0x00; op <= 0xff; op++) {
      if (prefixes.has(op)) continue;
      if (typeof cpu.opcodeHandlers[op] !== "function") {
        missing.push("0x" + op.toString(16).padStart(2, "0"));
      }
    }

    expect(missing).toEqual([]);
  });
});
