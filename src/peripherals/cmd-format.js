/**
 * TRS-80 DOS /CMD executable handling
 *
 * A /CMD file is a stream of records: [type][length][payload…]. The
 * types honored here:
 *
 *   0x01  object-code block   payload: addr.lo addr.hi data…
 *                             For this type the length byte counts the
 *                             address AND data bytes, with the quirk
 *                             that 0, 1 and 2 mean 256, 257 and 258
 *                             (a block always carries the 2 address
 *                             bytes plus at least one data byte).
 *   0x02  transfer address    payload: entry.lo entry.hi — ends the load
 *   0x05  module name         payload: ASCII name
 *   other                     skipped by their length byte (comments,
 *                             patch and directory records)
 *
 * Fast-loading writes the blocks straight into RAM and jumps to the
 * entry point — the same hand-off TRSDOS performs — so tape/disk-era
 * machine-language games run with no DOS resident.
 */

/**
 * Parse a /CMD byte stream.
 * @returns {{name:string, blocks:{addr:number,data:Uint8Array}[], entry:number}}
 */
export function parseCmd(bytes) {
  if (!bytes || bytes.length < 4) {
    throw new Error("Not a /CMD image: too short");
  }
  const blocks = [];
  let entry = null;
  let name = "";
  let i = 0;

  while (i + 1 < bytes.length) {
    const type = bytes[i++];
    let len = bytes[i++];
    if (type === 0x01) {
      if (len < 3) len += 256; // 0,1,2 mean 256,257,258
      if (i + len > bytes.length) {
        throw new Error("Truncated /CMD load block");
      }
      const addr = bytes[i] | (bytes[i + 1] << 8);
      blocks.push({ addr, data: new Uint8Array(bytes.slice(i + 2, i + len)) });
      i += len;
    } else if (type === 0x02) {
      entry = bytes[i] | (bytes[i + 1] << 8);
      break; // transfer address ends the load; trailing bytes are ignored
    } else if (type === 0x05) {
      name = String.fromCharCode(...bytes.slice(i, i + len)).trimEnd();
      i += len;
    } else {
      i += len; // unknown record: skip its payload
    }
  }

  if (entry === null) {
    throw new Error("/CMD image has no transfer-address (0x02) record");
  }
  if (blocks.length === 0) {
    throw new Error("/CMD image has no load blocks");
  }
  return { name, blocks, entry };
}

/**
 * Fast-load a parsed /CMD: write every block and jump to the entry point.
 */
export function fastLoadCmd(system, parsed) {
  for (const block of parsed.blocks) {
    for (let i = 0; i < block.data.length; i++) {
      system.memory.writeByte((block.addr + i) & 0xffff, block.data[i]);
    }
  }
  system.cpu.halted = false;
  system.cpu.registers.PC = parsed.entry;
  return parsed.entry;
}
