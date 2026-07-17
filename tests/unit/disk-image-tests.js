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

export function buildJV3({ tracks = 3, spt = 10, flagFor = null } = {}) {
  const headerSize = 2901 * 3 + 1;
  const sectors = [];
  for (let t = 0; t < tracks; t++) {
    for (let s = 0; s < spt; s++) {
      sectors.push({ track: t, sector: s });
    }
  }
  const bytes = new Uint8Array(headerSize + sectors.length * 256);
  bytes.fill(0xff, 0, headerSize); // free entries; write-prot byte 0xff = writable
  sectors.forEach((sec, i) => {
    bytes[i * 3] = sec.track;
    bytes[i * 3 + 1] = sec.sector;
    // Default 0x00 = 256-byte, side 0, normal DAM; flagFor overrides
    bytes[i * 3 + 2] = flagFor ? flagFor(sec.track, sec.sector) : 0x00;
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

  it("honors the write-protect byte (non-0xff = protected)", () => {
    const bytes = buildJV3();
    bytes[2901 * 3] = 0x00; // last header byte: 0xff = writable, else protected

    const disk = new DiskImage(bytes, "protected");

    expect(disk.writeProtected).toBe(true);
    expect(disk.writeSector(0, 0, 0, new Uint8Array(256))).toBe(false);
  });

  it("leaves the disk writable when the write-protect byte is 0xff", () => {
    const disk = new DiskImage(buildJV3());

    expect(disk.writeProtected).toBe(false);
    expect(disk.writeSector(0, 0, 0, new Uint8Array(256).fill(0xaa))).toBe(
      true
    );
  });
});

describe("DiskImage - data address marks", () => {
  // LDOS/TRSDOS-family DOSes mark directory sectors with 0xF8 deleted
  // DAMs and verify the record type on every directory read; the JV3
  // flags byte carries that mark (DD: 0x20 bit; SD: DAM code 0x20-0x60).
  const ddFlags = (dirTrack) => (t) => (t === dirTrack ? 0xa0 : 0x80);

  it("JV3 reports deleted DAM sectors via readSectorEx", () => {
    const disk = new DiskImage(
      buildJV3({ tracks: 22, spt: 10, flagFor: ddFlags(20) }),
      "ldos-style"
    );

    const dir = disk.readSectorEx(20, 0, 3);
    const data = disk.readSectorEx(5, 0, 3);

    expect(dir.deleted).toBe(true);
    expect(dir.data[0]).toBe(20); // stamped track: payload still correct
    expect(data.deleted).toBe(false);
    expect(disk.readSectorEx(50, 0, 0)).toBeNull();
  });

  it("JV3 treats any single-density non-FB DAM code as deleted", () => {
    // Model I TRSDOS 2.3 marks its directory 0xFA (SD flag 0x20)
    const disk = new DiskImage(
      buildJV3({ tracks: 18, spt: 10, flagFor: (t) => (t === 17 ? 0x20 : 0x00) })
    );

    expect(disk.readSectorEx(17, 0, 1).deleted).toBe(true);
    expect(disk.readSectorEx(3, 0, 1).deleted).toBe(false);
  });

  it("JV3 writes can set and clear the deleted DAM, updating the header", () => {
    const disk = new DiskImage(buildJV3({ tracks: 3, spt: 10 }));
    const data = new Uint8Array(256).fill(0x11);

    expect(disk.writeSector(1, 0, 4, data, { deleted: true })).toBe(true);
    expect(disk.readSectorEx(1, 0, 4).deleted).toBe(true);
    // The flag must live in the image bytes so an exported .dsk keeps it
    const reparsed = new DiskImage(disk.bytes, "roundtrip");
    expect(reparsed.readSectorEx(1, 0, 4).deleted).toBe(true);

    expect(disk.writeSector(1, 0, 4, data, { deleted: false })).toBe(true);
    expect(disk.readSectorEx(1, 0, 4).deleted).toBe(false);
    expect(new DiskImage(disk.bytes).readSectorEx(1, 0, 4).deleted).toBe(false);
  });

  it("JV1 synthesizes deleted DAMs on the boot sector's directory track", () => {
    const bytes = buildJV1({ tracks: 40, spt: 18 });
    bytes[2] = 20; // boot sector byte 2 names the directory cylinder

    const disk = new DiskImage(bytes, "jv1-dir20");

    expect(disk.readSectorEx(20, 0, 3).deleted).toBe(true);
    expect(disk.readSectorEx(17, 0, 3).deleted).toBe(false);
    expect(disk.readSectorEx(0, 0, 1).deleted).toBe(false);
  });

  it("JV1 falls back to track 17 when byte 2 is implausible", () => {
    const disk = new DiskImage(buildJV1({ tracks: 40, spt: 18 }));
    // buildJV1 stamps byte 2 with 0 (sector payload), which is no track

    expect(disk.readSectorEx(17, 0, 3).deleted).toBe(true);
    expect(disk.readSectorEx(20, 0, 3).deleted).toBe(false);
  });

  it("readSector keeps its plain-bytes contract", () => {
    const disk = new DiskImage(
      buildJV3({ tracks: 22, spt: 10, flagFor: ddFlags(20) })
    );

    const sec = disk.readSector(20, 0, 3);
    expect(sec).toBeInstanceOf(Uint8Array);
    expect(sec[0]).toBe(20);
  });
});
