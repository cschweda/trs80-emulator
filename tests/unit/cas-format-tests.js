/**
 * .cas parser unit tests, using synthesized images (builders below mirror
 * what CSAVE and the SYSTEM writer put on tape).
 */

import { describe, it, expect } from "vitest";
import { parseCas } from "@peripherals/cas-format.js";

export function buildBasicCas(lines, { leader = 128, name = "A" } = {}) {
  const bytes = [];
  for (let i = 0; i < leader; i++) bytes.push(0x00);
  bytes.push(0xa5, 0xd3, 0xd3, 0xd3, name.charCodeAt(0));
  // Fake absolute links as a real CSAVE would (values don't matter to the
  // parser — it walks by line structure)
  let addr = 0x42e9;
  for (const { lineNo, tokens } of lines) {
    const next = addr + 5 + tokens.length;
    bytes.push(next & 0xff, next >> 8, lineNo & 0xff, lineNo >> 8, ...tokens, 0x00);
    addr = next;
  }
  bytes.push(0x00, 0x00);
  return new Uint8Array(bytes);
}

export function buildSystemCas(blocks, entry, { name = "GAME" } = {}) {
  const bytes = [];
  for (let i = 0; i < 64; i++) bytes.push(0x55);
  bytes.push(0xa5, 0x55);
  const padded = name.padEnd(6, " ");
  for (let i = 0; i < 6; i++) bytes.push(padded.charCodeAt(i));
  for (const { addr, data } of blocks) {
    bytes.push(0x3c, data.length === 256 ? 0 : data.length, addr & 0xff, addr >> 8);
    let sum = (addr & 0xff) + ((addr >> 8) & 0xff);
    for (const b of data) {
      bytes.push(b);
      sum += b;
    }
    bytes.push(sum & 0xff);
  }
  bytes.push(0x78, entry & 0xff, entry >> 8);
  return new Uint8Array(bytes);
}

// Level II tokens used in fixtures: PRINT = 0xB2
export const T_PRINT = 0xb2;

describe("parseCas - BASIC images with embedded machine code", () => {
  it("preserves 0x00 bytes inside a line by walking the link chain", () => {
    // Christopherson-style: ML embedded in a REM line, zeros included.
    // Real CLOAD follows the link pointers, so the zeros survive.
    const ml = [0x8e, 0x00, 0x21, 0x00, 0x3c, 0xc9, 0x00, 0x00, 0x3e];
    const cas = buildBasicCas([
      { lineNo: 1, tokens: [0x93, ...ml] }, // REM <binary>
      { lineNo: 10, tokens: [T_PRINT, 0x22, 0x4f, 0x4b, 0x22] },
    ]);

    const parsed = parseCas(cas);

    expect(parsed.lines).toHaveLength(2);
    expect(parsed.lines[0].tokens).toEqual([0x93, ...ml]);
    expect(parsed.lines[1].lineNo).toBe(10);
  });

  it("falls back to zero-scanning when the link chain is inconsistent", () => {
    // Hand-build a tape whose links are garbage (as some tools emit)
    const bytes = [0x00, 0x00, 0xa5, 0xd3, 0xd3, 0xd3, 0x41];
    const put = (lineNo, tokens) => {
      bytes.push(0x11, 0x11, lineNo & 0xff, lineNo >> 8, ...tokens, 0x00);
    };
    put(10, [T_PRINT, 0x22, 0x48, 0x49, 0x22]);
    put(20, [T_PRINT]);
    bytes.push(0x00, 0x00);

    const parsed = parseCas(new Uint8Array(bytes));

    expect(parsed.lines).toHaveLength(2);
    expect(parsed.lines[0].lineNo).toBe(10);
    expect(parsed.lines[0].tokens).toEqual([T_PRINT, 0x22, 0x48, 0x49, 0x22]);
    expect(parsed.lines[1].lineNo).toBe(20);
  });
});

describe("parseCas - BASIC images", () => {
  it("parses a tokenized program with leader and sync", () => {
    const tokens = [T_PRINT, 0x22, 0x48, 0x49, 0x22]; // PRINT "HI"
    const cas = buildBasicCas([{ lineNo: 10, tokens }]);

    const parsed = parseCas(cas);

    expect(parsed.kind).toBe("basic");
    expect(parsed.name).toBe("A");
    expect(parsed.lines).toHaveLength(1);
    expect(parsed.lines[0].lineNo).toBe(10);
    expect(parsed.lines[0].tokens).toEqual(tokens);
  });

  it("parses multiple lines in order", () => {
    const cas = buildBasicCas([
      { lineNo: 10, tokens: [T_PRINT, 0x31] },
      { lineNo: 20, tokens: [T_PRINT, 0x32] },
    ]);

    const parsed = parseCas(cas);

    expect(parsed.lines.map((l) => l.lineNo)).toEqual([10, 20]);
  });

  it("accepts images without a leader", () => {
    const full = buildBasicCas([{ lineNo: 5, tokens: [T_PRINT] }], {
      leader: 0,
    });

    const parsed = parseCas(full);

    expect(parsed.kind).toBe("basic");
    expect(parsed.lines[0].lineNo).toBe(5);
  });
});

describe("parseCas - SYSTEM images", () => {
  it("parses blocks, entry point, and filename", () => {
    const data = new Uint8Array([0x3e, 0x42, 0x76]); // LD A,0x42; HALT
    const cas = buildSystemCas([{ addr: 0x5000, data }], 0x5000, {
      name: "SEADRG",
    });

    const parsed = parseCas(cas);

    expect(parsed.kind).toBe("system");
    expect(parsed.name).toBe("SEADRG");
    expect(parsed.blocks).toHaveLength(1);
    expect(parsed.blocks[0].addr).toBe(0x5000);
    expect(Array.from(parsed.blocks[0].data)).toEqual([0x3e, 0x42, 0x76]);
    expect(parsed.entry).toBe(0x5000);
    expect(parsed.checksumErrors).toBe(0);
  });

  it("counts checksum mismatches without failing the load", () => {
    const data = new Uint8Array([0x00]);
    const cas = buildSystemCas([{ addr: 0x6000, data }], 0x6000);
    cas[cas.length - 4] ^= 0xff; // corrupt the block checksum

    const parsed = parseCas(cas);

    expect(parsed.checksumErrors).toBe(1);
  });

  it("rejects garbage", () => {
    expect(() => parseCas(new Uint8Array([1, 2, 3, 4, 5, 6]))).toThrow(
      /Unrecognized/
    );
  });
});
