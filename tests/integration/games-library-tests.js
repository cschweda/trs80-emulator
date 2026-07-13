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

  // Legacy trsjs rows: [file, format, entry] — generic takeover assertions.
  // v1.3.0 rows: [file, format, entry, expect, seconds] — after `seconds`
  // of emulated time the screen must also contain `expect`, a string the
  // real title screen / attract mode prints. A crashed loader that merely
  // scribbles graphics over VRAM satisfies the generic assertions, so the
  // newer rows pin visible proof-of-life text (strings taken from
  // full-screen probe dumps of each title).
  const ML_GAMES = [
    ["nova-m3.cmd", "cmd", 0x6393],
    ["flysauc1.cmd", "cmd", 0x6c00],
    ["galaxy.cmd", "cmd", 0xa500],
    ["opus1msg.cmd", "cmd", 0x4a00],
    ["seadrag.3bn", "cas", 0x497f],
    ["timetrek.3bn", "cas", 0x6ff1],
    ["invade.cas", "cas", 0x5000],

    // v1.3.0 arcade classics (entries pinned from scripts/probe-program.js)
    ["scarfman.cas", "cas", 0x6000, "HIGH SCORE", 8],
    ["cosmic.cmd", "cmd", 0x65d9, "to start game", 8],
    ["meteor2.cmd", "cmd", 0x9e00, "Big Five Software", 8],
    ["defense.cas", "cas", 0x493e, "Big Five Software", 8],
    ["armored.cmd", "cmd", 0xf8ff, "1 or 2 Players?", 8],

    // v1.3.0 text adventures: Bedlam prints its opening prose the moment
    // it takes over — no input needed, so a plain row suffices (unlike
    // Adventureland/Pirate Adventure below, which idle at a "restore a
    // saved game?" prompt shared by every Scott Adams title and need
    // typed input to reach their distinct, title-identifying banners —
    // see the dedicated tests after the BASIC games below).
    ["bedlam.cmd", "cmd", 0xbd30, "YOU FEEL AS THOUGH YOU HAVE JUST AWAKENED", 8],
  ];

  for (const [file, format, entry, expectText, seconds] of ML_GAMES) {
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
      system.runSeconds(expectText ? seconds : 1);

      expect(system.cpu.halted).toBe(false);
      const after = system.screenText().join("\n");
      expect(after).not.toBe(before); // the game drew something
      expect(after).not.toContain("READY"); // BASIC is gone
      if (expectText) {
        expect(after).toContain(expectText); // real title/attract text
      }
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

  // Super Star Trek (Ahl/Leedom, 1978): the galaxy setup runs nested
  // 8x8 placement loops with random retries, so reaching the first
  // interactive prompt takes far longer emulated time than the other
  // BASIC type-ins above -- 60 emulated seconds, empirically confirmed
  // stable and deterministic, well under a second of real wall-clock
  // time in this headless harness. "STAR TREK" itself never reaches the
  // screen (it only appears inside an unprinted REM banner), so the
  // assertions below are pinned to real, on-screen proof of the short
  // range sensor scan and command prompt instead.
  it(
    "sstrek.cas (Super Star Trek) fast-loads and reaches its short-range sensor scan",
    () => {
      const bytes = programBytes("sstrek.cas");
      const parsed = parseCas(bytes);
      expect(parsed.kind).toBe("basic");
      expect(parsed.lines.length).toBeGreaterThan(300);
      fastLoadBasic(system, parsed);
      system.typeText("RUN\n");
      system.runSeconds(70);

      const screen = system.screenText().join("\n");
      expect(system.cpu.halted).toBe(false);
      expect(screen).not.toContain("?SN");
      expect(screen).not.toContain("?OM");
      expect(screen).not.toContain("?OS");
      expect(screen).not.toContain("?L3");
      expect(screen).toContain("STARDATE");
      expect(screen).toContain("KLINGONS REMAINING");
      expect(screen).toContain("COMMAND");
    },
    240000
  );

  // Scott Adams adventures (advland.cmd, pirate.cmd): the shipped /CMD is
  // the interpreter plus its game database (parsed name is "ADVENT" for
  // both — the interpreter's own module name, not the game title). Both
  // idle at the same interpreter-wide "restore a saved game?" prompt, so
  // that string alone can't distinguish the two titles or prove the right
  // database loaded. Decline the restore, press Enter past the credits
  // page, and require each title's own "Welcome to Adventure number: N"
  // banner (real per-title prose, taken from full-screen probe dumps) —
  // the ML_GAMES loop above has no input step, hence dedicated tests.
  it("advland.cmd loads Scott Adams's Adventureland and reaches its opening room", () => {
    const bytes = programBytes("advland.cmd");
    const parsed = parseCmd(bytes);
    expect(parsed.entry).toBe(0x9e00);
    fastLoadCmd(system, parsed);
    system.runSeconds(3);
    expect(system.screenText().join("\n")).toContain(
      "Want to restore a previously saved game?"
    );

    system.typeText("N\n", { enterTStates: 600000 }); // decline restore
    system.runSeconds(3);
    system.typeText("\n", { enterTStates: 600000 }); // past the credits page
    system.runSeconds(3);

    const screen = system.screenText().join("\n");
    expect(system.cpu.halted).toBe(false);
    expect(screen).not.toContain("READY");
    expect(screen).toContain('Welcome to Adventure number: 1 "ADVENTURELAND"');
  });

  it("pirate.cmd loads Scott Adams's Pirate Adventure and reaches its opening room", () => {
    const bytes = programBytes("pirate.cmd");
    const parsed = parseCmd(bytes);
    expect(parsed.name).toBe("ADVENT");
    expect(parsed.entry).toBe(0xad00);
    fastLoadCmd(system, parsed);
    system.runSeconds(3);
    expect(system.screenText().join("\n")).toContain(
      "Want to restore a previously saved game?"
    );

    system.typeText("N\n", { enterTStates: 600000 }); // decline restore
    system.runSeconds(3);
    system.typeText("\n", { enterTStates: 600000 }); // past the credits page
    system.runSeconds(3);

    const screen = system.screenText().join("\n");
    expect(system.cpu.halted).toBe(false);
    expect(screen).not.toContain("READY");
    expect(screen).toContain('Welcome to Adventure number 2: "pirate adventure"');
  });
});
