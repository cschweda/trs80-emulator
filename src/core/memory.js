/**
 * TRS-80 Model III Memory Management System
 * Handles ROM/RAM separation, memory protection, and program loading
 */

export class MemorySystem {
  constructor() {
    // 16K ROM (0x0000 - 0x3FFF)
    this.rom = new Uint8Array(0x4000);

    // 48K RAM (0x4000 - 0xFFFF)
    this.ram = new Uint8Array(0xc000);

    // ROM loaded flag
    this.romLoaded = false;

    // Video RAM area (0x3C00 - 0x3FFF) - writable even though in ROM space
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
   * Load ROM data (16K = 0x4000 bytes)
   * Supports both 14KB and 16KB ROMs (14KB ROMs will be padded)
   */
  loadROM(romData) {
    if (!romData || romData.length === 0) {
      throw new Error("ROM data is required");
    }

    // Support 14KB (0x3800) and 16KB (0x4000) ROMs
    if (romData.length === 0x3800) {
      // 14KB ROM - pad to 16KB
      this.rom.set(romData, 0);
      this.rom.fill(0, 0x3800, 0x4000);
    } else if (romData.length === 0x4000) {
      // 16KB ROM
      this.rom.set(romData);
    } else {
      throw new Error(
        `Invalid ROM size: ${romData.length} bytes. Expected 14KB (0x3800) or 16KB (0x4000)`
      );
    }

    this.romLoaded = true;
    return true;
  }

  /**
   * Read a byte from memory
   * Addresses are masked to 16 bits (0x0000 - 0xFFFF)
   */
  readByte(address) {
    address = address & 0xffff;

    if (address < 0x4000) {
      // ROM area (0x0000 - 0x3FFF)
      return this.rom[address];
    } else {
      // RAM area (0x4000 - 0xFFFF)
      const ramOffset = address - 0x4000;
      return this.ram[ramOffset];
    }
  }

  /**
   * Write a byte to memory
   * ROM is protected except for video RAM area (0x3C00 - 0x3FFF)
   */
  writeByte(address, value) {
    address = address & 0xffff;
    value = value & 0xff;

    if (address < 0x4000) {
      // ROM area - only allow writes to video RAM
      if (address >= this.VIDEO_RAM_START && address <= this.VIDEO_RAM_END) {
        this.rom[address] = value;
      }
      // Otherwise, write is ignored (ROM protection)
    } else {
      // RAM area (0x4000 - 0xFFFF)
      const ramOffset = address - 0x4000;
      this.ram[ramOffset] = value;
    }
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
    if (address < 0x4000) {
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
   * Get a view of the entire memory space (for debugging)
   * Returns a Uint8Array representing the full 64K address space
   */
  getMemoryView() {
    const view = new Uint8Array(0x10000);
    view.set(this.rom, 0);
    view.set(this.ram, 0x4000);
    return view;
  }
}
