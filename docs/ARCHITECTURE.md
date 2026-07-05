# TRS-80 Model III Emulator — Architecture & Extension Guide

*Last updated: 2026-07-05. This document describes how the emulator works today and where new features plug in.*

## The one-paragraph version

The emulator runs the **real 14K Model III ROM** on a hand-written Z80 core. `TRS80System` owns the machine: it wires the CPU's memory/port callbacks to a faithful Model III address map and port map, runs the CPU in T-state-budgeted slices at 2.02752 MHz, raises the 30 Hz real-time-clock interrupt, and delivers FDC NMIs. Everything the machine does — the `Cass?` prompt, BASIC tokenization, the blinking cursor, disk boot — is the ROM's own code executing. The emulator's job is only to be accurate hardware.

## Module map

```
src/
  core/
    z80cpu.js        Z80 CPU: full instruction set, IM0/1/2 + NMI, EI delay,
                     strict mode (throws on unimplemented opcodes in tests)
    memory.js        Address map: ROM 0x0000-37FF · keyboard 0x3800-3BFF ·
                     video RAM 0x3C00-3FFF (videoDirty flag) · RAM 0x4000-FFFF
    io.js            Port map + interrupt latches (details below)
  peripherals/
    keyboard.js      8x8 matrix; row-select reads; browser-key mapping
    video.js         Character generator (two fonts) + ImageData renderer;
                     SET/RESET/POINT graphics helpers
    cassette.js      Motor/tape state (legacy high-level simulation)
    cas-format.js    .cas parser + BASIC/SYSTEM fast-loaders
    disk-image.js    .dsk containers: JV1-linear + JV3
    fdc-wd1793.js    WD1793 floppy controller state machine
  system/
    trs80-system.js  The machine: wiring, timing, RTC, NMI edge, typeText,
                     mountDisk/ejectDisk, screenText
  data/
    library.js       Built-in public-domain BASIC programs
  main.js            Browser shell: boot, rAF loop + occlusion heartbeat,
                     MACHINE menu, fonts/sizes, theater mode, phase consoles
tests/
  unit/              Per-module tests (CPU, memory, io, fdc, disk, cas, ...)
  integration/       Acceptance: ROM boot, cassette fast-load, disk boot,
                     library programs — all run the REAL ROM in strict mode
```

## Hardware model

### CPU (`core/z80cpu.js`)
- Callback-based bus: the system assigns `cpu.readMemory/writeMemory/readPort/writePort`. Nothing else reaches memory.
- `interrupt(dataBus)` implements IM1 (RST 38) and IM2 vectoring; `nmi()` → 0x0066. `EI` enables after the following instruction (`pendingEI` countdown). An accepted interrupt clears `HALT`.
- `strictMode = true` makes unimplemented opcodes throw with PC — every acceptance test sets it, so instruction-set gaps cannot hide behind the NOP fallback.
- `cycles` accumulates T-states; every timing feature (RTC, FDC delays, typeText pacing) is derived from it.

### Memory map (`core/memory.js`)
| Range | What | Notes |
|---|---|---|
| 0x0000-0x37FF | 14K ROM | `loadROM` accepts 14K or padded-16K images only |
| 0x3800-0x3BFF | Keyboard matrix | read-only; low 8 address bits select rows, result = OR of selected rows; idle reads 0x00 |
| 0x3C00-0x3FFF | 1K video RAM | writes set `videoDirty` so the renderer can skip idle frames |
| 0x4000-0xFFFF | 48K RAM | |

### Port map (`core/io.js`)
| Port | Read | Write |
|---|---|---|
| 0xE0-0xE3 | interrupt latch, **active-low** (`~latch`) | interrupt mask (RTC bit = 0x04) |
| 0xE4-0xE7 | NMI status, active-low (bit 7 = FDC INTRQ) | NMI mask (bit 7 enables FDC INTRQ→NMI) |
| 0xEC-0xEF | acknowledge RTC interrupt | mode register (bit 1 cassette motor) |
| 0xF0-0xF3 | WD1793 status/track/sector/data | command/track/sector/data |
| 0xF4 | — | drive select (bits 0-3), side (bit 4) |
| 0xFF | cassette input (stub 0x00) | cassette output level |
| everything else | 0xFF (floating bus) | ignored |

**FDC presence rule:** ports 0xF0-0xF4/0xE4 present as *absent* (floating 0xFF) until a disk is mounted. That float is what makes the boot ROM fall through to cassette BASIC; mounting a disk and pressing RESET is what makes it boot the DOS. If you ever want "disk controller present but no disk," change `fdcPresent()` in `io.js` — the ROM will then wait for a diskette on boot, like real disk-equipped hardware.

### Timing (`system/trs80-system.js`)
- `runTStates(budget)` executes instructions until the budget is spent. Between instructions it: raises the RTC latch every 67,584 T-states (30 Hz), delivers a maskable interrupt when `(latch & mask) != 0`, delivers an **edge-triggered** NMI when the FDC's INTRQ is enabled by the 0xE4 mask, and ticks the FDC with the consumed cycles.
- The browser loop (`main.js`) budgets `elapsed-wall-time × 2.03 MHz` per animation frame (capped at 66 ms of catch-up), and a 100 ms `setInterval` heartbeat keeps the machine alive when Chrome suspends rAF (hidden/occluded windows).
- `typeText(text)` feeds the keyboard matrix in **emulated** time (~3 ms wall per character): 70k T-states held, 50k released, 400k after ENTER (the ROM tokenizes and stores the line before it scans again — shortchanging this eats the next line's first character).

### Video (`peripherals/video.js`)
- `renderScreen(memory)` builds one 512×192 ImageData per frame from video RAM + the character generator.
- Two glyph sets: `trs80` (chunky 5×7 with true lowercase descenders, default) and `modern`; `setFont(name)` switches, UI persists the choice in `localStorage`.
- Graphics characters 128-191 use the Level II manual's encoding — CHR$(128 + Σ): **+1 top-left, +2 top-right, +4 mid-left, +8 mid-right, +16 bottom-left, +32 bottom-right**. Do not "fix" this to the reversed order: the ROM's blinking cursor is CHR$(176) = both bottom pixels = the authentic underline.

### Keyboard (`peripherals/keyboard.js`)
- Authentic Model III typing: unshifted letters are uppercase; SHIFT+letter is lowercase; the machine boots caps-locked and SHIFT+0 (handled by the ROM itself) unlocks lowercase. Escape = BREAK, Backspace = ←.
- Browser layer (`main.js`) adds an 80 ms minimum matrix hold so fast taps and synthetic events survive the ROM's scan/debounce.

## Storage

### Cassette `.cas` (`peripherals/cas-format.js`)
- `parseCas` recognizes BASIC (`0xA5` sync, `0xD3×3`, 1-byte name, tokenized program) and SYSTEM (`0x55`, 6-byte name, `0x3C` data blocks with checksums, `0x78` entry).
- `fastLoadBasic` writes the program at TXTTAB (pointer at 0x40A4) with **recomputed line links** and sets 0x40F9/0x40FB/0x40FD — the state CLOAD leaves; then `typeText("RUN\n")`.
- `fastLoadSystem` writes blocks and jumps to the entry point (what `SYSTEM` + `/` does).
- Authentic bit-level playback through port 0xFF is deliberately not implemented (fast-load covers the use case); the port stub and motor plumbing are the seam if you want it.

### Disks (`peripherals/disk-image.js`, `peripherals/fdc-wd1793.js`)
- Containers: **JV1** (headerless 256-byte-sector linear; geometry inferred from size; 18-sector images are 1-based/TRSDOS-style, 10-sector are 0-based/Model I-style, with automatic fallback) and **JV3** (2901 sector headers + data).
- WD1793: Type I (restore/seek/step), Type II (read/write sector with a DRQ byte pump), Type III (read address; read/write track accepted as no-ops — **DOS FORMAT does not work yet**), Type IV (force interrupt). Commands complete after a T-state delay via `tick()`; completion raises INTRQ; reading status clears it.
- Boot: the ROM loads track 0's first sector to **0x4300** and jumps to it. `tests/integration/disk-boot-tests.js` proves the whole handshake with a synthesized boot floppy — a real LDOS/TRSDOS image follows the identical path.
- Writes go to the in-memory image only (nothing touches the user's file).

## Adding features — where things plug in

**More disk drives (2 & 3).** The FDC already models four drives (`drives[4]`, select bits 0-3). Add menu items calling `system.mountDisk(2|3, image)` — that's all.

**Export modified disks.** `DiskImage.bytes` is the live image. Add a menu item that wraps it in a `Blob` and triggers a download. (JV3 write-back works because writes go through `_locate` offsets.)

**DOS FORMAT support.** Implement WRITE TRACK in `fdc-wd1793.js`: parse the format stream for 0xFE ID address marks to learn the sector layout, allocate sectors in the image (JV3 makes this natural), and complete with INTRQ. The command already parks in the `"noop"` branch.

**DMK images.** Add a third parser in `disk-image.js` (16-byte header, per-track IDAM pointer tables). Keep `readSector/writeSector(track, side, sector)` as the interface and the FDC never knows the difference.

**Authentic cassette audio.** Model the port-0xFF input bit as a pulse train derived from `cpu.cycles` (500 baud: clock pulse every ~4,032 T-states, data pulse midway for 1-bits). The cassette section of the MACHINE menu (Play/Stop/motor) is the intended control surface.

**Printer.** Model III line printer is memory-mapped at 0x37E8-0x37EB (read = status 0x30 ready; write = character). Intercept that range in `memory.js` (it's inside the ROM region — add a hook like `this.printer` beside `this.keyboard`) and append to a UI log. LPRINT/LLIST then work.

**RS-232.** Ports 0xE8-0xEB (UART) — add handlers in `io.js`; a WebSocket bridge makes a fun terminal.

**Sound.** The cassette output port (0xFF write, bits 0-1) *is* the Model III sound trick. `io.cassetteOut` changes are the signal: timestamp transitions with `cpu.cycles`, feed a WebAudio buffer.

**Hi-res graphics board.** Grafyx-style boards map a separate framebuffer via ports; add a peripheral + a second render path in `video.js`.

**Model 4 mode.** Needs banked memory (`memory.js` regions become switchable), the 80×24 video mode, and a Model 4 ROM. The memory class is the main surgery site.

## Testing conventions

- Every subsystem has unit tests; every user-visible capability has an **acceptance test that runs the real ROM in strict mode** (`tests/integration/`). New hardware features should follow the pattern: synthesize the medium (tape/disk) in the test, prove the ROM/DOS handshake end-to-end.
- The browser "phase consoles" (View dropdown) are hand-maintained copies of older unit suites. When core semantics change, grep `src/browser-test-runner*.js` for stale assertions — they drift (this has bitten several times).
- `yarn test:run` must stay green; `npm run phase:6` runs the ROM-boot acceptance file via the phase-gate script.

## Known limitations

- DOS FORMAT (WRITE TRACK) is a no-op; double-sided and >40-track operation is untested; JV1 side 1 reads fail by design.
- No cassette bit-level I/O (CLOAD from the `Cass?` prompt won't read a tape — use Load .cas from the menu).
- Multi-sector READ/WRITE commands transfer one sector (LDOS/TRSDOS use single-sector transfers).
- Disk writes are session-only until an export feature is added.
