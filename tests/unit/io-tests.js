/**
 * I/O System Unit Tests — Model III port map
 *
 * Real Model III ports (non-disk machine):
 *   0xE0-0xE3  read: interrupt latch (pending bits read as 0, i.e. ~latch)
 *              write: interrupt mask (bit set = source enabled)
 *   0xEC-0xEF  read: acknowledge/clear the RTC interrupt
 *              write: mode register (bit 1 = cassette motor)
 *   0xF0-0xF3  floppy controller — absent, reads float to 0xFF
 *   0xFF       cassette data port
 * The keyboard is memory-mapped at 0x3800-0x3BFF, NOT an I/O port.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { IOSystem, RTC_IRQ_BIT } from "@core/io.js";

describe("IOSystem - Initialization", () => {
  let io;

  beforeEach(() => {
    io = new IOSystem();
  });

  it("should initialize cassette system", () => {
    expect(io.cassette).toBeDefined();
    expect(io.cassette.motorOn).toBe(false);
  });

  it("should initialize port handlers", () => {
    expect(io.portHandlers).toBeDefined();
    expect(io.portHandlers.size).toBeGreaterThan(0);
  });

  it("should start with no pending interrupts and an empty mask", () => {
    expect(io.intLatch).toBe(0);
    expect(io.intMask).toBe(0);
    expect(io.pendingInterrupt()).toBe(false);
  });
});

describe("IOSystem - Interrupt latch and mask (ports 0xE0/0xEC)", () => {
  let io;

  beforeEach(() => {
    io = new IOSystem();
  });

  it("raiseRTC sets the RTC latch bit; 0xE0 reads it active-low", () => {
    expect(io.readPort(0xe0)).toBe(0xff); // nothing pending

    io.raiseRTC();

    expect(io.readPort(0xe0)).toBe((~RTC_IRQ_BIT) & 0xff); // 0xFB
  });

  it("pendingInterrupt requires both latch and mask bits", () => {
    io.raiseRTC();
    expect(io.pendingInterrupt()).toBe(false); // masked off

    io.writePort(0xe0, RTC_IRQ_BIT); // enable RTC interrupts

    expect(io.pendingInterrupt()).toBe(true);
  });

  it("reading 0xEC acknowledges the RTC interrupt", () => {
    io.writePort(0xe0, RTC_IRQ_BIT);
    io.raiseRTC();
    expect(io.pendingInterrupt()).toBe(true);

    io.readPort(0xec);

    expect(io.pendingInterrupt()).toBe(false);
    expect(io.readPort(0xe0)).toBe(0xff);
  });

  it("latch reads identically across the 0xE0-0xE3 mirror", () => {
    io.raiseRTC();

    expect(io.readPort(0xe1)).toBe((~RTC_IRQ_BIT) & 0xff);
    expect(io.readPort(0xe3)).toBe((~RTC_IRQ_BIT) & 0xff);
  });
});

describe("IOSystem - Mode register (port 0xEC write)", () => {
  let io;

  beforeEach(() => {
    io = new IOSystem();
  });

  it("bit 1 controls the cassette motor", () => {
    io.writePort(0xec, 0x02);
    expect(io.cassette.motorOn).toBe(true);

    io.writePort(0xec, 0x00);
    expect(io.cassette.motorOn).toBe(false);
  });

  it("stores the full mode value for later use", () => {
    io.writePort(0xec, 0x0e);

    expect(io.modeRegister).toBe(0x0e);
  });
});

describe("IOSystem - Absent hardware floats high", () => {
  let io;

  beforeEach(() => {
    io = new IOSystem();
  });

  it("FDC ports 0xF0-0xF3 read 0xFF (no disk controller)", () => {
    expect(io.readPort(0xf0)).toBe(0xff);
    expect(io.readPort(0xf1)).toBe(0xff);
    expect(io.readPort(0xf3)).toBe(0xff);
  });

  it("unmapped ports read 0xFF", () => {
    expect(io.readPort(0x99)).toBe(0xff);
  });

  it("writes to absent hardware are ignored without error", () => {
    expect(() => io.writePort(0xf0, 0x55)).not.toThrow();
    expect(() => io.writePort(0x99, 0x55)).not.toThrow();
  });
});

describe("IOSystem - Legacy keyboard buffer (internal API only)", () => {
  let io;

  beforeEach(() => {
    io = new IOSystem();
  });

  it("buffers and consumes keys in FIFO order", () => {
    io.addKey(0x41);
    io.addKey(0x42);

    expect(io.readKeyboard()).toBe(0x41);
    expect(io.readKeyboard()).toBe(0x42);
    expect(io.readKeyboard()).toBe(0x00);
  });

  it("clears and caps the buffer", () => {
    for (let i = 0; i < 300; i++) {
      io.addKey(i & 0xff);
    }
    expect(io.keyboardBuffer.length).toBeLessThanOrEqual(256);

    io.clearKeyboardBuffer();
    expect(io.keyboardBuffer.length).toBe(0);
  });
});
