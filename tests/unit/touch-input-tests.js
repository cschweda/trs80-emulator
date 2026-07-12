/**
 * TouchTyper pacing tests
 *
 * Soft-keyboard characters must be pressed one at a time, held long
 * enough for the ROM's scan/debounce, and fully released before the
 * next press - otherwise repeated letters merge into one.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TouchTyper } from "@ui/touch-input.js";

describe("TouchTyper", () => {
  let events;
  let typer;

  beforeEach(() => {
    vi.useFakeTimers();
    events = [];
    typer = new TouchTyper({
      press: (key, code) => {
        if (key === "~unmapped~") return false;
        events.push(["press", key, code]);
        return true;
      },
      release: (code) => {
        events.push(["release", code]);
      },
      holdMs: 90,
      gapMs: 40,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("presses immediately and releases after the hold time", () => {
    typer.enqueue("A");
    expect(events).toEqual([["press", "A", "touch:0"]]);

    vi.advanceTimersByTime(89);
    expect(events.length).toBe(1); // still held

    vi.advanceTimersByTime(1);
    expect(events[1]).toEqual(["release", "touch:0"]);
  });

  it("serializes characters: press N+1 only after release N plus a gap", () => {
    typer.enqueueText("AB");
    expect(events).toEqual([["press", "A", "touch:0"]]);

    vi.advanceTimersByTime(90); // A released
    expect(events.length).toBe(2);
    vi.advanceTimersByTime(39); // gap not over
    expect(events.length).toBe(2);
    vi.advanceTimersByTime(1); // gap over -> B pressed
    expect(events[2]).toEqual(["press", "B", "touch:1"]);
  });

  it("gives repeated letters distinct codes so both register", () => {
    typer.enqueueText("LL");
    vi.runAllTimers();
    const presses = events.filter(([kind]) => kind === "press");
    expect(presses.length).toBe(2);
    expect(presses[0][2]).not.toBe(presses[1][2]);
  });

  it("maps newline to Enter and skips unmappable characters", () => {
    typer.enqueueText("A\n");
    typer.enqueue("~unmapped~");
    typer.enqueue("B");
    vi.runAllTimers();
    const keys = events
      .filter(([kind]) => kind === "press")
      .map(([, key]) => key);
    expect(keys).toEqual(["A", "Enter", "B"]);
  });
});
