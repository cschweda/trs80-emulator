#!/usr/bin/env node
/**
 * Wrap a tokenized BASIC file (disk-style .bas: 0xFF header + program
 * image) into a 500-baud CSAVE-style .cas the emulator's fast loader
 * reads. Used for the Christopherson games, whose ML lives as binary
 * bytes inside REM lines — so the line lengths must come from the
 * link-pointer chain, never from scanning for 0x00.
 *
 * The saving machine's program base is unknown (disk BASIC bases vary),
 * so it is derived: try every plausible first-record length until the
 * whole link chain validates, then rebase every link to the stock
 * cassette TXTTAB (0x42E9) — exactly what a real CSAVE from a stock
 * machine would have written.
 *
 *   node scripts/wrap-tokenized-bas.js <in.bas> <out.cas> [name-char]
 */
import { readFileSync, writeFileSync } from "fs";

const [inFile, outFile, nameChar = "A"] = process.argv.slice(2);
if (!inFile || !outFile) {
  console.error("usage: node scripts/wrap-tokenized-bas.js <in.bas> <out.cas> [name-char]");
  process.exit(2);
}

const raw = new Uint8Array(readFileSync(inFile));
if (raw[0] !== 0xff) {
  console.error(`FAIL: ${inFile} is not a tokenized .bas (first byte 0x${raw[0].toString(16)}, want 0xff)`);
  process.exit(1);
}
const image = raw.subarray(1);

/** Decode the record layout via the link chain; returns record byte
 * ranges or null if no first-record length yields a consistent chain. */
function decodeChain(img) {
  outer: for (let s1 = 5; s1 <= Math.min(400, img.length - 2); s1++) {
    if (img[s1 - 1] !== 0x00) continue;
    const link0 = img[0] | (img[1] << 8);
    if (link0 === 0) continue;
    const records = [[0, s1]];
    let pos = s1;
    let addr = link0;
    while (true) {
      if (pos + 1 >= img.length) continue outer;
      const link = img[pos] | (img[pos + 1] << 8);
      if (link === 0x0000) {
        return { records, end: pos + 2 };
      }
      const recLen = link - addr;
      if (recLen < 5 || recLen > 1000) continue outer;
      if (pos + recLen > img.length || img[pos + recLen - 1] !== 0x00) continue outer;
      records.push([pos, pos + recLen]);
      pos += recLen;
      addr = link;
    }
  }
  return null;
}

const chain = decodeChain(image);
if (!chain) {
  console.error(`FAIL: ${inFile}: no consistent link chain found`);
  process.exit(1);
}

// Rebase links to the stock cassette TXTTAB and assemble the tape
const TXTTAB = 0x42e9;
const out = [];
for (let i = 0; i < 128; i++) out.push(0x00);
out.push(0xa5, 0xd3, 0xd3, 0xd3, nameChar.charCodeAt(0));
let addr = TXTTAB;
for (const [start, end] of chain.records) {
  const body = image.subarray(start + 2, end); // [line# u16][tokens...][0x00]
  const next = addr + 2 + body.length;
  out.push(next & 0xff, (next >> 8) & 0xff, ...body);
  addr = next;
}
out.push(0x00, 0x00);

writeFileSync(outFile, new Uint8Array(out));
console.log(
  `${outFile}: ${chain.records.length} lines, ${out.length} bytes ` +
    `(${image.length - chain.end} trailing bytes in the source ignored)`
);
