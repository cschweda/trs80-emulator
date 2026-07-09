/**
 * Z80 ADD/ADC Half-Carry and DAA Correctness Tests
 *
 * H (half-carry) is a carry from bit 3 to bit 4 of the nibble sum —
 * it is NOT bit 4 of the result. DAA applies the canonical BCD
 * correction table driven by N, H, C and the nibble values.
 * Level II BASIC's number handling executes DAA, so these matter
 * for real ROM behavior.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Z80CPU } from "@core/z80cpu.js";

describe("ADD/ADC half-carry", () => {
  let cpu;

  beforeEach(() => {
    cpu = new Z80CPU();
  });

  it("0x02 + 0x10 leaves H clear (no nibble carry, result bit 4 set)", () => {
    cpu.registers.A = 0x02;
    cpu.addA(0x10);
    expect(cpu.registers.A).toBe(0x12);
    expect(cpu.flagH).toBe(0);
  });

  it("0x55 + 0xAA leaves H clear (0x5 + 0xA = 0xF, no carry out of bit 3)", () => {
    cpu.registers.A = 0x55;
    cpu.addA(0xaa);
    expect(cpu.registers.A).toBe(0xff);
    expect(cpu.flagH).toBe(0);
  });

  it("0x0F + 0x01 sets H (nibble carry)", () => {
    cpu.registers.A = 0x0f;
    cpu.addA(0x01);
    expect(cpu.registers.A).toBe(0x10);
    expect(cpu.flagH).toBe(1);
  });

  it("ADC counts the carry-in toward the nibble sum", () => {
    cpu.registers.A = 0x08;
    cpu.flagC = 1;
    cpu.adcA(0x07); // 8 + 7 + 1 = 16 -> nibble carry
    expect(cpu.registers.A).toBe(0x10);
    expect(cpu.flagH).toBe(1);
  });
});

describe("DAA", () => {
  let cpu;

  beforeEach(() => {
    cpu = new Z80CPU();
  });

  function daa() {
    cpu.opcodeHandlers[0x27].call(cpu);
  }

  it("adjusts 0x15 + 0x27 = 0x3C to BCD 42", () => {
    cpu.registers.A = 0x15;
    cpu.addA(0x27); // 0x3C, H=0, C=0
    daa();
    expect(cpu.registers.A).toBe(0x42);
    expect(cpu.flagC).toBe(0);
  });

  it("adjusts 0x99 + 0x01 to 0x00 with carry (BCD 99+1=100)", () => {
    cpu.registers.A = 0x99;
    cpu.addA(0x01); // 0x9A
    daa();
    expect(cpu.registers.A).toBe(0x00);
    expect(cpu.flagC).toBe(1);
    expect(cpu.flagZ).toBe(1);
  });

  it("adjusts after subtraction: 0x20 - 0x03 to BCD 17", () => {
    cpu.registers.A = 0x20;
    cpu.subA(0x03); // 0x1D, N=1, H=1
    daa();
    expect(cpu.registers.A).toBe(0x17);
  });

  it("adjusts 0x09 + 0x08 = 0x11 to BCD 17 (H path)", () => {
    cpu.registers.A = 0x09;
    cpu.addA(0x08); // 0x11 with H=1
    daa();
    expect(cpu.registers.A).toBe(0x17);
    expect(cpu.flagC).toBe(0);
  });

  it("adjusts 0x80 + 0x90 to BCD 70 with carry (170)", () => {
    cpu.registers.A = 0x80;
    cpu.addA(0x90); // 0x10 with C=1
    daa();
    expect(cpu.registers.A).toBe(0x70);
    expect(cpu.flagC).toBe(1);
  });
});

describe("CCF", () => {
  let cpu;

  beforeEach(() => {
    cpu = new Z80CPU();
  });

  function ccf() {
    cpu.opcodeHandlers[0x3f].call(cpu);
  }

  it("copies the PREVIOUS carry into H when clearing C", () => {
    cpu.flagC = 1;
    ccf();
    expect(cpu.flagC).toBe(0);
    expect(cpu.flagH).toBe(1); // H = old C, not the new one
    expect(cpu.flagN).toBe(0);
  });

  it("leaves H clear when setting C from a clear carry", () => {
    cpu.flagC = 0;
    cpu.flagH = 1; // must be overwritten by old C = 0
    ccf();
    expect(cpu.flagC).toBe(1);
    expect(cpu.flagH).toBe(0);
  });
});
