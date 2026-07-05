/**
 * Disk Boot Acceptance Test
 *
 * Mounts a synthesized JV1 floppy whose track-0 boot sector is real Z80
 * code (writes "DISK BOOT OK" into video RAM, then spins), and proves the
 * ROM's entire disk-boot handshake works against the WD1793 model:
 * controller detection, RESTORE, sector read via the DRQ pump, and the
 * jump into the loaded boot sector. No copyrighted DOS is needed — a
 * real LDOS/TRSDOS image exercises exactly the same path.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { TRS80System, CPU_CLOCK_HZ } from "@system/trs80-system.js";
import { DiskImage } from "@peripherals/disk-image.js";

const romData = new Uint8Array(
  fs.readFileSync(path.resolve(process.cwd(), "public/assets/model3.rom"))
);

const BOOT_MSG = "DISK BOOT OK";

/**
 * A 40-track, 18-sector JV1 image whose first sector (the one the boot
 * ROM loads to 0x4200 and jumps to) copies BOOT_MSG to the top of the
 * screen and loops.
 */
function buildBootDisk() {
  const bytes = new Uint8Array(40 * 18 * 256);
  const org = 0x4300; // the Model III ROM loads the boot sector here
  const msgOffset = 0x20;
  const code = [
    0x21, (org + msgOffset) & 0xff, (org + msgOffset) >> 8, // LD HL, msg
    0x11, 0x00, 0x3c, // LD DE, 0x3C00
    0x01, BOOT_MSG.length, 0x00, // LD BC, len
    0xed, 0xb0, // LDIR
    0x18, 0xfe, // JR $
  ];
  bytes.set(code, 0);
  bytes.set(
    BOOT_MSG.split("").map((c) => c.charCodeAt(0)),
    msgOffset
  );
  return new DiskImage(bytes, "bootdisk");
}

function runUntilScreen(system, text, maxSeconds = 4) {
  const slice = Math.round(CPU_CLOCK_HZ / 20);
  const slices = Math.ceil((maxSeconds * CPU_CLOCK_HZ) / slice);
  for (let i = 0; i < slices; i++) {
    if (system.screenText().join("\n").includes(text)) return true;
    system.runTStates(slice);
  }
  return system.screenText().join("\n").includes(text);
}

describe("Disk boot (drive 0)", () => {
  it("boots the synthesized floppy's boot sector via the real ROM", () => {
    const system = new TRS80System({ romData });
    system.cpu.strictMode = true;
    system.mountDisk(0, buildBootDisk());
    system.reset();

    const booted = runUntilScreen(system, BOOT_MSG);

    if (!booted) {
      console.log("Screen:\n" + system.screenText().join("\n"));
      console.log(
        "PC=0x" + system.cpu.registers.PC.toString(16).padStart(4, "0"),
        "FDC status=0x" + system.io.fdc.status.toString(16),
        "track=" + system.io.fdc.physicalTrack[0],
        "sector=" + system.io.fdc.sectorReg
      );
    }
    expect(booted).toBe(true);
  });

  it("still boots to cassette BASIC when no disk is mounted", () => {
    const system = new TRS80System({ romData });
    system.cpu.strictMode = true;
    system.reset();

    expect(runUntilScreen(system, "Cass?")).toBe(true);
  });
});
