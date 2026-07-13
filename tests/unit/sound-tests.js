/**
 * Cassette-port sound tests
 *
 * The Model III's only sound source is the cassette output (port 0xFF
 * bits 0-1). IOSystem logs level transitions with T-state timestamps;
 * synthesizeSamples turns a time slice of transitions into PCM.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  synthesizeSamples,
  sliceIsSilent,
  SoundDriver,
} from "@peripherals/sound.js";
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

describe("SoundDriver.pump({ silent }) — turbo mutes", () => {
  // A minimal AudioContext stand-in: enough for pump() to believe audio
  // is live, and spied so a test can prove nothing was scheduled.
  function liveDriver() {
    const driver = new SoundDriver();
    driver.enabled = true;
    driver.supported = true;
    driver.gain = {};
    driver.ctx = {
      state: "running",
      sampleRate: RATE,
      currentTime: 0,
      createBuffer: vi.fn(() => ({
        duration: 0.016,
        copyToChannel: vi.fn(),
      })),
      createBufferSource: vi.fn(() => ({
        buffer: null,
        connect: vi.fn(),
        start: vi.fn(),
      })),
    };
    return driver;
  }

  const systemWith = (transitions) => ({
    io: { drainSound: () => transitions },
  });

  it("schedules no audio at all while turbo is muting it", () => {
    const driver = liveDriver();

    driver.pump(systemWith([{ t: 10, level: 1 }]), 0, 100000, CPU_HZ, {
      silent: true,
    });

    expect(driver.ctx.createBuffer).not.toHaveBeenCalled();
    expect(driver.ctx.createBufferSource).not.toHaveBeenCalled();
  });

  it("still drains the transition log, so it cannot grow without bound", () => {
    const driver = liveDriver();
    const drainSound = vi.fn(() => []);

    driver.pump({ io: { drainSound } }, 0, 100000, CPU_HZ, { silent: true });

    expect(drainSound).toHaveBeenCalled();
  });

  it("tracks the DC level, so audio resumes correctly when turbo drops", () => {
    const driver = liveDriver();

    driver.pump(
      systemWith([
        { t: 10, level: 1 },
        { t: 20, level: 2 },
      ]),
      0,
      100000,
      CPU_HZ,
      { silent: true }
    );

    expect(driver.lastLevel).toBe(2);
  });

  it("leaves the user's sound preference and the AudioContext untouched", () => {
    const driver = liveDriver();

    driver.pump(systemWith([]), 0, 100000, CPU_HZ, { silent: true });

    expect(driver.enabled).toBe(true);
    expect(driver.ctx.state).toBe("running");
  });

  it("schedules audio again the moment silent is false (control case)", () => {
    const driver = liveDriver();

    driver.pump(systemWith([{ t: 10, level: 1 }]), 0, 100000, CPU_HZ, {
      silent: false,
    });

    expect(driver.ctx.createBuffer).toHaveBeenCalled();
    expect(driver.ctx.createBufferSource).toHaveBeenCalled();
  });

  it("defaults to audible when no options are passed (existing callers)", () => {
    const driver = liveDriver();

    driver.pump(systemWith([{ t: 10, level: 1 }]), 0, 100000, CPU_HZ);

    expect(driver.ctx.createBuffer).toHaveBeenCalled();
  });
});
