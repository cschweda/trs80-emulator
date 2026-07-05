# Storage & Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Spec (all formats/ports/addresses): `docs/superpowers/specs/2026-07-05-storage-and-library-design.md` — it is the single reference; this plan is ordering + gates.

**Goal:** .cas fast-load (BASIC + SYSTEM), WD1793 dual-.dsk drives with DOS boot, Library/paste turbo-type — all from the MACHINE menu, all covered by headless acceptance tests using synthesized media (no copyrighted bits in repo).

## Global constraints

- No git commits (user commits manually). `yarn test:run` green after every task.
- New modules follow existing patterns: ES class per peripheral, wired in TRS80System/IOSystem, vitest with `@peripherals` alias.
- Synthetic media builders live beside their tests; acceptance tests run `cpu.strictMode = true`.

### Task 1: typeText turbo feed  ✅ gate: typed program RUNs headless
- Create `TRS80System.typeText(text)` (emulated-time pacing per spec C; ENTER for `\n`; unknown chars skipped w/ count returned).
- Tests in `tests/unit/system-tests.js`: boot ROM, typeText `10 PRINT "T"\nRUN\n`, screen shows `T`.

### Task 2: .cas parser + fast-load  ✅ gate: CAS OK / SYS OK on screen
- Create `src/peripherals/cas-format.js`: `parseCas`, `fastLoadBasic(system, parsed)` (link fixups at TXTTAB from 0x40A4; set 40F9/40FB/40FD), `fastLoadSystem(system, parsed)` (blocks + PC=entry).
- Tests: `tests/unit/cas-format-tests.js` (parser) + `tests/integration/cas-load-tests.js` (acceptance per spec).

### Task 3: Disk images  ✅ gate: JV1/JV3 geometry + sector IO unit tests
- Create `src/peripherals/disk-image.js` per spec B (JV3 detect, JV1-linear fallback, dual sector-numbering base, in-memory writes).
- Tests: `tests/unit/disk-image-tests.js`.

### Task 4: WD1793 + ports + NMI  ✅ gate: FDC unit tests
- Create `src/peripherals/fdc-wd1793.js` (state machine per spec B; `attachDrive(n, image)`, `tick(cycles)`, `intrq`, port read/write handlers).
- Modify `src/core/io.js`: 0xF0-0xF3 → fdc, 0xF4 drive select, 0xE4 NMI mask/status (active-low read); expose `nmiPending()`.
- Modify `src/system/trs80-system.js`: `fdc.tick`, edge-triggered `cpu.nmi()` delivery; `mountDisk(n, bytes, name)` / `ejectDisk(n)`.
- Tests: `tests/unit/fdc-tests.js`.

### Task 5: Disk boot acceptance  ✅ gate: `DISK BOOT OK` from synthesized boot floppy
- `tests/integration/disk-boot-tests.js`: build JV1 with hand-assembled boot sector (LD HL,msg / LD DE,0x3C00 / LDIR / JR $), mount drive 0, reset, strict mode, expect screen text. Iterate FDC handshake against the real ROM until green (same loop as ROM boot — dump PC trace on stall).

### Task 6: Menu UI (Cassette / Disks / Library / Paste)  ✅ gate: browser verify
- `index.html` + `src/main.js`: hidden file inputs; Cassette section (Load .cas → fast-load, status), Disks (Mount 0/1, eject, status), Library select + Load & RUN, Paste BASIC.
- `src/data/library.js`: Hammurabi, Lunar Lander, Hurkle, Number Guess (original/PD text).
- Library headless test: each entry typeTexts + RUNs without ?SN Error (`tests/integration/library-tests.js`).

### Task 7: Docs + wrap  ✅ gate: suite green, browser session verified
- `docs/ARCHITECTURE.md` (task #19: implementation map + extension guide: more drives, DMK, printer, RS-232, sound, hi-res).
- README status refresh; plan addendum; memory update.

### Deferred (stretch, only if all above green and budget remains)
- 500-baud authentic cassette playback into ROM CLOAD (spec A decision).
- WRITE TRACK true formatting; .dsk download/export.

### Addendum (written during execution, 2026-07-05)

- All gates passed: 334/334 tests. Cassette fast-load worked first try against the real ROM (validating PRINT=0xB2 tokens and the 0x40F9/FB/FD fixups via RUN and LIST). Disk boot needed exactly one fix: the Model III ROM loads the boot sector at 0x4300 (not 0x4200) — the FDC handshake itself (detect, RESTORE, DRQ pump, jump) worked unmodified.
- JV1 sector numbering decided by geometry: 18-sector images 1-based (TRSDOS style), 10-sector 0-based (Model I), with fallback to the other base on miss.
- typeText needed a 400k T-state post-ENTER settle: the ROM tokenizes/stores each line before scanning again; without it, longer programs lost the first character after ENTER.
- FDC `_finish()` must clear DRQ with BUSY or the byte pump delivers one extra byte.
- Authentic 500-baud playback: cut per spec decision (fast-load covers games); seam documented in ARCHITECTURE.md.
- Browser-verified: Lunar Lander loaded from the Library menu and played interactively. Automation lesson recorded: drive verification through system.typeText, not synthetic DOM key events (unreliable in occluded windows).
