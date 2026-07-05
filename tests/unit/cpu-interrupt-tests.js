/**
 * Z80 Interrupt Delivery Tests
 *
 * The Model III drives everything time-based (clock, cursor blink) off a
 * 30 Hz maskable interrupt taken in IM 1 (RST 38). These tests verify
 * acceptance rules (IFF1), the EI one-instruction delay, HALT wake-up,
 * NMI behavior, and IM 2 vectoring.
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

describe("Maskable interrupt (IM 1)", () => {
  let cpu, ram;

  beforeEach(() => {
    ({ cpu, ram } = makeCpuWithRam());
    cpu.interruptMode = 1;
  });

  it("pushes PC and jumps to 0x0038 when IFF1 is set", () => {
    cpu.registers.PC = 0x1234;
    cpu.registers.SP = 0x8000;
    cpu.IFF1 = true;
    cpu.IFF2 = true;

    const accepted = cpu.interrupt();

    expect(accepted).toBe(true);
    expect(cpu.registers.PC).toBe(0x0038);
    expect(ram[0x7ffe]).toBe(0x34); // pushed PC low
    expect(ram[0x7fff]).toBe(0x12); // pushed PC high
    expect(cpu.registers.SP).toBe(0x7ffe);
    expect(cpu.IFF1).toBe(false);
    expect(cpu.IFF2).toBe(false);
  });

  it("is refused when IFF1 is clear", () => {
    cpu.registers.PC = 0x1234;
    cpu.IFF1 = false;

    const accepted = cpu.interrupt();

    expect(accepted).toBe(false);
    expect(cpu.registers.PC).toBe(0x1234);
  });

  it("EI enables interrupts only after the following instruction", () => {
    // 0x0000: EI; 0x0001: NOP
    ram[0x0000] = 0xfb;
    ram[0x0001] = 0x00;
    cpu.IFF1 = false;

    cpu.executeInstruction(); // EI
    expect(cpu.interrupt()).toBe(false); // still masked right after EI

    cpu.executeInstruction(); // NOP
    expect(cpu.interrupt()).toBe(true); // now accepted
  });

  it("DI cancels a pending EI", () => {
    ram[0x0000] = 0xfb; // EI
    ram[0x0001] = 0xf3; // DI
    ram[0x0002] = 0x00; // NOP

    cpu.executeInstruction();
    cpu.executeInstruction();
    cpu.executeInstruction();

    expect(cpu.IFF1).toBe(false);
    expect(cpu.interrupt()).toBe(false);
  });

  it("wakes the CPU from HALT", () => {
    // 0x0000: EI; 0x0001: HALT
    ram[0x0000] = 0xfb;
    ram[0x0001] = 0x76;

    cpu.executeInstruction(); // EI
    cpu.executeInstruction(); // HALT
    expect(cpu.halted).toBe(true);

    const accepted = cpu.interrupt();

    expect(accepted).toBe(true);
    expect(cpu.halted).toBe(false);
    expect(cpu.registers.PC).toBe(0x0038);
  });
});

describe("IM 2 vectoring", () => {
  it("fetches the handler address from (I<<8 | vector)", () => {
    const { cpu, ram } = makeCpuWithRam();
    cpu.interruptMode = 2;
    cpu.registers.I = 0x40;
    cpu.IFF1 = true;
    // Vector table entry at 0x40FE -> handler 0x5678
    ram[0x40fe] = 0x78;
    ram[0x40ff] = 0x56;
    cpu.registers.PC = 0x1000;
    cpu.registers.SP = 0x8000;

    cpu.interrupt(0xfe);

    expect(cpu.registers.PC).toBe(0x5678);
  });
});

describe("NMI", () => {
  it("is taken regardless of IFF1, jumps to 0x0066, preserves IFF2", () => {
    const { cpu, ram } = makeCpuWithRam();
    cpu.registers.PC = 0x2000;
    cpu.registers.SP = 0x8000;
    cpu.IFF1 = true;
    cpu.IFF2 = true;

    cpu.nmi();

    expect(cpu.registers.PC).toBe(0x0066);
    expect(cpu.IFF1).toBe(false);
    expect(cpu.IFF2).toBe(true); // remembered for RETN
    expect(ram[0x7ffe]).toBe(0x00);
    expect(ram[0x7fff]).toBe(0x20);
  });
});

describe("Strict mode", () => {
  it("throws on unimplemented opcodes instead of silently NOPing", () => {
    const { cpu, ram } = makeCpuWithRam();
    cpu.strictMode = true;
    // 0xED 0xFF is not a documented ED opcode
    ram[0x0000] = 0xed;
    ram[0x0001] = 0xff;

    expect(() => cpu.executeInstruction()).toThrow(/[Uu]nimplemented/);
  });
});
