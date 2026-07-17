/**
 * Bundled disk operating systems for drive 0.
 *
 * Each entry is a bootable 40-track double-density Model III .dsk under
 * public/disks/ (JV3 with proper deleted-DAM directory flags — see the
 * v1.5.0 design doc), fetched on demand like the games library. `note`
 * is shown after boot: what the DOS asks for before it reaches Ready.
 * Provenance and copyright status live in LICENSE.
 */

export const DOS_LIBRARY = [
  {
    id: "trsdos13",
    title: "TRSDOS 1.3 (Tandy, 1981)",
    file: "/disks/trsdos13.dsk",
    note: "Enter a date like 07/17/87 (ENTER skips the time)",
  },
  {
    id: "newdos80",
    title: "NEWDOS/80 v2 (Apparat)",
    file: "/disks/newdos80.dsk",
    note: "Boots straight to Newdos/80 Ready",
  },
  {
    id: "ldos531",
    title: "LDOS 5.3.1 (Logical Systems/MISOSYS, 1991)",
    file: "/disks/ldos-531.dsk",
    note: "Wants a full date and time, e.g. 07/17/87 then 12:00:00",
  },
];
