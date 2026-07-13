#!/usr/bin/env node
/**
 * Probe a TRS-80 program image headlessly: boot the real ROM, load the
 * file through the same parser/loader the app uses, run a while, and
 * report what happened. Vets candidate games before they join
 * public/programs/, and prints the entry address the acceptance test
 * pins.
 *
 *   node scripts/probe-program.js <file.cmd|file.cas|file.3bn> [seconds]
 */
import { register } from "node:module";
import { pathToFileURL } from "node:url";

// Register module alias loader
const loaderPath = new URL("./module-loader.js", import.meta.url);
register(loaderPath);

// Import after registration
const { readFileSync } = await import("fs");
const { fileURLToPath } = await import("url");
const { dirname, join, extname } = await import("path");
const { TRS80System } = await import("../src/system/trs80-system.js");
const {
  parseCas,
  fastLoadBasic,
  fastLoadSystem,
} = await import("../src/peripherals/cas-format.js");
const { parseCmd, fastLoadCmd } = await import(
  "../src/peripherals/cmd-format.js"
);

const __dirname = dirname(fileURLToPath(import.meta.url));
const file = process.argv[2];
const seconds = parseFloat(process.argv[3] || "2");
if (!file) {
  console.error("usage: node scripts/probe-program.js <file> [seconds]");
  process.exit(2);
}

const romData = new Uint8Array(
  readFileSync(join(__dirname, "../public/assets/model3.rom"))
);
const bytes = new Uint8Array(readFileSync(file));

const system = new TRS80System({ romData });
system.cpu.strictMode = true;
system.reset();

// Boot to READY (same dance as the acceptance tests)
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
  console.error("FAIL: machine did not reach READY");
  process.exit(1);
}

const before = system.screenText().join("\n");
const ext = extname(file).toLowerCase();
try {
  if (ext === ".cmd") {
    const parsed = parseCmd(bytes);
    console.log(`format: cmd   entry: 0x${parsed.entry.toString(16)}`);
    fastLoadCmd(system, parsed);
  } else {
    const parsed = parseCas(bytes);
    if (parsed.kind === "system") {
      console.log(
        `format: cas/system  name: "${parsed.name}"  entry: 0x${parsed.entry.toString(16)}  checksumErrors: ${parsed.checksumErrors}`
      );
      fastLoadSystem(system, parsed);
    } else {
      console.log(
        `format: cas/basic  name: "${parsed.name}"  lines: ${parsed.lines.length}`
      );
      fastLoadBasic(system, parsed);
      system.typeText("RUN\n");
    }
  }
} catch (err) {
  console.error(`FAIL: ${err.message}`);
  process.exit(1);
}

system.runSeconds(seconds);

const after = system.screenText().join("\n");
console.log(`cpu halted: ${system.cpu.halted}`);
console.log(`screen changed: ${after !== before}`);
console.log(`READY gone: ${!after.includes("READY")}`);
console.log("--- screen (top 8 lines) ---");
for (const line of system.screenText().slice(0, 8)) console.log(`|${line}|`);
