/**
 * I/O System Unit Tests
 * Tests port handling and keyboard buffer
 */

import { describe, it, expect, beforeEach } from "vitest";
import { IOSystem } from "@core/io.js";

describe("IOSystem - Initialization", () => {
  let io;

  beforeEach(() => {
    io = new IOSystem();
  });

  it("should initialize cassette system", () => {
    expect(io.cassette).toBeDefined();
    expect(io.cassette.motorOn).toBe(false);
  });

  it("should initialize keyboard buffer", () => {
    expect(io.keyboardBuffer).toEqual([]);
  });

  it("should initialize port handlers", () => {
    expect(io.portHandlers).toBeDefined();
    expect(io.portHandlers.size).toBeGreaterThan(0);
  });
});

describe("IOSystem - Port Operations (Test 3.5)", () => {
  let io;

  beforeEach(() => {
    io = new IOSystem();
  });

  it("should write to cassette port (0xFE)", () => {
    io.writePort(0xfe, 0x01);

    expect(io.cassette.motorOn).toBe(true);
  });

  it("should read cassette status from port 0xFE", () => {
    io.cassette.loadTape([0x10]);
    io.cassette.control(0x01);

    const status = io.readPort(0xfe);

    expect(status & 0x01).toBe(0x01); // Motor on
  });

  it("should return 0xFF for undefined ports", () => {
    const value = io.readPort(0x99);

    expect(value).toBe(0xff);
  });
});

describe("IOSystem - Keyboard Buffer", () => {
  let io;

  beforeEach(() => {
    io = new IOSystem();
  });

  it("should add key to buffer", () => {
    io.addKey(0x41); // 'A'
    io.addKey(0x42); // 'B'

    expect(io.keyboardBuffer.length).toBe(2);
  });

  it("should read from keyboard port (0xFF)", () => {
    io.addKey(0x41);

    const key = io.readPort(0xff);

    expect(key).toBe(0x41);
    expect(io.keyboardBuffer.length).toBe(0); // Consumed
  });

  it("should return 0 when buffer is empty", () => {
    const key = io.readPort(0xff);

    expect(key).toBe(0x00);
  });

  it("should process keys in FIFO order", () => {
    io.addKey(0x41);
    io.addKey(0x42);
    io.addKey(0x43);

    expect(io.readPort(0xff)).toBe(0x41);
    expect(io.readPort(0xff)).toBe(0x42);
    expect(io.readPort(0xff)).toBe(0x43);
  });

  it("should clear keyboard buffer", () => {
    io.addKey(0x41);
    io.addKey(0x42);

    io.clearKeyboardBuffer();

    expect(io.keyboardBuffer.length).toBe(0);
  });

  it("should limit buffer size to 256", () => {
    for (let i = 0; i < 300; i++) {
      io.addKey(i & 0xff);
    }

    expect(io.keyboardBuffer.length).toBeLessThanOrEqual(256);
  });
});


