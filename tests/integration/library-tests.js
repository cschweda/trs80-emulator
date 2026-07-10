/**
 * Program Library Acceptance Tests
 *
 * Every bundled program must survive the real ROM's tokenizer: turbo-type
 * it, RUN it, and require its opening output with no ?SN Error. The
 * games then sit at an INPUT prompt — that's success.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, beforeAll } from "vitest";
import { TRS80System } from "@system/trs80-system.js";
import { LIBRARY } from "../../src/data/library.js";

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
}

describe("Built-in library programs run on the real ROM", () => {
  let system;

  beforeAll(() => {
    system = new TRS80System({ romData });
    system.cpu.strictMode = true;
    system.reset();
    bootToReady(system);
  });

  for (const entry of LIBRARY.filter((e) => e.kind !== "file")) {
    it(`${entry.title} loads and runs`, () => {
      system.typeText("NEW\n");
      const skipped = system.typeText(entry.text);
      system.typeText("RUN\n");
      system.runSeconds(0.5);

      const screen = system.screenText().join("\n");
      expect(skipped).toBe(0);
      expect(screen).not.toContain("?SN");
      expect(screen).toContain(entry.expect);

      // Break out of the program's INPUT so the next entry starts clean
      system.keyboard.keyDown("Escape", "brk");
      system.runTStates(200000);
      system.keyboard.keyUp("brk");
      system.runSeconds(0.3);
    });
  }
});
