/**
 * TRS-80 Model III System
 *
 * Owns and wires the machine: Z80 CPU, memory map, I/O ports, and the
 * keyboard matrix. Runs the CPU in T-state-budgeted slices at the real
 * 2.02752 MHz clock and raises the 30 Hz RTC heartbeat interrupt the
 * ROM's clock/cursor services depend on.
 *
 * Rendering is the caller's concern: pass `memory` to a VideoSystem and
 * consult `memory.videoDirty`. Keyboard input goes through
 * `system.keyboard` (attach to a DOM element, or press/release directly).
 */

import { Z80CPU } from "@core/z80cpu.js";
import { MemorySystem } from "@core/memory.js";
import { IOSystem } from "@core/io.js";
import { KeyboardMatrix } from "@peripherals/keyboard.js";

export const CPU_CLOCK_HZ = 2027520;
export const RTC_HZ = 30;
export const RTC_INTERVAL_TSTATES = CPU_CLOCK_HZ / RTC_HZ; // 67,584

export class TRS80System {
  constructor({ romData }) {
    this.memory = new MemorySystem();
    this.io = new IOSystem();
    this.keyboard = new KeyboardMatrix();
    this.cpu = new Z80CPU();

    this.memory.keyboard = this.keyboard;

    this.cpu.readMemory = (addr) => this.memory.readByte(addr);
    this.cpu.writeMemory = (addr, value) => this.memory.writeByte(addr, value);
    this.cpu.readPort = (port) => this.io.readPort(port);
    this.cpu.writePort = (port, value) => this.io.writePort(port, value);

    this.memory.loadROM(romData);

    this.nextRtcAt = RTC_INTERVAL_TSTATES;
    this.reset();
  }

  /**
   * Hardware reset (the orange button): CPU restarts at 0x0000, interrupt
   * latches clear, screen blanks. RAM contents survive, as on the real
   * machine.
   */
  reset() {
    this.cpu.reset();
    this.io.reset();
    this.keyboard.reset();
    this.memory.clearVideoRAM();
    this.nextRtcAt = this.cpu.cycles + RTC_INTERVAL_TSTATES;
    this._nmiWasPending = false;
  }

  /**
   * Execute instructions until `budget` T-states have elapsed, raising
   * the RTC heartbeat on schedule and delivering pending interrupts
   * between instructions. Returns the T-states actually consumed (the
   * final instruction may overshoot slightly).
   */
  runTStates(budget) {
    const start = this.cpu.cycles;
    const target = start + budget;

    while (this.cpu.cycles < target) {
      if (this.cpu.cycles >= this.nextRtcAt) {
        this.io.raiseRTC();
        this.nextRtcAt += RTC_INTERVAL_TSTATES;
      }
      if (this.io.pendingInterrupt()) {
        this.cpu.interrupt();
      }
      // FDC INTRQ -> NMI, edge-triggered so one assertion fires one NMI
      const nmiNow = this.io.nmiPending();
      if (nmiNow && !this._nmiWasPending) {
        this.cpu.nmi();
      }
      this._nmiWasPending = nmiNow;

      const before = this.cpu.cycles;
      this.cpu.executeInstruction();
      this.io.fdc.tick(this.cpu.cycles - before);
    }

    return this.cpu.cycles - start;
  }

  /** Mount a .dsk image (DiskImage) in drive 0-3. */
  mountDisk(driveNumber, image) {
    this.io.fdc.attachDrive(driveNumber, image);
  }

  ejectDisk(driveNumber) {
    this.io.fdc.ejectDrive(driveNumber);
  }

  /** Convenience for tests: run N emulated seconds. */
  runSeconds(seconds) {
    return this.runTStates(Math.round(seconds * CPU_CLOCK_HZ));
  }

  /**
   * Type text through the keyboard matrix at emulated speed ("turbo
   * paste"): each key is held long enough for the ROM's scan/debounce,
   * but the wall-clock cost is only the emulation time (~3 ms/char).
   * '\n' presses ENTER. Returns the number of characters that had no
   * matrix mapping and were skipped.
   *
   * After ENTER the ROM tokenizes and stores the line (cost grows with
   * program size) before it scans the keyboard again — give it room or
   * the first character of the next line gets eaten. The default suits
   * the small built-in classics; pass a larger `enterTStates` for
   * multi-KB listings (a 5.7 KB program needs ~1M).
   */
  typeText(text, { enterTStates = 400000 } = {}) {
    let skipped = 0;
    let seq = 0;
    for (const ch of text) {
      const key = ch === "\n" ? "Enter" : ch;
      const code = `typeText:${seq++}`;
      if (!this.keyboard.keyDown(key, code)) {
        skipped++;
        continue;
      }
      this.runTStates(70000); // held across several scans + debounce
      this.keyboard.keyUp(code);
      this.runTStates(ch === "\n" ? enterTStates : 50000);
    }
    return skipped;
  }

  /**
   * The 64x16 screen as strings, for tests and status displays.
   * Control bytes 0x00-0x1F display as their 0x40-0x5F fold (Model III
   * character generator); block-graphics bytes render as '.'.
   */
  screenText() {
    const rows = [];
    for (let row = 0; row < 16; row++) {
      let line = "";
      for (let col = 0; col < 64; col++) {
        let byte = this.memory.videoRam[row * 64 + col];
        if (byte < 0x20) {
          byte += 0x40;
        }
        line += byte >= 0x20 && byte < 0x80 ? String.fromCharCode(byte) : ".";
      }
      rows.push(line);
    }
    return rows;
  }
}
