# Turbo Mode — Design (v1.4.0)

**Date:** 2026-07-13
**Status:** Approved by user

## Goal

Let the user fast-forward the machine past the parts that are only slow
because a Model III really was that slow. The motivating case is Super
Star Trek, whose galaxy setup takes about a minute of honest 2.03 MHz
time; the same applies to a long `LIST`, a `LOAD`, and an adventure
game's text crawl.

Turbo runs the machine at **10×**, engaged by **holding backtick**
(momentary) or by **clicking a status-bar pill** (a session-only latch).

## Decisions (user-confirmed)

- **10×, single speed.** Not a cycle of speeds, not "as fast as this
  machine can go". 10× turns SST's ~60 s setup into ~6 s while leaving
  the screen readable and BREAK reachable.
- **Hold is the primary interaction.** Every real use case is a short
  burst, and a held key *cannot* be left on — it deletes the footgun
  rather than mitigating it. (Rejected: toggle-only. A latched turbo
  makes an arcade game look broken rather than fast.)
- **The pill also latches on click.** This is what makes turbo exist at
  all on touch, and it means nobody is *required* to hold a key down.
- **Sound mutes while turbo is active.** See Sound below.
- **Turbo does not persist.** It is off on every load.

## Architecture

### Turbo is a multiplier on the T-state budget, and nothing else

`stepMachine()` (`src/ui/emulator-ui.js`) already converts real elapsed
milliseconds into T-states at `CPU_CLOCK_HZ` and hands them to
`system.runTStates()`. Turbo multiplies that number by 10.

This is safe because every scheduled event inside `runTStates()` is
driven off `cpu.cycles`: the 30 Hz RTC heartbeat
(`RTC_INTERVAL_TSTATES`, every 67,584 T-states), the FDC tick, cassette
bit timing. Multiplying the budget speeds the whole machine up
*coherently* — its clock, its interrupts and its disk stay in exact
proportion, so nothing inside the emulated Model III can tell the
difference. Only the rate at which the host feeds it time changes.

**`TRS80System` therefore never learns that turbo exists.** It remains a
faithful 2.03 MHz machine. The system layer, the 448 existing tests, and
the headless scripts (`probe-program.js`, `build-cas.js`) are all
untouched.

Rejected alternatives:

- **A variable clock rate on `TRS80System`.** `RTC_INTERVAL_TSTATES` is
  derived from `CPU_CLOCK_HZ` at module scope, `runSeconds()` would stop
  meaning a second, and it drags a host-side UI concern into the machine.
- **Calling `stepMachine()` ten times per frame.** Identical effect, ten
  times the sound-pump and repaint bookkeeping, no upside.

### State: two inputs, one truth

```js
emulator.turboHeld     // backtick is physically down (momentary)
emulator.turboLatched  // the pill was clicked (sticky, session-only)

const turboActive = () => emulator.turboHeld || emulator.turboLatched;
```

The pill lights whenever `turboActive()` is true, so the machine's state
is never ambiguous. Releasing the key does not clear a latch the user
explicitly set.

### The asymmetric engage/disengage rule

**`keydown` is gated; `keyup` is not.**

Engaging turbo is suppressed when a form field has focus or the
changelog modal is open — in those contexts the user is typing a
backtick or reading, not driving the machine. This reuses the existing
`isFormField()` / `isUiModalOpen()` guards.

Disengaging is *never* suppressed: `keyup` clears `turboHeld` before any
guard runs. Releasing the key always stops turbo, whatever has focus.
This single asymmetry eliminates the entire stuck-on class of bug.

### Safety hooks (all three already exist for matrix keys)

| Hook | Existing purpose | Turbo addition |
|---|---|---|
| `e.repeat` swallow in `keydownHandler` | a held matrix key must not re-fire | held backtick sets `turboHeld` idempotently, then returns before `matrixPress()` |
| `blurHandler` → `releaseAllMatrixKeys()` | alt-tab must not strand a key down | clears `turboHeld` — this is the case where the `keyup` never arrives |
| `onUiModalOpen()` | opening the changelog releases matrix keys | clears `turboHeld` for the same reason |

Each clears **`turboHeld` only, never `turboLatched`** — a blur or a
modal must not silently undo an explicit user choice.

Backtick cannot collide with the machine: the keyboard matrix maps
letters, digits, `:;,-./`, the shifted symbols, `Enter`, `Home`/`Clear`,
`Escape`/`Pause`, the arrows, `Backspace`, `Space` and `Shift` — the
TRS-80 has no backtick key at all. The handler matches on
`e.code === "Backquote"` (physical position, layout-independent) and
returns before `matrixPress()`, which keys off `e.key`.

**F12 was rejected as the shortcut**: it is browser-reserved (DevTools),
`preventDefault()` does not suppress it, and on macOS the F-row is media
keys by default and never reaches the page without `fn`.

## Sound

`synthesizeSamples()` sizes each PCM chunk from **emulated** duration —
`round(((toCycle - fromCycle) / cpuHz) * sampleRate)` (`sound.js:38`) —
and `pump()` schedules chunks back-to-back on the WebAudio wall clock
(`this.nextTime += buffer.duration`, `sound.js:158`).

At 10×, each 16 ms frame would therefore emit 160 ms of audio while only
16 ms of real time passed. The scheduled queue would run away from real
time permanently: the game's sound drifting ever further behind the
picture, with buffers piling up unbounded. Passing a 10× `cpuHz` instead
would keep the queue in sync but pitch-shift everything up tenfold — a
1 kHz beep becomes a 10 kHz shriek.

**So turbo mutes.** `pump()` gains one option:

```js
pump(system, fromCycle, toCycle, cpuHz, { silent = false } = {})
```

`silent` takes the **drain-and-track-level early return that already
exists** for the `!this.enabled` case (`sound.js:115-125`): the
transition log is still drained (so it cannot grow without bound) and
`lastLevel` is still tracked (so audio resumes at the correct DC level),
but nothing is synthesized or scheduled. It does **not** touch
`this.enabled` and does **not** suspend the AudioContext, so the user's
Sound preference is preserved across a turbo burst.

On exit from turbo, a stale `nextTime` self-heals via the existing
catch-up branch (`if (this.nextTime < now + 0.02) …`, `sound.js:154`).

## Slow devices: degrade, don't stutter

`stepMachine()` caps catch-up at 66 ms of real time. At 10× that becomes
660 ms of *emulated* time inside one blocking `runTStates()` call. The
July 2026 audit measured ~83× realtime on the development machine, so
that is ~8 ms of work there — but a phone (the emulator ships touch
input) would drop frames badly.

Under turbo only, the budget is therefore consumed in slices against a
wall-clock deadline:

```js
const deadline = now + TURBO_FRAME_MS;      // ~12 ms
let remaining = budget;
while (remaining > 0 && performance.now() < deadline) {
  const slice = Math.min(remaining, TURBO_SLICE_TSTATES);  // ~50k
  remaining -= system.runTStates(slice);
}
```

A slow device simply gets less than 10× rather than freezing. There is
**no debt tracking and no catch-up spiral**: emulated time the machine
did not get is time it did not experience.

`TURBO_FRAME_MS` and `TURBO_SLICE_TSTATES` are tuning constants. The
slice is sized so the clock is checked often enough to honour the
deadline on a slow device without the check itself costing anything
(~50k T-states ≈ 25 ms emulated ≈ well under a millisecond of real work
at measured speeds).

**The non-turbo path is unchanged** — still the single
`runTStates(budget)` call it is today. Normal play carries none of this
machinery.

Turbo applies in `emulatorHeartbeat()` (the hidden-tab path) as well, for
coherence; the deadline bounds the cost, and the heartbeat's existing
150 ms gate already makes a backgrounded tab run below real time.

## Components

| File | Change |
|---|---|
| `src/ui/turbo.js` *(new)* | Pure, DOM-free: `frameBudgetTStates(elapsedMs, speed)` and the slice/deadline loop as a testable function taking an injected clock. Follows the codebase's existing pure-core pattern (`synthesizeSamples`, `normalizeScale`, `wellLayout`). |
| `src/ui/emulator-ui.js` | `turboHeld` / `turboLatched` on `emulator`; `stepMachine()` uses the turbo budget and passes `{ silent: turboActive() }` to `pump()`; backtick in the keydown/keyup handlers; `blurHandler` and `onUiModalOpen()` clear the hold; `updateTurboIndicator()`; `window.toggleTurbo()` for the pill. |
| `src/peripherals/sound.js` | `pump()` accepts `{ silent }`. |
| `index.html` | `#status-bar-turbo` button in `#status-bar-links`, before Changelog. ID-scoped CSS (the page's generic green `button` rule would otherwise win). Dim `⏩ Turbo` when off; bright amber `⏩ TURBO 10×` when on. |
| `src/data/library.js` | Super Star Trek's note becomes an invitation to hold backtick instead of "be patient". |
| `CHANGELOG.md`, `README.md`, `package.json` | v1.4.0 entry, feature bullet, version bump. |

`aria-pressed` on the pill tracks `turboActive()` rather than
`turboLatched` alone: the question the control answers for the user is
"is turbo on?", and a held key genuinely means it is.

## Testing

**Unit — `tests/unit/turbo-tests.js` (new)**

- `frameBudgetTStates()` returns the 2.03 MHz budget at 1× and ten times
  that at 10×.
- The slice loop consumes the whole budget when the injected clock stays
  inside the deadline.
- The slice loop **stops early** when the injected clock jumps past the
  deadline — proving graceful degradation rather than asserting it.

**Unit — `tests/unit/sound-tests.js`**

- `pump(…, { silent: true })` drains the transition log, updates
  `lastLevel`, and schedules no buffer, while leaving `enabled` and the
  AudioContext state alone.

**Unit — `tests/unit/ui-tests.js`**

- Backtick keydown sets the hold; keyup clears it.
- **Keyup clears the hold even when a form field has focus** (the
  asymmetric rule).
- `blur` and `onUiModalOpen()` clear the hold but **not** the latch.
- Backtick never reaches the keyboard matrix (no key registers).
- Backtick keydown is ignored while the changelog modal is open or a form
  field has focus.
- The pill latches and unlatches on click, and lights for either input.
- Turbo is off after a reload (nothing written to localStorage).

**Integration — `tests/integration/`**

- N frames with turbo active advance `cpu.cycles` ~10× further than N
  frames without.

## Out of scope

- Multiple turbo speeds, or a "max speed" mode.
- Persisting turbo across reloads.
- Auto-engaging turbo (e.g. detecting SST's setup loop).
- Pitch-corrected audio under turbo.
