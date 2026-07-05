/**
 * WD1793 FDC tests, driven through the IOSystem ports the way the ROM
 * and a DOS would: command/status at 0xF0, track 0xF1, sector 0xF2,
 * data 0xF3, drive select 0xF4, NMI mask/status 0xE4.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { IOSystem } from "@core/io.js";
import { DiskImage } from "@peripherals/disk-image.js";
import { buildJV1 } from "./disk-image-tests.js";

function settle(io, tstates = 20000) {
  io.fdc.tick(tstates);
}

describe("FDC via ports", () => {
  let io;

  beforeEach(() => {
    io = new IOSystem();
  });

  it("presents as absent (floating bus) with no disk mounted", () => {
    expect(io.readPort(0xf0)).toBe(0xff);
    expect(io.readPort(0xe4)).toBe(0xff);
  });

  it("RESTORE homes the head and reports track 0 + head loaded", () => {
    io.fdc.attachDrive(0, new DiskImage(buildJV1()));
    io.writePort(0xf4, 0x01); // select drive 0

    io.writePort(0xf0, 0x00); // RESTORE
    settle(io);

    const status = io.readPort(0xf0);
    expect(status & 0x01).toBe(0); // not busy
    expect(status & 0x04).toBe(0x04); // track 0
    expect(status & 0x20).toBe(0x20); // head loaded
    expect(status & 0x80).toBe(0); // ready
  });

  it("SEEK moves to the track in the data register", () => {
    io.fdc.attachDrive(0, new DiskImage(buildJV1()));
    io.writePort(0xf4, 0x01);

    io.writePort(0xf3, 17); // target track via data register
    io.writePort(0xf0, 0x10); // SEEK
    settle(io);

    expect(io.readPort(0xf1)).toBe(17); // track register updated
    expect(io.fdc.physicalTrack[0]).toBe(17);
  });

  it("READ SECTOR pumps 256 bytes via DRQ and raises INTRQ at the end", () => {
    io.fdc.attachDrive(0, new DiskImage(buildJV1()));
    io.writePort(0xf4, 0x01);
    io.writePort(0xf3, 5);
    io.writePort(0xf0, 0x10); // seek track 5
    settle(io);

    io.writePort(0xf2, 3); // sector 3
    io.writePort(0xf0, 0x80); // READ SECTOR
    settle(io);

    const bytes = [];
    let guard = 0;
    while (guard++ < 300) {
      const status = io.fdc.status;
      if (status & 0x02) {
        bytes.push(io.readPort(0xf3));
      }
      if (!(status & 0x01)) break; // busy cleared
    }

    expect(bytes.length).toBe(256);
    expect(bytes[0]).toBe(5); // stamped track
    expect(bytes[1]).toBe(2); // sector 3 on an 18-sector (1-based) disk = index 2
    expect(io.fdc.intrq).toBe(true);
    // Reading status clears INTRQ
    io.readPort(0xf0);
    expect(io.fdc.intrq).toBe(false);
  });

  it("READ SECTOR of a missing sector sets record-not-found", () => {
    io.fdc.attachDrive(0, new DiskImage(buildJV1({ spt: 10 })));
    io.writePort(0xf4, 0x01);
    io.fdc.currentDisk().readSector(0, 0, 0); // lock 0-based numbering

    io.writePort(0xf2, 99);
    io.writePort(0xf0, 0x80);
    settle(io);

    expect(io.readPort(0xf0) & 0x10).toBe(0x10); // RNF
  });

  it("WRITE SECTOR commits pumped bytes to the image", () => {
    const image = new DiskImage(buildJV1());
    io.fdc.attachDrive(0, image);
    io.writePort(0xf4, 0x01);
    io.writePort(0xf2, 2);
    io.writePort(0xf0, 0xa0); // WRITE SECTOR (track 0 after reset)
    settle(io);

    for (let i = 0; i < 256; i++) {
      io.writePort(0xf3, 0xcc);
    }

    expect(image.readSector(0, 0, 2)[0]).toBe(0xcc);
    expect(io.fdc.intrq).toBe(true);
  });

  it("WRITE SECTOR on a protected disk reports write-protect", () => {
    const image = new DiskImage(buildJV1());
    image.writeProtected = true;
    io.fdc.attachDrive(0, image);
    io.writePort(0xf4, 0x01);

    io.writePort(0xf0, 0xa0);
    settle(io);

    expect(io.readPort(0xf0) & 0x40).toBe(0x40);
  });

  it("drive select routes commands to the second drive", () => {
    const d0 = new DiskImage(buildJV1());
    const d1 = new DiskImage(buildJV1());
    io.fdc.attachDrive(0, d0);
    io.fdc.attachDrive(1, d1);

    io.writePort(0xf4, 0x02); // select drive 1
    io.writePort(0xf3, 7);
    io.writePort(0xf0, 0x10); // seek 7
    settle(io);

    expect(io.fdc.physicalTrack[1]).toBe(7);
    expect(io.fdc.physicalTrack[0]).toBe(0);
  });

  it("FORCE INTERRUPT aborts a pending command", () => {
    io.fdc.attachDrive(0, new DiskImage(buildJV1()));
    io.writePort(0xf4, 0x01);
    io.writePort(0xf0, 0x80); // read sector, still spinning up

    io.writePort(0xf0, 0xd0); // force interrupt, no INTRQ

    expect(io.fdc.pending).toBe(null);
    expect(io.readPort(0xf0) & 0x01).toBe(0);
  });

  it("NMI line follows INTRQ gated by the 0xE4 mask", () => {
    io.fdc.attachDrive(0, new DiskImage(buildJV1()));
    io.writePort(0xf4, 0x01);
    io.writePort(0xf0, 0x00); // RESTORE
    settle(io);
    expect(io.fdc.intrq).toBe(true);

    expect(io.nmiPending()).toBe(false); // masked off
    io.writePort(0xe4, 0x80); // enable FDC NMI
    expect(io.nmiPending()).toBe(true);
    expect(io.readPort(0xe4) & 0x80).toBe(0); // status active-low
  });
});
