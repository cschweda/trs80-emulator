# Design: Boot real 48K ROM BASIC (non-disk Model III)

**Date:** 2026-07-05
**Goal:** Pressing RESET boots the actual 14K Model III ROM through the Z80 core to cassette BASIC — `Cass?` → `Memory Size?` → `Radio Shack Model III Basic` / `READY` — with a usable keyboard and live screen. Exactly what a non-disk Model III does. Disk drives are explicitly out of scope (next phase); the design must not preclude them.

## Context

A July 2026 audit found the Z80 core is real but has boot-blocking defects, and the current "Phase 6" terminal bypasses the CPU entirely (loads ROM, never executes an instruction; BASIC is simulated in JS). This work makes the machine genuinely run.

## Approaches considered

- **A (chosen): Fix the existing core and wire a real machine around it.** The core is ~80% correct (16-bit ADC/SBC flags, block ops, DD CB already right), has 205 unit tests, and is the project's educational point. Incremental, testable.
- **B: Adopt a proven third-party Z80 core.** Fastest to boot, but discards the hand-built core and its test suite — against the project's phased-build ethos.
- **C: Keep extending the JS BASIC interpreter.** Rejected: it's what the user explicitly wants to move away from; it can never be "the real machine."

## Hardware model (what "faithful" means here)

- **CPU:** Z80 @ 2.02752 MHz, IM 1 in practice (ROM uses RST 38 handler).
- **Memory map:**
  - `0x0000-0x37FF` — 14K ROM (write-protected)
  - `0x3800-0x3BFF` — keyboard matrix, read-only: low 8 address bits select rows; reading returns OR of selected rows' key bits; A8/A9 undecoded (4× mirror)
  - `0x3C00-0x3FFF` — 1K video RAM (64×16 characters)
  - `0x4000-0xFFFF` — 48K RAM
- **I/O ports (non-disk machine):**
  - `0xE0-0xE3` read = interrupt latch (xtrs polarity: pending bits read as 0, i.e. `~latch`), write = interrupt mask. RTC bit = `0x04`.
  - `0xEC-0xEF` read = acknowledge/clear RTC interrupt (returns 0xFF); write = mode register (bit 1 cassette motor, bit 2 32-col mode, bit 3 alt charset) — stored; only motor bit is consumed for now.
  - `0xF0-0xF3` (FDC) read = `0xFF` — floating bus, no disk controller; this is what makes the ROM fall through to cassette BASIC. Writes ignored.
  - `0xFF` cassette port: write bits 0-1 = output level (stub), read bit 7 = cassette input (0 for now).
  - All other ports: read `0xFF` (floating bus), writes ignored. Unknown port accesses are counted for diagnostics.
- **Interrupts:** 30 Hz RTC sets latch bit; when `(latch & mask)` nonzero and IFF1, CPU takes IM1 interrupt (push PC, jump `0x0038`, clear HALT, 13 T-states). ROM ISR reads 0xE0, dispatches, clears via 0xEC read.
- **Keyboard matrix rows** (bit set = key down):
  - row0 `@ A B C D E F G` · row1 `H..O` · row2 `P..W` · row3 `X Y Z`
  - row4 `0..7` · row5 `8 9 : ; , - . /`
  - row6 `ENTER CLEAR BREAK ↑ ↓ ← → SPACE` · row7 `LSHIFT RSHIFT`
  - Browser mapping is character-based: `e.key` → TRS-80 combo (with synthetic SHIFT for symbols like `"` = SHIFT+2), keyed by `e.code` so keyup releases exactly what keydown pressed. Backspace → `←` (Level II delete), Escape → BREAK.

## Z80 core fixes (audit items that block or corrupt boot)

1. Add `LD (HL),A` (0x77) and `RET NZ` (0xC0) — currently silent NOPs.
2. Implement true `(IX+d)`/`(IY+d)`: read displacement byte, effective address = index + signed d, correct extra T-states; cover LD r,(IX+d) / LD (IX+d),r / LD (IX+d),n / arithmetic ops / INC/DEC. (DD CB path is already correct.)
3. Fix ADD/ADC half-carry: `H = ((a & 0x0f) + (v & 0x0f) + carry) > 0x0f`; fix the cpu test that enshrines the wrong value.
4. Replace DAA with the canonical N/H/C-table algorithm.
5. Add `interrupt()` (IM1/IM2) and `nmi()`; EI enables interrupts only after the following instruction; accepted interrupt clears `halted`.
6. Remove the ~110-line duplicate opcode definition block; add a coverage test asserting every documented base opcode has a handler (kills the silent-NOP failure class).
7. R register: increment twice for prefixed opcodes; preserve bit 7. Registers Proxy: replace the per-access `Array.includes` with a precomputed lookup (perf; full de-Proxy deferred).

Anything else the ROM trips over is surfaced by the boot acceptance test + `unimplementedOpcodes` diagnostics and fixed in the same loop.

## New/changed modules

- `src/core/memory.js` — region-aware map above; separate `videoRam` array; `keyboardReadHook` injection point; ROM validation restored (accept 14K exactly, or 16K images by mapping only the first 14K; reject others — no silent truncation).
- `src/core/io.js` — Model III port map above; owns interrupt latch/mask + `rtcPending`; keeps handler-map pattern.
- `src/peripherals/keyboard.js` (new) — matrix state + `read(addressLow)` + `attach(el)/detach()` DOM key mapping.
- `src/system/trs80-system.js` (new) — owns CPU/memory/io/keyboard/video; wires CPU callbacks; `reset()`; `start()/stop()`; per-frame: run `elapsed × 2.03M` T-states (capped), raise RTC every 1/30 s of emulated time, deliver IRQ between instructions, render on video-dirty.
- `src/peripherals/video.js` — real 8×8 ASCII font for 0x20-0x7F (0x00-0x1F render as 0x40-0x5F, Model III style); ImageData-based `renderScreen` (same signature); graphics chars unchanged.
- `index.html` + `src/main.js` — new **Emulator** tab (default): canvas (512×192, scaled 2×), orange RESET button, status line (running/T-states). Keyboard captured when tab focused. Existing phase tabs untouched.

## Testing

- **Acceptance (the definition of done):** headless vitest integration test loads `public/assets/model3.rom` from disk, `system.reset()`, runs emulated seconds, asserts video RAM shows `Cass?`; injects ENTER; asserts `Memory Size?`; injects ENTER; asserts `READY` and BASIC banner; then types `PRINT 2+2` + ENTER via the matrix and asserts ` 4` appears.
- **Unit:** new opcodes, IX/IY displacement (incl. negative d), H flag, DAA table cases, interrupt delivery/EI delay/HALT wake, keyboard matrix row select + mirrors, memory regions, port latch/ack semantics.
- **Repairs:** fix the 15 miswired tests (`cpu.memory =` → `cpu.readMemory/writeMemory` callbacks); update the ROM-size test to the restored validation; adjust any memory tests that assumed ROM occupies 0x3800-0x3BFF.
- **Manual:** dev server + Chrome — press RESET, boot, type a BASIC one-liner; screenshot.

## Error handling

- ROM fetch failure → visible message in the Emulator tab, system stays stopped.
- Unknown opcode in strict mode (tests) → throw with PC/opcode; in browser → warn once, continue (unchanged behavior).
- Frame budget cap (max 4 frames of T-states per tick) prevents spiral-of-death after tab sleep.

## Out of scope (unchanged from audit backlog)

Disk drives/FDC (next phase — port 0xF0-0xF3 stubs are the seam), cassette bit-level I/O, 32-column mode rendering, dead-code deletion of old runners, interpreter fixes, CI. Phase 1-6 tabs keep working as-is.
