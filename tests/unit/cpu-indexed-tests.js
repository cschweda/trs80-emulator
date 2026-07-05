/**
 * Z80 (IX+d) / (IY+d) Indexed Addressing Tests
 *
 * The Model III ROM leans on indexed addressing throughout. These tests
 * verify the displacement byte is actually consumed and applied (signed),
 * that H/L-named indexed loads use the real H/L registers (not IXH/IXL),
 * and that execution continues correctly at the next instruction.
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

describe("Indexed loads", () => {
  let cpu, ram;

  beforeEach(() => {
    ({ cpu, ram } = makeCpuWithRam());
  });

  it("DD 7E d - LD A,(IX+2) reads from IX+2", () => {
    ram[0x0000] = 0xdd;
    ram[0x0001] = 0x7e;
    ram[0x0002] = 0x02;
    cpu.IX = 0x5000;
    ram[0x5002] = 0x99;

    const cycles = cpu.executeInstruction();

    expect(cpu.registers.A).toBe(0x99);
    expect(cpu.registers.PC).toBe(0x0003);
    expect(cycles).toBe(19);
  });

  it("DD 7E d - LD A,(IX-1) applies negative displacement", () => {
    ram[0x0000] = 0xdd;
    ram[0x0001] = 0x7e;
    ram[0x0002] = 0xff; // d = -1
    cpu.IX = 0x5000;
    ram[0x4fff] = 0x42;

    cpu.executeInstruction();

    expect(cpu.registers.A).toBe(0x42);
    expect(cpu.registers.PC).toBe(0x0003);
  });

  it("FD 70 d - LD (IY+5),B writes B to IY+5", () => {
    ram[0x0000] = 0xfd;
    ram[0x0001] = 0x70;
    ram[0x0002] = 0x05;
    cpu.IY = 0x6000;
    cpu.registers.B = 0x77;

    cpu.executeInstruction();

    expect(ram[0x6005]).toBe(0x77);
    expect(cpu.registers.PC).toBe(0x0003);
  });

  it("DD 77 d - LD (IX+0),A writes A", () => {
    ram[0x0000] = 0xdd;
    ram[0x0001] = 0x77;
    ram[0x0002] = 0x00;
    cpu.IX = 0x7000;
    cpu.registers.A = 0xab;

    cpu.executeInstruction();

    expect(ram[0x7000]).toBe(0xab);
  });

  it("DD 66 d - LD H,(IX+1) loads the real H register, not IXH", () => {
    ram[0x0000] = 0xdd;
    ram[0x0001] = 0x66;
    ram[0x0002] = 0x01;
    cpu.IX = 0x5000;
    ram[0x5001] = 0x3c;

    cpu.executeInstruction();

    expect(cpu.registers.H).toBe(0x3c);
    expect(cpu.registers.IXH).toBe(0x50); // IX untouched
  });

  it("DD 36 d n - LD (IX+3),n reads displacement then immediate", () => {
    ram[0x0000] = 0xdd;
    ram[0x0001] = 0x36;
    ram[0x0002] = 0x03; // d
    ram[0x0003] = 0x5e; // n
    cpu.IX = 0x5100;

    const cycles = cpu.executeInstruction();

    expect(ram[0x5103]).toBe(0x5e);
    expect(cpu.registers.PC).toBe(0x0004);
    expect(cycles).toBe(19);
  });
});

describe("Indexed arithmetic and INC/DEC", () => {
  let cpu, ram;

  beforeEach(() => {
    ({ cpu, ram } = makeCpuWithRam());
  });

  it("DD 86 d - ADD A,(IX+1) adds memory operand", () => {
    ram[0x0000] = 0xdd;
    ram[0x0001] = 0x86;
    ram[0x0002] = 0x01;
    cpu.IX = 0x5000;
    ram[0x5001] = 0x05;
    cpu.registers.A = 0x10;

    cpu.executeInstruction();

    expect(cpu.registers.A).toBe(0x15);
    expect(cpu.registers.PC).toBe(0x0003);
  });

  it("DD BE d - CP (IX+d) compares without changing A", () => {
    ram[0x0000] = 0xdd;
    ram[0x0001] = 0xbe;
    ram[0x0002] = 0x02;
    cpu.IX = 0x5000;
    ram[0x5002] = 0x20;
    cpu.registers.A = 0x20;

    cpu.executeInstruction();

    expect(cpu.registers.A).toBe(0x20);
    expect(cpu.flagZ).toBeTruthy();
  });

  it("FD 34 d - INC (IY-2) increments memory with flags", () => {
    ram[0x0000] = 0xfd;
    ram[0x0001] = 0x34;
    ram[0x0002] = 0xfe; // d = -2
    cpu.IY = 0x6002;
    ram[0x6000] = 0x7f;

    const cycles = cpu.executeInstruction();

    expect(ram[0x6000]).toBe(0x80);
    expect(cpu.flagPV).toBeTruthy(); // 0x7f -> 0x80 overflow
    expect(cpu.registers.PC).toBe(0x0003);
    expect(cycles).toBe(23);
  });

  it("DD 35 d - DEC (IX+0) decrements memory", () => {
    ram[0x0000] = 0xdd;
    ram[0x0001] = 0x35;
    ram[0x0002] = 0x00;
    cpu.IX = 0x5000;
    ram[0x5000] = 0x01;

    cpu.executeInstruction();

    expect(ram[0x5000]).toBe(0x00);
    expect(cpu.flagZ).toBeTruthy();
  });
});

describe("Instruction stream integrity after indexed ops", () => {
  it("executes the following opcode correctly (displacement fully consumed)", () => {
    const { cpu, ram } = makeCpuWithRam();
    // LD A,(IX+2); INC A
    ram[0x0000] = 0xdd;
    ram[0x0001] = 0x7e;
    ram[0x0002] = 0x02;
    ram[0x0003] = 0x3c; // INC A
    cpu.IX = 0x5000;
    ram[0x5002] = 0x10;

    cpu.executeInstruction();
    cpu.executeInstruction();

    expect(cpu.registers.A).toBe(0x11);
    expect(cpu.registers.PC).toBe(0x0004);
  });
});
