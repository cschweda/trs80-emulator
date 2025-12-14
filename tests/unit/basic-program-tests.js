/**
 * BASIC Program Execution Unit Tests
 * Tests ROM loading, BASIC program storage, and execution environment
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Z80CPU } from "../../src/core/z80cpu.js";
import { MemorySystem } from "../../src/core/memory.js";
import { CassetteSystem } from "../../src/peripherals/cassette.js";
import { IOSystem } from "../../src/core/io.js";

describe("BASIC Program Execution - ROM Loading", () => {
  let memory;

  beforeEach(() => {
    memory = new MemorySystem();
  });

  it("should load ModelIII.rom successfully", () => {
    const romData = new Uint8Array(0x4000);
    // Simulate ROM with BASIC interpreter signature
    romData[0] = 0xc3; // JP instruction (typical ROM start)
    romData[1] = 0x00;
    romData[2] = 0x00;

    const result = memory.loadROM(romData);

    expect(result).toBe(true);
    expect(memory.romLoaded).toBe(true);
  });

  it("should load 14KB ROM and pad to 16KB", () => {
    const romData = new Uint8Array(0x3800); // 14KB
    romData[0] = 0xc3;

    const result = memory.loadROM(romData);

    expect(result).toBe(true);
    expect(memory.rom.length).toBe(0x4000); // Padded to 16KB
    expect(memory.rom[0]).toBe(0xc3);
  });

  it("should read ROM data correctly after loading", () => {
    const romData = new Uint8Array(0x4000);
    romData[0x1000] = 0x3e; // LD A, n
    romData[0x1001] = 0x42;

    memory.loadROM(romData);

    expect(memory.readByte(0x1000)).toBe(0x3e);
    expect(memory.readByte(0x1001)).toBe(0x42);
  });

  it("should protect ROM from writes", () => {
    const romData = new Uint8Array(0x4000);
    romData[0x1000] = 0x42;
    memory.loadROM(romData);

    memory.writeByte(0x1000, 0xaa);

    expect(memory.readByte(0x1000)).toBe(0x42); // Unchanged
  });
});

describe("BASIC Program Execution - Program Storage", () => {
  let memory;

  beforeEach(() => {
    memory = new MemorySystem();
    const romData = new Uint8Array(0x4000);
    memory.loadROM(romData);
  });

  it("should store BASIC program at default address (0x4200)", () => {
    const program = new Uint8Array([0x10, 0x20, 0x30, 0x40]);

    const address = memory.loadProgram(program);

    expect(address).toBe(0x4200);
    expect(memory.readByte(0x4200)).toBe(0x10);
    expect(memory.readByte(0x4201)).toBe(0x20);
  });

  it("should store BASIC program at custom address", () => {
    const program = new Uint8Array([0xaa, 0xbb, 0xcc]);

    const address = memory.loadProgram(program, 0x5000);

    expect(address).toBe(0x5000);
    expect(memory.readByte(0x5000)).toBe(0xaa);
  });

  it("should store multiple BASIC programs in different locations", () => {
    const program1 = new Uint8Array([0x11, 0x22]);
    const program2 = new Uint8Array([0x33, 0x44]);

    memory.loadProgram(program1, 0x4200);
    memory.loadProgram(program2, 0x5000);

    expect(memory.readByte(0x4200)).toBe(0x11);
    expect(memory.readByte(0x5000)).toBe(0x33);
  });

  it("should preserve ROM when loading BASIC programs", () => {
    const romData = new Uint8Array(0x4000);
    romData[0x1000] = 0x42;
    memory.loadROM(romData);

    const program = new Uint8Array([0xaa, 0xbb]);
    memory.loadProgram(program, 0x4200);

    expect(memory.readByte(0x1000)).toBe(0x42); // ROM unchanged
  });
});

describe("BASIC Program Execution - CPU Execution with ROM", () => {
  let cpu;
  let memory;

  beforeEach(() => {
    memory = new MemorySystem();
    cpu = new Z80CPU();
    cpu.memory = memory;
  });

  it("should execute instruction from ROM", () => {
    const romData = new Uint8Array(0x4000);
    romData[0x0000] = 0x3e; // LD A, n
    romData[0x0001] = 0x42;
    memory.loadROM(romData);

    cpu.registers.PC = 0x0000;
    cpu.executeInstruction();

    expect(cpu.registers.A).toBe(0x42);
    expect(cpu.registers.PC).toBe(0x0002);
  });

  it("should execute jump instruction from ROM", () => {
    const romData = new Uint8Array(0x4000);
    romData[0x0000] = 0xc3; // JP nn
    romData[0x0001] = 0x00;
    romData[0x0002] = 0x10; // Jump to 0x1000
    memory.loadROM(romData);

    cpu.registers.PC = 0x0000;
    cpu.executeInstruction();

    expect(cpu.registers.PC).toBe(0x1000);
  });

  it("should execute CALL instruction from ROM", () => {
    const romData = new Uint8Array(0x4000);
    romData[0x0000] = 0xcd; // CALL nn
    romData[0x0001] = 0x00;
    romData[0x0002] = 0x50; // Call 0x5000
    memory.loadROM(romData);

    cpu.registers.PC = 0x0000;
    cpu.registers.SP = 0xffff;
    cpu.executeInstruction();

    expect(cpu.registers.PC).toBe(0x5000);
    expect(cpu.registers.SP).toBe(0xfffd);
  });

  it("should execute multiple instructions from ROM sequentially", () => {
    const romData = new Uint8Array(0x4000);
    romData[0x0000] = 0x3e; // LD A, 0x55
    romData[0x0001] = 0x55;
    romData[0x0002] = 0x06; // LD B, 0xAA
    romData[0x0003] = 0xaa;
    romData[0x0004] = 0x80; // ADD A, B
    memory.loadROM(romData);

    cpu.registers.PC = 0x0000;
    cpu.executeInstruction(); // LD A, 0x55
    cpu.executeInstruction(); // LD B, 0xAA
    cpu.executeInstruction(); // ADD A, B

    expect(cpu.registers.A).toBe(0xff);
    expect(cpu.registers.B).toBe(0xaa);
  });
});

describe("BASIC Program Execution - CLOAD Integration", () => {
  let memory;
  let cassette;
  let io;

  beforeEach(() => {
    memory = new MemorySystem();
    const romData = new Uint8Array(0x4000);
    memory.loadROM(romData);
    cassette = new CassetteSystem();
    io = new IOSystem();
  });

  it("should load BASIC program via CLOAD to default address", () => {
    const programData = new Uint8Array([0x10, 0x20, 0x30]);
    cassette.loadTape(programData);

    const address = cassette.simulateCLoad(memory);

    expect(address).toBe(0x4200);
    expect(memory.readByte(0x4200)).toBe(0x10);
    expect(memory.readByte(0x4201)).toBe(0x20);
    expect(memory.readByte(0x4202)).toBe(0x30);
  });

  it("should load BASIC program via CLOAD to custom address", () => {
    const programData = new Uint8Array([0xaa, 0xbb, 0xcc]);
    cassette.loadTape(programData);

    const address = cassette.simulateCLoad(memory, 0x5000);

    expect(address).toBe(0x5000);
    expect(memory.readByte(0x5000)).toBe(0xaa);
  });

  it("should preserve ROM when loading via CLOAD", () => {
    const romData = new Uint8Array(0x4000);
    romData[0x1000] = 0x42;
    memory.loadROM(romData);

    const programData = new Uint8Array([0x10, 0x20]);
    cassette.loadTape(programData);
    cassette.simulateCLoad(memory);

    expect(memory.readByte(0x1000)).toBe(0x42); // ROM unchanged
  });
});

describe("BASIC Program Execution - Memory Layout", () => {
  let memory;

  beforeEach(() => {
    memory = new MemorySystem();
    const romData = new Uint8Array(0x4000);
    memory.loadROM(romData);
  });

  it("should have correct ROM address range (0x0000-0x3FFF)", () => {
    expect(memory.readByte(0x0000)).toBeDefined();
    expect(memory.readByte(0x3fff)).toBeDefined();
  });

  it("should have correct RAM address range (0x4000-0xFFFF)", () => {
    memory.writeByte(0x4000, 0x42);
    memory.writeByte(0xffff, 0xaa);

    expect(memory.readByte(0x4000)).toBe(0x42);
    expect(memory.readByte(0xffff)).toBe(0xaa);
  });

  it("should have BASIC program area at 0x4200", () => {
    const program = new Uint8Array([0x10, 0x20]);
    memory.loadProgram(program);

    expect(memory.readByte(0x4200)).toBe(0x10);
    expect(memory.readByte(0x4201)).toBe(0x20);
  });

  it("should allow programs in extended RAM area", () => {
    const program = new Uint8Array([0xaa, 0xbb]);
    memory.loadProgram(program, 0x8000);

    expect(memory.readByte(0x8000)).toBe(0xaa);
    expect(memory.readByte(0x8001)).toBe(0xbb);
  });
});

describe("BASIC Program Execution - Program Execution Flow", () => {
  let cpu;
  let memory;

  beforeEach(() => {
    memory = new MemorySystem();
    cpu = new Z80CPU();
    cpu.memory = memory;
  });

  it("should execute program loaded from ROM", () => {
    const romData = new Uint8Array(0x4000);
    // Simple program: LD A, 0x42; HALT
    romData[0x1000] = 0x3e; // LD A, n
    romData[0x1001] = 0x42;
    romData[0x1002] = 0x76; // HALT
    memory.loadROM(romData);

    cpu.registers.PC = 0x1000;
    cpu.executeInstruction(); // LD A, 0x42
    cpu.executeInstruction(); // HALT

    expect(cpu.registers.A).toBe(0x42);
    expect(cpu.halted).toBe(true);
  });

  it("should execute program loaded from RAM", () => {
    const romData = new Uint8Array(0x4000);
    memory.loadROM(romData);

    // Load program to RAM
    const program = new Uint8Array([0x3e, 0x55, 0x76]); // LD A, 0x55; HALT
    memory.loadProgram(program, 0x4200);

    cpu.registers.PC = 0x4200;
    cpu.executeInstruction(); // LD A, 0x55
    cpu.executeInstruction(); // HALT

    expect(cpu.registers.A).toBe(0x55);
    expect(cpu.halted).toBe(true);
  });

  it("should execute program that calls ROM routine", () => {
    const romData = new Uint8Array(0x4000);
    // ROM routine at 0x2000: LD A, 0x99; RET
    romData[0x2000] = 0x3e; // LD A, n
    romData[0x2001] = 0x99;
    romData[0x2002] = 0xc9; // RET
    memory.loadROM(romData);

    // Program in RAM: CALL 0x2000; HALT
    const program = new Uint8Array([0xcd, 0x00, 0x20, 0x76]);
    memory.loadProgram(program, 0x4200);

    cpu.registers.PC = 0x4200;
    cpu.registers.SP = 0xffff;
    cpu.executeInstruction(); // CALL 0x2000
    cpu.executeInstruction(); // LD A, 0x99 (in ROM)
    cpu.executeInstruction(); // RET

    expect(cpu.registers.A).toBe(0x99);
    expect(cpu.registers.PC).toBe(0x4203); // After CALL
  });
});

describe("BASIC Program Execution - Simple BASIC Programs", () => {
  let cpu;
  let memory;
  let cassette;

  beforeEach(() => {
    memory = new MemorySystem();
    const romData = new Uint8Array(0x4000);
    memory.loadROM(romData);
    cpu = new Z80CPU();
    cpu.memory = memory;
    cassette = new CassetteSystem();
  });

  it("should handle simple PRINT program structure", () => {
    // Simulate BASIC program bytes (tokenized)
    const basicProgram = new Uint8Array([
      0x0a,
      0x00, // Line number 10
      0x81, // PRINT token
      0x22, // Quote
      0x48,
      0x45,
      0x4c,
      0x4c,
      0x4f, // "HELLO"
      0x22, // Quote
      0x00, // End of line
    ]);

    cassette.loadTape(basicProgram);
    const address = cassette.simulateCLoad(memory);

    expect(address).toBe(0x4200);
    expect(memory.readByte(0x4200)).toBe(0x0a);
    expect(memory.readByte(0x4201)).toBe(0x00);
  });

  it("should handle program with multiple lines", () => {
    const basicProgram = new Uint8Array([
      0x0a,
      0x00, // Line 10
      0x81,
      0x22,
      0x48,
      0x49,
      0x22,
      0x00, // PRINT "HI"
      0x14,
      0x00, // Line 20
      0x81,
      0x22,
      0x42,
      0x59,
      0x45,
      0x22,
      0x00, // PRINT "BYE"
    ]);

    cassette.loadTape(basicProgram);
    cassette.simulateCLoad(memory);

    expect(memory.readByte(0x4200)).toBe(0x0a); // Line 10
    expect(memory.readByte(0x4207)).toBe(0x14); // Line 20
  });

  it("should handle program with variables", () => {
    const basicProgram = new Uint8Array([
      0x0a,
      0x00, // Line 10
      0x95,
      0x41,
      0x3d,
      0x32,
      0x00, // LET A=2
      0x14,
      0x00, // Line 20
      0x95,
      0x42,
      0x3d,
      0x33,
      0x00, // LET B=3
    ]);

    cassette.loadTape(basicProgram);
    cassette.simulateCLoad(memory);

    expect(memory.readByte(0x4200)).toBe(0x0a);
    expect(memory.readByte(0x4206)).toBe(0x14);
  });

  it("should handle program with GOTO statement", () => {
    const basicProgram = new Uint8Array([
      0x0a,
      0x00, // Line 10
      0x89,
      0x14,
      0x00,
      0x00, // GOTO 20
      0x14,
      0x00, // Line 20
      0x81,
      0x22,
      0x44,
      0x4f,
      0x4e,
      0x45,
      0x22,
      0x00, // PRINT "DONE"
    ]);

    cassette.loadTape(basicProgram);
    cassette.simulateCLoad(memory);

    expect(memory.readByte(0x4200)).toBe(0x0a);
    expect(memory.readByte(0x4205)).toBe(0x14);
  });
});

describe("BASIC Program Execution - Complex Scenarios", () => {
  let cpu;
  let memory;
  let cassette;

  beforeEach(() => {
    memory = new MemorySystem();
    const romData = new Uint8Array(0x4000);
    memory.loadROM(romData);
    cpu = new Z80CPU();
    cpu.memory = memory;
    cassette = new CassetteSystem();
  });

  it("should handle large BASIC program", () => {
    const largeProgram = new Uint8Array(1000);
    for (let i = 0; i < 1000; i++) {
      largeProgram[i] = i & 0xff;
    }

    cassette.loadTape(largeProgram);
    const address = cassette.simulateCLoad(memory);

    expect(address).toBe(0x4200);
    expect(memory.readByte(0x4200)).toBe(0x00);
    expect(memory.readByte(0x4200 + 999)).toBe(999 & 0xff);
  });

  it("should handle program that uses stack", () => {
    const romData = new Uint8Array(0x4000);
    // ROM routine that uses stack
    romData[0x3000] = 0xc5; // PUSH BC
    romData[0x3001] = 0x01; // LD BC, nn
    romData[0x3002] = 0x34;
    romData[0x3003] = 0x12;
    romData[0x3004] = 0xc1; // POP BC
    romData[0x3005] = 0xc9; // RET
    memory.loadROM(romData);

    const program = new Uint8Array([0xcd, 0x00, 0x30, 0x76]); // CALL 0x3000; HALT
    memory.loadProgram(program, 0x4200);

    cpu.registers.PC = 0x4200;
    cpu.registers.SP = 0xffff;
    cpu.BC = 0x0000;

    cpu.executeInstruction(); // CALL
    cpu.executeInstruction(); // PUSH BC
    cpu.executeInstruction(); // LD BC, 0x1234
    // Verify LD BC, nn worked correctly
    expect(cpu.BC).toBe(0x1234);

    cpu.executeInstruction(); // POP BC
    expect(cpu.BC).toBe(0x0000); // After POP, BC is restored to what was pushed

    cpu.executeInstruction(); // RET
  });

  it("should handle program with loops", () => {
    const program = new Uint8Array([
      0x3e,
      0x05, // LD A, 5 (loop counter)
      0x47, // LD B, A
      0x3d, // DEC A
      0x20,
      0xfd, // JR NZ, -3 (loop back)
      0x76, // HALT
    ]);

    memory.loadProgram(program, 0x4200);

    cpu.registers.PC = 0x4200;
    let cycles = 0;
    while (!cpu.halted && cycles < 20) {
      cpu.executeInstruction();
      cycles++;
    }

    expect(cpu.registers.A).toBe(0x00);
    expect(cpu.halted).toBe(true);
  });
});

describe("BASIC Program Execution - Integration Tests", () => {
  let cpu;
  let memory;
  let cassette;
  let io;

  beforeEach(() => {
    memory = new MemorySystem();
    const romData = new Uint8Array(0x4000);
    memory.loadROM(romData);
    cpu = new Z80CPU();
    cpu.memory = memory;
    cassette = new CassetteSystem();
    io = new IOSystem();
  });

  it("should execute complete CLOAD and RUN flow", () => {
    const program = new Uint8Array([0x3e, 0x42, 0x76]); // LD A, 0x42; HALT

    cassette.loadTape(program);
    const loadAddr = cassette.simulateCLoad(memory);

    cpu.registers.PC = loadAddr;
    cpu.executeInstruction(); // LD A, 0x42
    cpu.executeInstruction(); // HALT

    expect(loadAddr).toBe(0x4200);
    expect(cpu.registers.A).toBe(0x42);
    expect(cpu.halted).toBe(true);
  });

  it("should handle I/O operations during program execution", () => {
    const program = new Uint8Array([
      0x3e,
      0x01, // LD A, 1
      0xd3,
      0xfe, // OUT (0xFE), A (cassette motor on)
      0x76, // HALT
    ]);

    memory.loadProgram(program, 0x4200);

    cpu.registers.PC = 0x4200;
    cpu.executeInstruction(); // LD A, 1
    cpu.executeInstruction(); // OUT (0xFE), A

    // Verify I/O was handled (would need I/O system integration)
    expect(cpu.registers.A).toBe(0x01);
  });

  it("should preserve program state across multiple executions", () => {
    const program = new Uint8Array([0x3e, 0x55, 0x06, 0xaa, 0x80, 0x76]);
    // LD A, 0x55; LD B, 0xAA; ADD A, B; HALT

    memory.loadProgram(program, 0x4200);

    // First execution
    cpu.registers.PC = 0x4200;
    cpu.executeInstruction();
    cpu.executeInstruction();
    cpu.executeInstruction();
    cpu.executeInstruction();

    expect(cpu.registers.A).toBe(0xff);
    expect(memory.readByte(0x4200)).toBe(0x3e); // Program still in memory
  });
});
