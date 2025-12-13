/**
 * Memory System Unit Tests
 * Tests ROM/RAM management, program loading, and memory protection
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MemorySystem } from "../../src/core/memory.js";

describe("MemorySystem - Initialization", () => {
  let memory;

  beforeEach(() => {
    memory = new MemorySystem();
  });

  it("should initialize with correct memory sizes", () => {
    expect(memory.rom.length).toBe(0x4000); // 16K ROM
    expect(memory.ram.length).toBe(0xc000); // 48K RAM
  });

  it("should start with ROM not loaded", () => {
    expect(memory.romLoaded).toBe(false);
  });

  it("should report correct memory statistics", () => {
    const stats = memory.getStats();

    expect(stats.romSize).toBe(16384);
    expect(stats.ramSize).toBe(49152);
    expect(stats.totalSize).toBe(65536);
    expect(stats.romLoaded).toBe(false);
  });
});

describe("MemorySystem - ROM Loading", () => {
  let memory;

  beforeEach(() => {
    memory = new MemorySystem();
  });

  it("should load valid 16K ROM", () => {
    const romData = new Uint8Array(0x4000);
    for (let i = 0; i < romData.length; i++) {
      romData[i] = i & 0xff;
    }

    const result = memory.loadROM(romData);

    expect(result).toBe(true);
    expect(memory.romLoaded).toBe(true);
  });

  it("should reject ROM with incorrect size", () => {
    const invalidRom = new Uint8Array(1024); // Only 1K

    expect(() => memory.loadROM(invalidRom)).toThrow();
  });

  it("should copy ROM data correctly", () => {
    const romData = new Uint8Array(0x4000);
    romData[0] = 0x3e;
    romData[1] = 0x42;
    romData[0x3fff] = 0xff;

    memory.loadROM(romData);

    expect(memory.rom[0]).toBe(0x3e);
    expect(memory.rom[1]).toBe(0x42);
    expect(memory.rom[0x3fff]).toBe(0xff);
  });
});

describe("MemorySystem - Memory Reading", () => {
  let memory;

  beforeEach(() => {
    memory = new MemorySystem();
    const romData = new Uint8Array(0x4000);
    for (let i = 0; i < romData.length; i++) {
      romData[i] = 0x00;
    }
    memory.loadROM(romData);
  });

  it("should read from ROM (0x0000-0x3FFF)", () => {
    memory.rom[0x1000] = 0x42;

    const value = memory.readByte(0x1000);

    expect(value).toBe(0x42);
  });

  it("should read from RAM (0x4000-0xFFFF)", () => {
    memory.ram[0x0000] = 0x55; // RAM offset 0 = address 0x4000

    const value = memory.readByte(0x4000);

    expect(value).toBe(0x55);
  });

  it("should read 16-bit words (little-endian)", () => {
    memory.ram[0x0000] = 0x34; // Low byte at 0x4000
    memory.ram[0x0001] = 0x12; // High byte at 0x4001

    const value = memory.readWord(0x4000);

    expect(value).toBe(0x1234);
  });
});

describe("MemorySystem - Memory Writing", () => {
  let memory;

  beforeEach(() => {
    memory = new MemorySystem();
    const romData = new Uint8Array(0x4000).fill(0);
    memory.loadROM(romData);
  });

  it("should write to RAM", () => {
    memory.writeByte(0x4000, 0x42);

    expect(memory.ram[0x0000]).toBe(0x42);
    expect(memory.readByte(0x4000)).toBe(0x42);
  });

  it("should write to high RAM (0xFFFF)", () => {
    memory.writeByte(0xffff, 0xaa);

    expect(memory.ram[0xbfff]).toBe(0xaa);
    expect(memory.readByte(0xffff)).toBe(0xaa);
  });

  it("should write 16-bit words (little-endian)", () => {
    memory.writeWord(0x4000, 0x1234);

    expect(memory.ram[0x0000]).toBe(0x34); // Low byte
    expect(memory.ram[0x0001]).toBe(0x12); // High byte
  });
});

describe("MemorySystem - ROM Protection", () => {
  let memory;

  beforeEach(() => {
    memory = new MemorySystem();
    const romData = new Uint8Array(0x4000);
    romData[0x1000] = 0x42;
    memory.loadROM(romData);
  });

  it("should ignore writes to ROM area (Test 2.1)", () => {
    const originalValue = memory.readByte(0x1000);

    memory.writeByte(0x1000, 0xaa);

    const newValue = memory.readByte(0x1000);
    expect(newValue).toBe(originalValue);
    expect(newValue).toBe(0x42);
  });

  it("should allow writes to video RAM area (0x3C00-0x3FFF)", () => {
    memory.writeByte(0x3c00, 0x55);

    expect(memory.readByte(0x3c00)).toBe(0x55);
    expect(memory.rom[0x3c00]).toBe(0x55);
  });

  it("should allow writes throughout video RAM range", () => {
    for (let addr = 0x3c00; addr < 0x4000; addr++) {
      memory.writeByte(addr, 0xff);
      expect(memory.readByte(addr)).toBe(0xff);
    }
  });
});

describe("MemorySystem - RAM Operations (Test 2.2)", () => {
  let memory;

  beforeEach(() => {
    memory = new MemorySystem();
    const romData = new Uint8Array(0x4000).fill(0);
    memory.loadROM(romData);
  });

  it("should read and write at RAM start (0x4000)", () => {
    memory.writeByte(0x4000, 0xaa);
    expect(memory.readByte(0x4000)).toBe(0xaa);
  });

  it("should read and write at RAM end (0xFFFF)", () => {
    memory.writeByte(0xffff, 0x55);
    expect(memory.readByte(0xffff)).toBe(0x55);
  });

  it("should handle sequential writes and reads", () => {
    for (let i = 0; i < 100; i++) {
      const addr = 0x4000 + i;
      memory.writeByte(addr, i & 0xff);
    }

    for (let i = 0; i < 100; i++) {
      const addr = 0x4000 + i;
      expect(memory.readByte(addr)).toBe(i & 0xff);
    }
  });
});

describe("MemorySystem - Program Loading (Test 2.3)", () => {
  let memory;

  beforeEach(() => {
    memory = new MemorySystem();
    const romData = new Uint8Array(0x4000).fill(0);
    memory.loadROM(romData);
  });

  it("should load program at default address (0x4200)", () => {
    const program = new Uint8Array([0x3e, 0x42, 0x76]);

    const address = memory.loadProgram(program);

    expect(address).toBe(0x4200);
    expect(memory.readByte(0x4200)).toBe(0x3e);
    expect(memory.readByte(0x4201)).toBe(0x42);
    expect(memory.readByte(0x4202)).toBe(0x76);
  });

  it("should load program at custom address", () => {
    const program = new Uint8Array([0xaa, 0xbb, 0xcc]);

    const address = memory.loadProgram(program, 0x5000);

    expect(address).toBe(0x5000);
    expect(memory.readByte(0x5000)).toBe(0xaa);
    expect(memory.readByte(0x5001)).toBe(0xbb);
    expect(memory.readByte(0x5002)).toBe(0xcc);
  });

  it("should load program from Array", () => {
    const program = [0x10, 0x20, 0x30];

    memory.loadProgram(program, 0x6000);

    expect(memory.readByte(0x6000)).toBe(0x10);
    expect(memory.readByte(0x6001)).toBe(0x20);
    expect(memory.readByte(0x6002)).toBe(0x30);
  });

  it("should reject program that exceeds memory", () => {
    const largeProgram = new Uint8Array(0xffff);

    expect(() => memory.loadProgram(largeProgram, 0x4000)).toThrow();
  });

  it("should handle zero-length program", () => {
    const emptyProgram = new Uint8Array(0);

    const address = memory.loadProgram(emptyProgram, 0x5000);

    expect(address).toBe(0x5000);
  });
});

describe("MemorySystem - RAM Management", () => {
  let memory;

  beforeEach(() => {
    memory = new MemorySystem();
    const romData = new Uint8Array(0x4000).fill(0);
    memory.loadROM(romData);
  });

  it("should clear RAM", () => {
    // Fill RAM with non-zero values
    for (let i = 0; i < 100; i++) {
      memory.writeByte(0x4000 + i, 0xff);
    }

    memory.clearRAM();

    // Verify RAM is cleared
    for (let i = 0; i < 100; i++) {
      expect(memory.readByte(0x4000 + i)).toBe(0x00);
    }
  });

  it("should not affect ROM when clearing RAM", () => {
    memory.rom[0x1000] = 0x42;

    memory.clearRAM();

    expect(memory.readByte(0x1000)).toBe(0x42);
  });
});

describe("MemorySystem - Address Wrapping", () => {
  let memory;

  beforeEach(() => {
    memory = new MemorySystem();
    const romData = new Uint8Array(0x4000).fill(0);
    memory.loadROM(romData);
  });

  it("should handle 16-bit address wrap", () => {
    memory.writeByte(0xffff, 0xaa);
    memory.writeByte(0x10000, 0xbb); // Should wrap to 0x0000

    // 0x10000 wraps to ROM space, write is ignored
    expect(memory.readByte(0x0000)).toBe(0x00);
  });

  it("should mask addresses to 16 bits", () => {
    memory.writeByte(0x14000, 0x42); // 0x14000 & 0xFFFF = 0x4000

    expect(memory.readByte(0x4000)).toBe(0x42);
  });
});
