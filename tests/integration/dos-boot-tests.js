/**
 * Real-DOS boot acceptance: every bundled DOS in public/disks/ must boot
 * on the real ROM to its Ready prompt AND list its directory. DIR is the
 * load-bearing half — TRSDOS-family DOSes verify the deleted-DAM record
 * type (FDC status bit 5) on every directory read, so a DIR that prints
 * file names proves the DAM path end to end, not just the boot loader.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { TRS80System, CPU_CLOCK_HZ } from "@system/trs80-system.js";
import { DiskImage } from "@peripherals/disk-image.js";
import { DOS_LIBRARY } from "@data/dos-library.js";

const romData = new Uint8Array(
  fs.readFileSync(path.resolve(process.cwd(), "public/assets/model3.rom"))
);

function bootSystem(dosId) {
  const entry = DOS_LIBRARY.find((e) => e.id === dosId);
  const bytes = new Uint8Array(
    fs.readFileSync(path.resolve(process.cwd(), "public" + entry.file))
  );
  const system = new TRS80System({ romData });
  system.cpu.strictMode = true;
  system.mountDisk(0, new DiskImage(bytes, entry.file.split("/").pop()));
  system.reset();
  return system;
}

const onScreen = (system, text) =>
  system.screenText().join("\n").includes(text);

function runUntil(system, text, maxSeconds = 10) {
  const slice = Math.round(CPU_CLOCK_HZ / 20);
  for (let i = 0; i < maxSeconds * 20; i++) {
    if (onScreen(system, text)) return true;
    system.runTStates(slice);
  }
  return onScreen(system, text);
}

// DOS keyboard drivers scan on the 30 Hz heartbeat, not the ROM's tight
// poll — hold keys far longer than system.typeText does for BASIC.
function dosType(system, text) {
  let seq = 0;
  for (const ch of text) {
    const key = ch === "\n" ? "Enter" : ch;
    const code = `dos:${seq++}`;
    if (system.keyboard.keyDown(key, code)) {
      system.runTStates(500000);
      system.keyboard.keyUp(code);
      system.runTStates(ch === "\n" ? 1500000 : 300000);
    }
  }
}

describe("Bundled DOS boot (drive 0)", () => {
  it("TRSDOS 1.3 boots, takes a date, and lists its directory", () => {
    const system = bootSystem("trsdos13");

    expect(runUntil(system, "Enter Date")).toBe(true);
    expect(onScreen(system, "TRSDOS version 1.3")).toBe(true);
    dosType(system, "07/17/87\n");
    expect(runUntil(system, "Enter Time")).toBe(true);
    dosType(system, "\n");
    expect(runUntil(system, "TRSDOS Ready")).toBe(true);

    dosType(system, "DIR\n");
    expect(runUntil(system, "LMOFFSET/CMD")).toBe(true);
    expect(runUntil(system, "Free Granules")).toBe(true); // DIR ran to completion
  });

  it("NEWDOS/80 boots to Ready and lists its directory", () => {
    const system = bootSystem("newdos80");

    expect(runUntil(system, "Newdos/80 Ready")).toBe(true);

    dosType(system, "DIR 0\n");
    expect(runUntil(system, "BASIC/CMD")).toBe(true);
    expect(onScreen(system, "LMOFFSET/CMD")).toBe(true);
  });

  it("LDOS 5.3.1 boots through date/time and lists its directory", () => {
    const system = bootSystem("ldos531");

    expect(runUntil(system, "Date ?")).toBe(true);
    // The banner letter-spaces "L D O S"; match the stable tail
    expect(onScreen(system, "The Logical Disk Operating System")).toBe(true);
    dosType(system, "07/17/87\n");
    expect(runUntil(system, "Time ?")).toBe(true);
    dosType(system, "12:00:00\n");
    expect(runUntil(system, "LDOS Ready", 15)).toBe(true);

    dosType(system, "DIR\n");
    expect(runUntil(system, "BASIC/HLP")).toBe(true);
    expect(onScreen(system, "Filespec")).toBe(true); // DIR header row
  });

  it("bootToCassetteBasic ejects a booted DOS and lands at READY", () => {
    const system = bootSystem("newdos80");
    expect(runUntil(system, "Newdos/80 Ready")).toBe(true);

    const ok = system.bootToCassetteBasic();

    expect(ok).toBe(true);
    expect(system.io.fdc.anyDiskMounted()).toBe(false);
    const screen = system.screenText().join("\n");
    expect(screen).toContain("READY");
    expect(screen).not.toContain("Newdos");
  });
});
