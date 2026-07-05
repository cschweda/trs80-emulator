/**
 * .dsk container tests: JV1 geometry inference and sector addressing,
 * JV3 header parsing, in-memory writes.
 */

import { describe, it, expect } from "vitest";
import { DiskImage } from "@peripherals/disk-image.js";

export function buildJV1({ tracks = 40, spt = 18, stamp = true } = {}) {
  const bytes = new Uint8Array(tracks * spt * 256);
  if (stamp) {
    // Stamp every sector with [track, sectorIndex] for identification
    for (let t = 0; t < tracks; t++) {
      for (let s = 0; s < spt; s++) {
        const off = (t * spt + s) * 256;
        bytes[off] = t;
        bytes[off + 1] = s;
      }
    }
  }
  return bytes;
}

export function buildJV3({ tracks = 3, spt = 10 } = {}) {
  const headerSize = 2901 * 3 + 1;
  const sectors = [];
  for (let t = 0; t < tracks; t++) {
    for (let s = 0; s < spt; s++) {
      sectors.push({ track: t, sector: s });
    }
  }
  const bytes = new Uint8Array(headerSize + sectors.length * 256);
  bytes.fill(0xff, 0, headerSize); // free entries + write-prot byte 0xff=writable? (unused)
  sectors.forEach((sec, i) => {
    bytes[i * 3] = sec.track;
    bytes[i * 3 + 1] = sec.sector;
    bytes[i * 3 + 2] = 0x00; // 256-byte, side 0
    const off = headerSize + i * 256;
    bytes[off] = sec.track;
    bytes[off + 1] = sec.sector;
  });
  return bytes;
}

describe("DiskImage - JV1", () => {
  it("infers 40x18 geometry from a 184,320-byte image", () => {
    const disk = new DiskImage(buildJV1({ tracks: 40, spt: 18 }), "trsdos13");

    expect(disk.format).toBe("jv1");
    expect(disk.sectorsPerTrack).toBe(18);
    expect(disk.trackCount()).toBe(40);
  });

  it("infers 35x10 geometry from a Model I-size image", () => {
    const disk = new DiskImage(buildJV1({ tracks: 35, spt: 10 }));

    expect(disk.sectorsPerTrack).toBe(10);
    expect(disk.trackCount()).toBe(35);
  });

  it("18-sector images default to 1-based numbering (TRSDOS style)", () => {
    const disk = new DiskImage(buildJV1({ spt: 18 }));

    const sec = disk.readSector(5, 0, 3);

    expect(sec[0]).toBe(5);
    expect(sec[1]).toBe(2); // sector 3 = third sector = index 2
    expect(disk.sectorBase).toBe(1);
  });

  it("10-sector images default to 0-based numbering (Model I style)", () => {
    const disk = new DiskImage(buildJV1({ tracks: 35, spt: 10 }));

    const sec = disk.readSector(5, 0, 3);

    expect(sec[1]).toBe(3); // sector 3 = index 3
    expect(disk.sectorBase).toBe(0);
  });

  it("falls back to the other base when the preferred one misses", () => {
    const disk = new DiskImage(buildJV1({ spt: 18 }));

    // Sector 0 can't exist under 1-based numbering -> falls back to 0-based
    const sec = disk.readSector(2, 0, 0);

    expect(sec).not.toBeNull();
    expect(sec[1]).toBe(0);
    expect(disk.sectorBase).toBe(0);
  });

  it("returns null for a missing sector", () => {
    const disk = new DiskImage(buildJV1({ spt: 10 }));
    disk.readSector(0, 0, 0); // lock base to 0

    expect(disk.readSector(0, 0, 10)).toBeNull();
    expect(disk.readSector(99, 0, 0)).toBeNull();
  });

  it("writes sectors in memory", () => {
    const disk = new DiskImage(buildJV1());
    const data = new Uint8Array(256).fill(0xee);

    expect(disk.writeSector(1, 0, 2, data)).toBe(true);
    expect(disk.readSector(1, 0, 2)[10]).toBe(0xee);
  });

  it("honors write protection", () => {
    const disk = new DiskImage(buildJV1());
    disk.writeProtected = true;

    expect(disk.writeSector(0, 0, 0, new Uint8Array(256))).toBe(false);
  });

  it("rejects non-sector-multiple files", () => {
    expect(() => new DiskImage(new Uint8Array(1000))).toThrow(/Unrecognized/);
  });
});

describe("DiskImage - JV3", () => {
  it("parses headers and reads by CHS", () => {
    const disk = new DiskImage(buildJV3({ tracks: 3, spt: 10 }), "jv3disk");

    expect(disk.format).toBe("jv3");
    const sec = disk.readSector(2, 0, 7);
    expect(sec[0]).toBe(2);
    expect(sec[1]).toBe(7);
    expect(disk.trackCount()).toBe(3);
  });

  it("returns null for sectors not in the map", () => {
    const disk = new DiskImage(buildJV3());

    expect(disk.readSector(50, 0, 1)).toBeNull();
  });
});
