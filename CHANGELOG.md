# Changelog

All notable changes to the TRS-80 Model III emulator are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and versions follow [semver](https://semver.org/).

## [1.5.0] - 2026-07-17

### Added

- **Boot a real DOS.** MACHINE menu → "Boot a DOS (drive 0)": pick
  TRSDOS 1.3 (Tandy, 1981), NEWDOS/80 v2 (Apparat), LDOS 5.3.1
  (Logical Systems/MISOSYS), or your own `.dsk`, press **Boot in
  drive 0**, and the machine resets straight into it — DIR, BASIC, and
  friends all work. The bundled images are verified 40-track
  double-density Model III masters (see LICENSE for provenance,
  including the MISOSYS redistribution grant for LDOS). The status line
  tells you what each DOS asks at boot (TRSDOS and LDOS want a date —
  try `07/17/87`).
- **Deleted data address marks**, the one FDC feature real DOSes
  wouldn't boot without: directory sectors on TRSDOS-family disks carry
  0xF8 marks and the DOS verifies the WD1793 record-type status bit on
  every directory read. JV3 flags now decode (and write back) DAMs, JV1
  images synthesize them for the boot sector's directory track, and
  WRITE SECTOR honors the a0 command bit — so exported disks keep their
  marks.
- **13 new library titles** (26 → 39), every one machine-verified to
  its real title screen. New *Christopherson* group: Android Nim
  (1978), Bee Wary, Snake Eggs — the famous animated BASIC/ML hybrids,
  with their cassette-port sound wired to the emulator's audio. Arcade:
  Eliminator, Tank Zone 2000, Rear Guard (all Westmoreland & Gilman,
  public domain per the authors), Space Castle and Flip-Out (Cornsoft).
  Adventures: Pyramid of Doom (Scott Adams #8) and the Med Systems 3-D
  quartet — Asylum, Asylum II, Deathmaze 5000, Labyrinth.
- The cassette BASIC loader now follows the CSAVE link-pointer chain
  the way real CLOAD does, so programs with machine code embedded in
  REM lines (zeros included) load intact; garbage links still fall back
  to the old scan.

### Notes

- Voyage of the Valkyrie could not be included: its downloads on
  trs-80.com are disabled at the author's request, which this project
  honors (as with Penetrator). Dancing Demon, Duel-N-Droids, and Life
  Two stayed out for lack of any license evidence; Donkey Kong and
  Zaxxon for trademark/license reasons — details in LICENSE.
- DOS FORMAT (WRITE TRACK) and DMK images remain future work; writes
  to mounted disks stay in-memory (use Export drive to keep them).

## [1.4.1] - 2026-07-13

### Fixed

- **The machine case is a proper Model III again.** The cabinet was
  shrink-wrapping the screen at its raw 512×192 pixel shape — 8:3 — which
  squashed the whole machine flat at roughly 2.7:1 and left the characters
  wide and stubby. The real Model III drove that same raster onto a 4:3
  tube with double-height pixels, which is what the rest of the emulator
  already assumed: the Size menu's numeric steps are 512×384 per unit, and
  the case was throwing that height away. The tube is now 4:3 everywhere,
  and the cabinet stands at about 1.7:1.
- The cabinet no longer runs off the bottom of a short window. Its width is
  bounded by the height actually left over, so a small screen gets a smaller
  machine instead of a scrollbar reaching for RESET.
- The blank drive bays scale with the cabinet rather than staying 64px tall,
  which left them as two chips at the top of the taller right column.

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

## [1.3.0] - 2026-07-12

### Added

- Games library grows from 12 to 26 titles: arcade classics (Scarfman,
  Cosmic Fighter, Meteor Mission 2, Defense Command, Armored Patrol),
  text adventures (Adventureland, Pirate Adventure, Bedlam), Super Star
  Trek, and five more BASIC type-ins (Hunt the Wumpus, Acey Ducey,
  Bagels, Camel, Hangman)
- Library menu groups titles into Arcade, Adventures, BASIC type-ins,
  and Extras
- Super Star Trek ships as a pre-tokenized cassette built by the real
  ROM (`scripts/build-cas.js`)
- `scripts/probe-program.js`: headless loader probe for vetting game
  images before they join the library
- Bottom status bar: version, this changelog in an in-app modal, GitHub
  link
- This changelog

### Changed

- Default screen size is 2× for fresh visitors (a saved Size preference
  still wins)

## [1.2.0] - 2026-07-12

### Added

- Cassette-port sound through WebAudio, with a MACHINE-menu toggle
  (preference persisted)
- Save states: quick save/load in the browser plus JSON export/import
- 32-column wide-character mode
- Touch input: soft-keyboard bridge and on-screen special keys

### Changed

- Z80 core roughly 7× faster (about 83× realtime headless)

## [1.1.0] - 2026-07-10

### Added

- Games library: eight classics from trsjs.48k.ca (Super Nova, Galaxy
  Invasion, Flying Saucers, Sea Dragon, Time Trek, Invasion Force, City
  Defence, OPUS-1) with a native /CMD parser and fast-loader, cassette
  format dispatch, and headless real-ROM acceptance tests
- Skinless full-window screen as the default view; the machine case is
  opt-in from the MACHINE menu; Size select backed by a pure
  screen-layout mapping
- CI: the vitest suite runs on push and pull request

### Fixed

- CCF takes half-carry from the previous carry, not the new one
- RETN/RETI interrupt flip-flop restore semantics pinned by tests
- RLD/RRD (ED 6F/67) implemented
- JV3 write-protect byte honored
- Held keys release when the window loses focus

## [1.0.0] - 2026-07-05

### Added

- Boots the real 14K Model III ROM into Level II BASIC on an emulated
  Z80 at 2.03 MHz
- Dual WD1793 floppy controller with JV1/JV3 `.dsk` mounting
- Cassette `.cas` loading and a built-in program library with
  public-domain BASIC classics (Hammurabi, Lunar Lander, Hurkle, Number
  Guess), plus paste-BASIC-from-clipboard
- Authentic keyboard matrix and 64-column video; phased test suite
  covering CPU, memory, I/O, cassette, BASIC, and video (work back to
  2025-12-13 folds into this release)
