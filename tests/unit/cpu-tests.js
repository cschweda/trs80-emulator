/**
 * Z80 CPU Core Unit Tests
 * Tests all basic CPU operations, registers, flags, and instructions
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Z80CPU } from "@core/z80cpu.js";

describe("Z80CPU - Initialization and Reset", () => {
  let cpu;

  beforeEach(() => {
    cpu = new Z80CPU();
  });

  it("should initialize with correct default values", () => {
    expect(cpu.registers.PC).toBe(0x0000);
    expect(cpu.registers.SP).toBe(0xffff);
    expect(cpu.halted).toBe(false);
    expect(cpu.IFF1).toBe(false);
    expect(cpu.IFF2).toBe(false);
    expect(cpu.interruptMode).toBe(0);
  });

  it("should reset CPU to initial state", () => {
    cpu.registers.PC = 0x1234;
    cpu.registers.SP = 0x5678;
    cpu.halted = true;

    cpu.reset();

    expect(cpu.registers.PC).toBe(0x0000);
    expect(cpu.registers.SP).toBe(0xffff);
    expect(cpu.halted).toBe(false);
  });
});

describe("Z80CPU - Register Operations", () => {
  let cpu;

  beforeEach(() => {
    cpu = new Z80CPU();
  });

  describe("8-bit Registers", () => {
    it("should read and write A register", () => {
      cpu.registers.A = 0x42;
      expect(cpu.registers.A).toBe(0x42);
    });

    it("should read and write B register", () => {
      cpu.registers.B = 0x55;
      expect(cpu.registers.B).toBe(0x55);
    });

    it("should handle register overflow (wraps to 8 bits)", () => {
      cpu.registers.A = 0x1ff;
      expect(cpu.registers.A).toBe(0xff);
    });
  });

  describe("16-bit Register Pairs", () => {
    it("should handle BC register pair", () => {
      cpu.BC = 0x1234;
      expect(cpu.registers.B).toBe(0x12);
      expect(cpu.registers.C).toBe(0x34);
      expect(cpu.BC).toBe(0x1234);
    });

    it("should handle DE register pair", () => {
      cpu.DE = 0x5678;
      expect(cpu.registers.D).toBe(0x56);
      expect(cpu.registers.E).toBe(0x78);
      expect(cpu.DE).toBe(0x5678);
    });

    it("should handle HL register pair", () => {
      cpu.HL = 0xabcd;
      expect(cpu.registers.H).toBe(0xab);
      expect(cpu.registers.L).toBe(0xcd);
      expect(cpu.HL).toBe(0xabcd);
    });

    it("should handle IX register pair", () => {
      cpu.IX = 0x1122;
      expect(cpu.registers.IXH).toBe(0x11);
      expect(cpu.registers.IXL).toBe(0x22);
      expect(cpu.IX).toBe(0x1122);
    });

    it("should handle IY register pair", () => {
      cpu.IY = 0x3344;
      expect(cpu.registers.IYH).toBe(0x33);
      expect(cpu.registers.IYL).toBe(0x44);
      expect(cpu.IY).toBe(0x3344);
    });
  });
});

describe("Z80CPU - Flag Operations", () => {
  let cpu;

  beforeEach(() => {
    cpu = new Z80CPU();
  });

  it("should set and clear Carry flag (C)", () => {
    cpu.flagC = 1;
    expect(cpu.flagC).toBe(1);
    cpu.flagC = 0;
    expect(cpu.flagC).toBe(0);
  });

  it("should set and clear Zero flag (Z)", () => {
    cpu.flagZ = 1;
    expect(cpu.flagZ).toBe(1);
    cpu.flagZ = 0;
    expect(cpu.flagZ).toBe(0);
  });

  it("should set and clear Sign flag (S)", () => {
    cpu.flagS = 1;
    expect(cpu.flagS).toBe(1);
    cpu.flagS = 0;
    expect(cpu.flagS).toBe(0);
  });

  it("should set and clear Half-carry flag (H)", () => {
    cpu.flagH = 1;
    expect(cpu.flagH).toBe(1);
    cpu.flagH = 0;
    expect(cpu.flagH).toBe(0);
  });

  it("should set and clear Parity/Overflow flag (PV)", () => {
    cpu.flagPV = 1;
    expect(cpu.flagPV).toBe(1);
    cpu.flagPV = 0;
    expect(cpu.flagPV).toBe(0);
  });

  it("should set and clear Add/Subtract flag (N)", () => {
    cpu.flagN = 1;
    expect(cpu.flagN).toBe(1);
    cpu.flagN = 0;
    expect(cpu.flagN).toBe(0);
  });

  it("should handle multiple flag operations", () => {
    cpu.registers.F = 0xff;
    expect(cpu.flagC).toBe(1);
    expect(cpu.flagZ).toBe(1);
    expect(cpu.flagS).toBe(1);

    cpu.registers.F = 0x00;
    expect(cpu.flagC).toBe(0);
    expect(cpu.flagZ).toBe(0);
    expect(cpu.flagS).toBe(0);
  });
});

describe("Z80CPU - Arithmetic Operations", () => {
  let cpu;

  beforeEach(() => {
    cpu = new Z80CPU();
  });

  describe("ADD A, r", () => {
    it("should add without carry", () => {
      cpu.registers.A = 0x05;
      cpu.addA(0x03);
      expect(cpu.registers.A).toBe(0x08);
      expect(cpu.flagC).toBe(0);
    });

    it("should set carry flag on overflow", () => {
      cpu.registers.A = 0xff;
      cpu.addA(0x01);
      expect(cpu.registers.A).toBe(0x00);
      expect(cpu.flagC).toBe(1);
      expect(cpu.flagZ).toBe(1);
    });

    it("should set zero flag when result is zero", () => {
      cpu.registers.A = 0x00;
      cpu.addA(0x00);
      expect(cpu.flagZ).toBe(1);
    });

    it("should set sign flag when bit 7 is set", () => {
      cpu.registers.A = 0x80;
      cpu.addA(0x01);
      expect(cpu.registers.A).toBe(0x81);
      expect(cpu.flagS).toBe(1);
    });

    it("should set half-carry flag", () => {
      cpu.registers.A = 0x0f;
      cpu.addA(0x01);
      expect(cpu.flagH).toBe(1);
    });

    it("should set overflow flag on signed overflow", () => {
      cpu.registers.A = 0x7f; // +127
      cpu.addA(0x01); // +1
      expect(cpu.registers.A).toBe(0x80); // -128 (overflow)
      expect(cpu.flagPV).toBe(1);
    });
  });

  describe("SUB A, r", () => {
    it("should subtract without borrow", () => {
      cpu.registers.A = 0x08;
      cpu.subA(0x03);
      expect(cpu.registers.A).toBe(0x05);
      expect(cpu.flagC).toBe(0);
    });

    it("should set carry flag on underflow", () => {
      cpu.registers.A = 0x00;
      cpu.subA(0x01);
      expect(cpu.registers.A).toBe(0xff);
      expect(cpu.flagC).toBe(1);
    });

    it("should set N flag for subtraction", () => {
      cpu.registers.A = 0x05;
      cpu.subA(0x03);
      expect(cpu.flagN).toBe(1);
    });

    it("should handle compare mode (CP)", () => {
      cpu.registers.A = 0x42;
      cpu.subA(0x42, true); // Compare mode
      expect(cpu.registers.A).toBe(0x42); // A unchanged
      expect(cpu.flagZ).toBe(1); // But flags set
    });
  });

  describe("INC r", () => {
    it("should increment register", () => {
      cpu.registers.A = 0x41;
      cpu.incReg("A");
      expect(cpu.registers.A).toBe(0x42);
    });

    it("should wrap on overflow", () => {
      cpu.registers.A = 0xff;
      cpu.incReg("A");
      expect(cpu.registers.A).toBe(0x00);
      expect(cpu.flagZ).toBe(1);
    });

    it("should set half-carry flag", () => {
      cpu.registers.A = 0x0f;
      cpu.incReg("A");
      expect(cpu.flagH).toBe(1);
    });

    it("should set overflow flag when incrementing 0x7F", () => {
      cpu.registers.A = 0x7f;
      cpu.incReg("A");
      expect(cpu.flagPV).toBe(1);
    });

    it("should not affect carry flag", () => {
      cpu.flagC = 1;
      cpu.registers.A = 0xff;
      cpu.incReg("A");
      expect(cpu.flagC).toBe(1); // Carry unchanged
    });
  });

  describe("DEC r", () => {
    it("should decrement register", () => {
      cpu.registers.A = 0x42;
      cpu.decReg("A");
      expect(cpu.registers.A).toBe(0x41);
    });

    it("should wrap on underflow", () => {
      cpu.registers.A = 0x00;
      cpu.decReg("A");
      expect(cpu.registers.A).toBe(0xff);
    });

    it("should set N flag for decrement", () => {
      cpu.registers.A = 0x42;
      cpu.decReg("A");
      expect(cpu.flagN).toBe(1);
    });
  });
});

describe("Z80CPU - Load Instructions", () => {
  let cpu;
  let memory;

  beforeEach(() => {
    cpu = new Z80CPU();
    memory = new Uint8Array(65536);

    cpu.readMemory = (address) => memory[address];
    cpu.writeMemory = (address, value) => {
      memory[address] = value & 0xff;
    };
  });

  it("should execute LD A, n", () => {
    memory[0x0000] = 0x3e; // LD A, n
    memory[0x0001] = 0x42;

    cpu.executeInstruction();

    expect(cpu.registers.A).toBe(0x42);
    expect(cpu.registers.PC).toBe(0x0002);
  });

  it("should execute LD B, n", () => {
    memory[0x0000] = 0x06; // LD B, n
    memory[0x0001] = 0x55;

    cpu.executeInstruction();

    expect(cpu.registers.B).toBe(0x55);
  });

  it("should execute LD HL, nn", () => {
    memory[0x0000] = 0x21; // LD HL, nn
    memory[0x0001] = 0x34; // Low byte
    memory[0x0002] = 0x12; // High byte

    cpu.executeInstruction();

    expect(cpu.HL).toBe(0x1234);
    expect(cpu.registers.PC).toBe(0x0003);
  });

  it("should execute LD (HL), n", () => {
    cpu.HL = 0x5000;
    memory[0x0000] = 0x36; // LD (HL), n
    memory[0x0001] = 0xaa;

    cpu.executeInstruction();

    expect(memory[0x5000]).toBe(0xaa);
  });

  it("should execute LD A, (HL)", () => {
    cpu.HL = 0x5000;
    memory[0x5000] = 0x42;
    memory[0x0000] = 0x7e; // LD A, (HL)

    cpu.executeInstruction();

    expect(cpu.registers.A).toBe(0x42);
  });
});

describe("Z80CPU - Control Flow", () => {
  let cpu;
  let memory;

  beforeEach(() => {
    cpu = new Z80CPU();
    memory = new Uint8Array(65536);

    cpu.readMemory = (address) => memory[address];
    cpu.writeMemory = (address, value) => {
      memory[address] = value & 0xff;
    };
  });

  it("should execute JP nn (unconditional jump)", () => {
    memory[0x0000] = 0xc3; // JP nn
    memory[0x0001] = 0x00; // Low byte
    memory[0x0002] = 0x50; // High byte

    cpu.executeInstruction();

    expect(cpu.registers.PC).toBe(0x5000);
  });

  it("should execute JP Z, nn when zero flag is set", () => {
    cpu.flagZ = 1;
    memory[0x0000] = 0xca; // JP Z, nn
    memory[0x0001] = 0x00;
    memory[0x0002] = 0x50;

    cpu.executeInstruction();

    expect(cpu.registers.PC).toBe(0x5000);
  });

  it("should not jump JP Z, nn when zero flag is clear", () => {
    cpu.flagZ = 0;
    memory[0x0000] = 0xca; // JP Z, nn
    memory[0x0001] = 0x00;
    memory[0x0002] = 0x50;

    cpu.executeInstruction();

    expect(cpu.registers.PC).toBe(0x0003); // Just moved past instruction
  });

  it("should execute CALL nn", () => {
    cpu.registers.SP = 0xffff;
    cpu.registers.PC = 0x1000;

    memory[0x1000] = 0xcd; // CALL nn
    memory[0x1001] = 0x00;
    memory[0x1002] = 0x50;

    cpu.executeInstruction();

    expect(cpu.registers.PC).toBe(0x5000);
    expect(cpu.registers.SP).toBe(0xfffd);

    // Check return address on stack
    expect(memory[0xfffd]).toBe(0x03); // Low byte of return address
    expect(memory[0xfffe]).toBe(0x10); // High byte of return address
  });

  it("should execute RET", () => {
    cpu.registers.SP = 0xfffd;
    memory[0xfffd] = 0x34; // Return address low
    memory[0xfffe] = 0x12; // Return address high
    memory[0x0000] = 0xc9; // RET

    cpu.executeInstruction();

    expect(cpu.registers.PC).toBe(0x1234);
    expect(cpu.registers.SP).toBe(0xffff);
  });
});

describe("Z80CPU - Stack Operations", () => {
  let cpu;
  let memory;

  beforeEach(() => {
    cpu = new Z80CPU();
    memory = new Uint8Array(65536);

    cpu.readMemory = (address) => memory[address];
    cpu.writeMemory = (address, value) => {
      memory[address] = value & 0xff;
    };
  });

  it("should execute PUSH BC", () => {
    cpu.BC = 0x1234;
    cpu.registers.SP = 0xffff;
    memory[0x0000] = 0xc5; // PUSH BC

    cpu.executeInstruction();

    expect(cpu.registers.SP).toBe(0xfffd);
    expect(memory[0xfffd]).toBe(0x34); // C
    expect(memory[0xfffe]).toBe(0x12); // B
  });

  it("should execute POP BC", () => {
    cpu.registers.SP = 0xfffd;
    memory[0xfffd] = 0x34;
    memory[0xfffe] = 0x12;
    memory[0x0000] = 0xc1; // POP BC

    cpu.executeInstruction();

    expect(cpu.BC).toBe(0x1234);
    expect(cpu.registers.SP).toBe(0xffff);
  });
});

describe("Z80CPU - I/O Operations", () => {
  let cpu;
  let memory;
  let ports;

  beforeEach(() => {
    cpu = new Z80CPU();
    memory = new Uint8Array(65536);
    ports = new Uint8Array(256);

    cpu.readMemory = (address) => memory[address];
    cpu.writeMemory = (address, value) => {
      memory[address] = value & 0xff;
    };
    cpu.readPort = (port) => ports[port];
    cpu.writePort = (port, value) => {
      ports[port] = value & 0xff;
    };
  });

  it("should execute OUT (n), A", () => {
    cpu.registers.A = 0x42;
    memory[0x0000] = 0xd3; // OUT (n), A
    memory[0x0001] = 0xff; // Port FF

    cpu.executeInstruction();

    expect(ports[0xff]).toBe(0x42);
  });

  it("should execute IN A, (n)", () => {
    ports[0xff] = 0x55;
    memory[0x0000] = 0xdb; // IN A, (n)
    memory[0x0001] = 0xff; // Port FF

    cpu.executeInstruction();

    expect(cpu.registers.A).toBe(0x55);
  });
});

describe("Z80CPU - Special Instructions", () => {
  let cpu;
  let memory;

  beforeEach(() => {
    cpu = new Z80CPU();
    memory = new Uint8Array(65536);

    cpu.readMemory = (address) => memory[address];
    cpu.writeMemory = (address, value) => {
      memory[address] = value & 0xff;
    };
  });

  it("should execute NOP", () => {
    cpu.registers.PC = 0x1000;
    memory[0x1000] = 0x00; // NOP

    cpu.executeInstruction();

    expect(cpu.registers.PC).toBe(0x1001);
  });

  it("should execute HALT", () => {
    memory[0x0000] = 0x76; // HALT

    cpu.executeInstruction();

    expect(cpu.halted).toBe(true);
  });

  it("should not execute instructions when halted", () => {
    cpu.halted = true;
    cpu.registers.PC = 0x1000;

    const cycles = cpu.executeInstruction();

    expect(cpu.registers.PC).toBe(0x1000); // PC unchanged
    expect(cycles).toBe(4); // Still uses cycles
  });
});

describe("Z80CPU - Test Program 1.1", () => {
  let cpu;
  let memory;

  beforeEach(() => {
    cpu = new Z80CPU();
    memory = new Uint8Array(65536);

    cpu.readMemory = (address) => memory[address];
    cpu.writeMemory = (address, value) => {
      memory[address] = value & 0xff;
    };
  });

  it("should execute complete test program", () => {
    // Program:
    // LD A, 0x55
    // LD B, 0xAA
    // ADD A, B
    // HALT

    memory[0x0000] = 0x3e; // LD A, 0x55
    memory[0x0001] = 0x55;
    memory[0x0002] = 0x06; // LD B, 0xAA
    memory[0x0003] = 0xaa;
    memory[0x0004] = 0x80; // ADD A, B
    memory[0x0005] = 0x76; // HALT

    cpu.executeInstruction(); // LD A, 0x55
    cpu.executeInstruction(); // LD B, 0xAA
    cpu.executeInstruction(); // ADD A, B
    cpu.executeInstruction(); // HALT

    expect(cpu.registers.A).toBe(0xff);
    expect(cpu.registers.B).toBe(0xaa);
    expect(cpu.flagS).toBe(1); // Sign flag set (bit 7 = 1)
    expect(cpu.flagZ).toBe(0); // Zero flag clear
    expect(cpu.flagH).toBe(1); // Half-carry flag set
    expect(cpu.halted).toBe(true);
  });
});

describe("Z80CPU - Cycle Counting", () => {
  let cpu;
  let memory;

  beforeEach(() => {
    cpu = new Z80CPU();
    memory = new Uint8Array(65536);

    cpu.readMemory = (address) => memory[address];
    cpu.writeMemory = (address, value) => {
      memory[address] = value & 0xff;
    };
  });

  it("should count cycles for LD A, n (7 cycles)", () => {
    memory[0x0000] = 0x3e;
    memory[0x0001] = 0x42;

    const cycles = cpu.executeInstruction();

    expect(cycles).toBe(7);
  });

  it("should count cycles for ADD A, r (4 cycles)", () => {
    cpu.registers.B = 0x10;
    memory[0x0000] = 0x80; // ADD A, B

    const cycles = cpu.executeInstruction();

    expect(cycles).toBe(4);
  });

  it("should accumulate total cycles", () => {
    cpu.cycles = 0;
    memory[0x0000] = 0x3e; // LD A, n (7 cycles)
    memory[0x0001] = 0x42;
    memory[0x0002] = 0x00; // NOP (4 cycles)

    cpu.executeInstruction();
    cpu.executeInstruction();

    expect(cpu.cycles).toBe(11);
  });
});

describe("Z80CPU - Advanced CB Prefix Instructions", () => {
  let cpu;
  let memory;

  beforeEach(() => {
    cpu = new Z80CPU();
    memory = new Uint8Array(65536);

    cpu.readMemory = (address) => memory[address];
    cpu.writeMemory = (address, value) => {
      memory[address] = value & 0xff;
    };
  });

  describe("Rotate and Shift Operations", () => {
    it("should execute RLC r (rotate left circular)", () => {
      cpu.registers.B = 0x85; // 10000101
      memory[0x0000] = 0xcb; // CB prefix
      memory[0x0001] = 0x00; // RLC B

      cpu.executeInstruction();

      expect(cpu.registers.B).toBe(0x0b); // 00001011 (bit 7 moved to bit 0)
      expect(cpu.flagC).toBe(1); // Bit 7 was set
      expect(cpu.flagZ).toBe(0);
    });

    it("should execute RRC r (rotate right circular)", () => {
      cpu.registers.C = 0x85; // 10000101
      memory[0x0000] = 0xcb; // CB prefix
      memory[0x0001] = 0x09; // RRC C

      cpu.executeInstruction();

      expect(cpu.registers.C).toBe(0xc2); // 11000010 (bit 0 moved to bit 7)
      expect(cpu.flagC).toBe(1); // Bit 0 was set
    });

    it("should execute RL r (rotate left through carry)", () => {
      cpu.registers.D = 0x80;
      cpu.flagC = 0;
      memory[0x0000] = 0xcb; // CB prefix
      memory[0x0001] = 0x12; // RL D

      cpu.executeInstruction();

      expect(cpu.registers.D).toBe(0x00);
      expect(cpu.flagC).toBe(1);
      expect(cpu.flagZ).toBe(1);
    });

    it("should execute RR r (rotate right through carry)", () => {
      cpu.registers.E = 0x01;
      cpu.flagC = 1;
      memory[0x0000] = 0xcb; // CB prefix
      memory[0x0001] = 0x1b; // RR E

      cpu.executeInstruction();

      expect(cpu.registers.E).toBe(0x80);
      expect(cpu.flagC).toBe(1);
    });

    it("should execute SLA r (shift left arithmetic)", () => {
      cpu.registers.H = 0x85;
      memory[0x0000] = 0xcb; // CB prefix
      memory[0x0001] = 0x24; // SLA H

      cpu.executeInstruction();

      expect(cpu.registers.H).toBe(0x0a);
      expect(cpu.flagC).toBe(1);
    });

    it("should execute SRA r (shift right arithmetic)", () => {
      cpu.registers.L = 0x85; // 10000101
      memory[0x0000] = 0xcb; // CB prefix
      memory[0x0001] = 0x2d; // SRA L

      cpu.executeInstruction();

      expect(cpu.registers.L).toBe(0xc2); // Sign bit preserved
      expect(cpu.flagC).toBe(1);
    });

    it("should execute SRL r (shift right logical)", () => {
      cpu.registers.A = 0x85;
      memory[0x0000] = 0xcb; // CB prefix
      memory[0x0001] = 0x3f; // SRL A

      cpu.executeInstruction();

      expect(cpu.registers.A).toBe(0x42);
      expect(cpu.flagC).toBe(1);
      expect(cpu.flagS).toBe(0); // Sign bit cleared
    });

    it("should execute RLC (HL) - memory rotate", () => {
      cpu.HL = 0x5000;
      memory[0x5000] = 0x85;
      memory[0x0000] = 0xcb; // CB prefix
      memory[0x0001] = 0x06; // RLC (HL)

      cpu.executeInstruction();

      expect(memory[0x5000]).toBe(0x0b);
      expect(cpu.flagC).toBe(1);
    });
  });

  describe("Bit Operations", () => {
    it("should execute BIT b, r (test bit)", () => {
      cpu.registers.B = 0x85; // 10000101
      memory[0x0000] = 0xcb; // CB prefix
      memory[0x0001] = 0x40; // BIT 0, B

      cpu.executeInstruction();

      expect(cpu.flagZ).toBe(0); // Bit 0 is set
      expect(cpu.flagH).toBe(1);
      expect(cpu.flagN).toBe(0);
    });

    it("should execute BIT 7, r (sets sign flag)", () => {
      cpu.registers.C = 0x80;
      memory[0x0000] = 0xcb; // CB prefix
      memory[0x0001] = 0x79; // BIT 7, C

      cpu.executeInstruction();

      expect(cpu.flagZ).toBe(0);
      expect(cpu.flagS).toBe(1); // Sign flag set for bit 7
    });

    it("should execute SET b, r (set bit)", () => {
      cpu.registers.D = 0x00;
      memory[0x0000] = 0xcb; // CB prefix
      memory[0x0001] = 0xc2; // SET 0, D

      cpu.executeInstruction();

      expect(cpu.registers.D).toBe(0x01);
    });

    it("should execute RES b, r (reset bit)", () => {
      cpu.registers.E = 0xff;
      memory[0x0000] = 0xcb; // CB prefix
      memory[0x0001] = 0x83; // RES 0, E

      cpu.executeInstruction();

      expect(cpu.registers.E).toBe(0xfe);
    });

    it("should execute BIT b, (HL) - memory bit test", () => {
      cpu.HL = 0x5000;
      memory[0x5000] = 0x42; // 01000010
      memory[0x0000] = 0xcb; // CB prefix
      memory[0x0001] = 0x46; // BIT 0, (HL)

      cpu.executeInstruction();

      expect(cpu.flagZ).toBe(1); // Bit 0 is clear
    });

    it("should execute SET b, (HL) - memory bit set", () => {
      cpu.HL = 0x5000;
      memory[0x5000] = 0x00;
      memory[0x0000] = 0xcb; // CB prefix
      memory[0x0001] = 0xce; // SET 1, (HL)

      cpu.executeInstruction();

      expect(memory[0x5000]).toBe(0x02);
    });
  });
});

describe("Z80CPU - Advanced ED Prefix Instructions", () => {
  let cpu;
  let memory;
  let ports;

  beforeEach(() => {
    cpu = new Z80CPU();
    memory = new Uint8Array(65536);
    ports = new Uint8Array(256);

    cpu.readMemory = (address) => memory[address];
    cpu.writeMemory = (address, value) => {
      memory[address] = value & 0xff;
    };
    cpu.readPort = (port) => ports[port];
    cpu.writePort = (port, value) => {
      ports[port] = value & 0xff;
    };
  });

  describe("Block Transfer Operations", () => {
    it("should execute LDI (load and increment)", () => {
      cpu.HL = 0x4000;
      cpu.DE = 0x5000;
      cpu.BC = 0x0005;
      memory[0x4000] = 0x42;
      memory[0x0000] = 0xed; // ED prefix
      memory[0x0001] = 0xa0; // LDI

      cpu.executeInstruction();

      expect(memory[0x5000]).toBe(0x42);
      expect(cpu.HL).toBe(0x4001);
      expect(cpu.DE).toBe(0x5001);
      expect(cpu.BC).toBe(0x0004);
      expect(cpu.flagPV).toBe(1); // BC != 0
    });

    it("should execute LDIR (load, increment, repeat)", () => {
      cpu.HL = 0x4000;
      cpu.DE = 0x5000;
      cpu.BC = 0x0003;
      memory[0x4000] = 0x01;
      memory[0x4001] = 0x02;
      memory[0x4002] = 0x03;
      memory[0x0000] = 0xed; // ED prefix
      memory[0x0001] = 0xb0; // LDIR

      // Execute until BC = 0
      let cycles = 0;
      while (cpu.BC !== 0 && cycles < 100) {
        cpu.executeInstruction();
        cycles++;
      }

      expect(memory[0x5000]).toBe(0x01);
      expect(memory[0x5001]).toBe(0x02);
      expect(memory[0x5002]).toBe(0x03);
      expect(cpu.BC).toBe(0x0000);
      expect(cpu.flagPV).toBe(0);
    });

    it("should execute LDD (load and decrement)", () => {
      cpu.HL = 0x4002;
      cpu.DE = 0x5002;
      cpu.BC = 0x0003;
      memory[0x4002] = 0x42;
      memory[0x0000] = 0xed; // ED prefix
      memory[0x0001] = 0xa8; // LDD

      cpu.executeInstruction();

      expect(memory[0x5002]).toBe(0x42);
      expect(cpu.HL).toBe(0x4001);
      expect(cpu.DE).toBe(0x5001);
      expect(cpu.BC).toBe(0x0002);
    });

    it("should execute CPI (compare and increment)", () => {
      cpu.HL = 0x4000;
      cpu.BC = 0x0005;
      cpu.registers.A = 0x42;
      memory[0x4000] = 0x42;
      memory[0x0000] = 0xed; // ED prefix
      memory[0x0001] = 0xa1; // CPI

      cpu.executeInstruction();

      expect(cpu.flagZ).toBe(1); // Match found
      expect(cpu.HL).toBe(0x4001);
      expect(cpu.BC).toBe(0x0004);
      expect(cpu.flagPV).toBe(1); // BC != 0
    });

    it("should execute CPIR (compare, increment, repeat)", () => {
      cpu.HL = 0x4000;
      cpu.BC = 0x0005;
      cpu.registers.A = 0x42;
      memory[0x4000] = 0x01;
      memory[0x4001] = 0x02;
      memory[0x4002] = 0x42; // Match here
      memory[0x4003] = 0x04;
      memory[0x0000] = 0xed; // ED prefix
      memory[0x0001] = 0xb1; // CPIR

      // Execute until match or BC = 0
      let cycles = 0;
      while (cpu.BC !== 0 && !cpu.flagZ && cycles < 100) {
        cpu.executeInstruction();
        cycles++;
      }

      expect(cpu.flagZ).toBe(1); // Match found
      expect(cpu.HL).toBe(0x4003); // Points after match
      expect(cpu.BC).toBe(0x0002);
    });
  });

  describe("Extended Load Instructions", () => {
    it("should execute LD I, A", () => {
      cpu.registers.A = 0x42;
      memory[0x0000] = 0xed; // ED prefix
      memory[0x0001] = 0x47; // LD I, A

      cpu.executeInstruction();

      expect(cpu.registers.I).toBe(0x42);
    });

    it("should execute LD A, I", () => {
      cpu.registers.I = 0x55;
      cpu.IFF2 = true;
      memory[0x0000] = 0xed; // ED prefix
      memory[0x0001] = 0x57; // LD A, I

      cpu.executeInstruction();

      expect(cpu.registers.A).toBe(0x55);
      expect(cpu.flagPV).toBe(1); // IFF2 copied to PV
    });

    it("should execute LD BC, (nn)", () => {
      memory[0x5000] = 0x34; // Low byte
      memory[0x5001] = 0x12; // High byte
      memory[0x0000] = 0xed; // ED prefix
      memory[0x0001] = 0x4b; // LD BC, (nn)
      memory[0x0002] = 0x00; // Low byte of address
      memory[0x0003] = 0x50; // High byte of address

      cpu.executeInstruction();

      expect(cpu.BC).toBe(0x1234);
    });

    it("should execute LD (nn), BC", () => {
      cpu.BC = 0x5678;
      memory[0x0000] = 0xed; // ED prefix
      memory[0x0001] = 0x43; // LD (nn), BC
      memory[0x0002] = 0x00; // Low byte of address
      memory[0x0003] = 0x50; // High byte of address

      cpu.executeInstruction();

      expect(memory[0x5000]).toBe(0x78);
      expect(memory[0x5001]).toBe(0x56);
    });
  });

  describe("Extended Arithmetic", () => {
    it("should execute ADC HL, BC", () => {
      cpu.HL = 0x1234;
      cpu.BC = 0x5678;
      cpu.flagC = 1;
      memory[0x0000] = 0xed; // ED prefix
      memory[0x0001] = 0x4a; // ADC HL, BC

      cpu.executeInstruction();

      expect(cpu.HL).toBe(0x68ad); // 0x1234 + 0x5678 + 1
      expect(cpu.flagC).toBe(0);
    });

    it("should execute SBC HL, DE", () => {
      cpu.HL = 0x5678;
      cpu.DE = 0x1234;
      cpu.flagC = 0;
      memory[0x0000] = 0xed; // ED prefix
      memory[0x0001] = 0x52; // SBC HL, DE

      cpu.executeInstruction();

      expect(cpu.HL).toBe(0x4444);
      expect(cpu.flagC).toBe(0);
      expect(cpu.flagN).toBe(1);
    });

    it("should execute NEG (negate accumulator)", () => {
      cpu.registers.A = 0x42;
      memory[0x0000] = 0xed; // ED prefix
      memory[0x0001] = 0x44; // NEG

      cpu.executeInstruction();

      expect(cpu.registers.A).toBe(0xbe); // -0x42 in two's complement
      expect(cpu.flagC).toBe(1);
      expect(cpu.flagN).toBe(1);
    });
  });

  describe("Extended I/O Operations", () => {
    it("should execute IN r, (C)", () => {
      cpu.BC = 0x00ff;
      ports[0xff] = 0x55;
      memory[0x0000] = 0xed; // ED prefix
      memory[0x0001] = 0x40; // IN B, (C)

      cpu.executeInstruction();

      expect(cpu.registers.B).toBe(0x55);
      expect(cpu.flagZ).toBe(0);
    });

    it("should execute OUT (C), r", () => {
      cpu.BC = 0x00ff;
      cpu.registers.B = 0x42;
      memory[0x0000] = 0xed; // ED prefix
      memory[0x0001] = 0x41; // OUT (C), B

      cpu.executeInstruction();

      expect(ports[0xff]).toBe(0x42);
    });

    it("should execute INI (input and increment)", () => {
      cpu.BC = 0x02ff; // B = count, C = port
      cpu.HL = 0x5000;
      ports[0xff] = 0x55;
      memory[0x0000] = 0xed; // ED prefix
      memory[0x0001] = 0xa2; // INI

      cpu.executeInstruction();

      expect(memory[0x5000]).toBe(0x55);
      expect(cpu.HL).toBe(0x5001);
      expect(cpu.registers.B).toBe(0x01);
      expect(cpu.flagZ).toBe(0);
    });

    it("should execute OUTI (output and increment)", () => {
      cpu.BC = 0x02ff;
      cpu.HL = 0x5000;
      memory[0x5000] = 0x42;
      memory[0x0000] = 0xed; // ED prefix
      memory[0x0001] = 0xa3; // OUTI

      cpu.executeInstruction();

      expect(ports[0xff]).toBe(0x42);
      expect(cpu.HL).toBe(0x5001);
      expect(cpu.registers.B).toBe(0x01);
    });
  });

  describe("Interrupt Handling", () => {
    it("should execute RETI (return from interrupt)", () => {
      cpu.IFF1 = false;
      cpu.IFF2 = true;
      cpu.registers.SP = 0xfffd;
      memory[0xfffd] = 0x34;
      memory[0xfffe] = 0x12;
      memory[0x0000] = 0xed; // ED prefix
      memory[0x0001] = 0x4d; // RETI

      cpu.executeInstruction();

      expect(cpu.registers.PC).toBe(0x1234);
      expect(cpu.IFF1).toBe(true); // IFF2 copied to IFF1
    });

    it("should execute RETN (return from NMI)", () => {
      cpu.IFF1 = false;
      cpu.IFF2 = true;
      cpu.registers.SP = 0xfffd;
      memory[0xfffd] = 0x56;
      memory[0xfffe] = 0x78;
      memory[0x0000] = 0xed; // ED prefix
      memory[0x0001] = 0x45; // RETN

      cpu.executeInstruction();

      expect(cpu.registers.PC).toBe(0x7856);
      expect(cpu.IFF1).toBe(true);
    });

    it("should execute IM 0 (interrupt mode 0)", () => {
      memory[0x0000] = 0xed; // ED prefix
      memory[0x0001] = 0x46; // IM 0

      cpu.executeInstruction();

      expect(cpu.interruptMode).toBe(0);
    });

    it("should execute IM 1 (interrupt mode 1)", () => {
      memory[0x0000] = 0xed; // ED prefix
      memory[0x0001] = 0x56; // IM 1

      cpu.executeInstruction();

      expect(cpu.interruptMode).toBe(1);
    });

    it("should execute IM 2 (interrupt mode 2)", () => {
      memory[0x0000] = 0xed; // ED prefix
      memory[0x0001] = 0x5e; // IM 2

      cpu.executeInstruction();

      expect(cpu.interruptMode).toBe(2);
    });
  });
});

describe("Z80CPU - Advanced DD/FD Prefix Instructions", () => {
  let cpu;
  let memory;

  beforeEach(() => {
    cpu = new Z80CPU();
    memory = new Uint8Array(65536);

    cpu.readMemory = (address) => memory[address];
    cpu.writeMemory = (address, value) => {
      memory[address] = value & 0xff;
    };
  });

  describe("IX Register Operations", () => {
    it("should execute LD IX, nn", () => {
      memory[0x0000] = 0xdd; // DD prefix
      memory[0x0001] = 0x21; // LD IX, nn
      memory[0x0002] = 0x34; // Low byte
      memory[0x0003] = 0x12; // High byte

      cpu.executeInstruction();

      expect(cpu.IX).toBe(0x1234);
    });

    it("should execute ADD IX, BC", () => {
      cpu.IX = 0x1000;
      cpu.BC = 0x0234;
      memory[0x0000] = 0xdd; // DD prefix
      memory[0x0001] = 0x09; // ADD IX, BC

      cpu.executeInstruction();

      expect(cpu.IX).toBe(0x1234);
      expect(cpu.flagC).toBe(0);
    });

    it("should execute INC IX", () => {
      cpu.IX = 0x1234;
      memory[0x0000] = 0xdd; // DD prefix
      memory[0x0001] = 0x23; // INC IX

      cpu.executeInstruction();

      expect(cpu.IX).toBe(0x1235);
    });

    it("should execute PUSH IX", () => {
      cpu.IX = 0x5678;
      cpu.registers.SP = 0xffff;
      memory[0x0000] = 0xdd; // DD prefix
      memory[0x0001] = 0xe5; // PUSH IX

      cpu.executeInstruction();

      expect(memory[0xfffd]).toBe(0x78);
      expect(memory[0xfffe]).toBe(0x56);
      expect(cpu.registers.SP).toBe(0xfffd);
    });

    it("should execute POP IX", () => {
      cpu.registers.SP = 0xfffd;
      memory[0xfffd] = 0x34;
      memory[0xfffe] = 0x12;
      memory[0x0000] = 0xdd; // DD prefix
      memory[0x0001] = 0xe1; // POP IX

      cpu.executeInstruction();

      expect(cpu.IX).toBe(0x1234);
      expect(cpu.registers.SP).toBe(0xffff);
    });

    it("should execute JP (IX)", () => {
      cpu.IX = 0x5000;
      memory[0x0000] = 0xdd; // DD prefix
      memory[0x0001] = 0xe9; // JP (IX)

      cpu.executeInstruction();

      expect(cpu.registers.PC).toBe(0x5000);
    });

    it("should execute LD SP, IX", () => {
      cpu.IX = 0x5678;
      memory[0x0000] = 0xdd; // DD prefix
      memory[0x0001] = 0xf9; // LD SP, IX

      cpu.executeInstruction();

      expect(cpu.registers.SP).toBe(0x5678);
    });
  });

  describe("IY Register Operations", () => {
    it("should execute LD IY, nn", () => {
      memory[0x0000] = 0xfd; // FD prefix
      memory[0x0001] = 0x21; // LD IY, nn
      memory[0x0002] = 0x78; // Low byte
      memory[0x0003] = 0x56; // High byte

      cpu.executeInstruction();

      expect(cpu.IY).toBe(0x5678);
    });

    it("should execute ADD IY, DE", () => {
      cpu.IY = 0x2000;
      cpu.DE = 0x1234;
      memory[0x0000] = 0xfd; // FD prefix
      memory[0x0001] = 0x19; // ADD IY, DE

      cpu.executeInstruction();

      expect(cpu.IY).toBe(0x3234);
    });

    it("should execute DEC IY", () => {
      cpu.IY = 0x1234;
      memory[0x0000] = 0xfd; // FD prefix
      memory[0x0001] = 0x2b; // DEC IY

      cpu.executeInstruction();

      expect(cpu.IY).toBe(0x1233);
    });
  });

  describe("Indexed CB Operations", () => {
    it("should execute DD CB d RLC (IX+d) rotate", () => {
      cpu.IX = 0x5000;
      memory[0x5005] = 0x85; // IX + 5
      memory[0x0000] = 0xdd; // DD prefix
      memory[0x0001] = 0xcb; // CB prefix
      memory[0x0002] = 0x05; // Displacement
      memory[0x0003] = 0x06; // RLC (IX+d)

      cpu.executeInstruction();

      expect(memory[0x5005]).toBe(0x0b);
      expect(cpu.flagC).toBe(1);
    });

    it("should execute FD CB d BIT (IY+d) bit test", () => {
      cpu.IY = 0x4000;
      memory[0x4003] = 0x42; // IY + 3, bit 1 is set
      memory[0x0000] = 0xfd; // FD prefix
      memory[0x0001] = 0xcb; // CB prefix
      memory[0x0002] = 0x03; // Displacement
      memory[0x0003] = 0x4e; // BIT 1, (IY+d)

      cpu.executeInstruction();

      expect(cpu.flagZ).toBe(0); // Bit 1 is set
    });

    it("should execute DD CB d SET (IX+d) bit set", () => {
      cpu.IX = 0x3000;
      memory[0x3002] = 0x00; // IX + 2
      memory[0x0000] = 0xdd; // DD prefix
      memory[0x0001] = 0xcb; // CB prefix
      memory[0x0002] = 0x02; // Displacement
      memory[0x0003] = 0xc6; // SET 0, (IX+d)

      cpu.executeInstruction();

      expect(memory[0x3002]).toBe(0x01);
    });
  });
});

describe("Z80CPU - Advanced Control Instructions", () => {
  let cpu;
  let memory;

  beforeEach(() => {
    cpu = new Z80CPU();
    memory = new Uint8Array(65536);

    cpu.readMemory = (address) => memory[address];
    cpu.writeMemory = (address, value) => {
      memory[address] = value & 0xff;
    };
  });

  describe("Decimal Adjust Accumulator (DAA)", () => {
    it("should adjust BCD addition result", () => {
      cpu.registers.A = 0x09;
      cpu.addA(0x05); // 9 + 5 = 14 (0x0E)
      memory[0x0000] = 0x27; // DAA

      cpu.executeInstruction();

      expect(cpu.registers.A).toBe(0x14); // BCD: 14
      expect(cpu.flagC).toBe(0);
    });

    it("should adjust BCD addition with carry", () => {
      cpu.registers.A = 0x99;
      cpu.addA(0x01); // 99 + 1 = 100 (0x9A)
      memory[0x0000] = 0x27; // DAA

      cpu.executeInstruction();

      expect(cpu.registers.A).toBe(0x00); // BCD: 00 (with carry)
      expect(cpu.flagC).toBe(1);
    });
  });

  describe("Complement Operations", () => {
    it("should execute CPL (complement accumulator)", () => {
      cpu.registers.A = 0x55; // 01010101
      memory[0x0000] = 0x2f; // CPL

      cpu.executeInstruction();

      expect(cpu.registers.A).toBe(0xaa); // 10101010
      expect(cpu.flagH).toBe(1);
      expect(cpu.flagN).toBe(1);
    });

    it("should execute CCF (complement carry flag)", () => {
      cpu.flagC = 0;
      memory[0x0000] = 0x3f; // CCF

      cpu.executeInstruction();

      expect(cpu.flagC).toBe(1);
      expect(cpu.flagH).toBe(1); // Set to old C value
    });

    it("should execute SCF (set carry flag)", () => {
      cpu.flagC = 0;
      memory[0x0000] = 0x37; // SCF

      cpu.executeInstruction();

      expect(cpu.flagC).toBe(1);
      expect(cpu.flagH).toBe(0);
      expect(cpu.flagN).toBe(0);
    });
  });

  describe("Exchange Operations", () => {
    it("should execute EX DE, HL", () => {
      cpu.DE = 0x1234;
      cpu.HL = 0x5678;
      memory[0x0000] = 0xeb; // EX DE, HL

      cpu.executeInstruction();

      expect(cpu.DE).toBe(0x5678);
      expect(cpu.HL).toBe(0x1234);
    });

    it("should execute EX AF, AF'", () => {
      cpu.registers.A = 0x42;
      cpu.registers.F = 0xff;
      cpu.registers.A_ = 0x55;
      cpu.registers.F_ = 0x00;
      memory[0x0000] = 0x08; // EX AF, AF'

      cpu.executeInstruction();

      expect(cpu.registers.A).toBe(0x55);
      expect(cpu.registers.F).toBe(0x00);
      expect(cpu.registers.A_).toBe(0x42);
      expect(cpu.registers.F_).toBe(0xff);
    });

    it("should execute EX (SP), HL", () => {
      cpu.HL = 0x1234;
      cpu.registers.SP = 0xfffd;
      memory[0xfffd] = 0x78;
      memory[0xfffe] = 0x56;
      memory[0x0000] = 0xe3; // EX (SP), HL

      cpu.executeInstruction();

      expect(cpu.HL).toBe(0x5678);
      expect(memory[0xfffd]).toBe(0x34);
      expect(memory[0xfffe]).toBe(0x12);
    });

    it("should execute EXX (exchange register sets)", () => {
      cpu.BC = 0x1111;
      cpu.DE = 0x2222;
      cpu.HL = 0x3333;
      cpu.registers.B_ = 0x44;
      cpu.registers.C_ = 0x44;
      cpu.registers.D_ = 0x55;
      cpu.registers.E_ = 0x55;
      cpu.registers.H_ = 0x66;
      cpu.registers.L_ = 0x66;
      memory[0x0000] = 0xd9; // EXX

      cpu.executeInstruction();

      expect(cpu.BC).toBe(0x4444);
      expect(cpu.DE).toBe(0x5555);
      expect(cpu.HL).toBe(0x6666);
    });
  });

  describe("Interrupt Control", () => {
    it("should execute DI (disable interrupts)", () => {
      cpu.IFF1 = true;
      cpu.IFF2 = true;
      memory[0x0000] = 0xf3; // DI

      cpu.executeInstruction();

      expect(cpu.IFF1).toBe(false);
      expect(cpu.IFF2).toBe(false);
    });

    it("should execute EI (enable interrupts)", () => {
      cpu.IFF1 = false;
      cpu.IFF2 = false;
      memory[0x0000] = 0xfb; // EI

      cpu.executeInstruction();

      expect(cpu.IFF1).toBe(true);
      expect(cpu.IFF2).toBe(true);
    });
  });
});

describe("Z80CPU - Advanced Arithmetic Sequences", () => {
  let cpu;
  let memory;

  beforeEach(() => {
    cpu = new Z80CPU();
    memory = new Uint8Array(65536);

    cpu.readMemory = (address) => memory[address];
    cpu.writeMemory = (address, value) => {
      memory[address] = value & 0xff;
    };
  });

  it("should execute 16-bit addition sequence", () => {
    // ADD HL, BC; ADC HL, DE
    cpu.HL = 0x1000;
    cpu.BC = 0x0234;
    cpu.DE = 0x0567;
    cpu.flagC = 0;

    memory[0x0000] = 0x09; // ADD HL, BC
    memory[0x0001] = 0xed; // ED prefix
    memory[0x0002] = 0x5a; // ADC HL, DE

    cpu.executeInstruction();
    expect(cpu.HL).toBe(0x1234);

    cpu.executeInstruction();
    expect(cpu.HL).toBe(0x179b);
  });

  it("should execute multi-byte subtraction", () => {
    // SBC HL, BC
    cpu.HL = 0x5678;
    cpu.BC = 0x1234;
    cpu.flagC = 0;
    memory[0x0000] = 0xed; // ED prefix
    memory[0x0001] = 0x42; // SBC HL, BC

    cpu.executeInstruction();

    expect(cpu.HL).toBe(0x4444);
    expect(cpu.flagN).toBe(1);
  });

  it("should execute logical operations sequence", () => {
    // AND, OR, XOR sequence
    cpu.registers.A = 0xff;
    cpu.registers.B = 0x0f;

    memory[0x0000] = 0xa0; // AND B
    memory[0x0001] = 0xb0; // OR B
    memory[0x0002] = 0xa8; // XOR B

    cpu.executeInstruction(); // AND
    expect(cpu.registers.A).toBe(0x0f);
    expect(cpu.flagH).toBe(1);

    cpu.executeInstruction(); // OR
    expect(cpu.registers.A).toBe(0x0f);

    cpu.executeInstruction(); // XOR
    expect(cpu.registers.A).toBe(0x00);
    expect(cpu.flagZ).toBe(1);
  });
});

describe("Z80CPU - TRS-80 Model III Specific Patterns", () => {
  let cpu;
  let memory;
  let ports;

  beforeEach(() => {
    cpu = new Z80CPU();
    memory = new Uint8Array(65536);
    ports = new Uint8Array(256);

    cpu.readMemory = (address) => memory[address];
    cpu.writeMemory = (address, value) => {
      memory[address] = value & 0xff;
    };
    cpu.readPort = (port) => ports[port];
    cpu.writePort = (port, value) => {
      ports[port] = value & 0xff;
    };
  });

  it("should execute ROM boot sequence pattern", () => {
    // Typical ROM boot: Initialize stack, set up memory, jump to BASIC
    cpu.registers.SP = 0xffff;
    memory[0x0000] = 0x31; // LD SP, nn
    memory[0x0001] = 0x00;
    memory[0x0002] = 0x40; // SP = 0x4000
    memory[0x0003] = 0xc3; // JP nn
    memory[0x0004] = 0x00;
    memory[0x0005] = 0x10; // Jump to 0x1000

    cpu.executeInstruction(); // LD SP, nn
    expect(cpu.registers.SP).toBe(0x4000);

    cpu.executeInstruction(); // JP nn
    expect(cpu.registers.PC).toBe(0x1000);
  });

  it("should execute string copy routine (LDIR pattern)", () => {
    // Copy 5 bytes from 0x4000 to 0x5000
    cpu.HL = 0x4000;
    cpu.DE = 0x5000;
    cpu.BC = 0x0005;
    memory[0x4000] = 0x48; // 'H'
    memory[0x4001] = 0x45; // 'E'
    memory[0x4002] = 0x4c; // 'L'
    memory[0x4003] = 0x4c; // 'L'
    memory[0x4004] = 0x4f; // 'O'
    memory[0x0000] = 0xed; // ED prefix
    memory[0x0001] = 0xb0; // LDIR

    // Execute until BC = 0
    let cycles = 0;
    while (cpu.BC !== 0 && cycles < 100) {
      cpu.executeInstruction();
      cycles++;
    }

    expect(memory[0x5000]).toBe(0x48);
    expect(memory[0x5001]).toBe(0x45);
    expect(memory[0x5002]).toBe(0x4c);
    expect(memory[0x5003]).toBe(0x4c);
    expect(memory[0x5004]).toBe(0x4f);
    expect(cpu.BC).toBe(0x0000);
  });

  it("should execute memory fill routine", () => {
    // Fill 10 bytes with 0xFF using LDIR pattern
    cpu.HL = 0x4000;
    cpu.DE = 0x5000;
    cpu.BC = 0x000a;

    // Initialize source bytes (all 0xFF)
    for (let i = 0; i < 10; i++) {
      memory[0x4000 + i] = 0xff;
    }

    // Initialize destination bytes (all 0x00)
    for (let i = 0; i < 10; i++) {
      memory[0x5000 + i] = 0x00;
    }

    // Use LDIR to copy
    memory[0x0000] = 0xed; // ED prefix
    memory[0x0001] = 0xb0; // LDIR

    let cycles = 0;
    while (cpu.BC !== 0 && cycles < 100) {
      cpu.executeInstruction();
      cycles++;
    }

    // Verify all bytes filled
    for (let i = 0; i < 10; i++) {
      expect(memory[0x5000 + i]).toBe(0xff);
    }
  });

  it("should execute keyboard scan pattern (bit testing)", () => {
    // Simulate keyboard matrix scan using BIT instructions
    cpu.HL = 0x5000;
    memory[0x5000] = 0x42; // Keyboard row data

    memory[0x0000] = 0xcb; // CB prefix
    memory[0x0001] = 0x46; // BIT 0, (HL) - test key bit

    cpu.executeInstruction();

    expect(cpu.flagZ).toBe(1); // Bit 0 is clear
    expect(cpu.flagH).toBe(1);
  });

  it("should execute video memory update pattern", () => {
    // Update video RAM using indexed addressing
    cpu.IX = 0x3c00; // Video RAM base
    memory[0x3c05] = 0x20; // Space character

    // Use indexed CB operation to set bit for graphics
    memory[0x0000] = 0xdd; // DD prefix
    memory[0x0001] = 0xcb; // CB prefix
    memory[0x0002] = 0x05; // Displacement
    memory[0x0003] = 0xc6; // SET 0, (IX+d)

    cpu.executeInstruction();

    expect(memory[0x3c05]).toBe(0x21); // Bit 0 set
  });

  it("should execute subroutine call/return pattern", () => {
    // Call subroutine, execute, return
    cpu.registers.SP = 0xffff;
    cpu.registers.PC = 0x1000;

    // Main program
    memory[0x1000] = 0xcd; // CALL nn
    memory[0x1001] = 0x00;
    memory[0x1002] = 0x50; // Call 0x5000

    // Subroutine at 0x5000
    memory[0x5000] = 0x3e; // LD A, 0x42
    memory[0x5001] = 0x42;
    memory[0x5002] = 0xc9; // RET

    cpu.executeInstruction(); // CALL
    expect(cpu.registers.PC).toBe(0x5000);
    expect(cpu.registers.SP).toBe(0xfffd);

    cpu.executeInstruction(); // LD A, 0x42
    expect(cpu.registers.A).toBe(0x42);

    cpu.executeInstruction(); // RET
    expect(cpu.registers.PC).toBe(0x1003);
    expect(cpu.registers.SP).toBe(0xffff);
  });

  it("should execute loop with DJNZ", () => {
    // Countdown loop: B = 5, decrement and loop
    cpu.registers.B = 0x05;
    cpu.registers.PC = 0x1000;

    memory[0x1000] = 0x10; // DJNZ e
    memory[0x1001] = 0xfe; // -2 (loop back)

    let iterations = 0;
    while (cpu.registers.B !== 0 && iterations < 10) {
      cpu.executeInstruction();
      iterations++;
    }

    expect(cpu.registers.B).toBe(0x00);
    expect(iterations).toBe(5);
  });

  it("should execute relative jump sequence", () => {
    // JR forward
    cpu.registers.PC = 0x1000;
    memory[0x1000] = 0x18; // JR e
    memory[0x1001] = 0x05; // +5 bytes forward

    cpu.executeInstruction();

    expect(cpu.registers.PC).toBe(0x1007); // 0x1000 + 2 + 5

    // JR backward
    cpu.registers.PC = 0x1000;
    memory[0x1000] = 0x18; // JR e
    memory[0x1001] = 0xfb; // -5 bytes backward (signed: 0xFB = -5)

    cpu.executeInstruction();

    // 0x1000 + 2 + (-5) = 0x1000 + 2 - 5 = 0xFFFD (wraps around)
    // But PC is 16-bit, so 0x1000 + 2 - 5 = 0xFFFD
    expect(cpu.registers.PC).toBe((0x1000 + 2 - 5) & 0xffff); // 0xFFFD
  });

  it("should execute RST instruction sequence", () => {
    // RST 0x08 (interrupt vector at 0x0008)
    cpu.registers.SP = 0xffff;
    cpu.registers.PC = 0x1000;
    memory[0x1000] = 0xc7; // RST 0x00
    memory[0x0000] = 0xc9; // RET at interrupt handler

    cpu.executeInstruction(); // RST

    expect(cpu.registers.PC).toBe(0x0000);
    expect(cpu.registers.SP).toBe(0xfffd);
    expect(memory[0xfffd]).toBe(0x01); // Return address low
    expect(memory[0xfffe]).toBe(0x10); // Return address high
  });

  it("should execute complex flag-dependent branching", () => {
    // Test multiple conditional jumps
    cpu.registers.A = 0x80; // Negative number
    cpu.subA(0x00, true); // CP 0x00

    memory[0x0000] = 0xfa; // JP M, nn (jump if negative)
    memory[0x0001] = 0x00;
    memory[0x0002] = 0x50;

    cpu.executeInstruction();

    expect(cpu.registers.PC).toBe(0x5000); // Should jump
    expect(cpu.flagS).toBe(1);
  });

  it("should execute decimal arithmetic for BCD operations", () => {
    // Add two BCD numbers: 19 + 27 = 46
    cpu.registers.A = 0x19; // BCD: 19
    cpu.addA(0x27); // Add BCD: 27
    memory[0x0000] = 0x27; // DAA

    cpu.executeInstruction();

    expect(cpu.registers.A).toBe(0x46); // BCD: 46
  });

  it("should execute register exchange for context switching", () => {
    // Save context using EXX
    cpu.BC = 0x1111;
    cpu.DE = 0x2222;
    cpu.HL = 0x3333;
    cpu.registers.B_ = 0x44;
    cpu.registers.C_ = 0x44;
    cpu.registers.D_ = 0x55;
    cpu.registers.E_ = 0x55;
    cpu.registers.H_ = 0x66;
    cpu.registers.L_ = 0x66;

    memory[0x0000] = 0xd9; // EXX

    cpu.executeInstruction();

    // Verify registers swapped
    expect(cpu.BC).toBe(0x4444);
    expect(cpu.DE).toBe(0x5555);
    expect(cpu.HL).toBe(0x6666);

    // Swap back - need to reload instruction since PC advanced
    cpu.registers.PC = 0x0000;
    cpu.executeInstruction();

    expect(cpu.BC).toBe(0x1111);
    expect(cpu.DE).toBe(0x2222);
    expect(cpu.HL).toBe(0x3333);
  });
});
