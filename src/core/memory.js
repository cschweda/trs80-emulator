/**
 * TRS-80 Model III Memory Management System
 *
 * Real Model III address map (non-disk machine):
 *   0x0000-0x37FF  14K ROM (write-protected)
 *   0x3800-0x3BFF  keyboard matrix (memory-mapped, read-only;
 *                  low 8 address bits select rows, A8/A9 undecoded)
 *   0x3C00-0x3FFF  1K video RAM (64 cols x 16 rows)
 *   0x4000-0xFFFF  48K RAM
 */

const ROM_LIMIT = 0x3800;
const KEYBOARD_LIMIT = 0x3c00;
const RAM_BASE = 0x4000;

export class MemorySystem {
  constructor() {
    // ROM storage is 16K so padded 16K images can be loaded verbatim,
    // but only 0x0000-0x37FF is ever mapped as ROM.
    this.rom = new Uint8Array(0x4000);

    // 48K RAM (0x4000 - 0xFFFF)
    this.ram = new Uint8Array(0xc000);

    // 1K video RAM (0x3C00 - 0x3FFF)
    this.videoRam = new Uint8Array(0x400);

    // Set on every video RAM write so the renderer can skip idle frames
    this.videoDirty = false;

    // Keyboard matrix peripheral: { read(addrLow8) -> row bits } or null
    this.keyboard = null;

    this.romLoaded = false;

    // Kept for API compatibility with existing callers
    this.VIDEO_RAM_START = 0x3c00;
    this.VIDEO_RAM_END = 0x3fff;
  }

  /**
   * Get memory statistics
   */
  getStats() {
    return {
      romSize: this.rom.length,
      ramSize: this.ram.length,
      totalSize: this.rom.length + this.ram.length,
      romLoaded: this.romLoaded,
    };
  }

  /**
   * Load a ROM image: the real 14K (0x3800) Model III ROM, or a 16K
   * (0x4000) padded image of it. Anything else is a wrong file — reject
   * it rather than guessing.
   */
  loadROM(romData) {
    if (!romData || romData.length === 0) {
      throw new Error("ROM data is required");
    }

    if (romData.length !== 0x3800 && romData.length !== 0x4000) {
      throw new Error(
        `Invalid ROM size: ${romData.length} bytes. Expected 14KB (0x3800) or a 16KB (0x4000) padded image`
      );
    }

    this.rom.fill(0);
    this.rom.set(romData, 0);

    this.romLoaded = true;
    return true;
  }

  /**
   * Read a byte from memory
   * Addresses are masked to 16 bits (0x0000 - 0xFFFF)
   */
  readByte(address) {
    address = address & 0xffff;

    if (address < ROM_LIMIT) {
      return this.rom[address];
    }
    if (address < KEYBOARD_LIMIT) {
      // Keyboard matrix: reading with no keys down yields 0x00
      return this.keyboard ? this.keyboard.read(address & 0xff) : 0x00;
    }
    if (address < RAM_BASE) {
      return this.videoRam[address - KEYBOARD_LIMIT];
    }
    return this.ram[address - RAM_BASE];
  }

  /**
   * Write a byte to memory
   * ROM and the keyboard region ignore writes; video RAM and RAM accept them.
   */
  writeByte(address, value) {
    address = address & 0xffff;
    value = value & 0xff;

    if (address < KEYBOARD_LIMIT) {
      return; // ROM / keyboard matrix: not writable
    }
    if (address < RAM_BASE) {
      this.videoRam[address - KEYBOARD_LIMIT] = value;
      this.videoDirty = true;
      return;
    }
    this.ram[address - RAM_BASE] = value;
  }

  /**
   * Read a 16-bit word (little-endian)
   */
  readWord(address) {
    address = address & 0xffff;
    const low = this.readByte(address);
    const high = this.readByte((address + 1) & 0xffff);
    return (high << 8) | low;
  }

  /**
   * Write a 16-bit word (little-endian)
   */
  writeWord(address, value) {
    address = address & 0xffff;
    value = value & 0xffff;
    const low = value & 0xff;
    const high = (value >> 8) & 0xff;
    this.writeByte(address, low);
    this.writeByte((address + 1) & 0xffff, high);
  }

  /**
   * Load a program into RAM
   * @param {Uint8Array|Array} program - Program data
   * @param {number} address - Load address (default: 0x4200)
   * @returns {number} The address where the program was loaded
   */
  loadProgram(program, address = 0x4200) {
    if (!program || program.length === 0) {
      return address;
    }

    // Convert to Uint8Array if needed
    let programData;
    if (program instanceof Uint8Array) {
      programData = program;
    } else if (Array.isArray(program)) {
      programData = new Uint8Array(program);
    } else {
      throw new Error("Program must be Uint8Array or Array");
    }

    address = address & 0xffff;

    // Check if program fits in memory
    if (address < RAM_BASE) {
      throw new Error("Cannot load program into ROM area");
    }

    const endAddress = (address + programData.length - 1) & 0xffff;
    if (endAddress < address) {
      // Wrapped around - program too large
      throw new Error("Program exceeds available memory");
    }

    // Load program into RAM
    for (let i = 0; i < programData.length; i++) {
      const addr = (address + i) & 0xffff;
      this.writeByte(addr, programData[i]);
    }

    return address;
  }

  /**
   * Clear all RAM (set to 0x00)
   */
  clearRAM() {
    this.ram.fill(0);
  }

  /**
   * Clear video RAM to spaces (what the ROM's CLS leaves behind)
   */
  clearVideoRAM() {
    this.videoRam.fill(0x20);
    this.videoDirty = true;
  }

  /**
   * Get a view of the entire memory space (for debugging)
   * Returns a Uint8Array representing the full 64K address space
   */
  getMemoryView() {
    const view = new Uint8Array(0x10000);
    view.set(this.rom.subarray(0, ROM_LIMIT), 0);
    // Keyboard region reads as idle (0x00) in the debug view
    view.set(this.videoRam, KEYBOARD_LIMIT);
    view.set(this.ram, RAM_BASE);
    return view;
  }
}
