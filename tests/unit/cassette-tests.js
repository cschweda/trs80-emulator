/**
 * Cassette System Unit Tests
 * Tests tape loading, CLOAD/CSAVE operations, and cassette control
 */

import { describe, it, expect, beforeEach } from "vitest";
import { CassetteSystem } from "@peripherals/cassette.js";
import { MemorySystem } from "@core/memory.js";

describe("CassetteSystem - Initialization", () => {
  let cassette;

  beforeEach(() => {
    cassette = new CassetteSystem();
  });

  it("should initialize with correct defaults", () => {
    expect(cassette.motorOn).toBe(false);
    expect(cassette.playing).toBe(false);
    expect(cassette.recording).toBe(false);
    expect(cassette.tapeData).toBe(null);
    expect(cassette.tapePosition).toBe(0);
    expect(cassette.tapeLength).toBe(0);
  });
});

describe("CassetteSystem - Tape Loading (Test 3.1)", () => {
  let cassette;

  beforeEach(() => {
    cassette = new CassetteSystem();
  });

  it("should load Uint8Array tape data", () => {
    const data = new Uint8Array([0x3e, 0x42, 0x76]);

    const result = cassette.loadTape(data);

    expect(result).toBe(true);
    expect(cassette.tapeLength).toBe(3);
    expect(cassette.tapePosition).toBe(0);
    expect(cassette.tapeData[0]).toBe(0x3e);
  });

  it("should load Array tape data", () => {
    const data = [0xaa, 0xbb, 0xcc];

    const result = cassette.loadTape(data);

    expect(result).toBe(true);
    expect(cassette.tapeLength).toBe(3);
    expect(cassette.tapeData[1]).toBe(0xbb);
  });

  it("should reject empty tape", () => {
    const result = cassette.loadTape([]);

    expect(result).toBe(false);
  });

  it("should reject null tape", () => {
    const result = cassette.loadTape(null);

    expect(result).toBe(false);
  });

  it("should reset tape position on load", () => {
    cassette.tapePosition = 100;

    cassette.loadTape([0x10, 0x20]);

    expect(cassette.tapePosition).toBe(0);
  });
});

describe("CassetteSystem - CLOAD Operation (Test 3.2)", () => {
  let cassette;
  let memory;

  beforeEach(() => {
    cassette = new CassetteSystem();
    memory = new MemorySystem();
    const romData = new Uint8Array(0x4000).fill(0);
    memory.loadROM(romData);
  });

  it("should load tape to default address (0x4200)", () => {
    const programData = new Uint8Array([0x3e, 0x42, 0x00, 0x76]);
    cassette.loadTape(programData);

    const address = cassette.simulateCLoad(memory);

    expect(address).toBe(0x4200);
    expect(memory.readByte(0x4200)).toBe(0x3e);
    expect(memory.readByte(0x4201)).toBe(0x42);
    expect(memory.readByte(0x4202)).toBe(0x00);
    expect(memory.readByte(0x4203)).toBe(0x76);
  });

  it("should load tape to custom address", () => {
    const programData = new Uint8Array([0xaa, 0xbb, 0xcc]);
    cassette.loadTape(programData);

    const address = cassette.simulateCLoad(memory, 0x5000);

    expect(address).toBe(0x5000);
    expect(memory.readByte(0x5000)).toBe(0xaa);
    expect(memory.readByte(0x5001)).toBe(0xbb);
    expect(memory.readByte(0x5002)).toBe(0xcc);
  });

  it("should return false when no tape loaded", () => {
    const result = cassette.simulateCLoad(memory);

    expect(result).toBe(false);
  });

  it("should call onLoadComplete callback", () => {
    let callbackAddress = null;
    let callbackLength = null;

    cassette.onLoadComplete = (addr, len) => {
      callbackAddress = addr;
      callbackLength = len;
    };

    cassette.loadTape([0x10, 0x20, 0x30]);
    cassette.simulateCLoad(memory, 0x5000);

    expect(callbackAddress).toBe(0x5000);
    expect(callbackLength).toBe(3);
  });
});

describe("CassetteSystem - CSAVE Operation (Test 3.3)", () => {
  let cassette;
  let memory;

  beforeEach(() => {
    cassette = new CassetteSystem();
    memory = new MemorySystem();
    const romData = new Uint8Array(0x4000).fill(0);
    memory.loadROM(romData);
  });

  it("should save memory region to tape", () => {
    memory.writeByte(0x4200, 0x3e);
    memory.writeByte(0x4201, 0x42);
    memory.writeByte(0x4202, 0x76);

    const tapeData = cassette.simulateCSave(memory, 0x4200, 3);

    expect(tapeData.length).toBe(3);
    expect(tapeData[0]).toBe(0x3e);
    expect(tapeData[1]).toBe(0x42);
    expect(tapeData[2]).toBe(0x76);
    expect(cassette.tapeLength).toBe(3);
  });

  it("should call onSaveComplete callback", () => {
    let savedData = null;

    cassette.onSaveComplete = (data) => {
      savedData = data;
    };

    memory.writeByte(0x5000, 0xaa);
    cassette.simulateCSave(memory, 0x5000, 1);

    expect(savedData).not.toBe(null);
    expect(savedData[0]).toBe(0xaa);
  });
});

describe("CassetteSystem - Cassette Control (Test 3.4)", () => {
  let cassette;

  beforeEach(() => {
    cassette = new CassetteSystem();
  });

  it("should turn motor on with bit 0", () => {
    cassette.control(0x01);

    expect(cassette.motorOn).toBe(true);
  });

  it("should start playing with bit 1", () => {
    cassette.control(0x03); // Motor on + Play

    expect(cassette.motorOn).toBe(true);
    expect(cassette.playing).toBe(true);
  });

  it("should start recording with bit 2", () => {
    cassette.control(0x05); // Motor on + Record

    expect(cassette.motorOn).toBe(true);
    expect(cassette.recording).toBe(true);
  });

  it("should stop play/record when motor is off", () => {
    cassette.control(0x03); // Start playing
    cassette.control(0x00); // Motor off

    expect(cassette.motorOn).toBe(false);
    expect(cassette.playing).toBe(false);
  });

  it("should generate correct status byte", () => {
    cassette.loadTape([0x10, 0x20]);
    cassette.control(0x03); // Motor on + Play

    const status = cassette.getStatus();

    expect(status & 0x01).toBe(0x01); // Motor on
    expect(status & 0x02).toBe(0x02); // Playing
    expect(status & 0x08).toBe(0x08); // Data available
  });
});

describe("CassetteSystem - Sequential Reading", () => {
  let cassette;

  beforeEach(() => {
    cassette = new CassetteSystem();
  });

  it("should read bytes sequentially", () => {
    cassette.loadTape([0x10, 0x20, 0x30]);

    expect(cassette.readByte()).toBe(0x10);
    expect(cassette.readByte()).toBe(0x20);
    expect(cassette.readByte()).toBe(0x30);
  });

  it("should return 0 after tape end", () => {
    cassette.loadTape([0x42]);

    cassette.readByte(); // Read the only byte
    const afterEnd = cassette.readByte();

    expect(afterEnd).toBe(0x00);
  });
});

describe("CassetteSystem - Tape Control", () => {
  let cassette;

  beforeEach(() => {
    cassette = new CassetteSystem();
  });

  it("should rewind tape", () => {
    cassette.loadTape([0x10, 0x20, 0x30]);
    cassette.readByte();
    cassette.readByte();

    cassette.rewind();

    expect(cassette.tapePosition).toBe(0);
  });

  it("should eject tape", () => {
    cassette.loadTape([0x10, 0x20]);
    cassette.control(0x01);

    cassette.eject();

    expect(cassette.tapeData).toBe(null);
    expect(cassette.tapePosition).toBe(0);
    expect(cassette.tapeLength).toBe(0);
    expect(cassette.motorOn).toBe(false);
  });
});
