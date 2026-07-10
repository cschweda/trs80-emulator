/**
 * Bundled Games Acceptance Tests
 *
 * Every game shipped in public/programs/ must load through its real
 * loader path and visibly take over the machine: fast-load, run a
 * stretch of emulated time, and require that the CPU is alive and the
 * screen no longer shows the BASIC READY banner. strictMode makes any
 * unimplemented opcode a hard failure rather than silent corruption.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, beforeEach } from "vitest";
import { TRS80System } from "@system/trs80-system.js";
import {
  parseCas,
  fastLoadBasic,
  fastLoadSystem,
} from "@peripherals/cas-format.js";
import { parseCmd, fastLoadCmd } from "@peripherals/cmd-format.js";

const romData = new Uint8Array(
  fs.readFileSync(path.resolve(process.cwd(), "public/assets/model3.rom"))
);

function programBytes(name) {
  return new Uint8Array(
    fs.readFileSync(path.resolve(process.cwd(), "public/programs", name))
  );
}

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
    throw new Error("Machine did not reach READY");
  }
}

describe("Bundled games load and run on the real ROM", () => {
  let system;

  beforeEach(() => {
    system = new TRS80System({ romData });
    system.cpu.strictMode = true;
    system.reset();
    bootToReady(system);
  });

  const ML_GAMES = [
    ["nova-m3.cmd", "cmd", 0x6393],
    ["flysauc1.cmd", "cmd", 0x6c00],
    ["galaxy.cmd", "cmd", 0xa500],
    ["opus1msg.cmd", "cmd", 0x4a00],
    ["seadrag.3bn", "cas", 0x497f],
    ["timetrek.3bn", "cas", 0x6ff1],
    ["invade.cas", "cas", 0x5000],
  ];

  for (const [file, format, entry] of ML_GAMES) {
    it(`${file} fast-loads and takes over the machine`, () => {
      const before = system.screenText().join("\n");
      const bytes = programBytes(file);
      if (format === "cmd") {
        const parsed = parseCmd(bytes);
        expect(parsed.entry).toBe(entry);
        fastLoadCmd(system, parsed);
      } else {
        const parsed = parseCas(bytes);
        expect(parsed.kind).toBe("system");
        expect(parsed.entry).toBe(entry);
        expect(parsed.checksumErrors).toBe(0);
        fastLoadSystem(system, parsed);
      }
      system.runSeconds(1);

      expect(system.cpu.halted).toBe(false);
      const after = system.screenText().join("\n");
      expect(after).not.toBe(before); // the game drew something
      expect(after).not.toContain("READY"); // BASIC is gone
    });
  }

  it(
    "m2.bas (City Defence) turbo-types and RUNs",
    () => {
      const text = new TextDecoder()
        .decode(programBytes("m2.bas"))
        .replace(/\r\n?/g, "\n");
      system.typeText("NEW\n");
      const skipped = system.typeText(text, { enterTStates: 1500000 });
      system.typeText("RUN\n");
      system.runSeconds(0.5);

      const screen = system.screenText().join("\n");
      expect(skipped).toBe(0);
      expect(screen).not.toContain("?SN");
      expect(screen).toContain("CITY DEFENCE");
    },
    240000
  );
});
