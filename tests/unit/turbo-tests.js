/**
 * Turbo core tests
 *
 * The budget maths and the slice/deadline loop are pure — the clock is
 * injected — so they run here with no DOM and no machine.
 */

import { describe, it, expect } from "vitest";
import {
  TURBO_SPEED,
  TURBO_SLICE_TSTATES,
  frameBudgetTStates,
  runSliced,
} from "@ui/turbo.js";

const CPU_HZ = 2027520;

describe("frameBudgetTStates", () => {
  it("buys one second of machine time for one second of real time at 1x", () => {
    expect(frameBudgetTStates(1000, CPU_HZ, 1)).toBe(CPU_HZ);
  });

  it("buys ten times as much at turbo speed", () => {
    expect(frameBudgetTStates(1000, CPU_HZ, TURBO_SPEED)).toBe(CPU_HZ * 10);
  });

  it("runs at real time when no speed is given", () => {
    expect(frameBudgetTStates(16, CPU_HZ)).toBe(Math.round(0.016 * CPU_HZ));
  });
});

describe("runSliced", () => {
  // A machine that consumes exactly what it is asked for, plus a clock
  // the test drives by hand.
  function harness({ msPerSlice = 0 } = {}) {
    const calls = [];
    let t = 0;
    return {
      calls,
      clock: () => t,
      run: (slice) => {
        calls.push(slice);
        t += msPerSlice;
        return slice;
      },
    };
  }

  it("spends the whole budget when the clock stays inside the deadline", () => {
    const h = harness();
    const budget = TURBO_SLICE_TSTATES * 4;

    expect(runSliced(budget, h.run, h.clock, 12)).toBe(budget);
    expect(h.calls).toEqual(Array(4).fill(TURBO_SLICE_TSTATES));
  });

  it("stops early once the deadline passes, leaving budget unspent", () => {
    // Each slice costs 5 ms of real time and the deadline is 12 ms, so
    // the fourth slice never starts. This is the whole slow-device story:
    // less than 10x, rather than a dropped frame.
    const h = harness({ msPerSlice: 5 });
    const budget = TURBO_SLICE_TSTATES * 10;

    const consumed = runSliced(budget, h.run, h.clock, 12);

    expect(h.calls.length).toBe(3);
    expect(consumed).toBe(TURBO_SLICE_TSTATES * 3);
    expect(consumed).toBeLessThan(budget);
  });

  it("always runs one slice even if the frame is already past its deadline", () => {
    // A late rAF callback can hand us a frame whose deadline is already
    // gone. Turbo must still advance the machine — freezing it would be
    // the exact opposite of the feature.
    const h = harness();

    const consumed = runSliced(TURBO_SLICE_TSTATES * 4, h.run, h.clock, -1);

    expect(h.calls.length).toBe(1);
    expect(consumed).toBe(TURBO_SLICE_TSTATES);
  });

  it("decrements by what the machine really consumed, not the slice asked for", () => {
    // TRS80System.runTStates() overshoots on its final instruction and
    // returns the true figure. Ignoring it would drift the budget.
    const calls = [];
    const run = (slice) => {
      calls.push(slice);
      return slice + 7; // overshoot
    };

    const consumed = runSliced(TURBO_SLICE_TSTATES * 2, run, () => 0, 12);

    expect(calls).toEqual([TURBO_SLICE_TSTATES, TURBO_SLICE_TSTATES - 7]);
    expect(consumed).toBe(TURBO_SLICE_TSTATES * 2 + 7);
  });

  it("does not spin the frame when the machine consumes nothing", () => {
    expect(runSliced(TURBO_SLICE_TSTATES, () => 0, () => 0, 12)).toBe(0);
  });

  it("spends nothing on an empty budget", () => {
    const run = () => {
      throw new Error("must not run");
    };
    expect(runSliced(0, run, () => 0, 12)).toBe(0);
  });
});
