# Turbo Mode Implementation Plan (v1.4.0)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user fast-forward the emulated Model III to 10× by holding backtick (momentary) or clicking a status-bar pill (session latch).

**Architecture:** Turbo is a multiplier on the T-state budget the frame loop hands `TRS80System.runTStates()` — nothing more. Every event inside the machine (the 30 Hz RTC heartbeat, the FDC tick, cassette bit timing) is scheduled off `cpu.cycles`, so scaling the budget speeds the whole machine up *coherently* and `TRS80System` never learns turbo exists. Only two couplings to the host break: audio (bridged to the WebAudio wall clock, so it must mute) and the frame budget (sliced against a deadline, so a slow device degrades below 10× instead of stuttering).

**Tech Stack:** Vanilla JS ES modules, Vite 5, Vitest (jsdom), yarn. Path aliases `@core` `@peripherals` `@system` `@ui` `@data`.

**Spec:** `docs/superpowers/specs/2026-07-13-turbo-mode-design.md`

## Global Constraints

- **Turbo speed is 10×.** One speed, not a cycle of speeds.
- **Turbo is never persisted.** Nothing is written to `localStorage`. It is off on every load.
- **`TRS80System` must not change.** No file under `src/system/` or `src/core/` is touched by this plan. If a task seems to need it, stop and flag it.
- **The non-turbo frame path must stay a single `runTStates(budget)` call.** Normal play carries none of the slicing machinery.
- **Two inputs, one truth:** `turboActive() === turboHeld || turboLatched`. Blur, modal-open and loop-stop clear **`turboHeld` only** — never `turboLatched`, which is an explicit user choice.
- **The engage/disengage rule is asymmetric.** `keydown` is gated by `isFormField()` / `isUiModalOpen()`; `keyup` is **not** — releasing the key always drops turbo, whatever has focus.
- **The turbo key is `e.code === "Backquote"`.** Not F12 (browser-reserved for DevTools; `preventDefault()` does not suppress it, and on macOS the F-row is media keys).
- **Commit messages carry no AI co-author trailer.** Repository-wide rule.
- Node ≥ 20.6.0 (already in `engines`).

**Naming collision — read this before you grep.** The codebase already uses the word "turbo" for something else: `TRS80System.typeText()` is documented as "turbo paste" (`src/system/trs80-system.js:123`) and `README.md:27` mentions "snappier turbo-typing". That is the *keyboard* fast-path for injecting BASIC listings, and it has nothing to do with turbo mode. Do not touch it, do not rename it, and do not wire this feature into it.

---

### Task 1: Pure turbo core

The budget maths and the slice/deadline loop, with an injected clock, so they are testable without a DOM or a machine. This follows the codebase's existing pure-core pattern (`synthesizeSamples`, `normalizeScale`, `wellLayout`).

**Files:**
- Create: `src/ui/turbo.js`
- Test: `tests/unit/turbo-tests.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `TURBO_SPEED: number` (10)
  - `TURBO_FRAME_MS: number` (12)
  - `TURBO_SLICE_TSTATES: number` (50000)
  - `frameBudgetTStates(elapsedMs: number, cpuHz: number, speed?: number): number`
  - `runSliced(budget: number, run: (slice: number) => number, clock: () => number, deadline: number): number` — returns T-states actually consumed.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/turbo-tests.js`:

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn vitest run tests/unit/turbo-tests.js`
Expected: FAIL — `Failed to resolve import "@ui/turbo.js"`.

- [ ] **Step 3: Write the implementation**

Create `src/ui/turbo.js`:

```js
/**
 * Turbo mode: the host's time-dilation knob.
 *
 * The emulated Model III never learns turbo exists. Every event inside
 * TRS80System.runTStates() — the 30 Hz RTC heartbeat, the FDC tick,
 * cassette bit timing — is scheduled off cpu.cycles, so multiplying the
 * T-state budget the frame loop hands it speeds the whole machine up
 * coherently: its clock, its interrupts and its disk stay in exact
 * proportion. Only the rate at which the host feeds it time changes.
 *
 * Both functions here are pure (the clock is injected), so they are
 * tested without a browser.
 */

/** Turbo runs the machine ten times faster than the 2.03 MHz original. */
export const TURBO_SPEED = 10;

/**
 * Wall-clock ceiling for one turbo frame. At 10x the frame loop's 66 ms
 * catch-up cap becomes 660 ms of emulated time — about 8 ms of real work
 * on a machine that sustains ~83x realtime, but far more on a phone. The
 * deadline is what turns "stutters on slow hardware" into "delivers less
 * than 10x on slow hardware".
 */
export const TURBO_FRAME_MS = 12;

/**
 * T-states per slice: how often runSliced() gets to look at the clock.
 * ~50k is ~25 ms of emulated time — fine enough to honour a 12 ms
 * deadline on a slow device, coarse enough that the check costs nothing.
 */
export const TURBO_SLICE_TSTATES = 50000;

/** T-states of machine time that `elapsedMs` of real time buys at `speed`. */
export function frameBudgetTStates(elapsedMs, cpuHz, speed = 1) {
  return Math.round((elapsedMs / 1000) * cpuHz * speed);
}

/**
 * Spend `budget` T-states in slices, stopping once `clock()` reaches
 * `deadline`. Returns the T-states actually consumed.
 *
 * `run(slice)` must return the T-states it really consumed —
 * TRS80System.runTStates() overshoots slightly on its final instruction,
 * which is why the remaining budget is decremented by the return value
 * and not by the slice size.
 *
 * At least one slice always runs. A late rAF callback can hand us a
 * frame whose deadline has already passed; the machine must still
 * advance, or turbo would freeze it instead of speeding it up.
 *
 * Budget the machine could not spend is simply time it did not
 * experience: nothing is carried forward, so there is no debt to repay
 * and no catch-up spiral.
 */
export function runSliced(budget, run, clock, deadline) {
  if (budget <= 0) return 0;

  let remaining = budget;
  let consumed = 0;
  do {
    const ran = run(Math.min(remaining, TURBO_SLICE_TSTATES));
    if (ran <= 0) break; // a stalled machine must not spin the frame
    consumed += ran;
    remaining -= ran;
  } while (remaining > 0 && clock() < deadline);

  return consumed;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `yarn vitest run tests/unit/turbo-tests.js`
Expected: PASS — 10 tests.

- [ ] **Step 5: Commit**

```bash
git add src/ui/turbo.js tests/unit/turbo-tests.js
git commit -m "feat: pure turbo core - budget maths and a deadline-sliced runner"
```

---

### Task 2: Sound mutes under turbo

**Why this is mandatory, not cosmetic:** `synthesizeSamples()` sizes each PCM chunk from *emulated* duration (`src/peripherals/sound.js:38`) and `pump()` schedules chunks back-to-back on the WebAudio wall clock (`sound.js:158`). At 10× each 16 ms frame would emit 160 ms of audio while 16 ms of real time passed — the queue would run away from real time permanently, the game's sound drifting ever further behind with buffers piling up unbounded.

**Files:**
- Modify: `src/peripherals/sound.js:107-125` (`pump()` signature and its early-return guard)
- Test: `tests/unit/sound-tests.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `SoundDriver.pump(system, fromCycle, toCycle, cpuHz, { silent = false } = {})` — when `silent` is true it drains the transition log and tracks `lastLevel`, but synthesizes and schedules nothing. It must **not** touch `this.enabled` and must **not** suspend the AudioContext.

- [ ] **Step 1: Write the failing test**

Append to `tests/unit/sound-tests.js`. First widen the existing imports at the top of the file:

```js
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  synthesizeSamples,
  sliceIsSilent,
  SoundDriver,
} from "@peripherals/sound.js";
```

Then append this block at the end of the file:

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn vitest run tests/unit/sound-tests.js`
Expected: FAIL — the first three tests fail because `pump()` ignores the 5th argument and schedules audio anyway (`createBuffer` was called).

- [ ] **Step 3: Write the implementation**

In `src/peripherals/sound.js`, replace the `pump()` docstring and signature and add `silent` to the guard:

```js
  /**
   * Feed the transitions of the just-emulated slice [fromCycle, toCycle).
   * Always drains the system's transition log, even when muted, so the
   * log can't grow without bound.
   *
   * `silent` is turbo's mute. Chunk length is derived from *emulated*
   * duration, so at 10x a 16 ms frame would emit 160 ms of audio and the
   * scheduled queue would run away from the wall clock for good. Muting
   * takes the same drain-and-track-level path as a disabled driver, but
   * without touching the user's preference or suspending the context —
   * so sound returns, at the right DC level, the instant turbo drops.
   */
  pump(system, fromCycle, toCycle, cpuHz, { silent = false } = {}) {
    const transitions = system.io.drainSound();

    if (
      silent ||
      !this.enabled ||
      !this.ctx ||
      this.ctx.state !== "running" ||
      toCycle <= fromCycle
    ) {
      if (transitions.length) {
        this.lastLevel = transitions[transitions.length - 1].level & 3;
      }
      return;
    }
```

The rest of `pump()` is unchanged.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `yarn vitest run tests/unit/sound-tests.js`
Expected: PASS — the pre-existing sound tests plus 6 new ones.

- [ ] **Step 5: Commit**

```bash
git add src/peripherals/sound.js tests/unit/sound-tests.js
git commit -m "feat: SoundDriver.pump({ silent }) so turbo can mute without desyncing WebAudio"
```

---

### Task 3: Turbo state, the frame loop, and the key

**Files:**
- Modify: `src/ui/emulator-ui.js` (imports; `emulator` state object at `:29-41`; `stepMachine()` at `:584-605`; `startEmulatorLoop()` key handlers at `:649-675`; `stopEmulatorLoop()` at `:678-695`; `onUiModalOpen()`)
- Test: `tests/unit/ui-tests.js`

**Interfaces:**
- Consumes: `TURBO_SPEED`, `TURBO_FRAME_MS`, `frameBudgetTStates`, `runSliced` from `@ui/turbo.js` (Task 1); `SoundDriver.pump(…, { silent })` (Task 2).
- Produces:
  - `emulator.turboHeld: boolean`, `emulator.turboLatched: boolean`
  - `export function turboActive(): boolean`
  - `updateTurboIndicator(): void` (module-private; Task 4 calls it from `initTurbo()`)

- [ ] **Step 1: Write the failing test**

In `tests/unit/ui-tests.js`, first **hoist `fakeSystem()` to module scope** so both describe blocks share it. Cut it out of the `"modal key isolation"` block (currently lines 69-78) and paste it just below the imports:

```js
// A minimal stand-in for TRS80System: just enough surface for
// startEmulatorLoop() and the matrix press/release path to run without
// booting the real ROM. keyDown/keyUp are spied so tests can assert on
// whether a dispatched window keyboard event ever reached them.
function fakeSystem() {
  return {
    memory: { videoDirty: false },
    keyboard: {
      keyDown: vi.fn(() => true),
      keyUp: vi.fn(() => true),
      reset: vi.fn(),
    },
  };
}
```

Widen the import from `@ui/emulator-ui.js` to include `turboActive`:

```js
import {
  readPickedFile,
  emulator,
  startEmulatorLoop,
  stopEmulatorLoop,
  onUiModalOpen,
  turboActive,
} from "@ui/emulator-ui.js";
```

Then append this block at the end of the file:

```js
describe("turbo mode", () => {
  const backtick = (type, opts = {}) =>
    new KeyboardEvent(type, { key: "`", code: "Backquote", ...opts });

  afterEach(() => {
    stopEmulatorLoop();
    emulator.system = null;
    emulator.turboHeld = false;
    emulator.turboLatched = false;
    document.body.innerHTML = "";
  });

  it("engages while the key is held and drops the moment it is released", () => {
    emulator.system = fakeSystem();
    startEmulatorLoop();

    window.dispatchEvent(backtick("keydown"));
    expect(turboActive()).toBe(true);

    window.dispatchEvent(backtick("keyup"));
    expect(turboActive()).toBe(false);
  });

  it("never reaches the keyboard matrix (the TRS-80 has no backtick key)", () => {
    emulator.system = fakeSystem();
    startEmulatorLoop();

    window.dispatchEvent(backtick("keydown"));
    window.dispatchEvent(backtick("keyup"));

    expect(emulator.system.keyboard.keyDown).not.toHaveBeenCalled();
    expect(emulator.system.keyboard.keyUp).not.toHaveBeenCalled();
  });

  it("stays engaged across the auto-repeat of a held key", () => {
    emulator.system = fakeSystem();
    startEmulatorLoop();

    window.dispatchEvent(backtick("keydown"));
    window.dispatchEvent(backtick("keydown", { repeat: true }));

    expect(turboActive()).toBe(true);
    expect(emulator.system.keyboard.keyDown).not.toHaveBeenCalled();
  });

  it("does not engage while a form field has focus", () => {
    document.body.innerHTML = '<input id="field" />';
    emulator.system = fakeSystem();
    startEmulatorLoop();

    document
      .getElementById("field")
      .dispatchEvent(backtick("keydown", { bubbles: true }));

    expect(turboActive()).toBe(false);
  });

  it("does not engage while the changelog modal is open", () => {
    document.body.innerHTML =
      '<div id="changelog-modal" style="display: block;"></div>';
    emulator.system = fakeSystem();
    startEmulatorLoop();

    window.dispatchEvent(backtick("keydown"));

    expect(turboActive()).toBe(false);
  });

  it("releases on keyup even when a form field has focus", () => {
    // Engaging is gated on focus; releasing must NOT be. If focus moved
    // mid-hold, a gated keyup would strand the machine at 10x forever.
    document.body.innerHTML = '<input id="field" />';
    emulator.system = fakeSystem();
    startEmulatorLoop();

    window.dispatchEvent(backtick("keydown"));
    expect(turboActive()).toBe(true);

    document
      .getElementById("field")
      .dispatchEvent(backtick("keyup", { bubbles: true }));

    expect(turboActive()).toBe(false);
  });

  it("blur drops a held key but keeps an explicit latch", () => {
    // Alt-tab mid-hold: the keyup never arrives, so the hold must be
    // dropped here — but a latch the user deliberately set must survive.
    emulator.system = fakeSystem();
    startEmulatorLoop();
    emulator.turboLatched = true;

    window.dispatchEvent(backtick("keydown"));
    window.dispatchEvent(new Event("blur"));

    expect(emulator.turboHeld).toBe(false);
    expect(emulator.turboLatched).toBe(true);
    expect(turboActive()).toBe(true);
  });

  it("opening the changelog drops a held key but keeps an explicit latch", () => {
    emulator.system = fakeSystem();
    startEmulatorLoop();
    emulator.turboLatched = true;

    window.dispatchEvent(backtick("keydown"));
    onUiModalOpen();

    expect(emulator.turboHeld).toBe(false);
    expect(emulator.turboLatched).toBe(true);
  });

  it("stopping the loop drops a held key (its keyup would never arrive)", () => {
    emulator.system = fakeSystem();
    startEmulatorLoop();

    window.dispatchEvent(backtick("keydown"));
    stopEmulatorLoop();

    expect(emulator.turboHeld).toBe(false);
  });

  it("is off on a fresh load and persists nothing", () => {
    expect(emulator.turboHeld).toBe(false);
    expect(emulator.turboLatched).toBe(false);
    expect(localStorage.getItem("trs80-turbo")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn vitest run tests/unit/ui-tests.js`
Expected: FAIL — `turboActive is not a function` (the import does not exist yet).

- [ ] **Step 3: Write the implementation**

In `src/ui/emulator-ui.js`:

**(a)** Add the import alongside the existing `@ui/` imports:

```js
import {
  TURBO_SPEED,
  TURBO_FRAME_MS,
  frameBudgetTStates,
  runSliced,
} from "@ui/turbo.js";
```

**(b)** Add two fields to the `emulator` object (after `holds`):

```js
  holds: new Map(), // physical code -> { pressedAt, timer, key }
  turboHeld: false, // the turbo key is physically down (momentary)
  turboLatched: false, // the status-bar pill was clicked (session only)
```

**(c)** Below `MIN_KEY_HOLD_MS`, add the key constant and the state helpers:

```js
// The TRS-80 has no backtick key, so the matrix can never want it. Match
// on e.code (physical position) — the matrix keys off e.key, so the two
// cannot collide. F12 is not an option: browsers reserve it for DevTools
// and preventDefault() does not suppress it, and on macOS the F-row is
// media keys that never reach the page.
const TURBO_KEY = "Backquote";

/** Turbo is on if the key is held OR the status-bar pill is latched. */
export function turboActive() {
  return emulator.turboHeld || emulator.turboLatched;
}

function setTurboHeld(held) {
  if (emulator.turboHeld === held) return;
  emulator.turboHeld = held;
  updateTurboIndicator();
}

function updateTurboIndicator() {
  const pill = document.getElementById("status-bar-turbo");
  if (!pill) return;
  const on = turboActive();
  pill.textContent = on ? `⏩ TURBO ${TURBO_SPEED}×` : "⏩ Turbo";
  pill.classList.toggle("on", on);
  // The question this control answers is "is turbo on?", so a held key
  // reads as pressed too — not just the latch.
  pill.setAttribute("aria-pressed", on ? "true" : "false");
}
```

**(d)** Replace `stepMachine()`:

```js
function stepMachine(now) {
  // Budget real elapsed time in T-states, capped at 4 frames so a
  // backgrounded tab doesn't come back with seconds of catch-up.
  const elapsedMs = Math.min(now - emulator.lastFrameTime || 16, 66);
  emulator.lastFrameTime = now;

  const turbo = turboActive();
  const fromCycle = emulator.system.cpu.cycles;
  const budget = frameBudgetTStates(
    elapsedMs,
    CPU_CLOCK_HZ,
    turbo ? TURBO_SPEED : 1
  );

  if (turbo) {
    // 660 ms of emulated time in one blocking call would drop frames on a
    // slow device. Slice it against a wall-clock deadline instead: what
    // doesn't fit is simply time the machine doesn't experience.
    runSliced(
      budget,
      (slice) => emulator.system.runTStates(slice),
      () => performance.now(),
      performance.now() + TURBO_FRAME_MS
    );
  } else {
    emulator.system.runTStates(budget);
  }

  emulator.sound.pump(
    emulator.system,
    fromCycle,
    emulator.system.cpu.cycles,
    CPU_CLOCK_HZ,
    { silent: turbo } // see sound.js: chunks are sized by emulated time
  );

  if (emulator.system.memory.videoDirty) {
    emulator.system.memory.videoDirty = false;
    emulator.video.renderScreen(
      emulator.system.memory,
      emulator.system.columns32
    );
  }
}
```

**(e)** In `startEmulatorLoop()`, replace the two key handlers:

```js
  emulator.keydownHandler = (e) => {
    if (isFormField(e.target) || isUiModalOpen()) return;
    // Any keystroke is a user gesture: (re)start audio if it's enabled
    emulator.sound.ensureRunning();
    // Turbo is momentary. Engaging it is gated by the guard above — in a
    // form field you're typing a backtick, not driving the machine. This
    // sits before the e.repeat check so a held key keeps re-affirming it.
    if (e.code === TURBO_KEY) {
      setTurboHeld(true);
      e.preventDefault();
      return;
    }
    if (e.repeat) {
      // Matrix key is already down; just swallow the auto-repeat
      if (emulator.holds.has(e.code)) e.preventDefault();
      return;
    }
    if (matrixPress(e.key, e.code)) {
      e.preventDefault();
    }
  };
  emulator.keyupHandler = (e) => {
    // Releasing the turbo key ALWAYS drops turbo, whatever has focus —
    // deliberately NOT gated the way keydown is. If focus moved mid-hold,
    // a gated keyup would strand the machine at 10x with no way back.
    if (e.code === TURBO_KEY) {
      setTurboHeld(false);
      e.preventDefault();
      return;
    }
    if (isFormField(e.target) || isUiModalOpen()) return;
    if (matrixRelease(e.key, e.code)) {
      e.preventDefault();
    }
  };
```

**(f)** In `startEmulatorLoop()`, extend the blur handler:

```js
  emulator.blurHandler = () => {
    releaseAllMatrixKeys();
    setTurboHeld(false); // alt-tab mid-hold: the keyup will never arrive
  };
```

**(g)** In `stopEmulatorLoop()`, after `releaseAllMatrixKeys()`:

```js
  releaseAllMatrixKeys(); // no stuck keys on return
  setTurboHeld(false); // ...and no stuck turbo: the listeners are gone
```

**(h)** Extend `onUiModalOpen()`:

```js
export function onUiModalOpen() {
  if (emulator.system) releaseAllMatrixKeys();
  setTurboHeld(false); // the modal swallows keydown, so it'd swallow the keyup
}
```

Leave `turboLatched` alone in (f), (g) and (h) — it is an explicit user choice, and neither a blur nor a modal may silently undo it.

Note that turbo automatically applies to the hidden-tab path too: `emulatorHeartbeat()` calls `stepMachine()`, which reads `turboActive()`. That is intended (turbo means "time passes faster", and it should keep being true when the tab is not visible), the deadline bounds the cost, and the heartbeat's existing 150 ms gate already runs a backgrounded tab below real time. No extra code.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `yarn vitest run tests/unit/ui-tests.js tests/unit/turbo-tests.js tests/unit/sound-tests.js`
Expected: PASS, including the pre-existing "modal key isolation" tests (the `fakeSystem()` hoist must not have broken them).

- [ ] **Step 5: Commit**

```bash
git add src/ui/emulator-ui.js tests/unit/ui-tests.js
git commit -m "feat: hold backtick for 10x turbo

keydown is gated on focus; keyup never is, so releasing the key always
drops turbo whatever has focus. Blur, modal-open and loop-stop clear the
hold too - each is a path where the keyup would never arrive."
```

---

### Task 4: The status-bar pill

**Files:**
- Modify: `index.html` (status-bar CSS block at `:77-114`; the `<footer id="status-bar">` markup at `:1133-1145`)
- Modify: `src/ui/emulator-ui.js` (add `initTurbo()`)
- Modify: `src/main.js:10-11,45`
- Test: `tests/unit/ui-tests.js`

**Interfaces:**
- Consumes: `emulator.turboLatched`, `turboActive()`, `updateTurboIndicator()` (Task 3).
- Produces: `export function initTurbo(): void` from `@ui/emulator-ui.js` — wires `#status-bar-turbo` and paints its initial state.

- [ ] **Step 1: Write the failing test**

Widen the `@ui/emulator-ui.js` import in `tests/unit/ui-tests.js` to add `initTurbo`, then append:

```js
describe("turbo pill (status bar)", () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<button type="button" id="status-bar-turbo" aria-pressed="false">⏩ Turbo</button>';
    emulator.turboHeld = false;
    emulator.turboLatched = false;
    initTurbo();
  });

  afterEach(() => {
    stopEmulatorLoop();
    emulator.system = null;
    emulator.turboHeld = false;
    emulator.turboLatched = false;
    document.body.innerHTML = "";
  });

  it("latches turbo on click and unlatches on a second click", () => {
    const pill = document.getElementById("status-bar-turbo");

    pill.click();
    expect(emulator.turboLatched).toBe(true);
    expect(turboActive()).toBe(true);

    pill.click();
    expect(emulator.turboLatched).toBe(false);
    expect(turboActive()).toBe(false);
  });

  it("lights up and announces itself pressed while latched", () => {
    const pill = document.getElementById("status-bar-turbo");

    pill.click();

    expect(pill.classList.contains("on")).toBe(true);
    expect(pill.getAttribute("aria-pressed")).toBe("true");
    expect(pill.textContent).toContain("10×");
  });

  it("lights up for a held key too, not just the latch", () => {
    const pill = document.getElementById("status-bar-turbo");
    emulator.system = fakeSystem();
    startEmulatorLoop();

    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "`", code: "Backquote" })
    );
    expect(pill.classList.contains("on")).toBe(true);
    expect(pill.getAttribute("aria-pressed")).toBe("true");

    window.dispatchEvent(
      new KeyboardEvent("keyup", { key: "`", code: "Backquote" })
    );
    expect(pill.classList.contains("on")).toBe(false);
    expect(pill.getAttribute("aria-pressed")).toBe("false");
  });

  it("goes dark and reads 'Turbo' when off", () => {
    const pill = document.getElementById("status-bar-turbo");

    expect(pill.classList.contains("on")).toBe(false);
    expect(pill.getAttribute("aria-pressed")).toBe("false");
    expect(pill.textContent).toContain("Turbo");
    expect(pill.textContent).not.toContain("10×");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn vitest run tests/unit/ui-tests.js`
Expected: FAIL — `initTurbo is not a function`.

- [ ] **Step 3: Write the implementation**

**(a)** In `src/ui/emulator-ui.js`, add below `updateTurboIndicator()`:

```js
/**
 * Wire the status-bar turbo pill: a session-only latch. Touch has no key
 * to hold, and nobody should be *required* to hold a key down, so the
 * pill is how turbo stays reachable — but it is never persisted, because
 * a turbo that survived a reload is exactly the silent 10x this design
 * exists to prevent.
 */
export function initTurbo() {
  const pill = document.getElementById("status-bar-turbo");
  if (!pill) return;
  pill.addEventListener("click", () => {
    emulator.turboLatched = !emulator.turboLatched;
    updateTurboIndicator();
  });
  updateTurboIndicator();
}
```

**(b)** In `index.html`, add these rules immediately after the existing `#status-bar a:focus-visible, #status-bar button:focus-visible` rule (around line 114):

```css
      /* Right-hand group: the turbo pill sits beside the project links
         without being one of them (the <nav> is labelled "Project links"). */
      #status-bar-right {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      /* Turbo pill: dim when idle, unmistakable when lit. Every selector
         carries the element type AND both ids, because the generic
         "#status-bar button" rule above (border:none, padding, color)
         out-specifies a bare "#status-bar-turbo" and would win. */
      #status-bar button#status-bar-turbo {
        border: 1px solid #2a2521;
        border-radius: 10px;
        padding: 1px 8px;
        color: #8f887e;
      }
      #status-bar button#status-bar-turbo:hover {
        color: #fff;
        text-decoration: none;
      }
      #status-bar button#status-bar-turbo.on {
        border-color: var(--reset-orange);
        background: rgba(224, 100, 30, 0.16); /* --reset-orange #e0641e */
        color: var(--reset-orange);
        font-weight: bold;
      }
```

**(c)** In `index.html`, replace the `<footer id="status-bar">` block:

```html
    <footer id="status-bar">
      <span id="status-bar-version"></span>
      <div id="status-bar-right">
        <button
          type="button"
          id="status-bar-turbo"
          aria-pressed="false"
          title="Run the machine at 10× — click to latch, or hold the ` key"
        >
          ⏩ Turbo
        </button>
        <nav id="status-bar-links" aria-label="Project links">
          <button type="button" id="status-bar-changelog">Changelog</button>
          <span aria-hidden="true">·</span>
          <a
            href="https://github.com/cschweda/trs80-emulator"
            target="_blank"
            rel="noopener"
            >GitHub ↗</a
          >
        </nav>
      </div>
    </footer>
```

**(d)** In `src/main.js`, import and call `initTurbo` next to `initChangelog`:

```js
import { emulator, initTurbo } from "@ui/emulator-ui.js";
import { initChangelog } from "@ui/changelog.js";
```

```js
window.showEmulatorTab();
initChangelog();
initTurbo();
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `yarn vitest run tests/unit/ui-tests.js`
Expected: PASS.

- [ ] **Step 5: Verify the pill in a real browser**

Run: `yarn dev`, open the page.
Expected, and **each must be confirmed by looking, not assumed**:
1. The status bar reads `⏩ Turbo`, dim, to the left of Changelog.
2. Clicking it turns it orange and it reads `⏩ TURBO 10×`.
3. Clicking again returns it to dim.
4. Holding the `` ` `` key lights it; releasing darkens it.
5. With the machine at the `READY` prompt, hold `` ` `` and type `FOR I=1 TO 5000: NEXT` then ENTER — the loop visibly finishes far faster with turbo held than without.
6. No backtick character is ever typed onto the TRS-80 screen.

- [ ] **Step 6: Commit**

```bash
git add index.html src/ui/emulator-ui.js src/main.js tests/unit/ui-tests.js
git commit -m "feat: status-bar turbo pill - a session latch, lit whenever turbo is on"
```

---

### Task 5: Prove 10× on the real machine, then say so honestly

The integration test measures the actual speedup on a booted ROM; the docs then claim exactly what was measured. Both halves belong together — the number in `CHANGELOG.md` should be the number the test asserts, not a number anyone hoped for.

**Files:**
- Create: `tests/integration/turbo-tests.js`
- Modify: `src/data/library.js:441` (Super Star Trek's note)
- Modify: `CHANGELOG.md`, `README.md`, `package.json`

**Interfaces:**
- Consumes: everything from Tasks 1-4.
- Produces: nothing further.

- [ ] **Step 1: Write the failing test**

Create `tests/integration/turbo-tests.js`:

```js
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
```

- [ ] **Step 2: Run the test to verify it passes**

Run: `yarn vitest run tests/integration/turbo-tests.js`
Expected: PASS. (This one is written last, against finished code, so it should pass first time. **If the ratio is not ~10, stop — the feature is wrong, not the test.**)

- [ ] **Step 3: Run the whole suite and record the real numbers**

Run: `yarn test:run`
Expected: all green. **Write down the actual test count and file count printed by vitest** — they go into the README verbatim in Step 5. Do not estimate them.

- [ ] **Step 4: Retire the "be patient" note**

In `src/data/library.js:441`, replace:

```js
    note: "Galaxy setup takes about a minute of real 2 MHz time - be patient",
```

with:

```js
    note: "Galaxy setup takes about a minute at 2 MHz - hold the ` key (or click TURBO) to skip through it",
```

- [ ] **Step 5: Update the docs and the version**

`package.json`: `"version": "1.3.0"` → `"version": "1.4.0"`.

`CHANGELOG.md`: the file has no `[Unreleased]` section — it runs straight from the intro paragraph into `## [1.3.0] - 2026-07-12` (line 7). Insert this directly above that heading, matching the file's existing Keep-a-Changelog style:

```markdown
## [1.4.0] - 2026-07-13

### Added

- **Turbo mode (10×).** Hold the `` ` `` key to run the machine at ten
  times its 2.03 MHz clock, or click the TURBO pill in the status bar to
  latch it on. Super Star Trek's galaxy setup drops from about a minute to
  about six seconds. Turbo is a multiplier on the T-state budget the frame
  loop hands the CPU, so the whole machine — including its 30 Hz clock
  interrupt and its disk controller — speeds up in exact proportion.
  Nothing inside the emulated Model III can tell.

### Notes

- Sound is muted while turbo is engaged. The audio path derives chunk
  length from emulated time, so at 10× the WebAudio queue would run away
  from the wall clock; the alternative, pitch-shifting, turns a beep into a
  shriek.
- Turbo is never saved. It is off on every load, and the pill stays lit for
  as long as it is on — an unnoticed 10× would make an arcade game look
  broken rather than fast.
- On a slow device turbo delivers less than 10× rather than dropping
  frames: each turbo frame is sliced against a wall-clock deadline.
```

`README.md`, two edits:

1. Add a bullet to the **"July 2026 performance & platform pass"** group, directly after the `- **Status bar & changelog**: …` bullet (line 30):

```markdown
- **Turbo (10×)**: hold the `` ` `` key to fast-forward the machine, or click the TURBO pill in the status bar to latch it — Super Star Trek's galaxy setup drops from ~1 minute to ~6 seconds; sound mutes while engaged, and turbo is never saved
```

2. Update the test-count line (line 23, currently "448 vitest tests across 28 files") to the **actual** figures recorded in Step 3. Do not carry the old numbers forward and do not estimate the new ones.

- [ ] **Step 6: Run the whole suite one more time**

Run: `yarn test:run`
Expected: all green, and the count matches what the README now claims.

- [ ] **Step 7: Commit**

```bash
git add tests/integration/turbo-tests.js src/data/library.js CHANGELOG.md README.md package.json
git commit -m "feat: turbo mode ships as v1.4.0

Integration test measures the speedup on a booted ROM (10.0x cycles,
10x RTC heartbeats) so the changelog claims a number that was measured
rather than hoped for."
```

---

## Done when

- `yarn test:run` is green, and the README's test count is the real one.
- Holding `` ` `` visibly fast-forwards the machine; releasing it stops.
- The pill latches, lights, and is lit for a held key too.
- No backtick ever appears on the TRS-80 screen.
- Sound plays normally at 1× and is silent at 10×, with no drift or pile-up when turbo is released.
- Nothing under `src/system/` or `src/core/` was touched.
