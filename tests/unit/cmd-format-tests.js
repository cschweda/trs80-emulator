/**
 * TRS-80 DOS /CMD executable parsing. Synthetic images cover the record
 * grammar (including the 0/1/2 → 256/257/258 length quirk); the real
 * bundled games pin the values a correct parser must produce.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { parseCmd, fastLoadCmd } from "@peripherals/cmd-format.js";

function programPath(name) {
  return path.resolve(process.cwd(), "public/programs", name);
}

function buildCmd({ name = null, blocks = [], entry = 0x8000, junkRecord = false }) {
  const out = [];
  if (name) {
    out.push(0x05, name.length, ...name.split("").map((c) => c.charCodeAt(0)));
  }
  if (junkRecord) {
    out.push(0x1f, 3, 0xde, 0xad, 0xbe); // comment-style record: skipped
  }
  for (const b of blocks) {
    const payloadLen = b.data.length + 2;
    out.push(0x01, payloadLen >= 256 ? payloadLen - 256 : payloadLen);
    out.push(b.addr & 0xff, (b.addr >> 8) & 0xff, ...b.data);
  }
  out.push(0x02, 2, entry & 0xff, (entry >> 8) & 0xff);
  return new Uint8Array(out);
}

describe("parseCmd — synthetic images", () => {
  it("parses name, load blocks, and entry", () => {
    const bytes = buildCmd({
      name: "TEST",
      blocks: [{ addr: 0x6000, data: [0xaa, 0xbb, 0xcc] }],
      entry: 0x1234,
    });
    const parsed = parseCmd(bytes);
    expect(parsed.name).toBe("TEST");
    expect(parsed.entry).toBe(0x1234);
    expect(parsed.blocks).toHaveLength(1);
    expect(parsed.blocks[0].addr).toBe(0x6000);
    expect([...parsed.blocks[0].data]).toEqual([0xaa, 0xbb, 0xcc]);
  });

  it("treats load-record lengths 0/1/2 as 256/257/258", () => {
    // 254 data bytes + 2 addr bytes = 256 → length byte 0x00
    const data254 = Array.from({ length: 254 }, (_, i) => i & 0xff);
    const parsed = parseCmd(buildCmd({ blocks: [{ addr: 0x5200, data: data254 }] }));
    expect(parsed.blocks[0].data).toHaveLength(254);
    // 256 data bytes + 2 addr = 258 → length byte 0x02
    const data256 = Array.from({ length: 256 }, () => 0x42);
    const parsed2 = parseCmd(buildCmd({ blocks: [{ addr: 0x5200, data: data256 }] }));
    expect(parsed2.blocks[0].data).toHaveLength(256);
  });

  it("skips unknown record types", () => {
    const parsed = parseCmd(
      buildCmd({ junkRecord: true, blocks: [{ addr: 0x7000, data: [1] }] })
    );
    expect(parsed.blocks).toHaveLength(1);
  });

  it("rejects images with no entry record", () => {
    const noEntry = new Uint8Array([0x01, 0x03, 0x00, 0x60, 0xaa]);
    expect(() => parseCmd(noEntry)).toThrow(/transfer-address/);
  });

  it("rejects empty/truncated input", () => {
    expect(() => parseCmd(new Uint8Array(0))).toThrow(/too short/);
  });
});

describe("parseCmd — real bundled games", () => {
  const expected = [
    ["nova-m3.cmd", { blocks: 33, entry: 0x6393, name: "NOVA-M" }],
    ["flysauc1.cmd", { blocks: 17, entry: 0x6c00 }],
    ["galaxy.cmd", { blocks: 38, entry: 0xa500 }],
    ["opus1msg.cmd", { blocks: 1, entry: 0x4a00 }],
  ];
  for (const [file, want] of expected) {
    it(`${file}: ${want.blocks} blocks, entry 0x${want.entry.toString(16)}`, () => {
      const bytes = new Uint8Array(fs.readFileSync(programPath(file)));
      const parsed = parseCmd(bytes);
      expect(parsed.blocks).toHaveLength(want.blocks);
      expect(parsed.entry).toBe(want.entry);
      if (want.name) expect(parsed.name).toBe(want.name);
    });
  }
});

describe("fastLoadCmd", () => {
  it("writes blocks into memory and jumps to the entry", () => {
    const fakeMemory = new Map();
    const system = {
      memory: { writeByte: (a, v) => fakeMemory.set(a, v) },
      cpu: { halted: true, registers: { PC: 0 } },
    };
    const parsed = {
      name: "",
      blocks: [{ addr: 0x6000, data: new Uint8Array([0x11, 0x22]) }],
      entry: 0x6000,
    };
    expect(fastLoadCmd(system, parsed)).toBe(0x6000);
    expect(fakeMemory.get(0x6000)).toBe(0x11);
    expect(fakeMemory.get(0x6001)).toBe(0x22);
    expect(system.cpu.registers.PC).toBe(0x6000);
    expect(system.cpu.halted).toBe(false);
  });
});
