# DOS Boot Disks for Drive 0 (v1.5.0) — Design

**Date:** 2026-07-17
**Goal:** Boot real disk operating systems — TRSDOS 1.3, NEWDOS/80, LDOS 5.3.1 —
from drive 0 with one menu action, bundled the way the games library is, while
keeping the existing "mount your own .dsk" path first-class. Grow the games
library at the same time (Leo Christopherson titles, Med Systems' Asylum, and
other legally distributable classics).

*Process note: designed and implemented in one autonomous session at the user's
request ("Can you add this and get the original disk images?"), so the approval
gates ran against evidence — headless boot traces — rather than conversation.
Decisions the user may want to revisit are collected in "Decisions taken" at
the end.*

## What already exists (verified)

- `FDC1793` implements Type I/II/III/IV commands with a DRQ byte pump;
  INTRQ→NMI wiring via port 0xE4 mask is in `IOSystem`/`TRS80System`.
- `DiskImage` parses JV1 (Model I 10-spt and Model III 18-spt geometry) and
  JV3 (2901-entry header), with in-memory writes and learned JV1 sector base.
- `system.mountDisk(n, image)`; the MACHINE menu mounts/ejects/exports drives
  0-1; save states serialize full disk contents.
- The ROM's whole disk-boot handshake is proven by
  `tests/integration/disk-boot-tests.js` against a synthesized boot floppy.

## The one real emulation gap: deleted data address marks

Booting the real LDOS 5.3.1 Model III master (`ld3-531.dsk`, JV3) headlessly
reaches the banner and accepts date/time, then loops back to `Time ?` forever.
An FDC command trace shows why: after time entry LDOS reads the directory
cylinder and reloads SYS overlays, and *verifies each directory sector read
returns the deleted-DAM record type* (WD1793 status bit 5). The image encodes
exactly that: every track-20 sector's JV3 flags are `0xA0` (double density +
0xF8 deleted DAM); all other tracks are `0x80`. Our FDC never reports bit 5,
so LDOS treats the directory as corrupt and aborts boot. TRSDOS 1.3 and
NEWDOS/80 use the same convention (directory sectors written with 0xF8 DAMs).

The boot sector's byte 2 names the directory cylinder (0x14 = 20 on the LDOS
master) — the TRS-80 DOS-family convention this design leans on for JV1.

## Design

### 1. `DiskImage` learns about DAMs

- JV3: decode flag bits per sector — density (0x80), DAM code (0x60: in DD,
  0x20 ⇒ 0xF8 deleted; in SD, 0x20/0x40/0x60 ⇒ non-standard marks, all
  reported as deleted for WD1793-on-Model-III purposes), side (0x10), size
  (0x03, already handled).
- New `readSectorEx(track, side, sector) → { data, deleted } | null`;
  `readSector` stays as-is (compat with existing tests/callers).
- JV1: `deleted = (track === dirTrack)` where `dirTrack` is boot-sector
  byte 2 when plausible (1..79), else 17 (TRSDOS-family default). Computed
  once in the constructor.
- `writeSector(track, side, sector, data, { deleted })`: JV3 updates the
  in-file flag byte too, so an exported .dsk keeps its DAMs; JV1 ignores the
  flag (geometry carries no DAM).

### 2. `FDC1793` reports and writes record types

- READ SECTOR completion latches the sector's `deleted` flag; when the DRQ
  pump exhausts the buffer, final status carries bit 5 (0x20), matching the
  WD1793's "record type" bit. It stays until the next command, as on
  hardware.
- WRITE SECTOR honors command bit 0 (a0): `0xA1`-style writes store a deleted
  DAM through the new `writeSector` option.
- Save states: the latched flag joins `FDC_SCALARS`; restore defaults it to
  false for older saves (no version bump — additive).

### 3. Bundled DOS library + drive-0 boot UI

- `public/disks/` ships the DOS images; `src/data/dos-library.js` describes
  them (`id`, `title`, `file`, `note` — e.g. LDOS wants `MM/DD/YY` +
  `HH:MM:SS`, TRSDOS 1.3 wants `MM/DD/YY`). Provenance lands in LICENSE like
  every other bundled binary.
- MACHINE menu, Disks section: a "Boot in drive 0" `<select id="dos-select">`
  listing the bundled DOSes plus `Custom .dsk…`, and a "Boot" button.
  Bundled: fetch, mount drive 0, reset. Custom: the existing `.dsk` picker,
  then mount + reset. The existing per-drive Mount/Eject/Export rows are
  unchanged (mount drives 1-3 for data disks, no auto-reset).
- Status line shows the DOS's date/time entry hint after boot.

### 4. Sourced images (provenance)

- **LDOS 5.3.1 (Model III)** — `ld3-531.dsk` from Tim Mann's MISOSYS archive
  (https://tim-mann.org/misosys.html, `trs80/ld3-531.zip`); the zip embeds
  Roy Soltoff's/Bill Schroeder's grant: "…grant free permission to everyone
  to download and use this software … and to redistribute it to others,
  provided this notice is retained." Verified JV3, 40 tracks, boots.
- **TRSDOS 1.3** and **NEWDOS/80 v2** — to be sourced in JV1/JV3 form
  (trs-80.com emulator packages and sister archives); each must headlessly
  boot to its Ready prompt and pass a DIR before shipping. If only DMK-form
  images exist, converting is out of scope for this release and the picker
  ships with what verified.

### 5. Games library growth (parallel workstream)

Candidates (Leo Christopherson's titles — Android Nim, Dancing Demon, Voyage
of the Valkyrie, Bee Wary…; Med Systems' Asylum I/II; other freely
downloadable classics from trs-80.com) are researched with license evidence,
then every file is vetted with `scripts/probe-program.js` on a full 16-row
screen dump before joining `src/data/library.js` and the acceptance tests —
the v1.3.0 bar. Titles whose downloads are author-disabled are skipped.

## Testing

- Unit: JV3 DAM decode (0xA0 ⇒ deleted), JV1 dir-track synthesis (byte-2 and
  fallback), write-with-DAM updates JV3 flags in `bytes`, FDC status bit 5
  after deleted reads and its a0-write path.
- Integration: the synthesized-floppy boot test keeps passing (normal DAMs);
  each bundled DOS boots headlessly to its Ready prompt and lists a DIR
  (proves the directory/DAM path end to end); library/games acceptance
  extends to new titles.
- Browser: boot each DOS and a custom disk in real Chrome, screenshot each.

## Decisions taken (flag on review)

1. Bundled DOS disks are committed to the repo like the ROM and games, with a
   LICENSE exception paragraph per source — consistent with project practice.
2. Boot-DOS resets the machine immediately (that is the action's meaning);
   plain per-drive Mount keeps requiring a manual reset.
3. JV1 deleted-DAM synthesis uses boot-sector byte 2 with fallback 17 rather
   than a per-DOS table.
4. DMK support is out of scope for v1.5.0.
5. No FORMAT/write-track support (unchanged); DOS FORMAT still won't work.
