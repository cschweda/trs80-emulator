# Skinless default view + trsjs games library — design

Date: 2026-07-10
Status: approved (pending user review of this document)

## Context

Today the emulator boots into a full "machine skin": the Tandy-gray case,
CRT bezel, drive blanks, badge row, RESET key, and a hint paragraph, all
inside a scrolling stage. A separate "theater mode" (MACHINE menu) hides
the chrome and fills the window. The canvas renders the native 512×192
pixel grid (8:3 — wide, squat characters), while the real Model III CRT
presented those characters roughly twice as tall (a ~4:3 picture).

The user wants the emulator to look like trs80.com's player by default:
the screen IS the page. They also want the trsjs.48k.ca game set loadable
from the built-in library.

## Decisions (user-confirmed)

1. **Screen fit:** default view fills the window edge-to-edge (stretch).
   The Size control gains an "Original ratio" choice that letterboxes at
   the authentic 4:3 CRT proportion. Numeric sizes stay for font-size
   control — and also use the 4:3 proportion (1× = 512×384 CSS px), so
   every non-Fill mode reads as "a Model III screen, pick how big."
2. **Skin fate:** kept, off by default. MACHINE menu gets a
   "Show machine case" / "Hide machine case" toggle, persisted.
3. **Games:** bundle all nine trsjs titles, self-hosted in the repo like
   the ROM, with a licensing note.

## Display design

### View modes

- The current `body.theater` styling becomes the default (no class):
  black stage, screen centered, slim dev bar pinned on top.
- The machine case, badge row, drive column, and hint paragraph render
  only under `body.case` — the inversion of today's logic.
- MACHINE menu item "Full screen" becomes "Show machine case" (label
  flips to "Hide machine case" when on). Persisted as
  `localStorage["trs80-case"]` (`"1"` shown; absent/`"0"` hidden —
  hidden is the default).
- The keyboard hint text (ENTER at Cass?, SHIFT+0 lowercase-unlock,
  ESC = BREAK) moves into the MACHINE menu as a `.menu-note` so it
  remains discoverable in the skinless view.

### Size select semantics

One control covers fill, aspect, and font size:

| Value | Behavior (skinless view) |
|---|---|
| `fill` (default) | canvas stretches to 100% × 100% of the stage |
| `ratio` | largest 4:3 rectangle that fits, centered on black |
| `1`, `1.5`, `2`, `3`, `4` | fixed 4:3 sizes: width 512·N px, height 384·N px, centered; stage scrolls if the window is smaller |

- Implementation is pure CSS on the existing 512×192 canvas
  (`width/height: 100%`, `aspect-ratio: 4 / 3`, fixed widths).
  `image-rendering: pixelated` keeps the 2× vertical stretch crisp;
  video.js is untouched.
- When the case is shown, the screen sits in the bezel exactly as today:
  `fill`/`ratio` behave like the old Fit (canvas fills the bezel well at
  its natural 8:3), numeric sizes pin the well width as today.
- Migration: a saved `trs80-scale` of `"fit"` maps to `fill`.
- The scale-value → style mapping is extracted into a pure function
  (new `src/ui/screen-layout.js`) so it can be unit-tested.

## Games library

### Files (public/programs/, ~64 KB total, fetched on demand)

| Title | File | Format | Load path |
|---|---|---|---|
| Super Nova | nova-m3.cmd | /CMD | new cmd loader |
| Flying Saucers | flysauc1.cmd | /CMD | new cmd loader |
| Galaxy Invasion | galaxy.cmd | /CMD | new cmd loader |
| OPUS-1 | opus1msg.cmd | /CMD | new cmd loader |
| Sea Dragon | seadrag.3bn | SYSTEM blocks | existing parseSystem (headerless adapter) |
| Time Trek | timetrek.3bn | SYSTEM blocks | existing parseSystem (headerless adapter) |
| Retro-Zap | retrozap.cas | .cas BASIC (0xAA leader) | existing parseCas + leader tolerance, then auto-RUN |
| Invasion Force | invade.cas | .cas SYSTEM (zero leader) | existing parseCas + leader tolerance |
| City Defence | m2.bas | ASCII BASIC | existing turbo-type (text entry) |

Sourced from trsjs.48k.ca/bin/ (George Phillips). The classic commercial
titles are widely-redistributed abandonware never formally freed; a
licensing note goes in the LICENSE exception section beside the existing
ROM exception, crediting the source site.

### Loaders

- New `src/peripherals/cmd-format.js`, mirroring cas-format.js style:
  - `parseCmd(bytes)` — walks /CMD records: type `0x01` load block
    (length byte counts address + data; values 0/1/2 mean 256/257/258),
    `0x02` transfer address (entry), `0x05` module name; other record
    types are skipped by length. Returns `{ name, blocks, entry }`.
  - `fastLoadCmd(system, parsed)` — writes blocks into RAM, sets PC to
    entry (SP left where ROM BASIC put it, matching fastLoadSystem).
- `.3bn` support: the files begin with a one-byte 0x55 sync + 6-byte
  name + `0x3C` data blocks — the SYSTEM tape layout without the long
  leader. parseCas's leader scan is relaxed to accept short/absent
  leaders and 0xAA/zero leader variants (drives Retro-Zap and Invasion
  Force too). If relaxing proves messy, a thin `.3bn` adapter prepends
  a synthetic leader instead — whichever keeps parseCas honest.

### Library schema & UI

- `LIBRARY` entries gain a discriminator:
  - `{ kind: "text", id, title, expect, text }` — today's shape (default)
  - `{ kind: "file", id, title, file, format }` — fetched entries
    (`format`: `"cmd" | "cas" | "3bn"`)
- The library `<select>` renders optgroups: "Games" first, then
  "BASIC classics".
- `menuLoadLibrary` dispatches on kind: text → NEW + typeText + RUN
  (unchanged); file → fetch → parse → fast-load → auto-RUN for BASIC
  tapes / jump-to-entry for ML. Status line reports title + any
  checksum warnings; fetch failures surface in the status line.

## Testing

- cmd-format unit tests parse the real bundled files (read from
  public/programs/ — no network) plus tiny synthetic fixtures for the
  length-byte edge cases (0/1/2) and unknown-record skipping.
- Leader-tolerance tests cover 0x55, 0xAA, zero, and absent leaders.
- Integration test per game: fast-load headlessly, assert PC lands on
  the parsed entry (ML) or the program auto-RUNs (BASIC), then run a
  few thousand frames and assert the machine hasn't halted and video
  RAM is non-blank.
- screen-layout mapping unit tests (fill / ratio / numeric / migration).
- Existing 334 tests stay green; CI unchanged.

## Verification (manual, end of implementation)

Dev server + viewcap screenshots: skinless default at two window
shapes, Original ratio letterboxing, case toggle round-trip,
Super Nova and Galaxy Invasion running from the Library menu.

## Out of scope

- Bottom overlay control bar (trs80.com style) — dev bar stays on top.
- trsjs's keystroke-injection mini-language, disk-image games
  (TRSDOS/Hires demos), WebGL/CRT shader effects.
- Re-rendering glyphs at 8×24 in video.js (CSS achieves the same pixels).
