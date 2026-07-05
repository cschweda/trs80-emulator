# Design: Cassette (.cas), Dual Disk (.dsk), and Program Library

**Date:** 2026-07-05 · **Builds on:** 2026-07-05-rom-basic-boot-design.md

**Goal:** Load real software: `.cas` cassette images (BASIC and SYSTEM machine-code tapes, e.g. Big Five games the user supplies), dual `.dsk` disk drives so drive 0 boots LDOS/TRSDOS and drive 1 holds games/data, and a built-in Library dropdown that quick-loads public-domain BASIC classics (Ahl). All user-facing controls live in the MACHINE menu.

## Non-goals / constraints

- No copyrighted software ships in the repo: users mount their own DOS and game images (Big Five is free from bigfivesoftware.com but not redistributable by us). Bundled library = public-domain/original text only.
- Disk writes stay in-memory for the session (no image download yet — extension point).
- DMK format, >2 drives, double-sided: extension points, not now.

## A. Cassette (.cas)

`.cas` files are the byte stream after FM/pulse decoding. Two structures:
- **BASIC (CSAVE):** leader `0x55...` + sync `0x7F`? — in practice Model I/III images: zeros/0x55 leader then `0xA5` sync, then `0xD3 0xD3 0xD3` + 1-byte filename, then the tokenized program image (with absolute line-link pointers), ending with `0x00 0x00` (link terminator).
- **SYSTEM:** leader + `0xA5` sync, `0x55` marker, 6-byte filename, then blocks: `0x3C, len(0=256), addrLo, addrHi, data..., checksum(addr+data)`, terminated by `0x78, entryLo, entryHi`.

Parser: `src/peripherals/cas-format.js` → `parseCas(bytes)` → `{ kind: "basic"|"system", name, program|blocks, entry }`. Detection: scan past leader to `0xA5`; next byte `0xD3` (basic) or `0x55` (system). Tolerate images that start directly at sync or even at `0xD3`.

**Fast-load (primary path, menu: "Load & run"):**
- BASIC: rewrite the program at TXTTAB with recomputed line links. Model III cassette BASIC: TXTTAB pointer at `0x40A4` (→ 0x42E9 stock). After writing lines (each: 2B link, 2B line#, tokens, 0x00) + terminating 0x0000: set `0x40F9` (VARTAB), `0x40FB` (ARYTAB), `0x40FD` (STREND?) all to end+1... exact trio: 40F9=simple vars, 40FB=arrays, 40FD=free-space start; all three = address after the 0x0000 terminator. Then turbo-type `RUN` (uses ROM's own RUN — resets runtime state properly).
- SYSTEM: write each block to its address; then set `cpu.registers.PC = entry` (what the ROM's `/` JP does). Machine code owns the machine; RESET recovers.
- Requires machine at READY (input loop); menu action boots first if needed? No — keep simple: user loads at READY (hint text says so); fast-load checks `system` exists only.

**Authentic playback (secondary, menu: "Play into CLOAD/SYSTEM"):** synthesize the port-0xFF bit stream: Model III 1500-baud (default, `Cass?`→ENTER) is FSK; 500-baud (L) is pulse/FM. Implementing precise timing is high-risk; ship behind the menu as experimental IF the headless CLOAD test passes within bounded effort; otherwise cut it and keep motor controls + fast-load (fast-load fully covers "playing games"). **Decision: attempt 500-baud only** (well-documented pulse format: clock pulse every 2 ms, data pulse present=1 between clocks; ROM reads via port 0xFF bit 7 edges); user answers `Cass?` with `L`. If unstable → cut, document.

## B. Dual disk (.dsk) + FDC

**Hardware model (Model III non-gate-array):**
- `0xF0` FDC status(R)/command(W); `0xF1` track; `0xF2` sector; `0xF3` data — WD1793.
- `0xF4` (W) drive select: bits 0-3 = drive 0-3 select, bit 4 = side 1, bit 5 = write precomp, bit 6 = wait-state gen, bit 7 = MFM (double density). Selecting starts motors (3 s timeout — modeled as always-on while selected).
- `0xE4` (W) NMI mask: bit 7 = FDC INTRQ triggers NMI, bit 6 = motor timeout NMI. (R) NMI status, **active-low like the 0xE0 latch**: bit 7 reads 0 when INTRQ pending (xtrs convention; acceptance test arbitrates polarity, same method as the RTC latch).
- Boot: with a controller present, the reset ROM selects drive 0, restores, reads track 0 sector 1(?) into RAM at 0x4200 and jumps — the strict-mode acceptance test with a synthetic boot sector confirms the exact handshake; whatever the ROM polls (status bits, DRQ loop on 0xF3, INTRQ NMI) the WD1793 model must satisfy.

**WD1793 model** (`src/peripherals/fdc-wd1793.js`), enough for DOS:
- Type I: RESTORE (0x0X → track 0, INTRQ), SEEK (0x1X → track=data reg), STEP/STEP-IN/STEP-OUT (0x2X-0x7X w/ update flag). Status: busy 0x01, index 0x02, track0 0x04, seek-err 0x10, head-loaded 0x20 (report loaded), write-prot 0x40, not-ready 0x80.
- Type II: READ SECTOR (0x80/0x90 multi), WRITE SECTOR (0xA0/0xB0): byte-at-a-time via data reg with DRQ (status 0x02) per byte; lost-data not modeled (we hold DRQ until read); RNF 0x10 if sector absent; INTRQ at completion.
- Type III: READ ADDRESS (0xC4 → 6 ID bytes), READ TRACK/WRITE TRACK (format) — WRITE TRACK accepted and consumes bytes until INTRQ (formats the track in the image: parse F5/FE ID marks minimally or just mark formatted — DOS format support is stretch; accept + no-op with success status).
- Type IV: FORCE INTERRUPT (0xD0 clears busy; 0xD8 immediate INTRQ).
- Timing: commands complete after a small emulated delay (e.g. Type I 20k T-states, per-byte DRQ immediate) — the system loop ticks the FDC with cycles (`fdc.tick(cycles)`), raising INTRQ→NMI via IOSystem.

**Disk images** (`src/peripherals/disk-image.js`): `mountFromBytes(bytes, name)` → geometry:
- JV3: detect by plausible header (2901 × 3-byte entries; flags byte patterns) → sector map with per-sector track/sector/density/size.
- JV1-linear fallback: 256-byte sectors; sectors/track = 10 (Model I SD) or 18 (Model III DD TRSDOS 1.3) chosen by divisibility (prefer 18 when both divide, image > 120 KB); sector numbering base auto: try 0-based, fall back 1..N on first RNF (store per-image base after first successful match — implement as: lookup(track, sector) checks both bases, remembers).
- API: `readSector(track, side, sector)` → Uint8Array(256)|null; `writeSector(...)` in-memory; `writeProtected` flag (default off so DOS can write).

**IOSystem gains:** `fdc` + `nmiMask`/`nmiPending()`; TRS80System delivers `cpu.nmi()` when `(fdc INTRQ or motor-timeout) & mask` — edge-triggered (fire once per assertion).

**UI:** MACHINE menu "Disks": Mount Drive 0… / Mount Drive 1… (file pickers), per-drive status line (name or "empty"), Eject. Reset with drive 0 mounted boots the DOS.

## C. Library + turbo-type

- `TRS80System.typeText(text, opts)`: feeds the keyboard matrix in emulated time (per char: press, run ~70k T-states, release, run ~50k; `\n` = ENTER; chars route through existing KeyboardMatrix combos). Wall-clock ≈ 3 ms/char. Uses the ROM's own tokenizer — zero token-table risk.
- MACHINE menu "Library": `<select>` from `src/data/library.js` — entries `{ id, title, kind: "basic", text }`. Bundled (public domain / original): Hammurabi, Lunar Lander (LEM), Hurkle, Number Guess. Load = `NEW` + typeText(program) + status; user types RUN (or menu types it — include `autoRun: true`).
- "Paste BASIC from clipboard" menu item: `navigator.clipboard.readText()` → typeText. This is the Big-Five-adjacent power feature: any listing from anywhere.
- `.cas` file picker under Cassette section feeds the same fast-loader (that's how user-supplied Big Five/Ahl tapes load).

## Testing

- `cas-format` unit tests: synthesized BASIC + SYSTEM images (builder helpers in test file), leader variants.
- Fast-load acceptance (extends rom-boot tests): boot → fast-load synthesized BASIC .cas (`10 PRINT "CAS OK"`) → auto-RUN → screen shows `CAS OK`; SYSTEM .cas whose code writes `SYS OK` into video RAM → PC jump → screen shows it.
- FDC unit tests: restore/seek/read-sector/DRQ byte pump/RNF/force-interrupt against a mounted synthetic JV1.
- **Disk-boot acceptance:** synthesize a JV1 image whose track 0 boot sector is Z80 code copying `DISK BOOT OK` to video RAM then HALT-loop; mount drive 0; reset; strict mode; screen shows the message. This proves the ROM's whole FDC handshake without any copyrighted DOS.
- typeText test: boot, typeText a 3-line program + RUN, assert output.
- Library: each bundled program typeText-loads and RUNs headless without `?SN Error`.

## Error handling

- Bad/unknown .cas or .dsk → menu status message, nothing mounted, machine untouched.
- FDC with no disk in selected drive → not-ready status (DOS shows its own error).
- Clipboard permission denied → status message.
