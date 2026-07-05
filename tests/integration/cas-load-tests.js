/**
 * .cas Fast-Load Acceptance Tests
 *
 * Boots the real ROM, fast-loads synthesized cassette images, and proves
 * they run: a BASIC tape via the ROM's own RUN, and a SYSTEM tape via the
 * entry-point jump. Validates the loader against genuine Level II
 * tokenization and pointer conventions — if the token values or the
 * 0x40F9/0x40FB/0x40FD fixups were wrong, RUN would ?SN or crash.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, beforeEach } from "vitest";
import { TRS80System, CPU_CLOCK_HZ } from "@system/trs80-system.js";
import {
  parseCas,
  fastLoadBasic,
  fastLoadSystem,
} from "@peripherals/cas-format.js";
import {
  buildBasicCas,
  buildSystemCas,
  T_PRINT,
} from "../unit/cas-format-tests.js";

const romData = new Uint8Array(
  fs.readFileSync(path.resolve(process.cwd(), "public/assets/model3.rom"))
);

function bootToReady(system) {
  const pressEnter = () => {
    system.keyboard.keyDown("Enter", "boot");
    system.runTStates(200000);
    system.keyboard.keyUp("boot");
    system.runTStates(100000);
  };
  system.runSeconds(1);
  pressEnter();
  system.runSeconds(0.5);
  pressEnter();
  system.runSeconds(2);
  if (!system.screenText().join("\n").includes("READY")) {
    throw new Error("Machine did not reach READY:\n" + system.screenText().join("\n"));
  }
}

describe("Cassette fast-load against the real ROM", () => {
  let system;

  beforeEach(() => {
    system = new TRS80System({ romData });
    system.cpu.strictMode = true;
    system.reset();
    bootToReady(system);
  });

  it("fast-loads a BASIC .cas and RUNs it", () => {
    // 10 PRINT "CAS OK"
    const tokens = [
      T_PRINT,
      0x20,
      0x22,
      ..."CAS OK".split("").map((c) => c.charCodeAt(0)),
      0x22,
    ];
    const cas = buildBasicCas([{ lineNo: 10, tokens }]);

    fastLoadBasic(system, parseCas(cas));
    system.typeText("RUN\n");
    system.runSeconds(0.3);

    expect(system.screenText().join("\n")).toContain("CAS OK");
  });

  it("fast-loaded BASIC survives LIST (links are walkable)", () => {
    const tokens = [T_PRINT, 0x31, 0x32, 0x33]; // PRINT 123
    const cas = buildBasicCas([
      { lineNo: 10, tokens },
      { lineNo: 20, tokens: [0x80] }, // END
    ]);

    fastLoadBasic(system, parseCas(cas));
    system.typeText("LIST\n");
    system.runSeconds(0.4);

    const screen = system.screenText().join("\n");
    expect(screen).toContain("10 ");
    expect(screen).toContain("20 ");
  });

  it("fast-loads a SYSTEM .cas and jumps to its entry point", () => {
    // Machine code at 0x5200: copy "SYS OK" into video RAM row 12, spin.
    const msg = "SYS OK";
    const msgAddr = 0x5220;
    const videoTarget = 0x3c00 + 12 * 64;
    const code = [
      0x21, msgAddr & 0xff, msgAddr >> 8, // LD HL, msg
      0x11, videoTarget & 0xff, videoTarget >> 8, // LD DE, video
      0x01, msg.length & 0xff, 0x00, // LD BC, len
      0xed, 0xb0, // LDIR
      0x18, 0xfe, // JR $ (spin)
    ];
    const block = new Uint8Array(0x30);
    block.set(code, 0);
    block.set(
      msg.split("").map((c) => c.charCodeAt(0)),
      msgAddr - 0x5200
    );
    const cas = buildSystemCas([{ addr: 0x5200, data: block }], 0x5200, {
      name: "SYSOK",
    });

    const parsed = parseCas(cas);
    fastLoadSystem(system, parsed);
    system.runTStates(Math.round(CPU_CLOCK_HZ * 0.05));

    expect(parsed.checksumErrors).toBe(0);
    expect(system.screenText()[12]).toContain("SYS OK");
  });
});
