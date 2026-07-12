/**
 * Cassette-port sound tests
 *
 * The Model III's only sound source is the cassette output (port 0xFF
 * bits 0-1). IOSystem logs level transitions with T-state timestamps;
 * synthesizeSamples turns a time slice of transitions into PCM.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { synthesizeSamples, sliceIsSilent } from "@peripherals/sound.js";
import { IOSystem } from "@core/io.js";

const CPU_HZ = 2027520;
const RATE = 22050;

describe("synthesizeSamples", () => {
  it("produces the right sample count for a slice", () => {
    const { samples } = synthesizeSamples([], 0, CPU_HZ, CPU_HZ, RATE, 0);
    expect(samples.length).toBe(RATE); // one emulated second
  });

  it("renders silence when the level is 0 and nothing changes", () => {
    const { samples, endLevel } = synthesizeSamples(
      [],
      0,
      CPU_HZ / 10,
      CPU_HZ,
      RATE,
      0
    );
    expect(endLevel).toBe(0);
    expect(samples.every((s) => s === 0)).toBe(true);
  });

  it("holds a positive level across the whole slice", () => {
    const { samples } = synthesizeSamples([], 0, CPU_HZ / 10, CPU_HZ, RATE, 1);
    expect(samples.every((s) => s === 1)).toBe(true);
  });

  it("renders a square wave from alternating transitions", () => {
    // 1kHz square: flip every ~1014 T-states over 1/10 s
    const halfPeriod = Math.round(CPU_HZ / 2000);
    const transitions = [];
    let level = 1;
    for (let t = 0; t < CPU_HZ / 10; t += halfPeriod) {
      transitions.push({ t, level });
      level = level === 1 ? 2 : 1;
    }
    const { samples } = synthesizeSamples(
      transitions,
      0,
      CPU_HZ / 10,
      CPU_HZ,
      RATE,
      0
    );
    const positive = samples.filter((s) => s > 0).length;
    const negative = samples.filter((s) => s < 0).length;
    // Half up, half down (within rounding slop)
    expect(positive).toBeGreaterThan(samples.length * 0.4);
    expect(negative).toBeGreaterThan(samples.length * 0.4);
    expect(positive + negative).toBeGreaterThan(samples.length * 0.95);
  });

  it("reports the level in effect at the end of the slice", () => {
    const { endLevel } = synthesizeSamples(
      [{ t: 100, level: 2 }],
      0,
      10000,
      CPU_HZ,
      RATE,
      1
    );
    expect(endLevel).toBe(2);
  });

  it("clamps transitions from before the slice to its start", () => {
    const { samples } = synthesizeSamples(
      [{ t: -5000, level: 1 }],
      0,
      CPU_HZ / 100,
      CPU_HZ,
      RATE,
      0
    );
    expect(samples.every((s) => s === 1)).toBe(true);
  });

  it("sliceIsSilent is true only for no transitions at zero level", () => {
    expect(sliceIsSilent([], 0)).toBe(true);
    expect(sliceIsSilent([], 3)).toBe(true); // 3 also rests at zero
    expect(sliceIsSilent([], 1)).toBe(false);
    expect(sliceIsSilent([{ t: 0, level: 0 }], 0)).toBe(false);
  });
});

describe("IOSystem cassette-out transition log", () => {
  let io;
  let cycles;

  beforeEach(() => {
    io = new IOSystem();
    cycles = 0;
    io.getCycles = () => cycles;
  });

  it("records level changes with timestamps", () => {
    cycles = 100;
    io.writePort(0xff, 0x01);
    cycles = 200;
    io.writePort(0xff, 0x02);

    expect(io.drainSound()).toEqual([
      { t: 100, level: 1 },
      { t: 200, level: 2 },
    ]);
  });

  it("ignores writes that do not change the level", () => {
    io.writePort(0xff, 0x01);
    io.writePort(0xff, 0x01);
    io.writePort(0xff, 0x01);
    expect(io.drainSound().length).toBe(1);
  });

  it("drain empties the log", () => {
    io.writePort(0xff, 0x01);
    io.drainSound();
    expect(io.drainSound().length).toBe(0);
  });

  it("only bits 0-1 count as the level", () => {
    io.writePort(0xff, 0xfd); // level = 0xfd & 3 = 1
    const log = io.drainSound();
    expect(log).toEqual([{ t: 0, level: 1 }]);
  });

  it("caps the log when nothing drains it", () => {
    io.SOUND_LOG_LIMIT = 10;
    for (let i = 0; i < 50; i++) {
      io.writePort(0xff, (i % 2) + 1); // alternate 1/2
    }
    expect(io.soundLog.length).toBe(10);
  });

  it("reset clears the log", () => {
    io.writePort(0xff, 0x01);
    io.reset();
    expect(io.drainSound().length).toBe(0);
  });
});
