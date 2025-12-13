/**
 * Browser-Compatible Test Runner for Phase 1
 * Executes all 130 Phase 1 tests and reports results
 *
 * This is a comprehensive test runner that includes all test cases
 * from tests/unit/cpu-tests.js converted to browser-compatible format
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
      0x02: "LD (BC), A",
      0x03: "INC BC",
      0x04: "INC B",
      0x05: "DEC B",
      0x06: "LD B, n",
      0x07: "RLCA",
      0x08: "EX AF, AF'",
      0x09: "ADD HL, BC",
      0x0a: "LD A, (BC)",
      0x0b: "DEC BC",
      0x0c: "INC C",
      0x0d: "DEC C",
      0x0e: "LD C, n",
      0x0f: "RRCA",
      0x10: "DJNZ e",
      0x11: "LD DE, nn",
      0x12: "LD (DE), A",
      0x13: "INC DE",
      0x14: "INC D",
      0x15: "DEC D",
      0x16: "LD D, n",
      0x17: "RLA",
      0x18: "JR e",
      0x19: "ADD HL, DE",
      0x1a: "LD A, (DE)",
      0x1b: "DEC DE",
      0x1c: "INC E",
      0x1d: "DEC E",
      0x1e: "LD E, n",
      0x1f: "RRA",
      0x20: "JR NZ, e",
      0x21: "LD HL, nn",
      0x22: "LD (nn), HL",
      0x23: "INC HL",
      0x24: "INC H",
      0x25: "DEC H",
      0x26: "LD H, n",
      0x27: "DAA",
      0x28: "JR Z, e",
      0x29: "ADD HL, HL",
      0x2a: "LD HL, (nn)",
      0x2b: "DEC HL",
      0x2c: "INC L",
      0x2d: "DEC L",
      0x2e: "LD L, n",
      0x2f: "CPL",
      0x30: "JR NC, e",
      0x31: "LD SP, nn",
      0x32: "LD (nn), A",
      0x33: "INC SP",
      0x34: "INC (HL)",
      0x35: "DEC (HL)",
      0x36: "LD (HL), n",
      0x37: "SCF",
      0x38: "JR C, e",
      0x39: "ADD HL, SP",
      0x3a: "LD A, (nn)",
      0x3b: "DEC SP",
      0x3c: "INC A",
      0x3d: "DEC A",
      0x3e: "LD A, n",
      0x3f: "CCF",
      0x40: "LD B, B",
      0x41: "LD B, C",
      0x42: "LD B, D",
      0x43: "LD B, E",
      0x44: "LD B, H",
      0x45: "LD B, L",
      0x46: "LD B, (HL)",
      0x47: "LD B, A",
      0x48: "LD C, B",
      0x49: "LD C, C",
      0x4a: "LD C, D",
      0x4b: "LD C, E",
      0x4c: "LD C, H",
      0x4d: "LD C, L",
      0x4e: "LD C, (HL)",
      0x4f: "LD C, A",
      0x50: "LD D, B",
      0x51: "LD D, C",
      0x52: "LD D, D",
      0x53: "LD D, E",
      0x54: "LD D, H",
      0x55: "LD D, L",
      0x56: "LD D, (HL)",
      0x57: "LD D, A",
      0x58: "LD E, B",
      0x59: "LD E, C",
      0x5a: "LD E, D",
      0x5b: "LD E, E",
      0x5c: "LD E, H",
      0x5d: "LD E, L",
      0x5e: "LD E, (HL)",
      0x5f: "LD E, A",
      0x60: "LD H, B",
      0x61: "LD H, C",
      0x62: "LD H, D",
      0x63: "LD H, E",
      0x64: "LD H, H",
      0x65: "LD H, L",
      0x66: "LD H, (HL)",
      0x67: "LD H, A",
      0x68: "LD L, B",
      0x69: "LD L, C",
      0x6a: "LD L, D",
      0x6b: "LD L, E",
      0x6c: "LD L, H",
      0x6d: "LD L, L",
      0x6e: "LD L, (HL)",
      0x6f: "LD L, A",
      0x70: "LD (HL), B",
      0x71: "LD (HL), C",
      0x72: "LD (HL), D",
      0x73: "LD (HL), E",
      0x74: "LD (HL), H",
      0x75: "LD (HL), L",
      0x76: "HALT",
      0x77: "LD (HL), A",
      0x78: "LD A, B",
      0x79: "LD A, C",
      0x7a: "LD A, D",
      0x7b: "LD A, E",
      0x7c: "LD A, H",
      0x7d: "LD A, L",
      0x7e: "LD A, (HL)",
      0x7f: "LD A, A",
      0x80: "ADD A, B",
      0x81: "ADD A, C",
      0x82: "ADD A, D",
      0x83: "ADD A, E",
      0x84: "ADD A, H",
      0x85: "ADD A, L",
      0x86: "ADD A, (HL)",
      0x87: "ADD A, A",
      0x88: "ADC A, B",
      0x89: "ADC A, C",
      0x8a: "ADC A, D",
      0x8b: "ADC A, E",
      0x8c: "ADC A, H",
      0x8d: "ADC A, L",
      0x8e: "ADC A, (HL)",
      0x8f: "ADC A, A",
      0x90: "SUB B",
      0x91: "SUB C",
      0x92: "SUB D",
      0x93: "SUB E",
      0x94: "SUB H",
      0x95: "SUB L",
      0x96: "SUB (HL)",
      0x97: "SUB A",
      0x98: "SBC A, B",
      0x99: "SBC A, C",
      0x9a: "SBC A, D",
      0x9b: "SBC A, E",
      0x9c: "SBC A, H",
      0x9d: "SBC A, L",
      0x9e: "SBC A, (HL)",
      0x9f: "SBC A, A",
      0xa0: "AND B",
      0xa1: "AND C",
      0xa2: "AND D",
      0xa3: "AND E",
      0xa4: "AND H",
      0xa5: "AND L",
      0xa6: "AND (HL)",
      0xa7: "AND A",
      0xa8: "XOR B",
      0xa9: "XOR C",
      0xaa: "XOR D",
      0xab: "XOR E",
      0xac: "XOR H",
      0xad: "XOR L",
      0xae: "XOR (HL)",
      0xaf: "XOR A",
      0xb0: "OR B",
      0xb1: "OR C",
      0xb2: "OR D",
      0xb3: "OR E",
      0xb4: "OR H",
      0xb5: "OR L",
      0xb6: "OR (HL)",
      0xb7: "OR A",
      0xb8: "CP B",
      0xb9: "CP C",
      0xba: "CP D",
      0xbb: "CP E",
      0xbc: "CP H",
      0xbd: "CP L",
      0xbe: "CP (HL)",
      0xbf: "CP A",
      0xc0: "RET NZ",
      0xc1: "POP BC",
      0xc2: "JP NZ, nn",
      0xc3: "JP nn",
      0xc4: "CALL NZ, nn",
      0xc5: "PUSH BC",
      0xc6: "ADD A, n",
      0xc7: "RST 0",
      0xc8: "RET Z",
      0xc9: "RET",
      0xca: "JP Z, nn",
      0xcb: "CB prefix",
      0xcc: "CALL Z, nn",
      0xcd: "CALL nn",
      0xce: "ADC A, n",
      0xcf: "RST 8",
      0xd0: "RET NC",
      0xd1: "POP DE",
      0xd2: "JP NC, nn",
      0xd3: "OUT (n), A",
      0xd4: "CALL NC, nn",
      0xd5: "PUSH DE",
      0xd6: "SUB n",
      0xd7: "RST 10",
      0xd8: "RET C",
      0xd9: "EXX",
      0xda: "JP C, nn",
      0xdb: "IN A, (n)",
      0xdc: "CALL C, nn",
      0xdd: "DD prefix",
      0xde: "SBC A, n",
      0xdf: "RST 18",
      0xe0: "RET PO",
      0xe1: "POP HL",
      0xe2: "JP PO, nn",
      0xe3: "EX (SP), HL",
      0xe4: "CALL PO, nn",
      0xe5: "PUSH HL",
      0xe6: "AND n",
      0xe7: "RST 20",
      0xe8: "RET PE",
      0xe9: "JP (HL)",
      0xea: "JP PE, nn",
      0xeb: "EX DE, HL",
      0xec: "CALL PE, nn",
      0xed: "ED prefix",
      0xee: "XOR n",
      0xef: "RST 28",
      0xf0: "RET P",
      0xf1: "POP AF",
      0xf2: "JP P, nn",
      0xf3: "DI",
      0xf4: "CALL P, nn",
      0xf5: "PUSH AF",
      0xf6: "OR n",
      0xf7: "RST 30",
      0xf8: "RET M",
      0xf9: "LD SP, HL",
      0xfa: "JP M, nn",
      0xfb: "EI",
      0xfc: "CALL M, nn",
      0xfd: "FD prefix",
      0xfe: "CP n",
      0xff: "RST 38",
    };

    if (opcode === 0xcb) {
      const cbOpcode = memory[(pc + 1) & 0xffff];
      return `CB ${hex(cbOpcode)} (CB prefix instruction)`;
    }
    if (opcode === 0xed) {
      const edOpcode = memory[(pc + 1) & 0xffff];
      return `ED ${hex(edOpcode)} (ED prefix instruction)`;
    }
    if (opcode === 0xdd) {
      const ddOpcode = memory[(pc + 1) & 0xffff];
      return `DD ${hex(ddOpcode)} (DD prefix - IX instruction)`;
    }
    if (opcode === 0xfd) {
      const fdOpcode = memory[(pc + 1) & 0xffff];
      return `FD ${hex(fdOpcode)} (FD prefix - IY instruction)`;
    }

    return mnemonics[opcode] || `Unknown (${hex(opcode)})`;
  }

  function runTest(testName, testFn) {
    results.total++;
    logFn(`  🧪 Running: ${testName}`, "info");

    try {
      const startTime = performance.now();
      testFn();
      const endTime = performance.now();
      const duration = (endTime - startTime).toFixed(2);
      results.passed++;
      logFn(`  ✅ ${testName} (${duration}ms)`, "success");
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

          // Show register changes
          const regChanges = [];
          if (
            this.registers.A !==
            (regsBefore.match(/A=0x([0-9A-F]+)/)?.[1]
              ? parseInt(regsBefore.match(/A=0x([0-9A-F]+)/)[1], 16)
              : 0)
          ) {
            regChanges.push(`A changed`);
          }
          if (
            this.HL !==
            (regsBefore.match(/PC=0x([0-9A-F]+)/)?.[1]
              ? parseInt(regsBefore.match(/HL=0x([0-9A-F]+)/)?.[1] || "0", 16)
              : 0)
          ) {
            regChanges.push(`HL changed`);
          }
          if (regChanges.length > 0 && instructionCount <= 10) {
            logFn(`        Changes: ${regChanges.join(", ")}`, "info");
          }
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

          // Show memory context around PC
          const pc = this.registers.PC;
          const memContext = [];
          for (
            let i = Math.max(0, pc - 4);
            i <= Math.min(memory.length - 1, pc + 4);
            i++
          ) {
            const marker = i === pc ? ">" : " ";
            memContext.push(`${marker}${hex(i, 4)}:${hex(memory[i])}`);
          }
          logFn(`        Memory context: ${memContext.join(" ")}`, "error");
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

  // ============================================
  // TEST SUITE 1: Initialization and Reset
  // ============================================
  runSuite("Z80CPU - Initialization and Reset", () => {
    runTest("should initialize with correct default values", () => {
      const cpu = new Z80CPU();
      expect(cpu.registers.PC).toBe(0x0000);
      expect(cpu.registers.SP).toBe(0xffff);
      expect(cpu.halted).toBe(false);
      expect(cpu.IFF1).toBe(false);
      expect(cpu.IFF2).toBe(false);
      expect(cpu.interruptMode).toBe(0);
    });

    runTest("should reset CPU to initial state", () => {
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

  // ============================================
  // TEST SUITE 2: Register Operations
  // ============================================
  runSuite("Z80CPU - Register Operations", () => {
    runTest("should read and write A register", () => {
      const cpu = new Z80CPU();
      cpu.registers.A = 0x42;
      expect(cpu.registers.A).toBe(0x42);
    });

    runTest("should read and write B register", () => {
      const cpu = new Z80CPU();
      cpu.registers.B = 0x55;
      expect(cpu.registers.B).toBe(0x55);
    });

    runTest("should handle register overflow (wraps to 8 bits)", () => {
      const cpu = new Z80CPU();
      cpu.registers.A = 0x1ff;
      expect(cpu.registers.A).toBe(0xff);
    });

    runTest("should handle BC register pair", () => {
      const cpu = new Z80CPU();
      cpu.BC = 0x1234;
      expect(cpu.registers.B).toBe(0x12);
      expect(cpu.registers.C).toBe(0x34);
      expect(cpu.BC).toBe(0x1234);
    });

    runTest("should handle DE register pair", () => {
      const cpu = new Z80CPU();
      cpu.DE = 0x5678;
      expect(cpu.registers.D).toBe(0x56);
      expect(cpu.registers.E).toBe(0x78);
      expect(cpu.DE).toBe(0x5678);
    });

    runTest("should handle HL register pair", () => {
      const cpu = new Z80CPU();
      cpu.HL = 0xabcd;
      expect(cpu.registers.H).toBe(0xab);
      expect(cpu.registers.L).toBe(0xcd);
      expect(cpu.HL).toBe(0xabcd);
    });

    runTest("should handle IX register pair", () => {
      const cpu = new Z80CPU();
      cpu.IX = 0x1122;
      expect(cpu.registers.IXH).toBe(0x11);
      expect(cpu.registers.IXL).toBe(0x22);
      expect(cpu.IX).toBe(0x1122);
    });

    runTest("should handle IY register pair", () => {
      const cpu = new Z80CPU();
      cpu.IY = 0x3344;
      expect(cpu.registers.IYH).toBe(0x33);
      expect(cpu.registers.IYL).toBe(0x44);
      expect(cpu.IY).toBe(0x3344);
    });
  });

  // ============================================
  // TEST SUITE 3: Flag Operations
  // ============================================
  runSuite("Z80CPU - Flag Operations", () => {
    runTest("should set and clear Carry flag (C)", () => {
      const cpu = new Z80CPU();
      cpu.flagC = 1;
      expect(cpu.flagC).toBe(1);
      cpu.flagC = 0;
      expect(cpu.flagC).toBe(0);
    });

    runTest("should set and clear Zero flag (Z)", () => {
      const cpu = new Z80CPU();
      cpu.flagZ = 1;
      expect(cpu.flagZ).toBe(1);
      cpu.flagZ = 0;
      expect(cpu.flagZ).toBe(0);
    });

    runTest("should set and clear Sign flag (S)", () => {
      const cpu = new Z80CPU();
      cpu.flagS = 1;
      expect(cpu.flagS).toBe(1);
      cpu.flagS = 0;
      expect(cpu.flagS).toBe(0);
    });

    runTest("should set and clear Half-carry flag (H)", () => {
      const cpu = new Z80CPU();
      cpu.flagH = 1;
      expect(cpu.flagH).toBe(1);
      cpu.flagH = 0;
      expect(cpu.flagH).toBe(0);
    });

    runTest("should set and clear Parity/Overflow flag (PV)", () => {
      const cpu = new Z80CPU();
      cpu.flagPV = 1;
      expect(cpu.flagPV).toBe(1);
      cpu.flagPV = 0;
      expect(cpu.flagPV).toBe(0);
    });

    runTest("should set and clear Add/Subtract flag (N)", () => {
      const cpu = new Z80CPU();
      cpu.flagN = 1;
      expect(cpu.flagN).toBe(1);
      cpu.flagN = 0;
      expect(cpu.flagN).toBe(0);
    });

    runTest("should handle multiple flag operations", () => {
      const cpu = new Z80CPU();
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

  // ============================================
  // TEST SUITE 4: Arithmetic Operations
  // ============================================
  runSuite("Z80CPU - Arithmetic Operations", () => {
    runTest("should add without carry", () => {
      const cpu = new Z80CPU();
      cpu.registers.A = 0x05;
      cpu.addA(0x03);
      expect(cpu.registers.A).toBe(0x08);
      expect(cpu.flagC).toBe(0);
    });

    runTest("should set carry flag on overflow", () => {
      const cpu = new Z80CPU();
      cpu.registers.A = 0xff;
      cpu.addA(0x01);
      expect(cpu.registers.A).toBe(0x00);
      expect(cpu.flagC).toBe(1);
      expect(cpu.flagZ).toBe(1);
    });

    runTest("should set zero flag when result is zero", () => {
      const cpu = new Z80CPU();
      cpu.registers.A = 0x00;
      cpu.addA(0x00);
      expect(cpu.flagZ).toBe(1);
    });

    runTest("should set sign flag when bit 7 is set", () => {
      const cpu = new Z80CPU();
      cpu.registers.A = 0x80;
      cpu.addA(0x01);
      expect(cpu.registers.A).toBe(0x81);
      expect(cpu.flagS).toBe(1);
    });

    runTest("should set half-carry flag", () => {
      const cpu = new Z80CPU();
      cpu.registers.A = 0x0f;
      cpu.addA(0x01);
      expect(cpu.flagH).toBe(1);
    });

    runTest("should set overflow flag on signed overflow", () => {
      const cpu = new Z80CPU();
      cpu.registers.A = 0x7f;
      cpu.addA(0x01);
      expect(cpu.registers.A).toBe(0x80);
      expect(cpu.flagPV).toBe(1);
    });

    runTest("should subtract without borrow", () => {
      const cpu = new Z80CPU();
      cpu.registers.A = 0x08;
      cpu.subA(0x03);
      expect(cpu.registers.A).toBe(0x05);
      expect(cpu.flagC).toBe(0);
    });

    runTest("should set carry flag on underflow", () => {
      const cpu = new Z80CPU();
      cpu.registers.A = 0x00;
      cpu.subA(0x01);
      expect(cpu.registers.A).toBe(0xff);
      expect(cpu.flagC).toBe(1);
    });

    runTest("should set N flag for subtraction", () => {
      const cpu = new Z80CPU();
      cpu.registers.A = 0x05;
      cpu.subA(0x03);
      expect(cpu.flagN).toBe(1);
    });

    runTest("should handle compare mode (CP)", () => {
      const cpu = new Z80CPU();
      cpu.registers.A = 0x42;
      cpu.subA(0x42, true);
      expect(cpu.registers.A).toBe(0x42);
      expect(cpu.flagZ).toBe(1);
    });

    runTest("should increment register", () => {
      const cpu = new Z80CPU();
      cpu.registers.A = 0x41;
      cpu.incReg("A");
      expect(cpu.registers.A).toBe(0x42);
    });

    runTest("should wrap on overflow", () => {
      const cpu = new Z80CPU();
      cpu.registers.A = 0xff;
      cpu.incReg("A");
      expect(cpu.registers.A).toBe(0x00);
      expect(cpu.flagZ).toBe(1);
    });

    runTest("should set half-carry flag on increment", () => {
      const cpu = new Z80CPU();
      cpu.registers.A = 0x0f;
      cpu.incReg("A");
      expect(cpu.flagH).toBe(1);
    });

    runTest("should set overflow flag when incrementing 0x7F", () => {
      const cpu = new Z80CPU();
      cpu.registers.A = 0x7f;
      cpu.incReg("A");
      expect(cpu.flagPV).toBe(1);
    });

    runTest("should not affect carry flag on increment", () => {
      const cpu = new Z80CPU();
      cpu.flagC = 1;
      cpu.registers.A = 0xff;
      cpu.incReg("A");
      expect(cpu.flagC).toBe(1);
    });

    runTest("should decrement register", () => {
      const cpu = new Z80CPU();
      cpu.registers.A = 0x42;
      cpu.decReg("A");
      expect(cpu.registers.A).toBe(0x41);
    });

    runTest("should wrap on underflow", () => {
      const cpu = new Z80CPU();
      cpu.registers.A = 0x00;
      cpu.decReg("A");
      expect(cpu.registers.A).toBe(0xff);
    });

    runTest("should set N flag for decrement", () => {
      const cpu = new Z80CPU();
      cpu.registers.A = 0x42;
      cpu.decReg("A");
      expect(cpu.flagN).toBe(1);
    });
  });

  // ============================================
  // TEST SUITE 5: Load Instructions
  // ============================================
  runSuite("Z80CPU - Load Instructions", () => {
    runTest("should execute LD A, n", () => {
      const { cpu, memory, logMemoryRange } = setupCPU();
      if (verboseLogging) {
        logFn(`        📝 Test Setup: Preparing instruction at 0x0000`, "info");
      }
      memory[0x0000] = 0x3e; // LD A, n
      memory[0x0001] = 0x42; // Immediate value
      if (verboseLogging) {
        logMemoryRange(0x0000, 0x0001, "instruction bytes");
        logFn(`        📝 Instruction: LD A, 0x42`, "info");
      }
      cpu.executeInstruction();
      expect(cpu.registers.A).toBe(0x42);
      expect(cpu.registers.PC).toBe(0x0002);
    });

    runTest("should execute LD B, n", () => {
      const { cpu, memory, logMemoryRange } = setupCPU();
      if (verboseLogging) {
        logFn(`        📝 Test Setup: Preparing LD B, n instruction`, "info");
      }
      memory[0x0000] = 0x06; // LD B, n
      memory[0x0001] = 0x55; // Immediate value
      if (verboseLogging) {
        logMemoryRange(0x0000, 0x0001, "instruction bytes");
      }
      cpu.executeInstruction();
      expect(cpu.registers.B).toBe(0x55);
    });

    runTest("should execute LD HL, nn", () => {
      const { cpu, memory, logMemoryRange } = setupCPU();
      if (verboseLogging) {
        logFn(`        📝 Test Setup: Preparing LD HL, nn instruction`, "info");
      }
      memory[0x0000] = 0x21; // LD HL, nn
      memory[0x0001] = 0x34; // Low byte
      memory[0x0002] = 0x12; // High byte
      if (verboseLogging) {
        logMemoryRange(0x0000, 0x0002, "instruction bytes (LD HL, 0x1234)");
        logFn(`        📝 Expected: HL = 0x1234, PC = 0x0003`, "info");
      }
      cpu.executeInstruction();
      expect(cpu.HL).toBe(0x1234);
      expect(cpu.registers.PC).toBe(0x0003);
    });

    runTest("should execute LD (HL), n", () => {
      const { cpu, memory, logMemoryRange } = setupCPU();
      if (verboseLogging) {
        logFn(`        📝 Test Setup: Setting HL = 0x5000`, "info");
      }
      cpu.HL = 0x5000;
      memory[0x0000] = 0x36; // LD (HL), n
      memory[0x0001] = 0xaa; // Immediate value
      if (verboseLogging) {
        logMemoryRange(0x0000, 0x0001, "instruction bytes");
        logFn(`        📝 Instruction: LD (HL), 0xAA where HL=0x5000`, "info");
        logFn(`        📝 Expected: MEM[0x5000] = 0xAA`, "info");
      }
      cpu.executeInstruction();
      expect(memory[0x5000]).toBe(0xaa);
      if (verboseLogging) {
        logFn(
          `        ✓ Verified: MEM[0x5000] = ${hex(memory[0x5000])}`,
          "success"
        );
      }
    });

    runTest("should execute LD A, (HL)", () => {
      const { cpu, memory, logMemoryRange } = setupCPU();
      if (verboseLogging) {
        logFn(
          `        📝 Test Setup: Setting HL = 0x5000, MEM[0x5000] = 0x42`,
          "info"
        );
      }
      cpu.HL = 0x5000;
      memory[0x5000] = 0x42;
      memory[0x0000] = 0x7e; // LD A, (HL)
      if (verboseLogging) {
        logMemoryRange(0x0000, 0x0000, "instruction byte");
        logMemoryRange(0x5000, 0x5000, "source data");
        logFn(
          `        📝 Instruction: LD A, (HL) where HL=0x5000, MEM[0x5000]=0x42`,
          "info"
        );
        logFn(`        📝 Expected: A = 0x42`, "info");
      }
      cpu.executeInstruction();
      expect(cpu.registers.A).toBe(0x42);
      if (verboseLogging) {
        logFn(`        ✓ Verified: A = ${hex(cpu.registers.A)}`, "success");
      }
    });
  });

  // ============================================
  // TEST SUITE 6: Control Flow
  // ============================================
  runSuite("Z80CPU - Control Flow", () => {
    runTest("should execute JP nn (unconditional jump)", () => {
      const { cpu, memory } = setupCPU();
      memory[0x0000] = 0xc3;
      memory[0x0001] = 0x00;
      memory[0x0002] = 0x50;
      cpu.executeInstruction();
      expect(cpu.registers.PC).toBe(0x5000);
    });

    runTest("should execute JP Z, nn when zero flag is set", () => {
      const { cpu, memory } = setupCPU();
      cpu.flagZ = 1;
      memory[0x0000] = 0xca;
      memory[0x0001] = 0x00;
      memory[0x0002] = 0x50;
      cpu.executeInstruction();
      expect(cpu.registers.PC).toBe(0x5000);
    });

    runTest("should not jump JP Z, nn when zero flag is clear", () => {
      const { cpu, memory } = setupCPU();
      cpu.flagZ = 0;
      memory[0x0000] = 0xca;
      memory[0x0001] = 0x00;
      memory[0x0002] = 0x50;
      cpu.executeInstruction();
      expect(cpu.registers.PC).toBe(0x0003);
    });

    runTest("should execute CALL nn", () => {
      const { cpu, memory } = setupCPU();
      cpu.registers.SP = 0xffff;
      cpu.registers.PC = 0x1000;
      memory[0x1000] = 0xcd;
      memory[0x1001] = 0x00;
      memory[0x1002] = 0x50;
      cpu.executeInstruction();
      expect(cpu.registers.PC).toBe(0x5000);
      expect(cpu.registers.SP).toBe(0xfffd);
      expect(memory[0xfffd]).toBe(0x03);
      expect(memory[0xfffe]).toBe(0x10);
    });

    runTest("should execute RET", () => {
      const { cpu, memory } = setupCPU();
      cpu.registers.SP = 0xfffd;
      memory[0xfffd] = 0x34;
      memory[0xfffe] = 0x12;
      memory[0x0000] = 0xc9;
      cpu.executeInstruction();
      expect(cpu.registers.PC).toBe(0x1234);
      expect(cpu.registers.SP).toBe(0xffff);
    });
  });

  // ============================================
  // TEST SUITE 7: Stack Operations
  // ============================================
  runSuite("Z80CPU - Stack Operations", () => {
    runTest("should execute PUSH BC", () => {
      const { cpu, memory } = setupCPU();
      cpu.BC = 0x1234;
      cpu.registers.SP = 0xffff;
      memory[0x0000] = 0xc5;
      cpu.executeInstruction();
      expect(cpu.registers.SP).toBe(0xfffd);
      expect(memory[0xfffd]).toBe(0x34);
      expect(memory[0xfffe]).toBe(0x12);
    });

    runTest("should execute POP BC", () => {
      const { cpu, memory } = setupCPU();
      cpu.registers.SP = 0xfffd;
      memory[0xfffd] = 0x34;
      memory[0xfffe] = 0x12;
      memory[0x0000] = 0xc1;
      cpu.executeInstruction();
      expect(cpu.BC).toBe(0x1234);
      expect(cpu.registers.SP).toBe(0xffff);
    });
  });

  // ============================================
  // TEST SUITE 8: I/O Operations
  // ============================================
  runSuite("Z80CPU - I/O Operations", () => {
    runTest("should execute OUT (n), A", () => {
      const { cpu, memory, ports } = setupCPU();
      cpu.registers.A = 0x42;
      memory[0x0000] = 0xd3;
      memory[0x0001] = 0xff;
      cpu.executeInstruction();
      expect(ports[0xff]).toBe(0x42);
    });

    runTest("should execute IN A, (n)", () => {
      const { cpu, memory, ports } = setupCPU();
      ports[0xff] = 0x55;
      memory[0x0000] = 0xdb;
      memory[0x0001] = 0xff;
      cpu.executeInstruction();
      expect(cpu.registers.A).toBe(0x55);
    });
  });

  // ============================================
  // TEST SUITE 9: Special Instructions
  // ============================================
  runSuite("Z80CPU - Special Instructions", () => {
    runTest("should execute NOP", () => {
      const { cpu, memory } = setupCPU();
      cpu.registers.PC = 0x1000;
      memory[0x1000] = 0x00;
      cpu.executeInstruction();
      expect(cpu.registers.PC).toBe(0x1001);
    });

    runTest("should execute HALT", () => {
      const { cpu, memory } = setupCPU();
      memory[0x0000] = 0x76;
      cpu.executeInstruction();
      expect(cpu.halted).toBe(true);
    });

    runTest("should not execute instructions when halted", () => {
      const { cpu, memory } = setupCPU();
      cpu.halted = true;
      cpu.registers.PC = 0x1000;
      const cycles = cpu.executeInstruction();
      expect(cpu.registers.PC).toBe(0x1000);
      expect(cycles).toBe(4);
    });
  });

  // ============================================
  // TEST SUITE 10: Test Program 1.1
  // ============================================
  runSuite("Z80CPU - Test Program 1.1", () => {
    runTest("should execute complete test program", () => {
      const { cpu, memory } = setupCPU();
      memory[0x0000] = 0x3e;
      memory[0x0001] = 0x55;
      memory[0x0002] = 0x06;
      memory[0x0003] = 0xaa;
      memory[0x0004] = 0x80;
      memory[0x0005] = 0x76;
      cpu.executeInstruction();
      cpu.executeInstruction();
      cpu.executeInstruction();
      cpu.executeInstruction();
      expect(cpu.registers.A).toBe(0xff);
      expect(cpu.registers.B).toBe(0xaa);
      expect(cpu.flagS).toBe(1);
      expect(cpu.flagZ).toBe(0);
      expect(cpu.flagH).toBe(1);
      expect(cpu.halted).toBe(true);
    });
  });

  // ============================================
  // TEST SUITE 11: Cycle Counting
  // ============================================
  runSuite("Z80CPU - Cycle Counting", () => {
    runTest("should count cycles for LD A, n (7 cycles)", () => {
      const { cpu, memory } = setupCPU();
      memory[0x0000] = 0x3e;
      memory[0x0001] = 0x42;
      const cycles = cpu.executeInstruction();
      expect(cycles).toBe(7);
    });

    runTest("should count cycles for ADD A, r (4 cycles)", () => {
      const { cpu, memory } = setupCPU();
      cpu.registers.B = 0x10;
      memory[0x0000] = 0x80;
      const cycles = cpu.executeInstruction();
      expect(cycles).toBe(4);
    });

    runTest("should accumulate total cycles", () => {
      const { cpu, memory } = setupCPU();
      cpu.cycles = 0;
      memory[0x0000] = 0x3e;
      memory[0x0001] = 0x42;
      memory[0x0002] = 0x00;
      cpu.executeInstruction();
      cpu.executeInstruction();
      expect(cpu.cycles).toBe(11);
    });
  });

  // ============================================
  // TEST SUITE: Block Transfer Operations (previously skipped)
  // ============================================
  runSuite("Z80CPU - Advanced ED Prefix - Block Transfer Operations", () => {
    runTest("should execute LDI (load and increment)", () => {
      const { cpu, memory, logMemoryRange } = setupCPU();
      if (verboseLogging) {
        logFn(`        📝 Test Setup: Block transfer test (LDI)`, "info");
        logFn(
          `        📝 Setting: HL=0x4000 (source), DE=0x5000 (dest), BC=0x0005 (count)`,
          "info"
        );
      }
      cpu.HL = 0x4000;
      cpu.DE = 0x5000;
      cpu.BC = 0x0005;
      memory[0x4000] = 0x42; // Source data
      memory[0x0000] = 0xed; // ED prefix
      memory[0x0001] = 0xa0; // LDI
      if (verboseLogging) {
        logMemoryRange(0x0000, 0x0001, "instruction bytes (ED A0 = LDI)");
        logMemoryRange(0x4000, 0x4000, "source data");
        logFn(
          `        📝 Expected: MEM[0x5000]=0x42, HL=0x4001, DE=0x5001, BC=0x0004, PV=1`,
          "info"
        );
      }
      cpu.executeInstruction();
      expect(memory[0x5000]).toBe(0x42);
      expect(cpu.HL).toBe(0x4001);
      expect(cpu.DE).toBe(0x5001);
      expect(cpu.BC).toBe(0x0004);
      expect(cpu.flagPV).toBe(1);
      if (verboseLogging) {
        logFn(`        ✓ Verified: Block transfer successful`, "success");
        logFn(
          `        ✓ MEM[0x5000]=${hex(memory[0x5000])}, HL=${hex(
            cpu.HL,
            4
          )}, DE=${hex(cpu.DE, 4)}, BC=${hex(cpu.BC, 4)}`,
          "success"
        );
      }
    });

    runTest("should execute LDIR (load, increment, repeat)", () => {
      const { cpu, memory, logMemoryRange } = setupCPU();
      if (verboseLogging) {
        logFn(
          `        📝 Test Setup: Block transfer with repeat (LDIR)`,
          "info"
        );
        logFn(
          `        📝 Setting: HL=0x4000, DE=0x5000, BC=0x0003 (copy 3 bytes)`,
          "info"
        );
      }
      cpu.HL = 0x4000;
      cpu.DE = 0x5000;
      cpu.BC = 0x0003;
      memory[0x4000] = 0x01;
      memory[0x4001] = 0x02;
      memory[0x4002] = 0x03;
      memory[0x0000] = 0xed; // ED prefix
      memory[0x0001] = 0xb0; // LDIR
      if (verboseLogging) {
        logMemoryRange(0x0000, 0x0001, "instruction bytes (ED B0 = LDIR)");
        logMemoryRange(0x4000, 0x4002, "source data [0x01, 0x02, 0x03]");
        logFn(
          `        📝 Expected: Copy 3 bytes from 0x4000-0x4002 to 0x5000-0x5002`,
          "info"
        );
        logFn(`        📝 Will execute LDIR until BC=0 (3 iterations)`, "info");
      }
      let cycles = 0;
      while (cpu.BC !== 0 && cycles < 100) {
        cpu.executeInstruction();
        cycles++;
        if (verboseLogging && cycles <= 3) {
          logFn(
            `        🔄 LDIR iteration ${cycles}: BC=${hex(
              cpu.BC,
              4
            )}, HL=${hex(cpu.HL, 4)}, DE=${hex(cpu.DE, 4)}`,
            "info"
          );
        }
      }
      expect(memory[0x5000]).toBe(0x01);
      expect(memory[0x5001]).toBe(0x02);
      expect(memory[0x5002]).toBe(0x03);
      expect(cpu.BC).toBe(0x0000);
      expect(cpu.flagPV).toBe(0);
      if (verboseLogging) {
        logFn(
          `        ✓ Verified: Block transfer complete after ${cycles} iterations`,
          "success"
        );
        logMemoryRange(0x5000, 0x5002, "destination data (copied)");
        logFn(
          `        ✓ BC=${hex(cpu.BC, 4)} (transfer complete), PV=${
            cpu.flagPV
          }`,
          "success"
        );
      }
    });

    runTest("should execute LDD (load and decrement)", () => {
      const { cpu, memory } = setupCPU();
      cpu.HL = 0x4002;
      cpu.DE = 0x5002;
      cpu.BC = 0x0003;
      memory[0x4002] = 0x42;
      memory[0x0000] = 0xed;
      memory[0x0001] = 0xa8;
      cpu.executeInstruction();
      expect(memory[0x5002]).toBe(0x42);
      expect(cpu.HL).toBe(0x4001);
      expect(cpu.DE).toBe(0x5001);
      expect(cpu.BC).toBe(0x0002);
    });

    runTest("should execute CPI (compare and increment)", () => {
      const { cpu, memory } = setupCPU();
      cpu.HL = 0x4000;
      cpu.BC = 0x0005;
      cpu.registers.A = 0x42;
      memory[0x4000] = 0x42;
      memory[0x0000] = 0xed;
      memory[0x0001] = 0xa1;
      cpu.executeInstruction();
      expect(cpu.flagZ).toBe(1);
      expect(cpu.HL).toBe(0x4001);
      expect(cpu.BC).toBe(0x0004);
      expect(cpu.flagPV).toBe(1);
    });

    runTest("should execute CPIR (compare, increment, repeat)", () => {
      const { cpu, memory } = setupCPU();
      cpu.HL = 0x4000;
      cpu.BC = 0x0005;
      cpu.registers.A = 0x42;
      memory[0x4000] = 0x01;
      memory[0x4001] = 0x02;
      memory[0x4002] = 0x42;
      memory[0x4003] = 0x04;
      memory[0x0000] = 0xed;
      memory[0x0001] = 0xb1;
      let cycles = 0;
      while (cpu.BC !== 0 && !cpu.flagZ && cycles < 100) {
        cpu.executeInstruction();
        cycles++;
      }
      expect(cpu.flagZ).toBe(1);
      expect(cpu.HL).toBe(0x4003);
      expect(cpu.BC).toBe(0x0002);
    });
  });

  // ============================================
  // TEST SUITE: Extended Load Instructions
  // ============================================
  runSuite("Z80CPU - Advanced ED Prefix - Extended Load Instructions", () => {
    runTest("should execute LD I, A", () => {
      const { cpu, memory } = setupCPU();
      cpu.registers.A = 0x42;
      memory[0x0000] = 0xed;
      memory[0x0001] = 0x47;
      cpu.executeInstruction();
      expect(cpu.registers.I).toBe(0x42);
    });

    runTest("should execute LD A, I", () => {
      const { cpu, memory } = setupCPU();
      cpu.registers.I = 0x55;
      cpu.IFF2 = true;
      memory[0x0000] = 0xed;
      memory[0x0001] = 0x57;
      cpu.executeInstruction();
      expect(cpu.registers.A).toBe(0x55);
      expect(cpu.flagPV).toBe(1);
    });

    runTest("should execute LD BC, (nn)", () => {
      const { cpu, memory } = setupCPU();
      memory[0x5000] = 0x34;
      memory[0x5001] = 0x12;
      memory[0x0000] = 0xed;
      memory[0x0001] = 0x4b;
      memory[0x0002] = 0x00;
      memory[0x0003] = 0x50;
      cpu.executeInstruction();
      expect(cpu.BC).toBe(0x1234);
    });

    runTest("should execute LD (nn), BC", () => {
      const { cpu, memory } = setupCPU();
      cpu.BC = 0x5678;
      memory[0x0000] = 0xed;
      memory[0x0001] = 0x43;
      memory[0x0002] = 0x00;
      memory[0x0003] = 0x50;
      cpu.executeInstruction();
      expect(memory[0x5000]).toBe(0x78);
      expect(memory[0x5001]).toBe(0x56);
    });
  });

  // ============================================
  // TEST SUITE: Extended Arithmetic
  // ============================================
  runSuite("Z80CPU - Advanced ED Prefix - Extended Arithmetic", () => {
    runTest("should execute ADC HL, BC", () => {
      const { cpu, memory } = setupCPU();
      cpu.HL = 0x1234;
      cpu.BC = 0x5678;
      cpu.flagC = 1;
      memory[0x0000] = 0xed;
      memory[0x0001] = 0x4a;
      cpu.executeInstruction();
      expect(cpu.HL).toBe(0x68ad);
      expect(cpu.flagC).toBe(0);
    });

    runTest("should execute SBC HL, DE", () => {
      const { cpu, memory } = setupCPU();
      cpu.HL = 0x5678;
      cpu.DE = 0x1234;
      cpu.flagC = 0;
      memory[0x0000] = 0xed;
      memory[0x0001] = 0x52;
      cpu.executeInstruction();
      expect(cpu.HL).toBe(0x4444);
      expect(cpu.flagC).toBe(0);
      expect(cpu.flagN).toBe(1);
    });

    runTest("should execute NEG (negate accumulator)", () => {
      const { cpu, memory } = setupCPU();
      cpu.registers.A = 0x42;
      memory[0x0000] = 0xed;
      memory[0x0001] = 0x44;
      cpu.executeInstruction();
      expect(cpu.registers.A).toBe(0xbe);
      expect(cpu.flagC).toBe(1);
      expect(cpu.flagN).toBe(1);
    });
  });

  // ============================================
  // TEST SUITE: Extended I/O Operations
  // ============================================
  runSuite("Z80CPU - Advanced ED Prefix - Extended I/O Operations", () => {
    runTest("should execute IN r, (C)", () => {
      const { cpu, memory, ports } = setupCPU();
      cpu.BC = 0x00ff;
      ports[0xff] = 0x55;
      memory[0x0000] = 0xed;
      memory[0x0001] = 0x40;
      cpu.executeInstruction();
      expect(cpu.registers.B).toBe(0x55);
      expect(cpu.flagZ).toBe(0);
    });

    runTest("should execute OUT (C), r", () => {
      const { cpu, memory, ports } = setupCPU();
      cpu.BC = 0x00ff;
      cpu.registers.B = 0x42;
      memory[0x0000] = 0xed;
      memory[0x0001] = 0x41;
      cpu.executeInstruction();
      expect(ports[0xff]).toBe(0x42);
    });

    runTest("should execute INI (input and increment)", () => {
      const { cpu, memory, ports } = setupCPU();
      cpu.BC = 0x02ff;
      cpu.HL = 0x5000;
      ports[0xff] = 0x55;
      memory[0x0000] = 0xed;
      memory[0x0001] = 0xa2;
      cpu.executeInstruction();
      expect(memory[0x5000]).toBe(0x55);
      expect(cpu.HL).toBe(0x5001);
      expect(cpu.registers.B).toBe(0x01);
      expect(cpu.flagZ).toBe(0);
    });

    runTest("should execute OUTI (output and increment)", () => {
      const { cpu, memory, ports } = setupCPU();
      cpu.BC = 0x02ff;
      cpu.HL = 0x5000;
      memory[0x5000] = 0x42;
      memory[0x0000] = 0xed;
      memory[0x0001] = 0xa3;
      cpu.executeInstruction();
      expect(ports[0xff]).toBe(0x42);
      expect(cpu.HL).toBe(0x5001);
      expect(cpu.registers.B).toBe(0x01);
    });
  });

  // ============================================
  // TEST SUITE: Interrupt Handling
  // ============================================
  runSuite("Z80CPU - Advanced ED Prefix - Interrupt Handling", () => {
    runTest("should execute RETI (return from interrupt)", () => {
      const { cpu, memory } = setupCPU();
      cpu.IFF1 = false;
      cpu.IFF2 = true;
      cpu.registers.SP = 0xfffd;
      memory[0xfffd] = 0x34;
      memory[0xfffe] = 0x12;
      memory[0x0000] = 0xed;
      memory[0x0001] = 0x4d;
      cpu.executeInstruction();
      expect(cpu.registers.PC).toBe(0x1234);
      expect(cpu.IFF1).toBe(true);
    });

    runTest("should execute RETN (return from NMI)", () => {
      const { cpu, memory } = setupCPU();
      cpu.IFF1 = false;
      cpu.IFF2 = true;
      cpu.registers.SP = 0xfffd;
      memory[0xfffd] = 0x56;
      memory[0xfffe] = 0x78;
      memory[0x0000] = 0xed;
      memory[0x0001] = 0x45;
      cpu.executeInstruction();
      expect(cpu.registers.PC).toBe(0x7856);
      expect(cpu.IFF1).toBe(true);
    });

    runTest("should execute IM 0 (interrupt mode 0)", () => {
      const { cpu, memory } = setupCPU();
      memory[0x0000] = 0xed;
      memory[0x0001] = 0x46;
      cpu.executeInstruction();
      expect(cpu.interruptMode).toBe(0);
    });

    runTest("should execute IM 1 (interrupt mode 1)", () => {
      const { cpu, memory } = setupCPU();
      memory[0x0000] = 0xed;
      memory[0x0001] = 0x56;
      cpu.executeInstruction();
      expect(cpu.interruptMode).toBe(1);
    });

    runTest("should execute IM 2 (interrupt mode 2)", () => {
      const { cpu, memory } = setupCPU();
      memory[0x0000] = 0xed;
      memory[0x0001] = 0x5e;
      cpu.executeInstruction();
      expect(cpu.interruptMode).toBe(2);
    });
  });

  // ============================================
  // TEST SUITE: CB Prefix - Rotate and Shift
  // ============================================
  runSuite("Z80CPU - Advanced CB Prefix - Rotate and Shift Operations", () => {
    runTest("should execute RLC r (rotate left circular)", () => {
      const { cpu, memory } = setupCPU();
      cpu.registers.B = 0x85;
      memory[0x0000] = 0xcb;
      memory[0x0001] = 0x00;
      cpu.executeInstruction();
      expect(cpu.registers.B).toBe(0x0b);
      expect(cpu.flagC).toBe(1);
      expect(cpu.flagZ).toBe(0);
    });

    runTest("should execute RRC r (rotate right circular)", () => {
      const { cpu, memory } = setupCPU();
      cpu.registers.C = 0x85;
      memory[0x0000] = 0xcb;
      memory[0x0001] = 0x09;
      cpu.executeInstruction();
      expect(cpu.registers.C).toBe(0xc2);
      expect(cpu.flagC).toBe(1);
    });

    runTest("should execute RL r (rotate left through carry)", () => {
      const { cpu, memory } = setupCPU();
      cpu.registers.D = 0x80;
      cpu.flagC = 0;
      memory[0x0000] = 0xcb;
      memory[0x0001] = 0x12;
      cpu.executeInstruction();
      expect(cpu.registers.D).toBe(0x00);
      expect(cpu.flagC).toBe(1);
      expect(cpu.flagZ).toBe(1);
    });

    runTest("should execute RR r (rotate right through carry)", () => {
      const { cpu, memory } = setupCPU();
      cpu.registers.E = 0x01;
      cpu.flagC = 1;
      memory[0x0000] = 0xcb;
      memory[0x0001] = 0x1b;
      cpu.executeInstruction();
      expect(cpu.registers.E).toBe(0x80);
      expect(cpu.flagC).toBe(1);
    });

    runTest("should execute SLA r (shift left arithmetic)", () => {
      const { cpu, memory } = setupCPU();
      cpu.registers.H = 0x85;
      memory[0x0000] = 0xcb;
      memory[0x0001] = 0x24;
      cpu.executeInstruction();
      expect(cpu.registers.H).toBe(0x0a);
      expect(cpu.flagC).toBe(1);
    });

    runTest("should execute SRA r (shift right arithmetic)", () => {
      const { cpu, memory } = setupCPU();
      cpu.registers.L = 0x85;
      memory[0x0000] = 0xcb;
      memory[0x0001] = 0x2d;
      cpu.executeInstruction();
      expect(cpu.registers.L).toBe(0xc2);
      expect(cpu.flagC).toBe(1);
    });

    runTest("should execute SRL r (shift right logical)", () => {
      const { cpu, memory } = setupCPU();
      cpu.registers.A = 0x85;
      memory[0x0000] = 0xcb;
      memory[0x0001] = 0x3f;
      cpu.executeInstruction();
      expect(cpu.registers.A).toBe(0x42);
      expect(cpu.flagC).toBe(1);
      expect(cpu.flagS).toBe(0);
    });

    runTest("should execute RLC (HL) - memory rotate", () => {
      const { cpu, memory } = setupCPU();
      cpu.HL = 0x5000;
      memory[0x5000] = 0x85;
      memory[0x0000] = 0xcb;
      memory[0x0001] = 0x06;
      cpu.executeInstruction();
      expect(memory[0x5000]).toBe(0x0b);
      expect(cpu.flagC).toBe(1);
    });
  });

  // ============================================
  // TEST SUITE: CB Prefix - Bit Operations
  // ============================================
  runSuite("Z80CPU - Advanced CB Prefix - Bit Operations", () => {
    runTest("should execute BIT b, r (test bit)", () => {
      const { cpu, memory } = setupCPU();
      cpu.registers.B = 0x85;
      memory[0x0000] = 0xcb;
      memory[0x0001] = 0x40;
      cpu.executeInstruction();
      expect(cpu.flagZ).toBe(0);
      expect(cpu.flagH).toBe(1);
      expect(cpu.flagN).toBe(0);
    });

    runTest("should execute BIT 7, r (sets sign flag)", () => {
      const { cpu, memory } = setupCPU();
      cpu.registers.C = 0x80;
      memory[0x0000] = 0xcb;
      memory[0x0001] = 0x79;
      cpu.executeInstruction();
      expect(cpu.flagZ).toBe(0);
      expect(cpu.flagS).toBe(1);
    });

    runTest("should execute SET b, r (set bit)", () => {
      const { cpu, memory } = setupCPU();
      cpu.registers.D = 0x00;
      memory[0x0000] = 0xcb;
      memory[0x0001] = 0xc2;
      cpu.executeInstruction();
      expect(cpu.registers.D).toBe(0x01);
    });

    runTest("should execute RES b, r (reset bit)", () => {
      const { cpu, memory } = setupCPU();
      cpu.registers.E = 0xff;
      memory[0x0000] = 0xcb;
      memory[0x0001] = 0x83;
      cpu.executeInstruction();
      expect(cpu.registers.E).toBe(0xfe);
    });

    runTest("should execute BIT b, (HL) - memory bit test", () => {
      const { cpu, memory } = setupCPU();
      cpu.HL = 0x5000;
      memory[0x5000] = 0x42;
      memory[0x0000] = 0xcb;
      memory[0x0001] = 0x46;
      cpu.executeInstruction();
      expect(cpu.flagZ).toBe(1);
    });

    runTest("should execute SET b, (HL) - memory bit set", () => {
      const { cpu, memory } = setupCPU();
      cpu.HL = 0x5000;
      memory[0x5000] = 0x00;
      memory[0x0000] = 0xcb;
      memory[0x0001] = 0xce;
      cpu.executeInstruction();
      expect(memory[0x5000]).toBe(0x02);
    });
  });

  // ============================================
  // TEST SUITE: DD/FD Prefix - IX Operations
  // ============================================
  runSuite("Z80CPU - Advanced DD/FD Prefix - IX Register Operations", () => {
    runTest("should execute LD IX, nn", () => {
      const { cpu, memory } = setupCPU();
      memory[0x0000] = 0xdd;
      memory[0x0001] = 0x21;
      memory[0x0002] = 0x34;
      memory[0x0003] = 0x12;
      cpu.executeInstruction();
      expect(cpu.IX).toBe(0x1234);
    });

    runTest("should execute ADD IX, BC", () => {
      const { cpu, memory } = setupCPU();
      cpu.IX = 0x1000;
      cpu.BC = 0x0234;
      memory[0x0000] = 0xdd;
      memory[0x0001] = 0x09;
      cpu.executeInstruction();
      expect(cpu.IX).toBe(0x1234);
      expect(cpu.flagC).toBe(0);
    });

    runTest("should execute INC IX", () => {
      const { cpu, memory } = setupCPU();
      cpu.IX = 0x1234;
      memory[0x0000] = 0xdd;
      memory[0x0001] = 0x23;
      cpu.executeInstruction();
      expect(cpu.IX).toBe(0x1235);
    });

    runTest("should execute PUSH IX", () => {
      const { cpu, memory } = setupCPU();
      cpu.IX = 0x5678;
      cpu.registers.SP = 0xffff;
      memory[0x0000] = 0xdd;
      memory[0x0001] = 0xe5;
      cpu.executeInstruction();
      expect(memory[0xfffd]).toBe(0x78);
      expect(memory[0xfffe]).toBe(0x56);
      expect(cpu.registers.SP).toBe(0xfffd);
    });

    runTest("should execute POP IX", () => {
      const { cpu, memory } = setupCPU();
      cpu.registers.SP = 0xfffd;
      memory[0xfffd] = 0x34;
      memory[0xfffe] = 0x12;
      memory[0x0000] = 0xdd;
      memory[0x0001] = 0xe1;
      cpu.executeInstruction();
      expect(cpu.IX).toBe(0x1234);
      expect(cpu.registers.SP).toBe(0xffff);
    });

    runTest("should execute JP (IX)", () => {
      const { cpu, memory } = setupCPU();
      cpu.IX = 0x5000;
      memory[0x0000] = 0xdd;
      memory[0x0001] = 0xe9;
      cpu.executeInstruction();
      expect(cpu.registers.PC).toBe(0x5000);
    });

    runTest("should execute LD SP, IX", () => {
      const { cpu, memory } = setupCPU();
      cpu.IX = 0x5678;
      memory[0x0000] = 0xdd;
      memory[0x0001] = 0xf9;
      cpu.executeInstruction();
      expect(cpu.registers.SP).toBe(0x5678);
    });
  });

  // ============================================
  // TEST SUITE: DD/FD Prefix - IY Operations
  // ============================================
  runSuite("Z80CPU - Advanced DD/FD Prefix - IY Register Operations", () => {
    runTest("should execute LD IY, nn", () => {
      const { cpu, memory } = setupCPU();
      memory[0x0000] = 0xfd;
      memory[0x0001] = 0x21;
      memory[0x0002] = 0x78;
      memory[0x0003] = 0x56;
      cpu.executeInstruction();
      expect(cpu.IY).toBe(0x5678);
    });

    runTest("should execute ADD IY, DE", () => {
      const { cpu, memory } = setupCPU();
      cpu.IY = 0x2000;
      cpu.DE = 0x1234;
      memory[0x0000] = 0xfd;
      memory[0x0001] = 0x19;
      cpu.executeInstruction();
      expect(cpu.IY).toBe(0x3234);
    });

    runTest("should execute DEC IY", () => {
      const { cpu, memory } = setupCPU();
      cpu.IY = 0x1234;
      memory[0x0000] = 0xfd;
      memory[0x0001] = 0x2b;
      cpu.executeInstruction();
      expect(cpu.IY).toBe(0x1233);
    });
  });

  // ============================================
  // TEST SUITE: Indexed CB Operations
  // ============================================
  runSuite("Z80CPU - Advanced DD/FD Prefix - Indexed CB Operations", () => {
    runTest("should execute DD CB d RLC (IX+d) rotate", () => {
      const { cpu, memory } = setupCPU();
      cpu.IX = 0x5000;
      memory[0x5005] = 0x85;
      memory[0x0000] = 0xdd;
      memory[0x0001] = 0xcb;
      memory[0x0002] = 0x05;
      memory[0x0003] = 0x06;
      cpu.executeInstruction();
      expect(memory[0x5005]).toBe(0x0b);
      expect(cpu.flagC).toBe(1);
    });

    runTest("should execute FD CB d BIT (IY+d) bit test", () => {
      const { cpu, memory } = setupCPU();
      cpu.IY = 0x4000;
      memory[0x4003] = 0x42;
      memory[0x0000] = 0xfd;
      memory[0x0001] = 0xcb;
      memory[0x0002] = 0x03;
      memory[0x0003] = 0x4e;
      cpu.executeInstruction();
      expect(cpu.flagZ).toBe(0);
    });

    runTest("should execute DD CB d SET (IX+d) bit set", () => {
      const { cpu, memory } = setupCPU();
      cpu.IX = 0x3000;
      memory[0x3002] = 0x00;
      memory[0x0000] = 0xdd;
      memory[0x0001] = 0xcb;
      memory[0x0002] = 0x02;
      memory[0x0003] = 0xc6;
      cpu.executeInstruction();
      expect(memory[0x3002]).toBe(0x01);
    });
  });

  // ============================================
  // TEST SUITE: Advanced Control Instructions
  // ============================================
  runSuite("Z80CPU - Advanced Control Instructions", () => {
    runTest("should adjust BCD addition result", () => {
      const { cpu, memory } = setupCPU();
      cpu.registers.A = 0x09;
      cpu.addA(0x05);
      memory[0x0000] = 0x27;
      cpu.executeInstruction();
      expect(cpu.registers.A).toBe(0x14);
      expect(cpu.flagC).toBe(0);
    });

    runTest("should adjust BCD addition with carry", () => {
      const { cpu, memory } = setupCPU();
      cpu.registers.A = 0x99;
      cpu.addA(0x01);
      memory[0x0000] = 0x27;
      cpu.executeInstruction();
      expect(cpu.registers.A).toBe(0x00);
      expect(cpu.flagC).toBe(1);
    });

    runTest("should execute CPL (complement accumulator)", () => {
      const { cpu, memory } = setupCPU();
      cpu.registers.A = 0x55;
      memory[0x0000] = 0x2f;
      cpu.executeInstruction();
      expect(cpu.registers.A).toBe(0xaa);
      expect(cpu.flagH).toBe(1);
      expect(cpu.flagN).toBe(1);
    });

    runTest("should execute CCF (complement carry flag)", () => {
      const { cpu, memory } = setupCPU();
      cpu.flagC = 0;
      memory[0x0000] = 0x3f;
      cpu.executeInstruction();
      expect(cpu.flagC).toBe(1);
      expect(cpu.flagH).toBe(1);
    });

    runTest("should execute SCF (set carry flag)", () => {
      const { cpu, memory } = setupCPU();
      cpu.flagC = 0;
      memory[0x0000] = 0x37;
      cpu.executeInstruction();
      expect(cpu.flagC).toBe(1);
      expect(cpu.flagH).toBe(0);
      expect(cpu.flagN).toBe(0);
    });

    runTest("should execute EX DE, HL", () => {
      const { cpu, memory } = setupCPU();
      cpu.DE = 0x1234;
      cpu.HL = 0x5678;
      memory[0x0000] = 0xeb;
      cpu.executeInstruction();
      expect(cpu.DE).toBe(0x5678);
      expect(cpu.HL).toBe(0x1234);
    });

    runTest("should execute EX AF, AF'", () => {
      const { cpu, memory } = setupCPU();
      cpu.registers.A = 0x42;
      cpu.registers.F = 0xff;
      cpu.registers.A_ = 0x55;
      cpu.registers.F_ = 0x00;
      memory[0x0000] = 0x08;
      cpu.executeInstruction();
      expect(cpu.registers.A).toBe(0x55);
      expect(cpu.registers.F).toBe(0x00);
      expect(cpu.registers.A_).toBe(0x42);
      expect(cpu.registers.F_).toBe(0xff);
    });

    runTest("should execute EX (SP), HL", () => {
      const { cpu, memory } = setupCPU();
      cpu.HL = 0x1234;
      cpu.registers.SP = 0xfffd;
      memory[0xfffd] = 0x78;
      memory[0xfffe] = 0x56;
      memory[0x0000] = 0xe3;
      cpu.executeInstruction();
      expect(cpu.HL).toBe(0x5678);
      expect(memory[0xfffd]).toBe(0x34);
      expect(memory[0xfffe]).toBe(0x12);
    });

    runTest("should execute EXX (exchange register sets)", () => {
      const { cpu, memory } = setupCPU();
      cpu.BC = 0x1111;
      cpu.DE = 0x2222;
      cpu.HL = 0x3333;
      cpu.registers.B_ = 0x44;
      cpu.registers.C_ = 0x44;
      cpu.registers.D_ = 0x55;
      cpu.registers.E_ = 0x55;
      cpu.registers.H_ = 0x66;
      cpu.registers.L_ = 0x66;
      memory[0x0000] = 0xd9;
      cpu.executeInstruction();
      expect(cpu.BC).toBe(0x4444);
      expect(cpu.DE).toBe(0x5555);
      expect(cpu.HL).toBe(0x6666);
    });

    runTest("should execute DI (disable interrupts)", () => {
      const { cpu, memory } = setupCPU();
      cpu.IFF1 = true;
      cpu.IFF2 = true;
      memory[0x0000] = 0xf3;
      cpu.executeInstruction();
      expect(cpu.IFF1).toBe(false);
      expect(cpu.IFF2).toBe(false);
    });

    runTest("should execute EI (enable interrupts)", () => {
      const { cpu, memory } = setupCPU();
      cpu.IFF1 = false;
      cpu.IFF2 = false;
      memory[0x0000] = 0xfb;
      cpu.executeInstruction();
      expect(cpu.IFF1).toBe(true);
      expect(cpu.IFF2).toBe(true);
    });
  });

  // ============================================
  // TEST SUITE: Advanced Arithmetic Sequences
  // ============================================
  runSuite("Z80CPU - Advanced Arithmetic Sequences", () => {
    runTest("should execute 16-bit addition sequence", () => {
      const { cpu, memory } = setupCPU();
      cpu.HL = 0x1000;
      cpu.BC = 0x0234;
      cpu.DE = 0x0567;
      cpu.flagC = 0;
      memory[0x0000] = 0x09;
      memory[0x0001] = 0xed;
      memory[0x0002] = 0x5a;
      cpu.executeInstruction();
      expect(cpu.HL).toBe(0x1234);
      cpu.executeInstruction();
      expect(cpu.HL).toBe(0x179b);
    });

    runTest("should execute multi-byte subtraction", () => {
      const { cpu, memory } = setupCPU();
      cpu.HL = 0x5678;
      cpu.BC = 0x1234;
      cpu.flagC = 0;
      memory[0x0000] = 0xed;
      memory[0x0001] = 0x42;
      cpu.executeInstruction();
      expect(cpu.HL).toBe(0x4444);
      expect(cpu.flagN).toBe(1);
    });

    runTest("should execute logical operations sequence", () => {
      const { cpu, memory } = setupCPU();
      cpu.registers.A = 0xff;
      cpu.registers.B = 0x0f;
      memory[0x0000] = 0xa0;
      memory[0x0001] = 0xb0;
      memory[0x0002] = 0xa8;
      cpu.executeInstruction();
      expect(cpu.registers.A).toBe(0x0f);
      expect(cpu.flagH).toBe(1);
      cpu.executeInstruction();
      expect(cpu.registers.A).toBe(0x0f);
      cpu.executeInstruction();
      expect(cpu.registers.A).toBe(0x00);
      expect(cpu.flagZ).toBe(1);
    });
  });

  // ============================================
  // TEST SUITE: TRS-80 Model III Specific Patterns
  // ============================================
  runSuite("Z80CPU - TRS-80 Model III Specific Patterns", () => {
    runTest("should execute ROM boot sequence pattern", () => {
      const { cpu, memory } = setupCPU();
      cpu.registers.SP = 0xffff;
      memory[0x0000] = 0x31;
      memory[0x0001] = 0x00;
      memory[0x0002] = 0x40;
      memory[0x0003] = 0xc3;
      memory[0x0004] = 0x00;
      memory[0x0005] = 0x10;
      cpu.executeInstruction();
      expect(cpu.registers.SP).toBe(0x4000);
      cpu.executeInstruction();
      expect(cpu.registers.PC).toBe(0x1000);
    });

    runTest("should execute string copy routine (LDIR pattern)", () => {
      const { cpu, memory } = setupCPU();
      cpu.HL = 0x4000;
      cpu.DE = 0x5000;
      cpu.BC = 0x0005;
      memory[0x4000] = 0x48;
      memory[0x4001] = 0x45;
      memory[0x4002] = 0x4c;
      memory[0x4003] = 0x4c;
      memory[0x4004] = 0x4f;
      memory[0x0000] = 0xed;
      memory[0x0001] = 0xb0;
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

    runTest("should execute memory fill routine", () => {
      const { cpu, memory } = setupCPU();
      cpu.HL = 0x4000;
      cpu.DE = 0x5000;
      cpu.BC = 0x000a;
      for (let i = 0; i < 10; i++) {
        memory[0x4000 + i] = 0xff;
      }
      for (let i = 0; i < 10; i++) {
        memory[0x5000 + i] = 0x00;
      }
      memory[0x0000] = 0xed;
      memory[0x0001] = 0xb0;
      let cycles = 0;
      while (cpu.BC !== 0 && cycles < 100) {
        cpu.executeInstruction();
        cycles++;
      }
      for (let i = 0; i < 10; i++) {
        expect(memory[0x5000 + i]).toBe(0xff);
      }
    });

    runTest("should execute keyboard scan pattern (bit testing)", () => {
      const { cpu, memory } = setupCPU();
      cpu.HL = 0x5000;
      memory[0x5000] = 0x42;
      memory[0x0000] = 0xcb;
      memory[0x0001] = 0x46;
      cpu.executeInstruction();
      expect(cpu.flagZ).toBe(1);
      expect(cpu.flagH).toBe(1);
    });

    runTest("should execute video memory update pattern", () => {
      const { cpu, memory } = setupCPU();
      cpu.IX = 0x3c00;
      memory[0x3c05] = 0x20;
      memory[0x0000] = 0xdd;
      memory[0x0001] = 0xcb;
      memory[0x0002] = 0x05;
      memory[0x0003] = 0xc6;
      cpu.executeInstruction();
      expect(memory[0x3c05]).toBe(0x21);
    });

    runTest("should execute subroutine call/return pattern", () => {
      const { cpu, memory } = setupCPU();
      cpu.registers.SP = 0xffff;
      cpu.registers.PC = 0x1000;
      memory[0x1000] = 0xcd;
      memory[0x1001] = 0x00;
      memory[0x1002] = 0x50;
      memory[0x5000] = 0x3e;
      memory[0x5001] = 0x42;
      memory[0x5002] = 0xc9;
      cpu.executeInstruction();
      expect(cpu.registers.PC).toBe(0x5000);
      expect(cpu.registers.SP).toBe(0xfffd);
      cpu.executeInstruction();
      expect(cpu.registers.A).toBe(0x42);
      cpu.executeInstruction();
      expect(cpu.registers.PC).toBe(0x1003);
      expect(cpu.registers.SP).toBe(0xffff);
    });

    runTest("should execute loop with DJNZ", () => {
      const { cpu, memory } = setupCPU();
      cpu.registers.B = 0x05;
      cpu.registers.PC = 0x1000;
      memory[0x1000] = 0x10;
      memory[0x1001] = 0xfe;
      let iterations = 0;
      while (cpu.registers.B !== 0 && iterations < 10) {
        cpu.executeInstruction();
        iterations++;
      }
      expect(cpu.registers.B).toBe(0x00);
      expect(iterations).toBe(5);
    });

    runTest("should execute relative jump sequence", () => {
      const { cpu, memory } = setupCPU();
      cpu.registers.PC = 0x1000;
      memory[0x1000] = 0x18;
      memory[0x1001] = 0x05;
      cpu.executeInstruction();
      expect(cpu.registers.PC).toBe(0x1007);
      cpu.registers.PC = 0x1000;
      memory[0x1000] = 0x18;
      memory[0x1001] = 0xfb;
      cpu.executeInstruction();
      expect(cpu.registers.PC).toBe((0x1000 + 2 - 5) & 0xffff);
    });

    runTest("should execute RST instruction sequence", () => {
      const { cpu, memory } = setupCPU();
      cpu.registers.SP = 0xffff;
      cpu.registers.PC = 0x1000;
      memory[0x1000] = 0xc7;
      memory[0x0000] = 0xc9;
      cpu.executeInstruction();
      expect(cpu.registers.PC).toBe(0x0000);
      expect(cpu.registers.SP).toBe(0xfffd);
      expect(memory[0xfffd]).toBe(0x01);
      expect(memory[0xfffe]).toBe(0x10);
    });

    runTest("should execute complex flag-dependent branching", () => {
      const { cpu, memory } = setupCPU();
      cpu.registers.A = 0x80;
      cpu.subA(0x00, true);
      memory[0x0000] = 0xfa;
      memory[0x0001] = 0x00;
      memory[0x0002] = 0x50;
      cpu.executeInstruction();
      expect(cpu.registers.PC).toBe(0x5000);
      expect(cpu.flagS).toBe(1);
    });

    runTest("should execute decimal arithmetic for BCD operations", () => {
      const { cpu, memory } = setupCPU();
      cpu.registers.A = 0x19;
      cpu.addA(0x27);
      memory[0x0000] = 0x27;
      cpu.executeInstruction();
      expect(cpu.registers.A).toBe(0x46);
    });

    runTest("should execute register exchange for context switching", () => {
      const { cpu, memory } = setupCPU();
      cpu.BC = 0x1111;
      cpu.DE = 0x2222;
      cpu.HL = 0x3333;
      cpu.registers.B_ = 0x44;
      cpu.registers.C_ = 0x44;
      cpu.registers.D_ = 0x55;
      cpu.registers.E_ = 0x55;
      cpu.registers.H_ = 0x66;
      cpu.registers.L_ = 0x66;
      memory[0x0000] = 0xd9;
      cpu.executeInstruction();
      expect(cpu.BC).toBe(0x4444);
      expect(cpu.DE).toBe(0x5555);
      expect(cpu.HL).toBe(0x6666);
      cpu.registers.PC = 0x0000;
      cpu.executeInstruction();
      expect(cpu.BC).toBe(0x1111);
      expect(cpu.DE).toBe(0x2222);
      expect(cpu.HL).toBe(0x3333);
    });
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

  logFn(
    "💡 For complete 130-test coverage, run: yarn test:run tests/unit/cpu-tests.js",
    "info"
  );
  logFn("");

  return results;
}
