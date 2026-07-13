#!/usr/bin/env node
/**
 * Build a BASIC .cas cassette image by letting the real ROM do the
 * tokenizing: boot headless, NEW, type the source, then dump the
 * tokenized program (TXTTAB..VARTAB) wrapped in the CSAVE tape layout
 * that parseCas() reads back (leader, 0xA5, D3 D3 D3, 1-char name,
 * program image ending in the 0x0000 link).
 *
 *   node scripts/build-cas.js <in.bas> <out.cas> <NAME-char>
 *
 * Note: cassette (Level II) BASIC has no DEF FN — it throws ?L3 ERROR
 * the instant one executes, even though disk/Model III BASIC accepts
 * it. That's why src/data/super-star-trek.bas inlines its FND/FNR
 * formulas at each call site instead of defining them once with DEF FN.
 */
import { register } from "node:module";

// Register module alias loader (mirrors probe-program.js) so this script
// can import the @core/@peripherals-aliased emulator modules under plain
// `node`, which never goes through Vite's bundler-time alias resolution.
const loaderPath = new URL("./module-loader.js", import.meta.url);
register(loaderPath);

// Import after registration
const { readFileSync, writeFileSync } = await import("fs");
const { fileURLToPath } = await import("url");
const { dirname, join } = await import("path");
const { TRS80System } = await import("../src/system/trs80-system.js");

const __dirname = dirname(fileURLToPath(import.meta.url));
const [inFile, outFile, name = "S"] = process.argv.slice(2);
if (!inFile || !outFile) {
  console.error("usage: node scripts/build-cas.js <in.bas> <out.cas> <NAME>");
  process.exit(2);
}

const TXTTAB_PTR = 0x40a4;
const VARTAB_PTR = 0x40f9;

const romData = new Uint8Array(
  readFileSync(join(__dirname, "../public/assets/model3.rom"))
);
const source = readFileSync(inFile, "utf8").replace(/\r\n?/g, "\n");

const system = new TRS80System({ romData });
system.cpu.strictMode = true;
system.reset();

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

system.typeText("NEW\n");
const text = source.endsWith("\n") ? source : source + "\n";
const skipped = system.typeText(text, { enterTStates: 1500000 });
if (skipped !== 0) {
  console.error(`FAIL: ${skipped} characters had no keyboard mapping`);
  process.exit(1);
}
const screen = system.screenText().join("\n");
if (screen.includes("?SN") || screen.includes("?OM") || screen.includes("?OS")) {
  console.error("FAIL: the ROM rejected the listing:\n" + screen);
  process.exit(1);
}

const txttab = system.memory.readWord(TXTTAB_PTR);
const vartab = system.memory.readWord(VARTAB_PTR);
const size = vartab - txttab;
if (size < 16) {
  console.error(`FAIL: program image is ${size} bytes — nothing was typed?`);
  process.exit(1);
}

const program = [];
for (let a = txttab; a < vartab; a++) program.push(system.memory.readByte(a));

const out = [];
for (let i = 0; i < 128; i++) out.push(0x00); // leader
out.push(0xa5); // sync
out.push(0xd3, 0xd3, 0xd3); // BASIC header
out.push(name.toUpperCase().charCodeAt(0) & 0x7f); // 1-char name
out.push(...program); // linked, tokenized image incl. 0x0000 terminator

writeFileSync(outFile, Buffer.from(out));
console.log(
  `OK: ${outFile} — ${size} bytes of tokenized BASIC (TXTTAB 0x${txttab.toString(16)}, VARTAB 0x${vartab.toString(16)})`
);
