/**
 * Browser-Compatible Test Runner for Phase 1
 * Executes 52 Phase 1 tests and reports results
 *
 * This test runner matches tests/unit/cpu-tests.js with all tests
 * organized by complexity level, showing assembly and opcodes for learning
 */

import { Z80CPU } from "./core/z80cpu.js";

// Enhanced expect implementation with verbose logging
// Note: This will be redefined inside runAllPhase1Tests to access logFn
let expect = null; // Will be set inside runAllPhase1Tests

export async function runAllPhase1Tests(logFn) {
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    errors: [],
  };

  let currentSuite = "";
  let verboseLogging = true; // Enable verbose logging
  let totalInstructionsExecuted = 0;

  // Helper to format hex values
  function hex(value, width = 2) {
    return `0x${value.toString(16).toUpperCase().padStart(width, "0")}`;
  }

  // Enhanced expect implementation with verbose logging
  expect = function (value) {
    return {
      toBe: (expected) => {
        if (value !== expected) {
          const valueHex = typeof value === "number" ? ` (${hex(value)})` : "";
          const expectedHex =
            typeof expected === "number" ? ` (${hex(expected)})` : "";
          throw new Error(
            `Expected ${expected}${expectedHex}, but got ${value}${valueHex}`
          );
        }
        if (verboseLogging) {
          const valueHex = typeof value === "number" ? ` (${hex(value)})` : "";
          logFn(
            `        ✓ Assert: ${value}${valueHex} === ${expected}`,
            "info"
          );
        }
      },
      toBeGreaterThan: (expected) => {
        if (value <= expected) {
          throw new Error(`Expected ${value} to be greater than ${expected}`);
        }
        if (verboseLogging) {
          logFn(`        ✓ Assert: ${value} > ${expected}`, "info");
        }
      },
      toBeLessThan: (expected) => {
        if (value >= expected) {
          throw new Error(`Expected ${value} to be less than ${expected}`);
        }
        if (verboseLogging) {
          logFn(`        ✓ Assert: ${value} < ${expected}`, "info");
        }
      },
    };
  };

  // Helper to format register state
  function formatRegisters(cpu) {
    return `A=${hex(cpu.registers.A)} B=${hex(cpu.registers.B)} C=${hex(
      cpu.registers.C
    )} D=${hex(cpu.registers.D)} E=${hex(cpu.registers.E)} H=${hex(
      cpu.registers.H
    )} L=${hex(cpu.registers.L)} PC=${hex(cpu.registers.PC, 4)} SP=${hex(
      cpu.registers.SP,
      4
    )}`;
  }

  // Helper to format flags
  function formatFlags(cpu) {
    const flags = [];
    if (cpu.flagC) flags.push("C");
    if (cpu.flagZ) flags.push("Z");
    if (cpu.flagS) flags.push("S");
    if (cpu.flagPV) flags.push("PV");
    if (cpu.flagH) flags.push("H");
    if (cpu.flagN) flags.push("N");
    return flags.length > 0 ? `[${flags.join(" ")}]` : "[none]";
  }

  // Helper to get instruction mnemonic from opcode
  function getInstructionMnemonic(cpu, memory) {
    const pc = cpu.registers.PC;
    const opcode = memory[pc];

    // Common instruction mnemonics
    const mnemonics = {
      0x00: "NOP",
      0x01: "LD BC, nn",
      0x06: "LD B, n",
      0x0e: "LD C, n",
      0x11: "LD DE, nn",
      0x18: "JR e",
      0x21: "LD HL, nn",
      0x27: "DAA",
      0x2f: "CPL",
      0x31: "LD SP, nn",
      0x36: "LD (HL), n",
      0x3a: "LD A, (nn)",
      0x3e: "LD A, n",
      0x47: "LD B, A",
      0x70: "LD (HL), B",
      0x76: "HALT",
      0x78: "LD A, B",
      0x7e: "LD A, (HL)",
      0x80: "ADD A, B",
      0x90: "SUB A, B",
      0xa0: "AND B",
      0xa8: "XOR B",
      0xb0: "OR B",
      0xb8: "CP B",
      0xc1: "POP BC",
      0xc2: "JP NZ, nn",
      0xc3: "JP nn",
      0xc5: "PUSH BC",
      0xc6: "ADD A, n",
      0xc9: "RET",
      0xca: "JP Z, nn",
      0xcd: "CALL nn",
      0xd3: "OUT (n), A",
      0xdb: "IN A, (n)",
    };

    // Handle prefix instructions
    if (opcode === 0xcb) {
      const nextByte = memory[(pc + 1) & 0xffff];
      const cbMnemonics = {
        0x00: "RLC B",
        0x09: "RRC C",
        0x24: "SLA H",
        0x40: "BIT 0, B",
        0xc2: "SET 0, D",
      };
      return (
        cbMnemonics[nextByte] || `CB ${hex(nextByte)} (CB prefix instruction)`
      );
    }

    if (opcode === 0xed) {
      const nextByte = memory[(pc + 1) & 0xffff];
      const edMnemonics = {
        0x44: "NEG",
        0x45: "RETN",
        0x46: "IM 0",
        0x47: "LD I, A",
        0x4a: "ADC HL, BC",
        0x4b: "LD BC, (nn)",
        0x4d: "RETI",
        0x56: "IM 1",
        0x57: "LD A, I",
        0x5e: "IM 2",
        0xa0: "LDI",
        0xa1: "CPI",
        0xa8: "LDD",
        0xb0: "LDIR",
      };
      return (
        edMnemonics[nextByte] || `ED ${hex(nextByte)} (ED prefix instruction)`
      );
    }

    if (opcode === 0xdd) {
      const nextByte = memory[(pc + 1) & 0xffff];
      if (nextByte === 0x21) return "LD IX, nn";
      if (nextByte === 0x09) return "ADD IX, BC";
      if (nextByte === 0xcb) {
        const thirdByte = memory[(pc + 2) & 0xffff];
        const fourthByte = memory[(pc + 3) & 0xffff];
        if (fourthByte === 0x06) return "RLC (IX+d)";
        return `DD CB ${hex(thirdByte)} ${hex(fourthByte)} (DD CB prefix)`;
      }
      return `DD ${hex(nextByte)} (DD prefix instruction)`;
    }

    if (opcode === 0xfd) {
      const nextByte = memory[(pc + 1) & 0xffff];
      if (nextByte === 0x21) return "LD IY, nn";
      return `FD ${hex(nextByte)} (FD prefix instruction)`;
    }

    return mnemonics[opcode] || `Unknown (${hex(opcode)})`;
  }

  function runTest(testName, testFn, metadata = {}) {
    results.total++;

    // Display test with assembly and opcode if available
    let testHeader = `  🧪 Running: ${testName}`;
    if (metadata.assembly) {
      testHeader += `\n     📝 Assembly: ${metadata.assembly}`;
    }
    if (metadata.opcode) {
      testHeader += `\n     🔢 Opcode: ${metadata.opcode}`;
    }
    logFn(testHeader, "info");

    try {
      const startTime = performance.now();
      testFn();
      const endTime = performance.now();
      const duration = (endTime - startTime).toFixed(2);
      results.passed++;

      // Display success with assembly/opcode info
      let successMsg = `  ✅ ${testName} (${duration}ms)`;
      if (metadata.assembly || metadata.opcode) {
        const parts = [];
        if (metadata.assembly) parts.push(`📝 Assembly: ${metadata.assembly}`);
        if (metadata.opcode) parts.push(`🔢 Opcode: ${metadata.opcode}`);
        successMsg += `\n     ${parts.join(" | ")}`;
      }
      logFn(successMsg, "success");
      return true;
    } catch (error) {
      results.failed++;
      const errorMsg = error.message || String(error);
      const errorStack = error.stack || "";
      logFn(`  ❌ ${testName}`, "error");
      logFn(`     Error: ${errorMsg}`, "error");

      if (verboseLogging) {
        if (errorStack) {
          const stackLines = errorStack.split("\n").slice(0, 5);
          logFn(`     Stack trace:`, "error");
          stackLines.forEach((line, idx) => {
            if (idx > 0) {
              // Skip first line (error message)
              logFn(`       ${idx}. ${line.trim()}`, "error");
            }
          });
        }

        // Try to extract context from error
        if (error.name) {
          logFn(`     Error type: ${error.name}`, "error");
        }
      }

      results.errors.push({
        suite: currentSuite,
        test: testName,
        error: errorMsg,
        stack: errorStack,
        name: error.name,
      });
      return false;
    }
  }

  function runSuite(suiteName, suiteFn) {
    currentSuite = suiteName;
    logFn(`\n📦 ${suiteName}`, "info");
    logFn(
      `   ────────────────────────────────────────────────────────`,
      "info"
    );
    try {
      const suiteStartTime = performance.now();
      suiteFn();
      const suiteEndTime = performance.now();
      const suiteDuration = (suiteEndTime - suiteStartTime).toFixed(2);
      logFn(
        `   ────────────────────────────────────────────────────────`,
        "info"
      );
      logFn(`   Suite completed in ${suiteDuration}ms`, "info");
    } catch (error) {
      logFn(`  ❌ Suite error: ${error.message}`, "error");
      if (verboseLogging && error.stack) {
        logFn(
          `     ${error.stack.split("\n").slice(0, 3).join("\n     ")}`,
          "error"
        );
      }
      results.errors.push({
        suite: suiteName,
        error: error.message,
        stack: error.stack,
      });
    }
    logFn("");
  }

  // Helper to log memory range initialization
  function logMemoryInit(memory, startAddr, endAddr, description = "") {
    if (!verboseLogging) return;
    const bytes = [];
    for (
      let addr = startAddr;
      addr <= endAddr && addr < memory.length && bytes.length < 16;
      addr++
    ) {
      bytes.push(hex(memory[addr]));
    }
    const rangeDesc = description ? ` (${description})` : "";
    if (bytes.length > 0) {
      logFn(
        `        💾 MEM INIT: ${hex(startAddr, 4)}-${hex(
          endAddr,
          4
        )}${rangeDesc}: [${bytes.join(" ")}${
          bytes.length < endAddr - startAddr + 1 ? "..." : ""
        }]`,
        "info"
      );
    }
  }

  // Helper to setup CPU with memory and ports (with verbose logging)
  function setupCPU() {
    const cpu = new Z80CPU();
    const memory = new Uint8Array(65536);
    const ports = new Uint8Array(256);
    let instructionCount = 0;

    if (verboseLogging) {
      logFn(
        `        🔧 CPU Setup: Initialized CPU, memory (64KB), ports (256)`,
        "info"
      );
      logFn(
        `        🔧 Initial state: ${formatRegisters(cpu)} ${formatFlags(cpu)}`,
        "info"
      );
    }

    // Wrap readMemory with logging
    cpu.readMemory = (address) => {
      const value = memory[address];
      if (verboseLogging && instructionCount <= 15) {
        logFn(
          `        📖 MEM READ: ${hex(address, 4)} = ${hex(value)}`,
          "info"
        );
      }
      return value;
    };

    // Wrap writeMemory with logging
    cpu.writeMemory = (address, value) => {
      const oldValue = memory[address];
      memory[address] = value & 0xff;
      if (verboseLogging && instructionCount <= 15) {
        if (oldValue !== (value & 0xff)) {
          logFn(
            `        📝 MEM WRITE: ${hex(address, 4)} = ${hex(
              value
            )} (was ${hex(oldValue)})`,
            "info"
          );
        } else {
          logFn(
            `        📝 MEM WRITE: ${hex(address, 4)} = ${hex(
              value
            )} (unchanged)`,
            "info"
          );
        }
      }
    };

    // Wrap readPort with logging
    cpu.readPort = (port) => {
      const value = ports[port];
      if (verboseLogging && instructionCount <= 15) {
        logFn(`        🔌 PORT READ: ${hex(port)} = ${hex(value)}`, "info");
      }
      return value;
    };

    // Wrap writePort with logging
    cpu.writePort = (port, value) => {
      const oldValue = ports[port];
      ports[port] = value & 0xff;
      if (verboseLogging && instructionCount <= 15) {
        logFn(
          `        🔌 PORT WRITE: ${hex(port)} = ${hex(value)} (was ${hex(
            oldValue
          )})`,
          "info"
        );
      }
    };

    // Wrap executeInstruction with verbose logging
    const originalExecuteInstruction = cpu.executeInstruction.bind(cpu);
    cpu.executeInstruction = function () {
      instructionCount++;
      totalInstructionsExecuted++;
      const pcBefore = this.registers.PC;
      const regsBefore = formatRegisters(this);
      const flagsBefore = formatFlags(this);
      const mnemonic = getInstructionMnemonic(this, memory);

      // Show instruction bytes
      let instructionBytes = [];
      const opcode = memory[pcBefore];
      instructionBytes.push(hex(opcode));
      if (
        opcode === 0xcb ||
        opcode === 0xed ||
        opcode === 0xdd ||
        opcode === 0xfd
      ) {
        const nextByte = memory[(pcBefore + 1) & 0xffff];
        instructionBytes.push(hex(nextByte));
        if (opcode === 0xdd || opcode === 0xfd) {
          const thirdByte = memory[(pcBefore + 2) & 0xffff];
          if (thirdByte === 0xcb) {
            instructionBytes.push(hex(thirdByte));
            instructionBytes.push(hex(memory[(pcBefore + 3) & 0xffff]));
          }
        }
      } else if (
        [
          0x01, 0x11, 0x21, 0x31, 0xc2, 0xc3, 0xc4, 0xca, 0xcc, 0xcd, 0xd2,
          0xd4, 0xda, 0xdc, 0xe2, 0xe4, 0xea, 0xec, 0xf2, 0xf4, 0xfa, 0xfc,
        ].includes(opcode)
      ) {
        // 16-bit immediate instructions
        instructionBytes.push(hex(memory[(pcBefore + 1) & 0xffff]));
        instructionBytes.push(hex(memory[(pcBefore + 2) & 0xffff]));
      } else if (
        [
          0x06, 0x0e, 0x16, 0x1e, 0x26, 0x2e, 0x36, 0x3e, 0xc6, 0xce, 0xd6,
          0xde, 0xe6, 0xee, 0xf6, 0xfe, 0xdb, 0xd3,
        ].includes(opcode)
      ) {
        // 8-bit immediate instructions
        instructionBytes.push(hex(memory[(pcBefore + 1) & 0xffff]));
      }

      if (verboseLogging && instructionCount <= 20) {
        logFn(
          `     ▶️  EXEC #${instructionCount}: PC=${hex(
            pcBefore,
            4
          )} | Bytes: [${instructionBytes.join(" ")}] | ${mnemonic}`,
          "info"
        );
        logFn(`        Before: ${regsBefore} ${flagsBefore}`, "info");

        // Show relevant memory context if instruction uses (HL), (IX+d), (IY+d), etc.
        if (mnemonic.includes("(HL)") || mnemonic.includes("HL")) {
          const hlAddr = this.HL;
          logFn(
            `        (HL) context: HL=${hex(hlAddr, 4)} → MEM[${hex(
              hlAddr,
              4
            )}]=${hex(memory[hlAddr])}`,
            "info"
          );
        }
        if (mnemonic.includes("(BC)") || mnemonic.includes("BC")) {
          const bcAddr = this.BC;
          logFn(
            `        (BC) context: BC=${hex(bcAddr, 4)} → MEM[${hex(
              bcAddr,
              4
            )}]=${hex(memory[bcAddr])}`,
            "info"
          );
        }
        if (mnemonic.includes("(DE)") || mnemonic.includes("DE")) {
          const deAddr = this.DE;
          logFn(
            `        (DE) context: DE=${hex(deAddr, 4)} → MEM[${hex(
              deAddr,
              4
            )}]=${hex(memory[deAddr])}`,
            "info"
          );
        }
      }

      try {
        const cycles = originalExecuteInstruction();

        const pcAfter = this.registers.PC;
        const regsAfter = formatRegisters(this);
        const flagsAfter = formatFlags(this);

        if (verboseLogging && instructionCount <= 20) {
          logFn(`        After:  ${regsAfter} ${flagsAfter}`, "info");
          if (pcBefore !== pcAfter) {
            const jumpDistance = (pcAfter - pcBefore - 2) & 0xffff;
            const signedDistance =
              jumpDistance > 0x7fff ? jumpDistance - 0x10000 : jumpDistance;
            logFn(
              `        PC: ${hex(pcBefore, 4)} → ${hex(pcAfter, 4)} (${
                signedDistance >= 0 ? "+" : ""
              }${signedDistance} bytes)`,
              "info"
            );
          }
          logFn(`        Cycles: ${cycles} | Total: ${this.cycles}`, "info");
        }

        return cycles;
      } catch (error) {
        if (verboseLogging) {
          logFn(`        ❌ ERROR during execution: ${error.message}`, "error");
          logFn(
            `        PC=${hex(this.registers.PC, 4)} | ${mnemonic}`,
            "error"
          );
          logFn(`        Registers: ${formatRegisters(this)}`, "error");
          logFn(`        Flags: ${formatFlags(this)}`, "error");
          logFn(
            `        Instruction bytes: [${instructionBytes.join(" ")}]`,
            "error"
          );
        }
        throw error;
      }
    };

    // Return enhanced setup object with logging helpers
    return {
      cpu,
      memory,
      ports,
      logMemoryRange: (start, end, desc) =>
        logMemoryInit(memory, start, end, desc),
      logRegisterState: () => {
        if (verboseLogging) {
          logFn(
            `        📊 Registers: ${formatRegisters(cpu)} ${formatFlags(cpu)}`,
            "info"
          );
        }
      },
    };
  }

  // ============================================================================
  // LEVEL 1: BASIC CPU INITIALIZATION (2 tests)
  // ============================================================================
  runSuite("LEVEL 1: CPU Initialization", () => {
    runTest("1.1 - CPU initializes with default values", () => {
      const cpu = new Z80CPU();
      expect(cpu.registers.PC).toBe(0x0000);
      expect(cpu.registers.SP).toBe(0xffff);
      expect(cpu.halted).toBe(false);
    });

    runTest("1.2 - CPU reset restores initial state", () => {
      const cpu = new Z80CPU();
      cpu.registers.PC = 0x1234;
      cpu.registers.SP = 0x5678;
      cpu.halted = true;
      cpu.reset();
      expect(cpu.registers.PC).toBe(0x0000);
      expect(cpu.registers.SP).toBe(0xffff);
      expect(cpu.halted).toBe(false);
    });
  });

  // ============================================================================
  // LEVEL 2: SIMPLE 8-BIT LOAD INSTRUCTIONS (5 tests)
  // ============================================================================
  runSuite("LEVEL 2: Simple 8-bit Load Instructions", () => {
    runTest(
      "2.1 - LD A, n (0x3E) - Load immediate value into accumulator",
      () => {
        const { cpu, memory } = setupCPU();
        memory[0x0000] = 0x3e; // LD A, n
        memory[0x0001] = 0x42; // Immediate value
        cpu.executeInstruction();
        expect(cpu.registers.A).toBe(0x42);
        expect(cpu.registers.PC).toBe(0x0002);
      },
      {
        assembly: "LD A, 0x42",
        opcode: "0x3E 0x42",
      }
    );

    runTest(
      "2.2 - LD B, n (0x06) - Load immediate into B register",
      () => {
        const { cpu, memory } = setupCPU();
        memory[0x0000] = 0x06; // LD B, n
        memory[0x0001] = 0x55;
        cpu.executeInstruction();
        expect(cpu.registers.B).toBe(0x55);
      },
      {
        assembly: "LD B, 0x55",
        opcode: "0x06 0x55",
      }
    );

    runTest(
      "2.3 - LD C, n (0x0E) - Load immediate into C register",
      () => {
        const { cpu, memory } = setupCPU();
        memory[0x0000] = 0x0e; // LD C, n
        memory[0x0001] = 0xaa;
        cpu.executeInstruction();
        expect(cpu.registers.C).toBe(0xaa);
      },
      {
        assembly: "LD C, 0xAA",
        opcode: "0x0E 0xAA",
      }
    );

    runTest(
      "2.4 - LD A, B (0x78) - Copy register to accumulator",
      () => {
        const { cpu, memory } = setupCPU();
        cpu.registers.B = 0x33;
        memory[0x0000] = 0x78; // LD A, B
        cpu.executeInstruction();
        expect(cpu.registers.A).toBe(0x33);
      },
      {
        assembly: "LD A, B",
        opcode: "0x78",
      }
    );

    runTest(
      "2.5 - LD B, A (0x47) - Copy accumulator to register",
      () => {
        const { cpu, memory } = setupCPU();
        cpu.registers.A = 0x99;
        memory[0x0000] = 0x47; // LD B, A
        cpu.executeInstruction();
        expect(cpu.registers.B).toBe(0x99);
      },
      {
        assembly: "LD B, A",
        opcode: "0x47",
      }
    );
  });

  // ============================================================================
  // LEVEL 3: 16-BIT LOAD INSTRUCTIONS (4 tests)
  // ============================================================================
  runSuite("LEVEL 3: 16-bit Load Instructions", () => {
    runTest(
      "3.1 - LD HL, nn (0x21) - Load 16-bit immediate into HL",
      () => {
        const { cpu, memory } = setupCPU();
        memory[0x0000] = 0x21; // LD HL, nn
        memory[0x0001] = 0x34; // Low byte
        memory[0x0002] = 0x12; // High byte
        cpu.executeInstruction();
        expect(cpu.HL).toBe(0x1234);
        expect(cpu.registers.PC).toBe(0x0003);
      },
      {
        assembly: "LD HL, 0x1234",
        opcode: "0x21 0x34 0x12",
      }
    );

    runTest(
      "3.2 - LD BC, nn (0x01) - Load 16-bit immediate into BC",
      () => {
        const { cpu, memory } = setupCPU();
        memory[0x0000] = 0x01; // LD BC, nn
        memory[0x0001] = 0x78; // Low byte
        memory[0x0002] = 0x56; // High byte
        cpu.executeInstruction();
        expect(cpu.BC).toBe(0x5678);
      },
      {
        assembly: "LD BC, 0x5678",
        opcode: "0x01 0x78 0x56",
      }
    );

    runTest(
      "3.3 - LD DE, nn (0x11) - Load 16-bit immediate into DE",
      () => {
        const { cpu, memory } = setupCPU();
        memory[0x0000] = 0x11; // LD DE, nn
        memory[0x0001] = 0xbc; // Low byte
        memory[0x0002] = 0x9a; // High byte
        cpu.executeInstruction();
        expect(cpu.DE).toBe(0x9abc);
      },
      {
        assembly: "LD DE, 0x9ABC",
        opcode: "0x11 0xBC 0x9A",
      }
    );

    runTest(
      "3.4 - LD SP, nn (0x31) - Load 16-bit immediate into stack pointer",
      () => {
        const { cpu, memory } = setupCPU();
        memory[0x0000] = 0x31; // LD SP, nn
        memory[0x0001] = 0x00; // Low byte
        memory[0x0002] = 0x40; // High byte
        cpu.executeInstruction();
        expect(cpu.registers.SP).toBe(0x4000);
      },
      {
        assembly: "LD SP, 0x4000",
        opcode: "0x31 0x00 0x40",
      }
    );
  });

  // ============================================================================
  // LEVEL 4: MEMORY ACCESS INSTRUCTIONS (4 tests)
  // ============================================================================
  runSuite("LEVEL 4: Memory Access Instructions", () => {
    runTest(
      "4.1 - LD (HL), n (0x36) - Store immediate value to memory via HL",
      () => {
        const { cpu, memory } = setupCPU();
        cpu.HL = 0x5000;
        memory[0x0000] = 0x36; // LD (HL), n
        memory[0x0001] = 0xaa;
        cpu.executeInstruction();
        expect(memory[0x5000]).toBe(0xaa);
      },
      {
        assembly: "LD (HL), 0xAA",
        opcode: "0x36 0xAA",
      }
    );

    runTest(
      "4.2 - LD A, (HL) (0x7E) - Load from memory via HL into accumulator",
      () => {
        const { cpu, memory } = setupCPU();
        cpu.HL = 0x5000;
        memory[0x5000] = 0x42;
        memory[0x0000] = 0x7e; // LD A, (HL)
        cpu.executeInstruction();
        expect(cpu.registers.A).toBe(0x42);
      },
      {
        assembly: "LD A, (HL)",
        opcode: "0x7E",
      }
    );

    runTest(
      "4.3 - LD (HL), B (0x70) - Store register to memory via HL",
      () => {
        const { cpu, memory } = setupCPU();
        cpu.HL = 0x5000;
        cpu.registers.B = 0x99;
        memory[0x0000] = 0x70; // LD (HL), B
        cpu.executeInstruction();
        expect(memory[0x5000]).toBe(0x99);
      },
      {
        assembly: "LD (HL), B",
        opcode: "0x70",
      }
    );

    runTest(
      "4.4 - LD A, (nn) (0x3A) - Load from absolute address into accumulator",
      () => {
        const { cpu, memory } = setupCPU();
        memory[0x5000] = 0x77;
        memory[0x0000] = 0x3a; // LD A, (nn)
        memory[0x0001] = 0x00; // Low byte of address
        memory[0x0002] = 0x50; // High byte of address
        cpu.executeInstruction();
        expect(cpu.registers.A).toBe(0x77);
      },
      {
        assembly: "LD A, (0x5000)",
        opcode: "0x3A 0x00 0x50",
      }
    );
  });

  // ============================================================================
  // LEVEL 5: ARITHMETIC OPERATIONS (6 tests)
  // ============================================================================
  runSuite("LEVEL 5: Arithmetic Operations", () => {
    runTest(
      "5.1 - ADD A, r (0x80-0x87) - Add register to accumulator",
      () => {
        const { cpu, memory } = setupCPU();
        cpu.registers.A = 0x05;
        cpu.registers.B = 0x03;
        memory[0x0000] = 0x80; // ADD A, B
        cpu.executeInstruction();
        expect(cpu.registers.A).toBe(0x08);
        expect(cpu.flagC).toBe(0);
        expect(cpu.flagZ).toBe(0);
      },
      {
        assembly: "ADD A, B",
        opcode: "0x80",
      }
    );

    runTest(
      "5.2 - ADD A, n (0xC6) - Add immediate to accumulator with carry",
      () => {
        const { cpu, memory } = setupCPU();
        cpu.registers.A = 0xff;
        memory[0x0000] = 0xc6; // ADD A, n
        memory[0x0001] = 0x01;
        cpu.executeInstruction();
        expect(cpu.registers.A).toBe(0x00);
        expect(cpu.flagC).toBe(1);
        expect(cpu.flagZ).toBe(1);
      },
      {
        assembly: "ADD A, 0x01",
        opcode: "0xC6 0x01",
      }
    );

    runTest(
      "5.3 - SUB A, r (0x90-0x97) - Subtract register from accumulator",
      () => {
        const { cpu, memory } = setupCPU();
        cpu.registers.A = 0x08;
        cpu.registers.B = 0x03;
        memory[0x0000] = 0x90; // SUB A, B
        cpu.executeInstruction();
        expect(cpu.registers.A).toBe(0x05);
        expect(cpu.flagC).toBe(0);
        expect(cpu.flagN).toBe(1);
      },
      {
        assembly: "SUB A, B",
        opcode: "0x90",
      }
    );

    runTest(
      "5.4 - INC r (0x04-0x3C) - Increment register",
      () => {
        const { cpu, memory } = setupCPU();
        cpu.registers.A = 0x41;
        memory[0x0000] = 0x3c; // INC A
        cpu.executeInstruction();
        expect(cpu.registers.A).toBe(0x42);
        expect(cpu.flagZ).toBe(0);
      },
      {
        assembly: "INC A",
        opcode: "0x3C",
      }
    );

    runTest(
      "5.5 - DEC r (0x05-0x3D) - Decrement register with wrap",
      () => {
        const { cpu, memory } = setupCPU();
        cpu.registers.A = 0x00;
        memory[0x0000] = 0x3d; // DEC A
        cpu.executeInstruction();
        expect(cpu.registers.A).toBe(0xff);
        expect(cpu.flagZ).toBe(0);
        expect(cpu.flagN).toBe(1);
      },
      {
        assembly: "DEC A",
        opcode: "0x3D",
      }
    );

    runTest(
      "5.6 - ADD HL, BC (0x09) - 16-bit addition",
      () => {
        const { cpu, memory } = setupCPU();
        cpu.HL = 0x1000;
        cpu.BC = 0x0234;
        memory[0x0000] = 0x09; // ADD HL, BC
        cpu.executeInstruction();
        expect(cpu.HL).toBe(0x1234);
      },
      {
        assembly: "ADD HL, BC",
        opcode: "0x09",
      }
    );
  });

  // ============================================================================
  // LEVEL 6: LOGICAL OPERATIONS (4 tests)
  // ============================================================================
  runSuite("LEVEL 6: Logical Operations", () => {
    runTest(
      "6.1 - AND r (0xA0-0xA7) - Logical AND with register",
      () => {
        const { cpu, memory } = setupCPU();
        cpu.registers.A = 0xff;
        cpu.registers.B = 0x0f;
        memory[0x0000] = 0xa0; // AND B
        cpu.executeInstruction();
        expect(cpu.registers.A).toBe(0x0f);
        expect(cpu.flagH).toBe(1);
      },
      {
        assembly: "AND B",
        opcode: "0xA0",
      }
    );

    runTest(
      "6.2 - OR r (0xB0-0xB7) - Logical OR with register",
      () => {
        const { cpu, memory } = setupCPU();
        cpu.registers.A = 0x0f;
        cpu.registers.B = 0xf0;
        memory[0x0000] = 0xb0; // OR B
        cpu.executeInstruction();
        expect(cpu.registers.A).toBe(0xff);
      },
      {
        assembly: "OR B",
        opcode: "0xB0",
      }
    );

    runTest(
      "6.3 - XOR r (0xA8-0xAF) - Logical XOR with register",
      () => {
        const { cpu, memory } = setupCPU();
        cpu.registers.A = 0xff;
        cpu.registers.B = 0xff;
        memory[0x0000] = 0xa8; // XOR B
        cpu.executeInstruction();
        expect(cpu.registers.A).toBe(0x00);
        expect(cpu.flagZ).toBe(1);
      },
      {
        assembly: "XOR B",
        opcode: "0xA8",
      }
    );

    runTest(
      "6.4 - CP r (0xB8-0xBF) - Compare register (subtract without storing)",
      () => {
        const { cpu, memory } = setupCPU();
        cpu.registers.A = 0x42;
        cpu.registers.B = 0x42;
        memory[0x0000] = 0xb8; // CP B
        cpu.executeInstruction();
        expect(cpu.registers.A).toBe(0x42);
        expect(cpu.flagZ).toBe(1);
      },
      {
        assembly: "CP B",
        opcode: "0xB8",
      }
    );
  });

  // ============================================================================
  // LEVEL 7: CONTROL FLOW - JUMPS (4 tests)
  // ============================================================================
  runSuite("LEVEL 7: Control Flow - Jumps", () => {
    runTest(
      "7.1 - JP nn (0xC3) - Unconditional absolute jump",
      () => {
        const { cpu, memory } = setupCPU();
        memory[0x0000] = 0xc3; // JP nn
        memory[0x0001] = 0x00; // Low byte
        memory[0x0002] = 0x50; // High byte
        cpu.executeInstruction();
        expect(cpu.registers.PC).toBe(0x5000);
      },
      {
        assembly: "JP 0x5000",
        opcode: "0xC3 0x00 0x50",
      }
    );

    runTest(
      "7.2 - JP Z, nn (0xCA) - Conditional jump if zero flag set",
      () => {
        const { cpu, memory } = setupCPU();
        cpu.flagZ = 1;
        memory[0x0000] = 0xca; // JP Z, nn
        memory[0x0001] = 0x00;
        memory[0x0002] = 0x50;
        cpu.executeInstruction();
        expect(cpu.registers.PC).toBe(0x5000);
      },
      {
        assembly: "JP Z, 0x5000",
        opcode: "0xCA 0x00 0x50",
      }
    );

    runTest(
      "7.3 - JP NZ, nn (0xC2) - Conditional jump if zero flag clear",
      () => {
        const { cpu, memory } = setupCPU();
        cpu.flagZ = 0;
        memory[0x0000] = 0xc2; // JP NZ, nn
        memory[0x0001] = 0x00;
        memory[0x0002] = 0x50;
        cpu.executeInstruction();
        expect(cpu.registers.PC).toBe(0x5000);
      },
      {
        assembly: "JP NZ, 0x5000",
        opcode: "0xC2 0x00 0x50",
      }
    );

    runTest(
      "7.4 - JR e (0x18) - Relative jump forward",
      () => {
        const { cpu, memory } = setupCPU();
        cpu.registers.PC = 0x1000;
        memory[0x1000] = 0x18; // JR e
        memory[0x1001] = 0x05; // +5 bytes
        cpu.executeInstruction();
        expect(cpu.registers.PC).toBe(0x1007);
      },
      {
        assembly: "JR +5",
        opcode: "0x18 0x05",
      }
    );
  });

  // ============================================================================
  // LEVEL 8: STACK OPERATIONS (3 tests)
  // ============================================================================
  runSuite("LEVEL 8: Stack Operations", () => {
    runTest(
      "8.1 - PUSH BC (0xC5) - Push register pair onto stack",
      () => {
        const { cpu, memory } = setupCPU();
        cpu.BC = 0x1234;
        cpu.registers.SP = 0xffff;
        memory[0x0000] = 0xc5; // PUSH BC
        cpu.executeInstruction();
        expect(cpu.registers.SP).toBe(0xfffd);
        expect(memory[0xfffd]).toBe(0x34);
        expect(memory[0xfffe]).toBe(0x12);
      },
      {
        assembly: "PUSH BC",
        opcode: "0xC5",
      }
    );

    runTest(
      "8.2 - POP BC (0xC1) - Pop register pair from stack",
      () => {
        const { cpu, memory } = setupCPU();
        cpu.registers.SP = 0xfffd;
        memory[0xfffd] = 0x34;
        memory[0xfffe] = 0x12;
        memory[0x0000] = 0xc1; // POP BC
        cpu.executeInstruction();
        expect(cpu.BC).toBe(0x1234);
        expect(cpu.registers.SP).toBe(0xffff);
      },
      {
        assembly: "POP BC",
        opcode: "0xC1",
      }
    );

    runTest(
      "8.3 - CALL nn (0xCD) - Call subroutine (push return address)",
      () => {
        const { cpu, memory } = setupCPU();
        cpu.registers.SP = 0xffff;
        cpu.registers.PC = 0x1000;
        memory[0x1000] = 0xcd; // CALL nn
        memory[0x1001] = 0x00;
        memory[0x1002] = 0x50;
        cpu.executeInstruction();
        expect(cpu.registers.PC).toBe(0x5000);
        expect(cpu.registers.SP).toBe(0xfffd);
        expect(memory[0xfffd]).toBe(0x03);
        expect(memory[0xfffe]).toBe(0x10);
      },
      {
        assembly: "CALL 0x5000",
        opcode: "0xCD 0x00 0x50",
      }
    );
  });

  // ============================================================================
  // LEVEL 9: CB PREFIX - BIT OPERATIONS (5 tests)
  // ============================================================================
  runSuite("LEVEL 9: CB Prefix - Bit Operations", () => {
    runTest(
      "9.1 - RLC r (0xCB 0x00-0x07) - Rotate left circular",
      () => {
        const { cpu, memory } = setupCPU();
        cpu.registers.B = 0x85;
        memory[0x0000] = 0xcb; // CB prefix
        memory[0x0001] = 0x00; // RLC B
        cpu.executeInstruction();
        expect(cpu.registers.B).toBe(0x0b);
        expect(cpu.flagC).toBe(1);
      },
      {
        assembly: "RLC B",
        opcode: "0xCB 0x00",
      }
    );

    runTest(
      "9.2 - RRC r (0xCB 0x08-0x0F) - Rotate right circular",
      () => {
        const { cpu, memory } = setupCPU();
        cpu.registers.C = 0x85;
        memory[0x0000] = 0xcb; // CB prefix
        memory[0x0001] = 0x09; // RRC C
        cpu.executeInstruction();
        expect(cpu.registers.C).toBe(0xc2);
        expect(cpu.flagC).toBe(1);
      },
      {
        assembly: "RRC C",
        opcode: "0xCB 0x09",
      }
    );

    runTest(
      "9.3 - SLA r (0xCB 0x20-0x27) - Shift left arithmetic",
      () => {
        const { cpu, memory } = setupCPU();
        cpu.registers.H = 0x85;
        memory[0x0000] = 0xcb; // CB prefix
        memory[0x0001] = 0x24; // SLA H
        cpu.executeInstruction();
        expect(cpu.registers.H).toBe(0x0a);
        expect(cpu.flagC).toBe(1);
      },
      {
        assembly: "SLA H",
        opcode: "0xCB 0x24",
      }
    );

    runTest(
      "9.4 - BIT b, r (0xCB 0x40-0x7F) - Test bit in register",
      () => {
        const { cpu, memory } = setupCPU();
        cpu.registers.B = 0x85;
        memory[0x0000] = 0xcb; // CB prefix
        memory[0x0001] = 0x40; // BIT 0, B
        cpu.executeInstruction();
        expect(cpu.flagZ).toBe(0);
        expect(cpu.flagH).toBe(1);
      },
      {
        assembly: "BIT 0, B",
        opcode: "0xCB 0x40",
      }
    );

    runTest(
      "9.5 - SET b, r (0xCB 0xC0-0xFF) - Set bit in register",
      () => {
        const { cpu, memory } = setupCPU();
        cpu.registers.D = 0x00;
        memory[0x0000] = 0xcb; // CB prefix
        memory[0x0001] = 0xc2; // SET 0, D
        cpu.executeInstruction();
        expect(cpu.registers.D).toBe(0x01);
      },
      {
        assembly: "SET 0, D",
        opcode: "0xCB 0xC2",
      }
    );
  });

  // ============================================================================
  // LEVEL 10: ED PREFIX - EXTENDED INSTRUCTIONS (5 tests)
  // ============================================================================
  runSuite("LEVEL 10: ED Prefix - Extended Instructions", () => {
    runTest(
      "10.1 - LDI (0xED 0xA0) - Load and increment (block transfer)",
      () => {
        const { cpu, memory } = setupCPU();
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
      },
      {
        assembly: "LDI",
        opcode: "0xED 0xA0",
      }
    );

    runTest(
      "10.2 - LDIR (0xED 0xB0) - Load, increment, repeat until BC=0",
      () => {
        const { cpu, memory } = setupCPU();
        cpu.HL = 0x4000;
        cpu.DE = 0x5000;
        cpu.BC = 0x0003;
        memory[0x4000] = 0x01;
        memory[0x4001] = 0x02;
        memory[0x4002] = 0x03;
        memory[0x0000] = 0xed; // ED prefix
        memory[0x0001] = 0xb0; // LDIR
        let cycles = 0;
        while (cpu.BC !== 0 && cycles < 10) {
          cpu.executeInstruction();
          cycles++;
        }
        expect(memory[0x5000]).toBe(0x01);
        expect(memory[0x5001]).toBe(0x02);
        expect(memory[0x5002]).toBe(0x03);
        expect(cpu.BC).toBe(0x0000);
      },
      {
        assembly: "LDIR",
        opcode: "0xED 0xB0",
      }
    );

    runTest(
      "10.3 - CPI (0xED 0xA1) - Compare and increment",
      () => {
        const { cpu, memory } = setupCPU();
        cpu.HL = 0x4000;
        cpu.BC = 0x0005;
        cpu.registers.A = 0x42;
        memory[0x4000] = 0x42;
        memory[0x0000] = 0xed; // ED prefix
        memory[0x0001] = 0xa1; // CPI
        cpu.executeInstruction();
        expect(cpu.flagZ).toBe(1);
        expect(cpu.HL).toBe(0x4001);
        expect(cpu.BC).toBe(0x0004);
      },
      {
        assembly: "CPI",
        opcode: "0xED 0xA1",
      }
    );

    runTest(
      "10.4 - NEG (0xED 0x44) - Negate accumulator (two's complement)",
      () => {
        const { cpu, memory } = setupCPU();
        cpu.registers.A = 0x42;
        memory[0x0000] = 0xed; // ED prefix
        memory[0x0001] = 0x44; // NEG
        cpu.executeInstruction();
        expect(cpu.registers.A).toBe(0xbe);
        expect(cpu.flagC).toBe(1);
        expect(cpu.flagN).toBe(1);
      },
      {
        assembly: "NEG",
        opcode: "0xED 0x44",
      }
    );

    runTest(
      "10.5 - LD BC, (nn) (0xED 0x4B) - Load 16-bit from memory",
      () => {
        const { cpu, memory } = setupCPU();
        memory[0x5000] = 0x34;
        memory[0x5001] = 0x12;
        memory[0x0000] = 0xed; // ED prefix
        memory[0x0001] = 0x4b; // LD BC, (nn)
        memory[0x0002] = 0x00;
        memory[0x0003] = 0x50;
        cpu.executeInstruction();
        expect(cpu.BC).toBe(0x1234);
      },
      {
        assembly: "LD BC, (0x5000)",
        opcode: "0xED 0x4B 0x00 0x50",
      }
    );
  });

  // ============================================================================
  // LEVEL 11: DD/FD PREFIX - INDEX REGISTERS (4 tests)
  // ============================================================================
  runSuite("LEVEL 11: DD/FD Prefix - Index Registers", () => {
    runTest(
      "11.1 - LD IX, nn (0xDD 0x21) - Load 16-bit into IX register",
      () => {
        const { cpu, memory } = setupCPU();
        memory[0x0000] = 0xdd; // DD prefix
        memory[0x0001] = 0x21; // LD IX, nn
        memory[0x0002] = 0x34;
        memory[0x0003] = 0x12;
        cpu.executeInstruction();
        expect(cpu.IX).toBe(0x1234);
      },
      {
        assembly: "LD IX, 0x1234",
        opcode: "0xDD 0x21 0x34 0x12",
      }
    );

    runTest(
      "11.2 - LD IY, nn (0xFD 0x21) - Load 16-bit into IY register",
      () => {
        const { cpu, memory } = setupCPU();
        memory[0x0000] = 0xfd; // FD prefix
        memory[0x0001] = 0x21; // LD IY, nn
        memory[0x0002] = 0x78;
        memory[0x0003] = 0x56;
        cpu.executeInstruction();
        expect(cpu.IY).toBe(0x5678);
      },
      {
        assembly: "LD IY, 0x5678",
        opcode: "0xFD 0x21 0x78 0x56",
      }
    );

    runTest(
      "11.3 - ADD IX, BC (0xDD 0x09) - Add to IX register",
      () => {
        const { cpu, memory } = setupCPU();
        cpu.IX = 0x1000;
        cpu.BC = 0x0234;
        memory[0x0000] = 0xdd; // DD prefix
        memory[0x0001] = 0x09; // ADD IX, BC
        cpu.executeInstruction();
        expect(cpu.IX).toBe(0x1234);
      },
      {
        assembly: "ADD IX, BC",
        opcode: "0xDD 0x09",
      }
    );

    runTest(
      "11.4 - DD CB d RLC (IX+d) (0xDD 0xCB d 0x06) - Rotate memory via IX",
      () => {
        const { cpu, memory } = setupCPU();
        cpu.IX = 0x5000;
        memory[0x5005] = 0x85;
        memory[0x0000] = 0xdd; // DD prefix
        memory[0x0001] = 0xcb; // CB prefix
        memory[0x0002] = 0x05; // Displacement
        memory[0x0003] = 0x06; // RLC (IX+d)
        cpu.executeInstruction();
        expect(memory[0x5005]).toBe(0x0b);
        expect(cpu.flagC).toBe(1);
      },
      {
        assembly: "RLC (IX+5)",
        opcode: "0xDD 0xCB 0x05 0x06",
      }
    );
  });

  // ============================================================================
  // LEVEL 12: SPECIAL INSTRUCTIONS (4 tests)
  // ============================================================================
  runSuite("LEVEL 12: Special Instructions", () => {
    runTest(
      "12.1 - NOP (0x00) - No operation",
      () => {
        const { cpu, memory } = setupCPU();
        cpu.registers.PC = 0x1000;
        memory[0x1000] = 0x00; // NOP
        cpu.executeInstruction();
        expect(cpu.registers.PC).toBe(0x1001);
      },
      {
        assembly: "NOP",
        opcode: "0x00",
      }
    );

    runTest(
      "12.2 - HALT (0x76) - Halt CPU execution",
      () => {
        const { cpu, memory } = setupCPU();
        memory[0x0000] = 0x76; // HALT
        cpu.executeInstruction();
        expect(cpu.halted).toBe(true);
      },
      {
        assembly: "HALT",
        opcode: "0x76",
      }
    );

    runTest(
      "12.3 - DAA (0x27) - Decimal adjust accumulator (BCD arithmetic)",
      () => {
        const { cpu, memory } = setupCPU();
        cpu.registers.A = 0x09;
        cpu.addA(0x05);
        memory[0x0000] = 0x27; // DAA
        cpu.executeInstruction();
        expect(cpu.registers.A).toBe(0x14);
      },
      {
        assembly: "DAA",
        opcode: "0x27",
      }
    );

    runTest(
      "12.4 - CPL (0x2F) - Complement accumulator (bitwise NOT)",
      () => {
        const { cpu, memory } = setupCPU();
        cpu.registers.A = 0x55;
        memory[0x0000] = 0x2f; // CPL
        cpu.executeInstruction();
        expect(cpu.registers.A).toBe(0xaa);
        expect(cpu.flagH).toBe(1);
        expect(cpu.flagN).toBe(1);
      },
      {
        assembly: "CPL",
        opcode: "0x2F",
      }
    );
  });

  // ============================================================================
  // LEVEL 13: COMPLETE PROGRAM EXECUTION (2 tests)
  // ============================================================================
  runSuite("LEVEL 13: Complete Program Execution", () => {
    runTest(
      "13.1 - Simple arithmetic program",
      () => {
        const { cpu, memory } = setupCPU();
        memory[0x0000] = 0x3e; // LD A, 0x55
        memory[0x0001] = 0x55;
        memory[0x0002] = 0x06; // LD B, 0xAA
        memory[0x0003] = 0xaa;
        memory[0x0004] = 0x80; // ADD A, B
        memory[0x0005] = 0x76; // HALT
        cpu.executeInstruction();
        cpu.executeInstruction();
        cpu.executeInstruction();
        cpu.executeInstruction();
        expect(cpu.registers.A).toBe(0xff);
        expect(cpu.registers.B).toBe(0xaa);
        expect(cpu.flagS).toBe(1);
        expect(cpu.flagH).toBe(1);
        expect(cpu.halted).toBe(true);
      },
      {
        assembly: "LD A, 0x55; LD B, 0xAA; ADD A, B; HALT",
        opcode: "0x3E 0x55, 0x06 0xAA, 0x80, 0x76",
      }
    );

    runTest(
      "13.2 - Subroutine call and return program",
      () => {
        const { cpu, memory } = setupCPU();
        cpu.registers.SP = 0xffff;
        cpu.registers.PC = 0x1000;
        memory[0x1000] = 0xcd; // CALL 0x5000
        memory[0x1001] = 0x00;
        memory[0x1002] = 0x50;
        memory[0x5000] = 0x3e; // LD A, 0x42
        memory[0x5001] = 0x42;
        memory[0x5002] = 0xc9; // RET
        cpu.executeInstruction();
        expect(cpu.registers.PC).toBe(0x5000);
        expect(cpu.registers.SP).toBe(0xfffd);
        cpu.executeInstruction();
        expect(cpu.registers.A).toBe(0x42);
        cpu.executeInstruction();
        expect(cpu.registers.PC).toBe(0x1003);
        expect(cpu.registers.SP).toBe(0xffff);
      },
      {
        assembly: "CALL 0x5000; LD A, 0x42; RET",
        opcode: "0xCD 0x00 0x50, 0x3E 0x42, 0xC9",
      }
    );
  });

  // Final summary
  logFn("═══════════════════════════════════════════════════════════", "info");
  logFn("📊 Test Execution Summary", "info");
  logFn("═══════════════════════════════════════════════════════════", "info");
  logFn(`   Total Tests Executed: ${results.total}`, "info");
  logFn(
    `   ✅ Passed: ${results.passed}`,
    results.passed === results.total ? "success" : "info"
  );
  logFn(
    `   ❌ Failed: ${results.failed}`,
    results.failed > 0 ? "error" : "success"
  );
  logFn(
    `   Success Rate: ${
      results.total > 0
        ? ((results.passed / results.total) * 100).toFixed(1)
        : 0
    }%`,
    results.passed === results.total ? "success" : "info"
  );
  logFn(`   Total Instructions Executed: ${totalInstructionsExecuted}`, "info");
  logFn("");

  if (verboseLogging) {
    logFn(
      "💡 Verbose logging enabled - showing detailed instruction execution",
      "info"
    );
    logFn(
      "💡 Note: Detailed logs shown for first 20 instructions per test",
      "info"
    );
  }

  logFn("");

  return results;
}



