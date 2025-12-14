/**
 * Z80 CPU Core Unit Tests - Phase 1
 *
 * This test suite verifies that the Z80 CPU correctly assembles and executes opcodes.
 * Tests are organized by complexity level, with clear documentation of:
 * - The opcode being tested (hex format)
 * - The instruction mnemonic
 * - Expected results
 *
 * Total: 50 tests covering fundamental Z80 operations
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Z80CPU } from "@core/z80cpu.js";

// ============================================================================
// LEVEL 1: BASIC CPU INITIALIZATION (2 tests)
// ============================================================================

describe("LEVEL 1: CPU Initialization", () => {
  let cpu;

  beforeEach(() => {
    cpu = new Z80CPU();
  });

  it("1.1 - CPU initializes with default values", () => {
    // Verify CPU starts in correct state
    expect(cpu.registers.PC).toBe(0x0000); // Program counter at 0
    expect(cpu.registers.SP).toBe(0xffff); // Stack pointer at top of memory
    expect(cpu.halted).toBe(false);
  });

  it("1.2 - CPU reset restores initial state", () => {
    // Modify CPU state
    cpu.registers.PC = 0x1234;
    cpu.registers.SP = 0x5678;
    cpu.halted = true;

    // Reset should restore defaults
    cpu.reset();
    expect(cpu.registers.PC).toBe(0x0000);
    expect(cpu.registers.SP).toBe(0xffff);
    expect(cpu.halted).toBe(false);
  });
});

// ============================================================================
// LEVEL 2: SIMPLE 8-BIT LOAD INSTRUCTIONS (5 tests)
// ============================================================================

describe("LEVEL 2: Simple 8-bit Load Instructions", () => {
  let cpu;
  let memory;

  beforeEach(() => {
    cpu = new Z80CPU();
    memory = new Uint8Array(65536);
    cpu.readMemory = (address) => memory[address];
    cpu.writeMemory = (address, value) => {
      memory[address] = value & 0xff;
    };
  });

  it("2.1 - LD A, n (0x3E) - Load immediate value into accumulator", () => {
    // Assembly: LD A, 0x42
    // Opcode: 0x3E 0x42
    memory[0x0000] = 0x3e; // LD A, n
    memory[0x0001] = 0x42; // Immediate value

    cpu.executeInstruction();

    expect(cpu.registers.A).toBe(0x42);
    expect(cpu.registers.PC).toBe(0x0002); // PC advanced by 2 bytes
  });

  it("2.2 - LD B, n (0x06) - Load immediate into B register", () => {
    // Assembly: LD B, 0x55
    // Opcode: 0x06 0x55
    memory[0x0000] = 0x06; // LD B, n
    memory[0x0001] = 0x55;

    cpu.executeInstruction();

    expect(cpu.registers.B).toBe(0x55);
  });

  it("2.3 - LD C, n (0x0E) - Load immediate into C register", () => {
    // Assembly: LD C, 0xAA
    // Opcode: 0x0E 0xAA
    memory[0x0000] = 0x0e; // LD C, n
    memory[0x0001] = 0xaa;

    cpu.executeInstruction();

    expect(cpu.registers.C).toBe(0xaa);
  });

  it("2.4 - LD A, B (0x78) - Copy register to accumulator", () => {
    // Assembly: LD A, B
    // Opcode: 0x78
    cpu.registers.B = 0x33;
    memory[0x0000] = 0x78; // LD A, B

    cpu.executeInstruction();

    expect(cpu.registers.A).toBe(0x33);
  });

  it("2.5 - LD B, A (0x47) - Copy accumulator to register", () => {
    // Assembly: LD B, A
    // Opcode: 0x47
    cpu.registers.A = 0x99;
    memory[0x0000] = 0x47; // LD B, A

    cpu.executeInstruction();

    expect(cpu.registers.B).toBe(0x99);
  });
});

// ============================================================================
// LEVEL 3: 16-BIT LOAD INSTRUCTIONS (4 tests)
// ============================================================================

describe("LEVEL 3: 16-bit Load Instructions", () => {
  let cpu;
  let memory;

  beforeEach(() => {
    cpu = new Z80CPU();
    memory = new Uint8Array(65536);
    cpu.readMemory = (address) => memory[address];
    cpu.writeMemory = (address, value) => {
      memory[address] = value & 0xff;
    };
  });

  it("3.1 - LD HL, nn (0x21) - Load 16-bit immediate into HL", () => {
    // Assembly: LD HL, 0x1234
    // Opcode: 0x21 0x34 0x12
    memory[0x0000] = 0x21; // LD HL, nn
    memory[0x0001] = 0x34; // Low byte
    memory[0x0002] = 0x12; // High byte

    cpu.executeInstruction();

    expect(cpu.HL).toBe(0x1234);
    expect(cpu.registers.PC).toBe(0x0003);
  });

  it("3.2 - LD BC, nn (0x01) - Load 16-bit immediate into BC", () => {
    // Assembly: LD BC, 0x5678
    // Opcode: 0x01 0x78 0x56
    memory[0x0000] = 0x01; // LD BC, nn
    memory[0x0001] = 0x78; // Low byte
    memory[0x0002] = 0x56; // High byte

    cpu.executeInstruction();

    expect(cpu.BC).toBe(0x5678);
  });

  it("3.3 - LD DE, nn (0x11) - Load 16-bit immediate into DE", () => {
    // Assembly: LD DE, 0x9ABC
    // Opcode: 0x11 0xBC 0x9A
    memory[0x0000] = 0x11; // LD DE, nn
    memory[0x0001] = 0xbc; // Low byte
    memory[0x0002] = 0x9a; // High byte

    cpu.executeInstruction();

    expect(cpu.DE).toBe(0x9abc);
  });

  it("3.4 - LD SP, nn (0x31) - Load 16-bit immediate into stack pointer", () => {
    // Assembly: LD SP, 0x4000
    // Opcode: 0x31 0x00 0x40
    memory[0x0000] = 0x31; // LD SP, nn
    memory[0x0001] = 0x00; // Low byte
    memory[0x0002] = 0x40; // High byte

    cpu.executeInstruction();

    expect(cpu.registers.SP).toBe(0x4000);
  });
});

// ============================================================================
// LEVEL 4: MEMORY ACCESS INSTRUCTIONS (4 tests)
// ============================================================================

describe("LEVEL 4: Memory Access Instructions", () => {
  let cpu;
  let memory;

  beforeEach(() => {
    cpu = new Z80CPU();
    memory = new Uint8Array(65536);
    cpu.readMemory = (address) => memory[address];
    cpu.writeMemory = (address, value) => {
      memory[address] = value & 0xff;
    };
  });

  it("4.1 - LD (HL), n (0x36) - Store immediate value to memory via HL", () => {
    // Assembly: LD (HL), 0xAA
    // Opcode: 0x36 0xAA
    cpu.HL = 0x5000;
    memory[0x0000] = 0x36; // LD (HL), n
    memory[0x0001] = 0xaa;

    cpu.executeInstruction();

    expect(memory[0x5000]).toBe(0xaa);
  });

  it("4.2 - LD A, (HL) (0x7E) - Load from memory via HL into accumulator", () => {
    // Assembly: LD A, (HL)
    // Opcode: 0x7E
    cpu.HL = 0x5000;
    memory[0x5000] = 0x42;
    memory[0x0000] = 0x7e; // LD A, (HL)

    cpu.executeInstruction();

    expect(cpu.registers.A).toBe(0x42);
  });

  it("4.3 - LD (HL), B (0x70) - Store register to memory via HL", () => {
    // Assembly: LD (HL), B
    // Opcode: 0x70
    cpu.HL = 0x5000;
    cpu.registers.B = 0x99;
    memory[0x0000] = 0x70; // LD (HL), B

    cpu.executeInstruction();

    expect(memory[0x5000]).toBe(0x99);
  });

  it("4.4 - LD A, (nn) (0x3A) - Load from absolute address into accumulator", () => {
    // Assembly: LD A, (0x5000)
    // Opcode: 0x3A 0x00 0x50
    memory[0x5000] = 0x77;
    memory[0x0000] = 0x3a; // LD A, (nn)
    memory[0x0001] = 0x00; // Low byte of address
    memory[0x0002] = 0x50; // High byte of address

    cpu.executeInstruction();

    expect(cpu.registers.A).toBe(0x77);
  });
});

// ============================================================================
// LEVEL 5: ARITHMETIC OPERATIONS (6 tests)
// ============================================================================

describe("LEVEL 5: Arithmetic Operations", () => {
  let cpu;
  let memory;

  beforeEach(() => {
    cpu = new Z80CPU();
    memory = new Uint8Array(65536);
    cpu.readMemory = (address) => memory[address];
    cpu.writeMemory = (address, value) => {
      memory[address] = value & 0xff;
    };
  });

  it("5.1 - ADD A, r (0x80-0x87) - Add register to accumulator", () => {
    // Assembly: ADD A, B
    // Opcode: 0x80
    // Result: 0x05 + 0x03 = 0x08
    cpu.registers.A = 0x05;
    cpu.registers.B = 0x03;
    memory[0x0000] = 0x80; // ADD A, B

    cpu.executeInstruction();

    expect(cpu.registers.A).toBe(0x08);
    expect(cpu.flagC).toBe(0); // No carry
    expect(cpu.flagZ).toBe(0); // Not zero
  });

  it("5.2 - ADD A, n (0xC6) - Add immediate to accumulator with carry", () => {
    // Assembly: ADD A, 0x01
    // Opcode: 0xC6 0x01
    // Result: 0xFF + 0x01 = 0x00 (with carry)
    cpu.registers.A = 0xff;
    memory[0x0000] = 0xc6; // ADD A, n
    memory[0x0001] = 0x01;

    cpu.executeInstruction();

    expect(cpu.registers.A).toBe(0x00);
    expect(cpu.flagC).toBe(1); // Carry set
    expect(cpu.flagZ).toBe(1); // Zero set
  });

  it("5.3 - SUB A, r (0x90-0x97) - Subtract register from accumulator", () => {
    // Assembly: SUB A, B
    // Opcode: 0x90
    // Result: 0x08 - 0x03 = 0x05
    cpu.registers.A = 0x08;
    cpu.registers.B = 0x03;
    memory[0x0000] = 0x90; // SUB A, B

    cpu.executeInstruction();

    expect(cpu.registers.A).toBe(0x05);
    expect(cpu.flagC).toBe(0); // No borrow
    expect(cpu.flagN).toBe(1); // Subtraction flag
  });

  it("5.4 - INC r (0x04-0x3C) - Increment register", () => {
    // Assembly: INC A
    // Opcode: 0x3C
    // Result: 0x41 + 1 = 0x42
    cpu.registers.A = 0x41;
    memory[0x0000] = 0x3c; // INC A

    cpu.executeInstruction();

    expect(cpu.registers.A).toBe(0x42);
    expect(cpu.flagZ).toBe(0);
  });

  it("5.5 - DEC r (0x05-0x3D) - Decrement register with wrap", () => {
    // Assembly: DEC A
    // Opcode: 0x3D
    // Result: 0x00 - 1 = 0xFF (wraps)
    cpu.registers.A = 0x00;
    memory[0x0000] = 0x3d; // DEC A

    cpu.executeInstruction();

    expect(cpu.registers.A).toBe(0xff);
    expect(cpu.flagZ).toBe(0);
    expect(cpu.flagN).toBe(1);
  });

  it("5.6 - ADD HL, BC (0x09) - 16-bit addition", () => {
    // Assembly: ADD HL, BC
    // Opcode: 0x09
    // Result: 0x1000 + 0x0234 = 0x1234
    cpu.HL = 0x1000;
    cpu.BC = 0x0234;
    memory[0x0000] = 0x09; // ADD HL, BC

    cpu.executeInstruction();

    expect(cpu.HL).toBe(0x1234);
  });
});

// ============================================================================
// LEVEL 6: LOGICAL OPERATIONS (4 tests)
// ============================================================================

describe("LEVEL 6: Logical Operations", () => {
  let cpu;
  let memory;

  beforeEach(() => {
    cpu = new Z80CPU();
    memory = new Uint8Array(65536);
    cpu.readMemory = (address) => memory[address];
    cpu.writeMemory = (address, value) => {
      memory[address] = value & 0xff;
    };
  });

  it("6.1 - AND r (0xA0-0xA7) - Logical AND with register", () => {
    // Assembly: AND B
    // Opcode: 0xA0
    // Result: 0xFF AND 0x0F = 0x0F
    cpu.registers.A = 0xff;
    cpu.registers.B = 0x0f;
    memory[0x0000] = 0xa0; // AND B

    cpu.executeInstruction();

    expect(cpu.registers.A).toBe(0x0f);
    expect(cpu.flagH).toBe(1); // Half-carry set for AND
  });

  it("6.2 - OR r (0xB0-0xB7) - Logical OR with register", () => {
    // Assembly: OR B
    // Opcode: 0xB0
    // Result: 0x0F OR 0xF0 = 0xFF
    cpu.registers.A = 0x0f;
    cpu.registers.B = 0xf0;
    memory[0x0000] = 0xb0; // OR B

    cpu.executeInstruction();

    expect(cpu.registers.A).toBe(0xff);
  });

  it("6.3 - XOR r (0xA8-0xAF) - Logical XOR with register", () => {
    // Assembly: XOR B
    // Opcode: 0xA8
    // Result: 0xFF XOR 0xFF = 0x00
    cpu.registers.A = 0xff;
    cpu.registers.B = 0xff;
    memory[0x0000] = 0xa8; // XOR B

    cpu.executeInstruction();

    expect(cpu.registers.A).toBe(0x00);
    expect(cpu.flagZ).toBe(1); // Zero set
  });

  it("6.4 - CP r (0xB8-0xBF) - Compare register (subtract without storing)", () => {
    // Assembly: CP B
    // Opcode: 0xB8
    // Compare: 0x42 - 0x42 = 0x00 (A unchanged, flags set)
    cpu.registers.A = 0x42;
    cpu.registers.B = 0x42;
    memory[0x0000] = 0xb8; // CP B

    cpu.executeInstruction();

    expect(cpu.registers.A).toBe(0x42); // A unchanged
    expect(cpu.flagZ).toBe(1); // Equal, so zero flag set
  });
});

// ============================================================================
// LEVEL 7: CONTROL FLOW - JUMPS (4 tests)
// ============================================================================

describe("LEVEL 7: Control Flow - Jumps", () => {
  let cpu;
  let memory;

  beforeEach(() => {
    cpu = new Z80CPU();
    memory = new Uint8Array(65536);
    cpu.readMemory = (address) => memory[address];
    cpu.writeMemory = (address, value) => {
      memory[address] = value & 0xff;
    };
  });

  it("7.1 - JP nn (0xC3) - Unconditional absolute jump", () => {
    // Assembly: JP 0x5000
    // Opcode: 0xC3 0x00 0x50
    memory[0x0000] = 0xc3; // JP nn
    memory[0x0001] = 0x00; // Low byte
    memory[0x0002] = 0x50; // High byte

    cpu.executeInstruction();

    expect(cpu.registers.PC).toBe(0x5000);
  });

  it("7.2 - JP Z, nn (0xCA) - Conditional jump if zero flag set", () => {
    // Assembly: JP Z, 0x5000
    // Opcode: 0xCA 0x00 0x50
    cpu.flagZ = 1; // Zero flag set
    memory[0x0000] = 0xca; // JP Z, nn
    memory[0x0001] = 0x00;
    memory[0x0002] = 0x50;

    cpu.executeInstruction();

    expect(cpu.registers.PC).toBe(0x5000); // Should jump
  });

  it("7.3 - JP NZ, nn (0xC2) - Conditional jump if zero flag clear", () => {
    // Assembly: JP NZ, 0x5000
    // Opcode: 0xC2 0x00 0x50
    cpu.flagZ = 0; // Zero flag clear
    memory[0x0000] = 0xc2; // JP NZ, nn
    memory[0x0001] = 0x00;
    memory[0x0002] = 0x50;

    cpu.executeInstruction();

    expect(cpu.registers.PC).toBe(0x5000); // Should jump
  });

  it("7.4 - JR e (0x18) - Relative jump forward", () => {
    // Assembly: JR +5
    // Opcode: 0x18 0x05
    cpu.registers.PC = 0x1000;
    memory[0x1000] = 0x18; // JR e
    memory[0x1001] = 0x05; // +5 bytes

    cpu.executeInstruction();

    expect(cpu.registers.PC).toBe(0x1007); // 0x1000 + 2 + 5
  });
});

// ============================================================================
// LEVEL 8: STACK OPERATIONS (3 tests)
// ============================================================================

describe("LEVEL 8: Stack Operations", () => {
  let cpu;
  let memory;

  beforeEach(() => {
    cpu = new Z80CPU();
    memory = new Uint8Array(65536);
    cpu.readMemory = (address) => memory[address];
    cpu.writeMemory = (address, value) => {
      memory[address] = value & 0xff;
    };
  });

  it("8.1 - PUSH BC (0xC5) - Push register pair onto stack", () => {
    // Assembly: PUSH BC
    // Opcode: 0xC5
    cpu.BC = 0x1234;
    cpu.registers.SP = 0xffff;
    memory[0x0000] = 0xc5; // PUSH BC

    cpu.executeInstruction();

    expect(cpu.registers.SP).toBe(0xfffd); // SP decremented by 2
    expect(memory[0xfffd]).toBe(0x34); // C register (low byte)
    expect(memory[0xfffe]).toBe(0x12); // B register (high byte)
  });

  it("8.2 - POP BC (0xC1) - Pop register pair from stack", () => {
    // Assembly: POP BC
    // Opcode: 0xC1
    cpu.registers.SP = 0xfffd;
    memory[0xfffd] = 0x34; // C register
    memory[0xfffe] = 0x12; // B register
    memory[0x0000] = 0xc1; // POP BC

    cpu.executeInstruction();

    expect(cpu.BC).toBe(0x1234);
    expect(cpu.registers.SP).toBe(0xffff); // SP incremented by 2
  });

  it("8.3 - CALL nn (0xCD) - Call subroutine (push return address)", () => {
    // Assembly: CALL 0x5000
    // Opcode: 0xCD 0x00 0x50
    cpu.registers.SP = 0xffff;
    cpu.registers.PC = 0x1000;
    memory[0x1000] = 0xcd; // CALL nn
    memory[0x1001] = 0x00;
    memory[0x1002] = 0x50;

    cpu.executeInstruction();

    expect(cpu.registers.PC).toBe(0x5000); // Jumped to subroutine
    expect(cpu.registers.SP).toBe(0xfffd); // Return address pushed
    expect(memory[0xfffd]).toBe(0x03); // Return address low byte
    expect(memory[0xfffe]).toBe(0x10); // Return address high byte
  });
});

// ============================================================================
// LEVEL 9: CB PREFIX - BIT OPERATIONS (5 tests)
// ============================================================================

describe("LEVEL 9: CB Prefix - Bit Operations", () => {
  let cpu;
  let memory;

  beforeEach(() => {
    cpu = new Z80CPU();
    memory = new Uint8Array(65536);
    cpu.readMemory = (address) => memory[address];
    cpu.writeMemory = (address, value) => {
      memory[address] = value & 0xff;
    };
  });

  it("9.1 - RLC r (0xCB 0x00-0x07) - Rotate left circular", () => {
    // Assembly: RLC B
    // Opcode: 0xCB 0x00
    // Input: 0x85 (10000101) -> Output: 0x0B (00001011), bit 7 -> bit 0
    cpu.registers.B = 0x85;
    memory[0x0000] = 0xcb; // CB prefix
    memory[0x0001] = 0x00; // RLC B

    cpu.executeInstruction();

    expect(cpu.registers.B).toBe(0x0b);
    expect(cpu.flagC).toBe(1); // Bit 7 was set, now in carry
  });

  it("9.2 - RRC r (0xCB 0x08-0x0F) - Rotate right circular", () => {
    // Assembly: RRC C
    // Opcode: 0xCB 0x09
    // Input: 0x85 (10000101) -> Output: 0xC2 (11000010), bit 0 -> bit 7
    cpu.registers.C = 0x85;
    memory[0x0000] = 0xcb; // CB prefix
    memory[0x0001] = 0x09; // RRC C

    cpu.executeInstruction();

    expect(cpu.registers.C).toBe(0xc2);
    expect(cpu.flagC).toBe(1); // Bit 0 was set
  });

  it("9.3 - SLA r (0xCB 0x20-0x27) - Shift left arithmetic", () => {
    // Assembly: SLA H
    // Opcode: 0xCB 0x24
    // Input: 0x85 -> Output: 0x0A (shift left, bit 7 -> carry)
    cpu.registers.H = 0x85;
    memory[0x0000] = 0xcb; // CB prefix
    memory[0x0001] = 0x24; // SLA H

    cpu.executeInstruction();

    expect(cpu.registers.H).toBe(0x0a);
    expect(cpu.flagC).toBe(1); // Bit 7 shifted into carry
  });

  it("9.4 - BIT b, r (0xCB 0x40-0x7F) - Test bit in register", () => {
    // Assembly: BIT 0, B
    // Opcode: 0xCB 0x40
    // Test: Is bit 0 of B set? (0x85 has bit 0 = 1)
    cpu.registers.B = 0x85; // 10000101 (bit 0 is set)
    memory[0x0000] = 0xcb; // CB prefix
    memory[0x0001] = 0x40; // BIT 0, B

    cpu.executeInstruction();

    expect(cpu.flagZ).toBe(0); // Bit is set, so Z=0
    expect(cpu.flagH).toBe(1); // Half-carry always set for BIT
  });

  it("9.5 - SET b, r (0xCB 0xC0-0xFF) - Set bit in register", () => {
    // Assembly: SET 0, D
    // Opcode: 0xCB 0xC2
    // Input: 0x00 -> Output: 0x01 (bit 0 set)
    cpu.registers.D = 0x00;
    memory[0x0000] = 0xcb; // CB prefix
    memory[0x0001] = 0xc2; // SET 0, D

    cpu.executeInstruction();

    expect(cpu.registers.D).toBe(0x01);
  });
});

// ============================================================================
// LEVEL 10: ED PREFIX - EXTENDED INSTRUCTIONS (5 tests)
// ============================================================================

describe("LEVEL 10: ED Prefix - Extended Instructions", () => {
  let cpu;
  let memory;

  beforeEach(() => {
    cpu = new Z80CPU();
    memory = new Uint8Array(65536);
    cpu.readMemory = (address) => memory[address];
    cpu.writeMemory = (address, value) => {
      memory[address] = value & 0xff;
    };
  });

  it("10.1 - LDI (0xED 0xA0) - Load and increment (block transfer)", () => {
    // Assembly: LDI
    // Opcode: 0xED 0xA0
    // Copies byte from (HL) to (DE), increments HL and DE, decrements BC
    cpu.HL = 0x4000;
    cpu.DE = 0x5000;
    cpu.BC = 0x0005;
    memory[0x4000] = 0x42;
    memory[0x0000] = 0xed; // ED prefix
    memory[0x0001] = 0xa0; // LDI

    cpu.executeInstruction();

    expect(memory[0x5000]).toBe(0x42); // Byte copied
    expect(cpu.HL).toBe(0x4001); // HL incremented
    expect(cpu.DE).toBe(0x5001); // DE incremented
    expect(cpu.BC).toBe(0x0004); // BC decremented
  });

  it("10.2 - LDIR (0xED 0xB0) - Load, increment, repeat until BC=0", () => {
    // Assembly: LDIR
    // Opcode: 0xED 0xB0
    // Repeats LDI until BC = 0
    cpu.HL = 0x4000;
    cpu.DE = 0x5000;
    cpu.BC = 0x0003;
    memory[0x4000] = 0x01;
    memory[0x4001] = 0x02;
    memory[0x4002] = 0x03;
    memory[0x0000] = 0xed; // ED prefix
    memory[0x0001] = 0xb0; // LDIR

    // Execute until BC = 0
    let cycles = 0;
    while (cpu.BC !== 0 && cycles < 10) {
      cpu.executeInstruction();
      cycles++;
    }

    expect(memory[0x5000]).toBe(0x01);
    expect(memory[0x5001]).toBe(0x02);
    expect(memory[0x5002]).toBe(0x03);
    expect(cpu.BC).toBe(0x0000); // All bytes copied
  });

  it("10.3 - CPI (0xED 0xA1) - Compare and increment", () => {
    // Assembly: CPI
    // Opcode: 0xED 0xA1
    // Compares A with (HL), increments HL, decrements BC
    cpu.HL = 0x4000;
    cpu.BC = 0x0005;
    cpu.registers.A = 0x42;
    memory[0x4000] = 0x42; // Match
    memory[0x0000] = 0xed; // ED prefix
    memory[0x0001] = 0xa1; // CPI

    cpu.executeInstruction();

    expect(cpu.flagZ).toBe(1); // Match found
    expect(cpu.HL).toBe(0x4001); // HL incremented
    expect(cpu.BC).toBe(0x0004); // BC decremented
  });

  it("10.4 - NEG (0xED 0x44) - Negate accumulator (two's complement)", () => {
    // Assembly: NEG
    // Opcode: 0xED 0x44
    // Result: 0x42 -> 0xBE (two's complement negation)
    cpu.registers.A = 0x42;
    memory[0x0000] = 0xed; // ED prefix
    memory[0x0001] = 0x44; // NEG

    cpu.executeInstruction();

    expect(cpu.registers.A).toBe(0xbe); // -0x42 in two's complement
    expect(cpu.flagC).toBe(1); // Carry set (always for NEG unless A=0)
    expect(cpu.flagN).toBe(1); // Subtraction flag
  });

  it("10.5 - LD BC, (nn) (0xED 0x4B) - Load 16-bit from memory", () => {
    // Assembly: LD BC, (0x5000)
    // Opcode: 0xED 0x4B 0x00 0x50
    memory[0x5000] = 0x34; // Low byte
    memory[0x5001] = 0x12; // High byte
    memory[0x0000] = 0xed; // ED prefix
    memory[0x0001] = 0x4b; // LD BC, (nn)
    memory[0x0002] = 0x00; // Low byte of address
    memory[0x0003] = 0x50; // High byte of address

    cpu.executeInstruction();

    expect(cpu.BC).toBe(0x1234);
  });
});

// ============================================================================
// LEVEL 11: DD/FD PREFIX - INDEX REGISTERS (4 tests)
// ============================================================================

describe("LEVEL 11: DD/FD Prefix - Index Registers", () => {
  let cpu;
  let memory;

  beforeEach(() => {
    cpu = new Z80CPU();
    memory = new Uint8Array(65536);
    cpu.readMemory = (address) => memory[address];
    cpu.writeMemory = (address, value) => {
      memory[address] = value & 0xff;
    };
  });

  it("11.1 - LD IX, nn (0xDD 0x21) - Load 16-bit into IX register", () => {
    // Assembly: LD IX, 0x1234
    // Opcode: 0xDD 0x21 0x34 0x12
    memory[0x0000] = 0xdd; // DD prefix
    memory[0x0001] = 0x21; // LD IX, nn
    memory[0x0002] = 0x34; // Low byte
    memory[0x0003] = 0x12; // High byte

    cpu.executeInstruction();

    expect(cpu.IX).toBe(0x1234);
  });

  it("11.2 - LD IY, nn (0xFD 0x21) - Load 16-bit into IY register", () => {
    // Assembly: LD IY, 0x5678
    // Opcode: 0xFD 0x21 0x78 0x56
    memory[0x0000] = 0xfd; // FD prefix
    memory[0x0001] = 0x21; // LD IY, nn
    memory[0x0002] = 0x78; // Low byte
    memory[0x0003] = 0x56; // High byte

    cpu.executeInstruction();

    expect(cpu.IY).toBe(0x5678);
  });

  it("11.3 - ADD IX, BC (0xDD 0x09) - Add to IX register", () => {
    // Assembly: ADD IX, BC
    // Opcode: 0xDD 0x09
    // Result: 0x1000 + 0x0234 = 0x1234
    cpu.IX = 0x1000;
    cpu.BC = 0x0234;
    memory[0x0000] = 0xdd; // DD prefix
    memory[0x0001] = 0x09; // ADD IX, BC

    cpu.executeInstruction();

    expect(cpu.IX).toBe(0x1234);
  });

  it("11.4 - DD CB d RLC (IX+d) (0xDD 0xCB d 0x06) - Rotate memory via IX", () => {
    // Assembly: RLC (IX+5)
    // Opcode: 0xDD 0xCB 0x05 0x06
    cpu.IX = 0x5000;
    memory[0x5005] = 0x85; // IX + 5
    memory[0x0000] = 0xdd; // DD prefix
    memory[0x0001] = 0xcb; // CB prefix
    memory[0x0002] = 0x05; // Displacement
    memory[0x0003] = 0x06; // RLC (IX+d)

    cpu.executeInstruction();

    expect(memory[0x5005]).toBe(0x0b); // Rotated result
    expect(cpu.flagC).toBe(1);
  });
});

// ============================================================================
// LEVEL 12: SPECIAL INSTRUCTIONS (4 tests)
// ============================================================================

describe("LEVEL 12: Special Instructions", () => {
  let cpu;
  let memory;

  beforeEach(() => {
    cpu = new Z80CPU();
    memory = new Uint8Array(65536);
    cpu.readMemory = (address) => memory[address];
    cpu.writeMemory = (address, value) => {
      memory[address] = value & 0xff;
    };
  });

  it("12.1 - NOP (0x00) - No operation", () => {
    // Assembly: NOP
    // Opcode: 0x00
    cpu.registers.PC = 0x1000;
    memory[0x1000] = 0x00; // NOP

    cpu.executeInstruction();

    expect(cpu.registers.PC).toBe(0x1001); // PC advances by 1
  });

  it("12.2 - HALT (0x76) - Halt CPU execution", () => {
    // Assembly: HALT
    // Opcode: 0x76
    memory[0x0000] = 0x76; // HALT

    cpu.executeInstruction();

    expect(cpu.halted).toBe(true);
  });

  it("12.3 - DAA (0x27) - Decimal adjust accumulator (BCD arithmetic)", () => {
    // Assembly: DAA
    // Opcode: 0x27
    // Adjusts result of BCD addition: 0x09 + 0x05 = 0x0E -> 0x14 (BCD)
    cpu.registers.A = 0x09;
    cpu.addA(0x05); // 9 + 5 = 14 (0x0E)
    memory[0x0000] = 0x27; // DAA

    cpu.executeInstruction();

    expect(cpu.registers.A).toBe(0x14); // BCD: 14
  });

  it("12.4 - CPL (0x2F) - Complement accumulator (bitwise NOT)", () => {
    // Assembly: CPL
    // Opcode: 0x2F
    // Result: 0x55 (01010101) -> 0xAA (10101010)
    cpu.registers.A = 0x55;
    memory[0x0000] = 0x2f; // CPL

    cpu.executeInstruction();

    expect(cpu.registers.A).toBe(0xaa);
    expect(cpu.flagH).toBe(1); // Half-carry set
    expect(cpu.flagN).toBe(1); // Subtraction flag set
  });
});

// ============================================================================
// LEVEL 13: COMPLETE PROGRAM EXECUTION (2 tests)
// ============================================================================

describe("LEVEL 13: Complete Program Execution", () => {
  let cpu;
  let memory;

  beforeEach(() => {
    cpu = new Z80CPU();
    memory = new Uint8Array(65536);
    cpu.readMemory = (address) => memory[address];
    cpu.writeMemory = (address, value) => {
      memory[address] = value & 0xff;
    };
  });

  it("13.1 - Simple arithmetic program", () => {
    // Assembly program:
    //   LD A, 0x55
    //   LD B, 0xAA
    //   ADD A, B
    //   HALT
    // Opcodes: 0x3E 0x55, 0x06 0xAA, 0x80, 0x76
    memory[0x0000] = 0x3e; // LD A, 0x55
    memory[0x0001] = 0x55;
    memory[0x0002] = 0x06; // LD B, 0xAA
    memory[0x0003] = 0xaa;
    memory[0x0004] = 0x80; // ADD A, B
    memory[0x0005] = 0x76; // HALT

    cpu.executeInstruction(); // LD A, 0x55
    cpu.executeInstruction(); // LD B, 0xAA
    cpu.executeInstruction(); // ADD A, B
    cpu.executeInstruction(); // HALT

    expect(cpu.registers.A).toBe(0xff); // 0x55 + 0xAA = 0xFF
    expect(cpu.registers.B).toBe(0xaa);
    expect(cpu.flagS).toBe(1); // Sign flag (bit 7 set)
    expect(cpu.flagH).toBe(1); // Half-carry flag
    expect(cpu.halted).toBe(true);
  });

  it("13.2 - Subroutine call and return program", () => {
    // Assembly program:
    // Main:
    //   CALL 0x5000
    // Subroutine at 0x5000:
    //   LD A, 0x42
    //   RET
    // Opcodes: 0xCD 0x00 0x50, 0x3E 0x42, 0xC9
    cpu.registers.SP = 0xffff;
    cpu.registers.PC = 0x1000;

    // Main program
    memory[0x1000] = 0xcd; // CALL 0x5000
    memory[0x1001] = 0x00;
    memory[0x1002] = 0x50;

    // Subroutine at 0x5000
    memory[0x5000] = 0x3e; // LD A, 0x42
    memory[0x5001] = 0x42;
    memory[0x5002] = 0xc9; // RET

    cpu.executeInstruction(); // CALL
    expect(cpu.registers.PC).toBe(0x5000);
    expect(cpu.registers.SP).toBe(0xfffd);

    cpu.executeInstruction(); // LD A, 0x42
    expect(cpu.registers.A).toBe(0x42);

    cpu.executeInstruction(); // RET
    expect(cpu.registers.PC).toBe(0x1003); // Returned to after CALL
    expect(cpu.registers.SP).toBe(0xffff);
  });
});
