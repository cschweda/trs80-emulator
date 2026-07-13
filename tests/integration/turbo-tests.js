/**
 * Turbo integration: the real ROM, the real CPU, the real turbo budget.
 *
 * Proves the claim CHANGELOG.md makes — that turbo advances the machine
 * ten times further per frame — against a booted Model III rather than a
 * stub, and proves the machine's own clock scales with it (which is the
 * property that lets turbo be a purely host-side change).
 */

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, vi } from "vitest";
import { TRS80System, CPU_CLOCK_HZ } from "@system/trs80-system.js";
import {
  TURBO_SPEED,
  TURBO_FRAME_MS,
  frameBudgetTStates,
  runSliced,
} from "@ui/turbo.js";

// vitest runs with the repo root as cwd; jsdom's import.meta.url is not
// a file: URL, so resolve from cwd instead.
const ROM_PATH = path.resolve(process.cwd(), "public/assets/model3.rom");
const romData = new Uint8Array(fs.readFileSync(ROM_PATH));

const FRAME_MS = 16;
const FRAMES = 30;

// A clock that never reaches the deadline: this machine is fast enough to
// spend the whole turbo budget. What the deadline does when it ISN'T is
// covered by tests/unit/turbo-tests.js, with an injected slow clock.
const fastClock = () => 0;

function turboFrame(system) {
  runSliced(
    frameBudgetTStates(FRAME_MS, CPU_CLOCK_HZ, TURBO_SPEED),
    (slice) => system.runTStates(slice),
    fastClock,
    TURBO_FRAME_MS
  );
}

function normalFrame(system) {
  system.runTStates(frameBudgetTStates(FRAME_MS, CPU_CLOCK_HZ, 1));
}

describe("turbo on a booted Model III", () => {
  it("advances the machine ten times further per frame", () => {
    const normal = new TRS80System({ romData });
    const turbo = new TRS80System({ romData });

    const normalStart = normal.cpu.cycles;
    const turboStart = turbo.cpu.cycles;
    for (let i = 0; i < FRAMES; i++) {
      normalFrame(normal);
      turboFrame(turbo);
    }
    const ran = {
      normal: normal.cpu.cycles - normalStart,
      turbo: turbo.cpu.cycles - turboStart,
    };

    const ratio = ran.turbo / ran.normal;
    expect(ratio).toBeGreaterThan(9.9);
    expect(ratio).toBeLessThan(10.1);
  });

  it("keeps the 30 Hz RTC in proportion, so the machine cannot tell", () => {
    // The RTC is scheduled off cpu.cycles, so ten times the cycles must
    // mean ten times the heartbeats. This is the property that makes
    // turbo safe: nothing inside the machine sees a distorted clock.
    const normal = new TRS80System({ romData });
    const turbo = new TRS80System({ romData });
    const normalRtc = vi.spyOn(normal.io, "raiseRTC");
    const turboRtc = vi.spyOn(turbo.io, "raiseRTC");

    for (let i = 0; i < FRAMES; i++) {
      normalFrame(normal);
      turboFrame(turbo);
    }

    const ratio = turboRtc.mock.calls.length / normalRtc.mock.calls.length;
    expect(normalRtc).toHaveBeenCalled();
    expect(ratio).toBeGreaterThan(9.5);
    expect(ratio).toBeLessThan(10.5);
  });
});
