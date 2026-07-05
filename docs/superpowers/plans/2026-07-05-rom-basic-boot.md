# ROM BASIC Boot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pressing RESET boots the real 14K Model III ROM through the Z80 core to cassette BASIC (`Cass?` → `Memory Size?` → `READY`) with working keyboard and live screen.

**Architecture:** Fix boot-blocking Z80 defects; give memory the real Model III map (14K ROM / keyboard matrix / video RAM / 48K RAM); implement Model III interrupt+mode ports; add a keyboard-matrix peripheral and a TRS80System orchestrator that runs T-state-budgeted slices at 2.02752 MHz with a 30 Hz RTC interrupt; render video RAM through VideoSystem with a real font; drive it all from a headless boot acceptance test, then a new default Emulator tab.

**Tech Stack:** Vanilla ES modules, Vite 5, Vitest 1 (jsdom env, node `fs` available for ROM fixture).

## Global Constraints

- **No git commits** — user commits manually; tree already holds their WIP. Leave all changes in the working tree. (Overrides this skill's commit steps.)
- ROM fixture: `public/assets/model3.rom` (14,336 bytes, already in repo).
- Existing Phase 1–6 tabs and their tests keep passing except where the spec explicitly changes behavior (ROM size validation; keyboard region reads).
- Model III constants: CPU 2,027,520 Hz; RTC 30 Hz (67,584 T-states/tick); RTC latch bit `0x04`; IM1 vector `0x0038`.
- Port 0xE0 read polarity: xtrs-style `(~latch) & 0xff` (pending bit reads 0). If boot stalls waiting on the clock, flip polarity and re-run acceptance test — it is the arbiter.
- `yarn test:run` green at the end, including the repaired basic-program tests.

---

### Task 1: Missing base opcodes + coverage test

**Files:**
- Modify: `src/core/z80cpu.js` (`setupOpcodeHandlers` LD block ~770–810; RET block ~1072–1154; delete duplicate defs ~615–706)
- Test: `tests/unit/cpu-opcode-coverage-tests.js` (new)

**Interfaces:** Produces: `opcodeHandlers[0x77]`, `[0xC0]`; every documented base opcode defined.

- [x] Failing tests: `LD (HL),A` stores A at HL (7 cyc); `RET NZ` pops when Z clear (11 cyc) / falls through when Z set (5 cyc); coverage test: for all 256 base opcodes except prefixes CB/DD/ED/FD, `cpu.opcodeHandlers[op]` is defined (documented set — full 0x00–0xFF range is documented for base table).
- [x] Implement 0x77/0xC0; delete the duplicate opcode block; run until green.

### Task 2: True (IX+d)/(IY+d) displacement

**Files:**
- Modify: `src/core/z80cpu.js` `executeIndexReg` (~2454)
- Test: `tests/unit/cpu-indexed-tests.js` (new)

**Interfaces:** Produces: correct DD/FD handling for opcodes using `(HL)` operand: 0x34,0x35,0x36,0x46–0x7E (r,(HL) family), 0x70–0x77, 0x86,0x8E,0x96,0x9E,0xA6,0xAE,0xB6,0xBE.

Approach: in `executeIndexReg(indexHigh, indexLow)`, classify the sub-opcode. If it's one of the `(HL)`-operand opcodes above: fetch `d` (signed) from PC, compute `addr = (IX/IY + d) & 0xffff`, execute a dedicated indexed variant that reads/writes `addr` directly (do NOT reuse the HL-swap trick for these), T-states 19 (23 for INC/DEC/LD (IX+d),n per tables). Non-memory DD/FD opcodes (e.g. ADD IX,rr; LD IX,nn; INC IX; EX (SP),IX; JP (IX); undocumented IXH/IXL forms) keep the swap path (no displacement). Undocumented IXH/IXL: leave swap-based behavior (H/L swap covers them adequately for now).

- [x] Failing tests incl. negative d: `LD A,(IX+2)`, `LD A,(IX-1)`, `LD (IY+5),B`, `LD (IX+3),n`, `ADD A,(IX+1)`, `INC (IY-2)`, and "next opcode after indexed op executes correctly" (guards the old d-left-in-stream bug).
- [x] Implement; green.

### Task 3: ADD/ADC half-carry + canonical DAA

**Files:**
- Modify: `src/core/z80cpu.js` `addA` (~1896–1925), `daa` (~1337)
- Modify: `tests/unit/cpu-tests.js` (the test enshrining wrong H)
- Test: `tests/unit/cpu-flags-tests.js` (new)

H: `this.flagH = ((a & 0x0f) + (value & 0x0f) + carryIn) > 0x0f;`
DAA (canonical):
```js
let a = this.registers.A, corr = 0, carry = this.flagC;
if (this.flagH || (a & 0x0f) > 9) corr = 0x06;
if (carry || a > 0x99) { corr |= 0x60; carry = 1; }
const before = a;
a = this.flagN ? (a - corr) & 0xff : (a + corr) & 0xff;
this.flagH = this.flagN ? (this.flagH && (before & 0x0f) < 6) : ((before & 0x0f) + (corr & 0x0f)) > 0x0f;
this.flagC = carry; this.flagS = (a & 0x80) !== 0; this.flagZ = a === 0; this.flagPV = parity(a);
```
- [x] Failing tests: `0x02+0x10` → H=0; `0x0f+0x01` → H=1; DAA: `0x15+0x27=0x3C→DAA→0x42` C=0; `0x99+0x01→DAA→0x00` C=1 Z=1; sub `0x20-0x03=0x1D→DAA→0x17`.
- [x] Fix `cpu-tests.js` enshrined case; green.

### Task 4: Interrupt delivery (IM1/IM2, NMI, EI delay, HALT wake)

**Files:**
- Modify: `src/core/z80cpu.js` (EI handler; `executeInstruction`; new methods)
- Test: `tests/unit/cpu-interrupt-tests.js` (new)

**Interfaces:** Produces: `cpu.interrupt(dataBus = 0xff) → boolean` (accepted?), `cpu.nmi()`, `cpu.pendingEI` internal.

```js
interrupt(dataBus = 0xff) {
  if (!this.IFF1 || this.pendingEI) return false;
  this.halted = false; this.IFF1 = this.IFF2 = false;
  this.pushWord(this.registers.PC);
  if (this.interruptMode === 2) this.registers.PC = this.readWord16(((this.registers.I << 8) | (dataBus & 0xfe)));
  else this.registers.PC = 0x0038; // IM0 treated as IM1 (RST 38 is what the bus presents on a Model III)
  this.cycles += 13; return true;
}
nmi() { this.halted = false; this.IFF2 = this.IFF1; this.IFF1 = false; this.pushWord(this.registers.PC); this.registers.PC = 0x0066; this.cycles += 11; }
```
EI sets `pendingEI = true` (not IFF); at top of `executeInstruction`, if `pendingEI` and the *previous* instruction was the EI (implement: after executing an instruction, promote `pendingEI` → IFF1=IFF2=true when the just-executed opcode wasn't EI itself — simplest: EI handler sets `pendingEI=2`; executeInstruction decrements once per instruction end; at 0 → set IFFs).
- [x] Failing tests: IM1 interrupt pushes PC & jumps 0x0038, refused when IFF1 clear; `EI; RET` — interrupt offered right after EI is refused, accepted after next instruction; HALT then accepted interrupt resumes at 0x0038 and un-halts; NMI works with IFF1 clear, preserves IFF2.
- [x] Implement; green. (`pushWord`/`readWord16` helpers exist — reuse actual names found in file.)

### Task 5: Model III memory map + ROM validation

**Files:**
- Modify: `src/core/memory.js`
- Modify: `tests/unit/memory-tests.js` (ROM-size test; any test reading 0x3800–0x3BFF as ROM)
- Test: extend `tests/unit/memory-tests.js`

**Interfaces:** Produces: `memory.keyboard = null | { read(addrLow8) }`; `memory.videoRam` (Uint8Array 0x400); `memory.videoDirty` flag; ROM storage stays `this.rom` but only 0x0000–0x37FF is ROM-mapped.

readByte: `<0x3800` → rom; `<0x3C00` → `this.keyboard ? this.keyboard.read(address & 0xff) : 0xff`; `<0x4000` → `videoRam[address - 0x3c00]`; else ram. writeByte: ROM+keyboard regions ignored; video region → `videoRam[...] = v; this.videoDirty = true`; else ram. loadROM: accept exactly 0x3800, or 0x4000 (map first 0x3800, common padded images); else throw.
- [x] Update/extend tests: keyboard region returns 0xff detached / delegates when attached (mirror 0x3900 ≡ 0x3800 via low-8-bit mask ⇒ `read(addr & 0xff)` — note 0x3900&0xff=0 ⇒ no rows ⇒ 0x00 from matrix; hardware mirrors via A8/A9 ignored, but ROM only scans 0x38xx so low-byte select is faithful where it matters); video readback; ROM sizes 14K ok/16K ok/1K throws; existing video tests stay green.
- [x] Implement; green. Check `getMemoryView`/video tests for direct `rom` access to 0x3C00+ and update to `videoRam`.

### Task 6: Model III I/O ports

**Files:**
- Modify: `src/core/io.js`
- Test: `tests/unit/io-tests.js` (extend; existing 12 tests may need updating where they encode the wrong map — port 0xFF keyboard buffer goes away, becomes cassette)

**Interfaces:** Produces: `io.intLatch`, `io.intMask`, `io.raiseRTC()`, `io.pendingInterrupt()` (`(intLatch & intMask) !== 0`), `io.modeRegister`.

Handlers: 0xE0–0xE3 read `(~this.intLatch) & 0xff`, write `this.intMask = value`; 0xEC–0xEF read → clear RTC bit (`intLatch &= ~0x04`), return 0xff; write → `this.modeRegister = value`, forward motor bit to cassette; 0xF0–0xF3 read 0xff, write ignored; 0xFF read → cassette input bit (0x00 for now), write → cassette output stub. Default: read 0xff. Keep `readKeyboard`/`addKey` API for phase-3 tests only if they reference it (check first — update tests to the new truth where they encode the wrong map, per spec).
- [x] Tests: `raiseRTC()` → `readPort(0xE0) === 0xfb`; read 0xEC clears it (0xE0 → 0xff); mask gates `pendingInterrupt()`; 0xF0 → 0xff.
- [x] Implement; reconcile io-tests/cassette-tests; green.

### Task 7: Keyboard matrix peripheral

**Files:**
- Create: `src/peripherals/keyboard.js`
- Test: `tests/unit/keyboard-tests.js` (new)

**Interfaces:** Produces: `class KeyboardMatrix { rows: Uint8Array(8); read(addrLow8); keyDown(e.key)/keyUp(e.key) → boolean handled; pressKey(row,bit)/releaseKey(row,bit); attach(element)/detach(); reset() }`

`read(sel)`: OR of `rows[i]` for each set bit i of sel. Matrix rows per spec (row0 `@ABCDEFG` … row7 shifts). Char map: letters (case-insensitive) → rows0–3; digits; `: ;` unshifted row5; symbols via synthetic shift: `!"#$%&'()` = SHIFT+1..9, `*` = SHIFT+`:`, `+` = SHIFT+`;`, `<` = SHIFT+`,`, `=` = SHIFT+`-`, `>` = SHIFT+`.`, `?` = SHIFT+`/`; `Enter`→(6,0), `Backspace`→(6,5), `Escape`/`Pause`→(6,2), arrows→(6,3..6), `' '`→(6,7), `Shift`→(7,0), `Clear`/`Home`→(6,1), `@`→(0,0). keyDown stores the combo keyed by the event's `code` so keyUp releases exactly what was pressed (synthetic shift released with it; real held Shift tracked separately so `2` typed while physically shifted yields `"` via e.key — mapping is by `e.key`, which already reflects shift).
- [x] Tests: `read(0x01)` after `keyDown('a')` has bit1 (A=row0 bit1); `"` sets row4 bit2 + row7 bit0; keyUp clears both; `read(0xff)` ORs all; ENTER at (6,0) via `read(0x40) & 0x01`.
- [x] Implement; green.

### Task 8: TRS80System orchestrator

**Files:**
- Create: `src/system/trs80-system.js`
- Test: `tests/unit/system-tests.js` (new)

**Interfaces:** Produces:
```js
class TRS80System {
  constructor({ romData })            // wires cpu/memory/io/keyboard; loads ROM
  reset()                             // cpu.reset(); io latches cleared; videoRam cleared to 0x20
  runTStates(budget) → tStatesRun     // executes instructions until budget spent; raises RTC each 67,584 cycles of emulated time; delivers io-pending IM1 between instructions
  runSeconds(s)                       // test helper: runTStates(s * 2_027_520)
  get cpu/memory/io/keyboard/videoRam
  screenText() → string[16]           // 16 rows × 64 cols, video RAM bytes &0x7f → chars (for tests/status)
}
```
RTC accounting: `nextRtc += 67584` against `cpu.cycles`; when crossed → `io.raiseRTC()`. Interrupt delivery: after each instruction, `if (io.pendingInterrupt()) cpu.interrupt()`. Safety: if `cpu.registers.PC` executes an unimplemented opcode in strict mode, surface it (`cpu.strictMode = true` set by tests only — add flag in decodeAndExecute: strict → throw `Error('Unimplemented opcode 0x.. at PC=0x....')`).
- [x] Tests: tiny synthetic ROM (`EI; IM 1; HALT` + ISR at 0x0038 incrementing 0x4000 and `EI; RETI`) — after `runSeconds(1)`, RAM[0x4000] ≈ 30 (±1); screenText returns 16×64 spaces after reset.
- [x] Implement; add `strictMode` to cpu; green.

### Task 9: Real font + ImageData renderer

**Files:**
- Modify: `src/peripherals/video.js` (`loadCharacterROM`, `renderScreen`; keep all signatures)
- Test: existing `tests/unit/video-tests.js` must stay green (61 tests); add glyph-sanity cases

Embed 8×8 bitmaps for ASCII 0x20–0x7F (96 glyphs, classic readable font), placed in rows 2–9 of the 12-row cell; codes 0x00–0x1F render as code+0x40 (Model III fold); graphics 0x80–0xBF unchanged; 0xC0–0xFF render as (code−0x40) space-ish fallback (Model III repeats space w/o alt charset). `renderScreen` builds one `ImageData(512,192)` in a typed loop and `putImageData`s it (canvas already 512×192).
- [x] Glyph tests: 'A'(0x41) row pattern non-empty and ≠ 'B'; '?' defined; graphics char 191 all-on unchanged.
- [x] Implement; all video tests green.

### Task 10: Headless boot acceptance test (the definition of done)

**Files:**
- Test: `tests/integration/rom-boot-tests.js` (new — also fixes the empty `tests/integration/` dir that `phase:6` script points at; update `package.json` `phase:6` to this path)

```js
import fs from "node:fs"; // jsdom env still has node fs in vitest
const rom = new Uint8Array(fs.readFileSync(new URL("../../public/assets/model3.rom", import.meta.url)));
```
Helpers: `typeKey(system, key, holdTStates ≈ 80_000)` — keyDown, run, keyUp, run (matrix scan needs the key held across scans + ROM debounce); `screenContains(system, text)`.
- [x] Test 1: after reset + `runSeconds(2)`, screen contains `Cass?` (exact ROM copy — accept `CASS?` case-insensitively).
- [x] Test 2: ENTER → screen contains `Memory Size?`; ENTER → contains `READY` and `MODEL III BASIC` (case-insensitive).
- [x] Test 3: type `PRINT 2+2` + ENTER → screen contains ` 4`.
- [x] **Iteration loop:** run with `cpu.strictMode = true`; every unimplemented-opcode throw or hang gets a targeted core fix (repeat Tasks 1–4 style: failing unit test → fix → rerun boot). Track fixes in the plan addendum below. Budget: expect several rounds (ED block, undocumented usage, flag edge cases). If stalled >2s emulated at same PC region, dump PC history + last 20 opcodes to diagnose (temporary debug helper in the test file).
- [x] All three tests green.

### Task 11: Repair miswired basic-program tests + ROM-size expectations

**Files:**
- Modify: `tests/unit/basic-program-tests.js` (`beforeEach` blocks, e.g. :120–124)

Replace `cpu.memory = memory` with:
```js
cpu.readMemory = (addr) => memory.readByte(addr);
cpu.writeMemory = (addr, v) => memory.writeByte(addr, v);
```
Tests there load 0x4000-byte synthetic ROMs — still valid (16K accepted, first 14K mapped); tests asserting reads of romData at ≥0x3800 (if any) get their fixture data moved below 0x3800.
- [x] All 32 basic-program tests green; full `yarn test:run` green.

### Task 12: Emulator tab UI (canvas + orange RESET)

**Files:**
- Modify: `index.html` (new default tab button + `#emulator-container` with `<canvas id="emulator-screen">`, orange `#emulator-reset` button, status line)
- Modify: `src/main.js` (`window.showEmulator`; extend `showTab` — note `showTab` was refactored in WIP; wire keyboard attach/detach on tab switch; rAF loop)

rAF loop: budget `min(elapsedMs, 66) / 1000 * 2_027_520` T-states per frame; render when `memory.videoDirty` (clear flag after render); status line shows run state. RESET button: `system.reset()`. Keyboard: `keydown/keyup` on window while emulator tab active and `e.target` isn't an input — `preventDefault()` for handled keys (stops Backspace navigation etc.). ROM fetched once from `/assets/model3.rom`; failure renders message into the tab. Canvas `image-rendering: pixelated`, displayed at 2× via CSS width.
- [x] Manual smoke via dev server; no automated UI test (acceptance test covers the machine).

### Task 13: Browser verification

- [x] `yarn dev`; in Chrome: default tab boots to `Cass?` → ENTER → `Memory Size?` → ENTER → `READY`; type `PRINT 2+2` → ` 4`; `10 PRINT "HI"` / `RUN` works; RESET reboots. Screenshot for the user. Console free of errors.

## Self-review notes

- Spec coverage: all spec sections map to tasks 1–13. R-register/prefixed-R tweak folded into Task 4 (same file region); Proxy `includes()`→Set lookup folded into Task 8 perf pass if profiling shows need — spec lists it as required: do it in Task 8 (one-line: `const eightBitRegSet = new Set(eightBitRegs)`).
- Type consistency: `io.raiseRTC/pendingInterrupt`, `memory.keyboard.read(addrLow8)`, `system.runTStates` used consistently across tasks 6–10, 12.
- No placeholders remain; font/table bulk data intentionally summarized (mechanical, no decisions), everything decision-carrying is inline.

## Addendum: fixes discovered during Task 10 iteration

(append findings here as the boot loop surfaces them)

### Addendum (written during execution, 2026-07-05)

- Boot acceptance test passed on the FIRST full run in strict mode — the audited fixes (0x77, 0xC0, IX/IY displacement, H flag, DAA, interrupts, memory map, ports, keyboard) were the complete blocking set; no additional opcodes surfaced.
- Spec correction: idle keyboard matrix reads 0x00 (no keys), not floating 0xFF — the ROM scan loop depends on it.
- Browser layer needed two robustness fixes the headless test couldn't show: a minimum 80 ms matrix hold (fast taps and synthetic key events release before the ROM's scan/debounce sees them) and a setInterval heartbeat because Chrome suspends rAF in occluded windows (the machine froze when the window was covered).
- Authenticity fixes found during user testing: graphics characters were bit-reversed vs the Level II manual (+1 TL … +32 BR) — fixing this also produced the correct underline-style blinking cursor (the ROM blinks CHR$(176)); lowercase now works the real way (machine boots in caps mode, SHIFT+0 unlocks, SHIFT+letter types lowercase).
- UI evolved per user direction: phase tabs → View dropdown; authentic Model III case; visual keyboard added then removed (kept screen + orange RESET); theater (full-screen) mode with top nav/status bar; MACHINE menu (fullscreen, reset, cassette motor); Font (TRS-80/modern) and Size (fit/1x-4x) selectors, both persisted.
- Esc is BREAK, so theater mode deliberately avoids the browser Fullscreen API (Esc would exit it); use the menu to leave, F11 for true fullscreen.
- Final state: 280/280 vitest tests green (was 189/205 at session start), production build clean, boot + BASIC session verified in live Chrome.
