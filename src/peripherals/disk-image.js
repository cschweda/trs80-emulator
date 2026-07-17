/**
 * TRS-80 .dsk disk image reader/writer (in-memory)
 *
 * Two common containers:
 *
 *   JV1 — headerless linear dump: track 0 sector 0.. then track 1...,
 *         256-byte sectors. Model I images use 10 sectors/track (single
 *         density); Model III TRSDOS 1.3-style images use 18. Geometry is
 *         inferred from the file size.
 *
 *   JV3 — 2901 three-byte sector headers (track, sector, flags) + one
 *         write-protect byte, followed by sector data in header order.
 *         Free entries are 0xFF-filled.
 *
 * Writes modify the in-memory image only (session-local); exporting a
 * modified image is a future extension.
 */

const JV3_ENTRIES = 2901;
const JV3_HEADER_SIZE = JV3_ENTRIES * 3 + 1;
const JV3_FREE = 0xff;

// JV3 flag bits
const F_SIDE = 0x10;
const F_DAM = 0x60; // data address mark code (0x00 = normal 0xFB)

function jv3SectorSize(flags, free) {
  // Size code meaning flips between used and free entries; used shown here
  const code = flags & 0x03;
  if (free) {
    return [512, 1024, 128, 256][code];
  }
  return [256, 128, 1024, 512][code];
}

// The WD1793 reports any non-0xFB mark as a deleted record (status bit
// 5). DOSes rely on it: directory sectors are written 0xF8 (or 0xFA on
// Model I TRSDOS) and verified on every directory read.
function jv3Deleted(flags) {
  return (flags & F_DAM) !== 0;
}

// TRSDOS-family boot sectors name the directory cylinder in byte 2.
const DEFAULT_DIR_TRACK = 17;

export class DiskImage {
  /**
   * @param {Uint8Array} bytes - raw .dsk contents
   * @param {string} name - display name (file name)
   */
  constructor(bytes, name = "disk") {
    this.name = name;
    this.bytes = new Uint8Array(bytes); // private working copy
    this.writeProtected = false;
    this.format = null; // "jv3" | "jv1"
    this.sectorBase = null; // JV1: 0 or 1, learned on first hit

    if (this._tryParseJV3()) {
      this.format = "jv3";
    } else if (this._tryParseJV1()) {
      this.format = "jv1";
    } else {
      throw new Error(
        `Unrecognized .dsk image (${bytes.length} bytes): not JV3, and not a multiple of 256-byte sectors`
      );
    }
  }

  _tryParseJV3() {
    if (this.bytes.length < JV3_HEADER_SIZE + 256) return false;

    const map = [];
    let dataOffset = JV3_HEADER_SIZE;
    let used = 0;
    for (let i = 0; i < JV3_ENTRIES; i++) {
      const track = this.bytes[i * 3];
      const sector = this.bytes[i * 3 + 1];
      const flags = this.bytes[i * 3 + 2];
      const free = track === JV3_FREE && sector === JV3_FREE;
      const size = jv3SectorSize(flags, free);
      if (!free) {
        // Sanity: plausible CHS values
        if (track > 96 || sector > 63) return false;
        map.push({
          track,
          sector,
          side: flags & F_SIDE ? 1 : 0,
          offset: dataOffset,
          size,
          deleted: jv3Deleted(flags),
          headerIndex: i, // to update the flags byte on DAM-changing writes
        });
        used++;
      }
      dataOffset += free ? 0 : size;
      if (dataOffset > this.bytes.length) return false;
    }
    if (used < 10) return false; // a real disk has many sectors

    this.jv3Map = map;
    // Last header byte: 0xff = writable, anything else = write-protected
    this.writeProtected = this.bytes[JV3_HEADER_SIZE - 1] !== 0xff;
    return true;
  }

  _tryParseJV1() {
    const size = this.bytes.length;
    if (size === 0 || size % 256 !== 0) return false;

    const totalSectors = size / 256;
    // Prefer geometries that yield a classic track count; prefer the
    // Model III 18-sector layout when both fit.
    const candidates = [];
    for (const spt of [18, 10]) {
      if (totalSectors % spt === 0) {
        candidates.push({ spt, tracks: totalSectors / spt });
      }
    }
    if (candidates.length === 0) return false;
    const classic = candidates.find((c) => [35, 40, 80].includes(c.tracks));
    const chosen = classic || candidates[0];

    this.sectorsPerTrack = chosen.spt;
    this.tracks = chosen.tracks;
    // Convention: Model III 18-sector disks number sectors 1-18 (TRSDOS
    // 1.3 style); Model I 10-sector disks number 0-9. Seed the base
    // accordingly; _locate still falls back to the other base on a miss.
    this.preferredBase = chosen.spt === 18 ? 1 : 0;
    // JV1 carries no DAM info, but DOSes verify the deleted mark on
    // directory reads — synthesize it for the directory track the boot
    // sector names (byte 2), as xtrs does for its fixed track 17.
    const bootDir = this.bytes[2];
    this.dirTrack =
      bootDir >= 1 && bootDir < this.tracks ? bootDir : DEFAULT_DIR_TRACK;
    return true;
  }

  /** Highest track number present (for FDC seek bounds). */
  trackCount() {
    if (this.format === "jv1") return this.tracks;
    return Math.max(...this.jv3Map.map((e) => e.track)) + 1;
  }

  /**
   * Find a sector's byte range. JV1 images may number sectors from 0 or 1
   * depending on how they were produced; the first successful lookup
   * fixes the convention for the rest of the session.
   * @returns {{offset:number,size:number}|null}
   */
  _locate(track, side, sector) {
    if (this.format === "jv3") {
      const hit = this.jv3Map.find(
        (e) => e.track === track && e.sector === sector && e.side === side
      );
      return hit ? { offset: hit.offset, size: hit.size, entry: hit } : null;
    }

    if (side !== 0) return null; // JV1 is single-sided
    const bases =
      this.sectorBase !== null
        ? [this.sectorBase]
        : [this.preferredBase, 1 - this.preferredBase];
    for (const base of bases) {
      const index = sector - base;
      if (index >= 0 && index < this.sectorsPerTrack && track < this.tracks) {
        this.sectorBase = base;
        return {
          offset: (track * this.sectorsPerTrack + index) * 256,
          size: 256,
          entry: null,
        };
      }
    }
    return null;
  }

  /**
   * Read a sector with its record type, the way the FDC sees it.
   * @returns {{data: Uint8Array, deleted: boolean}|null}
   */
  readSectorEx(track, side, sector) {
    const loc = this._locate(track, side, sector);
    if (!loc) return null;
    const deleted = loc.entry ? loc.entry.deleted : track === this.dirTrack;
    return {
      data: this.bytes.slice(loc.offset, loc.offset + loc.size),
      deleted,
    };
  }

  /** @returns {Uint8Array|null} a copy of the sector data */
  readSector(track, side, sector) {
    return this.readSectorEx(track, side, sector)?.data ?? null;
  }

  /**
   * @param {{deleted?: boolean}} [opts] - record type to write (WD1793
   *   write-sector bit a0). JV3 stores it in the header flags — in the
   *   image bytes, so exports keep it; JV1 has nowhere to put one and
   *   keeps synthesizing by directory track.
   * @returns {boolean} true if written
   */
  writeSector(track, side, sector, data, { deleted = false } = {}) {
    if (this.writeProtected) return false;
    const loc = this._locate(track, side, sector);
    if (!loc) return false;
    this.bytes.set(data.subarray(0, loc.size), loc.offset);
    const entry = loc.entry;
    if (entry && entry.deleted !== deleted) {
      const flagsAt = entry.headerIndex * 3 + 2;
      const flags = this.bytes[flagsAt] & ~F_DAM;
      // Density decides the code for 0xF8: DD uses 0x20, SD uses 0x60
      const damCode = deleted ? (flags & 0x80 ? 0x20 : 0x60) : 0x00;
      this.bytes[flagsAt] = flags | damCode;
      entry.deleted = deleted;
    }
    return true;
  }
}
