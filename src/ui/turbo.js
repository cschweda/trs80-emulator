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
