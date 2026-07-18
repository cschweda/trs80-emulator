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

    // v1.5.0 arcade (Westmoreland & Gilman released theirs to the public
    // domain; Cornsoft ties to the Misosys grant family — see LICENSE)
    ["eliminat.cmd", "cmd", 0x9000, "Press <ENTER> to Start", 8],
    ["tankzone.cmd", "cmd", 0x7b1f, "Press <I> for instructions", 8],
    ["reargard.cmd", "cmd", 0x77a5, "Hit <ENTER> to begin", 8],
    ["flipout.cmd", "cmd", 0x7000, "How many players?", 8],

    // v1.5.0 Med Systems 3-D adventures: Asylum idles at its restore
    // prompt; Asylum II runs straight into its title card. Deathmaze and
    // Labyrinth share one load-prompt string, so like the Scott Adams
    // pair they get dedicated keyed tests below.
    ["asylum.cmd", "cmd", 0x43ae, "RESTORE AN OLD GAME", 8],
    ["asylum2.cmd", "cmd", 0xb200, "A WILLIAM DENMAN PRODUCTION", 8],
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

  it("pyrmdoom.cmd loads Scott Adams's Pyramid of Doom and reaches its opening room", () => {
    const bytes = programBytes("pyrmdoom.cmd");
    const parsed = parseCmd(bytes);
    expect(parsed.entry).toBe(0xf000);
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
    expect(screen).toContain('Welcome to Adventure: 8 "PYRAMID OF DOOM"');
    expect(screen).toContain("I am in a desert");
  });

  // Deathmaze 5000 and Labyrinth open with the same "Do you wish to load
  // an old game (Y or N)?" — press N and require each one's distinct
  // instruction page (strings from full-screen probe dumps).
  const MED_MAZES = [
    ["dthmaze.cmd", 0x6c00, "Deathmaze 5000 is a full screen 3-D adventure"],
    ["labyrnth.cmd", 0xbd13, "Labyrinth is a full scale 3-D adventure"],
  ];
  for (const [file, entry, expectText] of MED_MAZES) {
    it(`${file} answers its load prompt and shows its instructions`, () => {
      const parsed = parseCmd(programBytes(file));
      expect(parsed.entry).toBe(entry);
      fastLoadCmd(system, parsed);
      system.runSeconds(2);
      expect(system.screenText().join("\n")).toContain(
        "Do you wish to load an old game"
      );

      system.keyboard.keyDown("N", "med");
      system.runTStates(400000);
      system.keyboard.keyUp("med");
      system.runSeconds(4);

      expect(system.cpu.halted).toBe(false);
      expect(system.screenText().join("\n")).toContain(expectText);
    });
  }

  // Space Castle's attract mode alternates pure-graphics scenes with a
  // letter-spaced Cornsoft title crawl; scan a window for the crawl
  // instead of pinning one instant.
  it("castle.cmd runs Space Castle's attract mode to its title crawl", () => {
    const parsed = parseCmd(programBytes("castle.cmd"));
    expect(parsed.entry).toBe(0x93f5);
    fastLoadCmd(system, parsed);
    system.runSeconds(3);
    system.keyboard.keyDown("Enter", "sc");
    system.runTStates(400000);
    system.keyboard.keyUp("sc");

    let seen = false;
    for (let i = 0; i < 40 && !seen; i++) {
      system.runTStates(Math.round(2027520 / 4));
      seen = system.screenText().join("\n").includes("o r n s o f t");
    }
    expect(system.cpu.halted).toBe(false);
    expect(seen).toBe(true);
  });

  // Leo Christopherson's BASIC/ML hybrids: tokenized BASIC whose REM
  // lines carry the animation machine code (binary bytes, 0x00 included)
  // — these load through the link-chain path of parseCas and must reach
  // their real instruction screens, proving the ML survived the tape.
  const CHRISTOPHERSON = [
    ["andrnim.cas", "ANDROID NIM", 8],
    ["beewary.cas", "YOU ARE THE BEE", 8],
    ["snakeggs.cas", "SNAKE EGGS : INSTRUCTIONS", 8],
  ];
  for (const [file, expectText, seconds] of CHRISTOPHERSON) {
    it(`${file} fast-loads (embedded ML intact) and reaches its instructions`, () => {
      const parsed = parseCas(programBytes(file));
      expect(parsed.kind).toBe("basic");
      fastLoadBasic(system, parsed);
      system.typeText("RUN\n");
      system.runSeconds(seconds);

      const screen = system.screenText().join("\n");
      expect(system.cpu.halted).toBe(false);
      expect(screen).not.toContain("?SN"); // a corrupted line would SN-error
      expect(screen).not.toContain("READY");
      expect(screen).toContain(expectText);
    });
  }

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
