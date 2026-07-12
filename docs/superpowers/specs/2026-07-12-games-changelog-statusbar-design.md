# Games Expansion, Changelog + Status Bar, 2× Default — Design (v1.3.0)

**Date:** 2026-07-12
**Status:** Approved by user

## Goal

Three user requests, one release:

1. **More games.** The library already contains every game on trsjs.48k.ca
   (the site the project's current binaries came from); the only title not
   included is Retro-Zap, deliberately excluded for its custom cassette
   encoding. Expand beyond that site: classic TRS-80 binaries from
   preservation archives plus more public-domain BASIC.
2. **Changelog**, readable both on GitHub (`CHANGELOG.md`) and in-app,
   opened from a new **bottom status bar** that also links to the GitHub
   repo.
3. **Default screen size 2×** instead of Fill window.

## Decisions (user-confirmed)

- Sources: preservation-archive binaries **and** public-domain BASIC
  (not Retro-Zap decoding).
- Categories: arcade classics, text adventures, Super Star Trek, small
  BASIC type-ins — all four.
- Changelog: backfill v1.0.0 → v1.2.0 from git history; this work ships
  as v1.3.0. Keep-a-Changelog format.
- Status bar: always visible (no hide toggle), slim, dev-bar palette.
- Technical stack: bundle+headless-verify for binaries; Super Star Trek
  as a pre-tokenized `.cas` built by the real ROM; `CHANGELOG.md`
  imported via Vite `?raw` as the single source.

## Titles

Each title is accepted only after its image parses and boots in the
headless harness (see Testing). If an image can't be found or won't
pass, swap in an alternate rather than shipping a broken entry.

| Category | Ship | Alternates |
|---|---|---|
| Arcade (5) | Scarfman; Robot Attack; Meteor Mission 2; Defense Command; Penetrator | Cosmic Fighter; Armored Patrol; Rear Guard |
| Adventures (3) | Adventureland; Pirate Adventure (Scott Adams); Bedlam (Tandy) | Haunted House; Raaka-Tu |
| BASIC flagship | Super Star Trek (Ahl 1978, public domain) | — |
| BASIC type-ins (5) | Hunt the Wumpus; Acey Ducey; Bagels; Camel; Hangman | Nim; Mugwump |

Acquisition from preservation archives (archive.org, trs-80.com) in the
formats the emulator already loads: `.cmd`, `.cas`/`.3bn`, `.bas`.

## Design

### 1. Library and files

- New binaries land in `public/programs/`.
- Each gets a `LIBRARY` entry in `src/data/library.js` (`kind: "file"`,
  correct `format`, `note` where a game needs a keypress hint).
- The library `<select>` gains `<optgroup>`s: **Arcade**, **Adventures**,
  **BASIC type-ins**; existing entries re-group to match (their `group`
  field currently is uniformly "Games").
- New BASIC type-ins are text entries like the existing four: Level
  II-safe adaptations in the spirit of Ahl's public-domain listings,
  with an `expect` string each.
- LICENSE games exception rewritten: full title list with sources,
  keeping the existing "preservation community / rights remain with
  holders / included solely so the emulator has period software"
  language. Scott Adams titles noted separately (author has long
  permitted hobbyist distribution of the classic adventures).

### 2. Super Star Trek pipeline (ROM as tokenizer)

- Canonical artifact: `src/data/super-star-trek.bas` — the Ahl listing
  adapted to Model III BASIC (public domain).
- New `scripts/build-cas.js` (node): boot real ROM headless → reach
  READY → `NEW` → `typeText` the source → assert no `?SN ERROR` and
  non-empty program → read tokenized bytes between TXTTAB (0x40A4) and
  VARTAB (0x40F9) → wrap in the BASIC-cassette layout `parseCas`
  already documents → write `public/programs/sstrek.cas`.
- Run manually when the source changes; the `.cas` is a committed,
  derived artifact. Not part of `npm run build`.
- Library entry `format: "cas"`; loads through existing `fastLoadBasic`
  + auto-`RUN`. Instant, no multi-minute type-in.

### 3. Changelog + bottom status bar

- `CHANGELOG.md` at repo root, Keep-a-Changelog format:
  - v1.0.0 — dated 2026-07-05 (no tag exists; that is the date of the
    ROM-BASIC-boot + storage + library work per the spec/plan docs, and
    all earlier history back to 2025-12-13 folds into it).
  - v1.1.0 — 2026-07-10 (tagged): skinless default view, games library.
  - v1.2.0 — 2026-07-12 (tagged): 7× core, sound, save states, 32-col
    mode, touch input.
  - v1.3.0 — this work.
- In-app: `import changelogText from "../../CHANGELOG.md?raw"`;
  `src/ui/changelog.js` renders it — headings, lists, links, bold only
  (~40 lines, no dependency) — into `#changelog-modal`, which reuses
  the existing `.modal` CSS pattern (same close/ESC behavior as the
  BASIC/graphics modals).
- New `<footer id="status-bar">` in `index.html`:
  - Left: `v1.3.0` — version injected from `package.json` via
    `define: { __APP_VERSION__ }` in `vite.config.js`, never
    hand-written.
  - Right: `Changelog` (opens modal) `·` `GitHub ↗`
    (`https://github.com/cschweda/trs80-emulator`, new tab,
    `rel="noopener"`).
  - Styling: `#dev-bar` palette, ~24px tall, monospace, flex-shrink 0.
- Layout accounting: `#crt-well[data-scale="ratio"]` currently sizes
  against `100vh - 42px` (dev bar); the calc adds the status-bar
  height. On coarse-pointer devices the bar renders below the
  `#touch-keys` strip (status bar is the last flex child of `body`).

### 4. Default scale 2×

- `SCALE_VALUES` unchanged; `normalizeScale()` fallback changes
  `"fill"` → `"2"`, and `index.html` moves `selected` to the `2`
  option.
- Existing visitors with a saved `localStorage["trs80-scale"]` keep
  their choice; only fresh visitors see 2×.
- Known trade-off (accepted): 2× (1024×384 CSS px) overflows narrow
  phone screens with scroll; mobile users can select Fill.

## Error handling

- `build-cas.js` exits non-zero on `?SN ERROR`, empty program image, or
  READY never reached.
- Library fetch/parse failures already surface in the UI status line —
  unchanged.
- A binary that fails its acceptance test is not shipped (swap in an
  alternate or drop the slot).

## Testing

- **Binaries:** one row each in `games-library-tests.js` `ML_GAMES`
  (real-ROM boot, entry-address pin, checksum-clean for cassettes,
  screen-takeover assertions, `cpu.strictMode`). Titles that load as
  BASIC tapes (`parseCas` kind "basic" — e.g. Adventureland if sourced
  as BASIC-loader tape, and `sstrek.cas`) get a `fastLoadBasic` + `RUN`
  variant asserting the program takes the screen.
- **BASIC type-ins:** join the existing library text-entry test via
  their `expect` strings (e.g. "WUMPUS").
- **Super Star Trek:** acceptance test fast-loads `sstrek.cas`, `RUN`s,
  expects a recognizable banner (e.g. "STARDATE") — proves the built
  artifact, not just the source.
- **Scale:** unit test `normalizeScale(undefined) === "2"` (and legacy
  `"fit"` still maps to `"fill"`).
- **Changelog:** unit test renders the real `CHANGELOG.md` and asserts
  the output contains `package.json`'s version — a release without a
  changelog entry fails CI.
- Full suite (`yarn test`) green before release; version bump to 1.3.0
  and tag on release commit, consistent with v1.1.0/v1.2.0 practice.

## Out of scope

- Retro-Zap cassette-encoding support (explicitly deferred).
- Runtime fetching of games from external sites.
- FORMAT/disk-writing work, cassette input, X/Y flag work (tracked from
  the July audit, unrelated).
- Any markdown rendering beyond what `CHANGELOG.md` needs.
