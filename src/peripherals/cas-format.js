/**
 * TRS-80 .cas cassette image handling
 *
 * A .cas file is the decoded byte stream of a tape. Two layouts matter:
 *
 *   BASIC (CSAVE):  [leader 0x00/0x55 ...] 0xA5  0xD3 0xD3 0xD3  name(1)
 *                   then the tokenized program image: per line
 *                   [link u16][line# u16][tokens...][0x00], ending with a
 *                   0x0000 link. Link pointers are absolute addresses from
 *                   the saving machine — they are recomputed on load.
 *
 *   SYSTEM:         [leader] 0xA5  0x55  name(6) then blocks:
 *                   0x3C len(0=256) addr(u16) data[len] checksum
 *                   terminated by 0x78 entry(u16).
 *
 * Fast-loading bypasses the cassette port entirely: BASIC programs are
 * written at TXTTAB with fresh links and the variable pointers fixed up
 * (what CLOAD leaves behind); SYSTEM blocks are written to their target
 * addresses and execution jumps to the entry point (what SYSTEM's "/"
 * does).
 */

// Model III cassette BASIC work area
const TXTTAB_PTR = 0x40a4; // -> start of BASIC program (0x42E9 stock)
const VARTAB_PTR = 0x40f9; // simple variables (= end of program)
const ARYTAB_PTR = 0x40fb; // arrays
const FRETOP_PTR = 0x40fd; // free space

/**
 * Parse a .cas byte stream.
 * @returns {{kind:"basic",name:string,lines:{lineNo:number,tokens:number[]}[]}
 *        | {kind:"system",name:string,blocks:{addr:number,data:Uint8Array}[],entry:number,checksumErrors:number}}
 */
export function parseCas(bytes) {
  if (!bytes || bytes.length < 4) {
    throw new Error("Not a .cas image: too short");
  }

  // Skip the leader (0x00 or 0x55 bytes) up to the 0xA5 sync byte. Some
  // images omit the leader or even the sync.
  let i = 0;
  while (i < bytes.length && (bytes[i] === 0x00 || bytes[i] === 0x55)) i++;
  if (bytes[i] === 0xa5) {
    i++;
  } else {
    i = 0; // no leader/sync: start over at the raw content
  }

  if (bytes[i] === 0xd3 && bytes[i + 1] === 0xd3 && bytes[i + 2] === 0xd3) {
    return parseBasic(bytes, i + 3);
  }
  if (bytes[i] === 0x55) {
    return parseSystem(bytes, i + 1);
  }
  // A few BASIC images begin at the D3s without sync handled above
  throw new Error(
    "Unrecognized .cas layout (expected BASIC 0xD3 0xD3 0xD3 or SYSTEM 0x55 header)"
  );
}

// Stock cassette BASIC program base (Model I and III alike): the link
// addresses a real CSAVE writes are absolute from here.
const TXTTAB_STOCK = 0x42e9;

function parseBasic(bytes, offset) {
  const name = String.fromCharCode(bytes[offset]);
  let i = offset + 1;
  const lines = [];

  // Real CLOAD walks the link-pointer chain, which is what lets a line
  // contain 0x00 bytes (machine code embedded in a REM — the
  // Christopherson games). Trust each link while it stays
  // self-consistent; fall back to 0x00-scanning for that record when it
  // doesn't (some tools write garbage links). After a fallback the next
  // record re-syncs on the link value, so lengths derive from link
  // deltas and the saving machine's base stops mattering.
  let addr = TXTTAB_STOCK;
  while (i + 1 < bytes.length) {
    const link = bytes[i] | (bytes[i + 1] << 8);
    if (link === 0x0000) {
      break; // program terminator
    }
    const lineNo = bytes[i + 2] | (bytes[i + 3] << 8);
    const recLen = link - addr; // [link u16][line# u16][tokens...][0x00]
    if (
      recLen >= 5 &&
      recLen <= 1000 &&
      i + recLen < bytes.length &&
      bytes[i + recLen - 1] === 0x00
    ) {
      lines.push({
        lineNo,
        tokens: Array.from(bytes.slice(i + 4, i + recLen - 1)),
      });
      i += recLen;
    } else {
      const tokens = [];
      let j = i + 4;
      while (j < bytes.length && bytes[j] !== 0x00) {
        tokens.push(bytes[j]);
        j++;
      }
      j++; // consume the end-of-line 0x00
      lines.push({ lineNo, tokens });
      i = j;
    }
    addr = link; // re-sync even after a fallback record
  }

  return { kind: "basic", name, lines };
}

function parseSystem(bytes, offset) {
  const name = String.fromCharCode(...bytes.slice(offset, offset + 6))
    .replace(/\0/g, " ")
    .trimEnd();
  let i = offset + 6;
  const blocks = [];
  let entry = null;
  let checksumErrors = 0;

  while (i < bytes.length) {
    const marker = bytes[i++];
    if (marker === 0x3c) {
      let len = bytes[i++];
      if (len === 0) len = 256;
      const addr = bytes[i] | (bytes[i + 1] << 8);
      i += 2;
      const data = bytes.slice(i, i + len);
      i += len;
      const checksum = bytes[i++];
      let sum = (addr & 0xff) + ((addr >> 8) & 0xff);
      for (const b of data) sum += b;
      if ((sum & 0xff) !== checksum) checksumErrors++;
      blocks.push({ addr, data: new Uint8Array(data) });
    } else if (marker === 0x78) {
      entry = bytes[i] | (bytes[i + 1] << 8);
      break;
    } else if (marker === 0x00 || marker === 0x55) {
      // stray leader/padding between blocks on some tapes
      continue;
    } else {
      throw new Error(
        `Unexpected SYSTEM block marker 0x${marker.toString(16)} at ${i - 1}`
      );
    }
  }

  if (entry === null) {
    throw new Error("SYSTEM tape has no entry-point (0x78) block");
  }
  return { kind: "system", name, blocks, entry, checksumErrors };
}

/**
 * Fast-load a parsed BASIC program: write it at TXTTAB with recomputed
 * line links and set the variable-area pointers, exactly the state CLOAD
 * leaves. The machine should be sitting at READY. Caller typically
 * follows with system.typeText("RUN\n").
 * @returns {number} address one past the program terminator
 */
export function fastLoadBasic(system, parsed) {
  const memory = system.memory;
  const txttab = memory.readWord(TXTTAB_PTR);
  let addr = txttab;

  for (const line of parsed.lines) {
    const next = addr + 2 + 2 + line.tokens.length + 1;
    memory.writeWord(addr, next);
    memory.writeWord(addr + 2, line.lineNo);
    for (let i = 0; i < line.tokens.length; i++) {
      memory.writeByte(addr + 4 + i, line.tokens[i]);
    }
    memory.writeByte(next - 1, 0x00);
    addr = next;
  }

  memory.writeWord(addr, 0x0000); // program terminator
  addr += 2;

  memory.writeWord(VARTAB_PTR, addr);
  memory.writeWord(ARYTAB_PTR, addr);
  memory.writeWord(FRETOP_PTR, addr);
  return addr;
}

/**
 * Fast-load a parsed SYSTEM (machine-code) tape: write every block and
 * jump to the entry point — the same transfer SYSTEM's "/" performs.
 */
export function fastLoadSystem(system, parsed) {
  for (const block of parsed.blocks) {
    for (let i = 0; i < block.data.length; i++) {
      system.memory.writeByte((block.addr + i) & 0xffff, block.data[i]);
    }
  }
  system.cpu.halted = false;
  system.cpu.registers.PC = parsed.entry;
  return parsed.entry;
}
