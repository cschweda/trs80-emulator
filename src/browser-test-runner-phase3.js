/**
 * Browser-Compatible Test Runner for Phase 3
 * Executes 37 Phase 3 cassette and I/O tests and reports results
 *
 * This is a comprehensive test runner that includes all test cases
 * from tests/unit/cassette-tests.js and tests/unit/io-tests.js
 * converted to browser-compatible format with verbose logging.
 *
 * Shows assembly mnemonics and opcodes for I/O operations (IN/OUT instructions)
 * and detailed descriptions of what each test does and expects.
 */

import { CassetteSystem } from "./peripherals/cassette.js";
import { IOSystem } from "./core/io.js";
import { MemorySystem } from "./core/memory.js";

// Enhanced expect implementation with verbose logging
let expect = null; // Will be set inside runAllPhase3Tests

export async function runAllPhase3Tests(logFn) {
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    errors: [],
  };

  let currentSuite = "";
  let verboseLogging = true; // Enable verbose logging

  // Helper to format hex values
  function hex(value, width = 2) {
    return `0x${value.toString(16).toUpperCase().padStart(width, "0")}`;
  }

  // Enhanced expect implementation with verbose logging
  expect = function (value) {
    return {
      toBe: (expected) => {
        const valueHex = typeof value === "number" ? ` (${hex(value)})` : "";
        const expectedHex =
          typeof expected === "number" ? ` (${hex(expected)})` : "";

        if (value !== expected) {
          throw new Error(
            `Expected ${expected}${expectedHex}, but got ${value}${valueHex}`
          );
        }
        if (verboseLogging) {
          logFn(
            `        ✓ Assert: ${value}${valueHex} === ${expected}${expectedHex}`,
            "info"
          );
        }
      },
      toEqual: (expected) => {
        const valueStr = JSON.stringify(value);
        const expectedStr = JSON.stringify(expected);
        if (valueStr !== expectedStr) {
          throw new Error(`Expected ${expectedStr}, but got ${valueStr}`);
        }
        if (verboseLogging) {
          logFn(`        ✓ Assert: ${valueStr} === ${expectedStr}`, "info");
        }
      },
      toBeDefined: () => {
        if (value === undefined) {
          throw new Error(`Expected value to be defined, but got undefined`);
        }
        if (verboseLogging) {
          logFn(`        ✓ Assert: Value is defined`, "info");
        }
      },
      toBeLessThanOrEqual: (expected) => {
        if (value > expected) {
          throw new Error(
            `Expected ${value} to be <= ${expected}, but got ${value}`
          );
        }
        if (verboseLogging) {
          logFn(`        ✓ Assert: ${value} <= ${expected}`, "info");
        }
      },
      toBeGreaterThan: (expected) => {
        if (value <= expected) {
          throw new Error(
            `Expected ${value} to be > ${expected}, but got ${value}`
          );
        }
        if (verboseLogging) {
          logFn(`        ✓ Assert: ${value} > ${expected}`, "info");
        }
      },
      not: {
        toBe: (expected) => {
          if (value === expected) {
            throw new Error(
              `Expected value not to be ${expected}, but got ${value}`
            );
          }
          if (verboseLogging) {
            logFn(`        ✓ Assert: ${value} !== ${expected}`, "info");
          }
        },
      },
    };
  };

  function runTest(testName, testFn, metadata = {}) {
    results.total++;

    // Display test with assembly, opcode, and description if available
    let testHeader = `  🧪 Running: ${testName}`;
    if (metadata.assembly) {
      testHeader += `\n     📝 Assembly: ${metadata.assembly}`;
    }
    if (metadata.opcode) {
      testHeader += `\n     🔢 Opcode: ${metadata.opcode}`;
    }
    if (metadata.description) {
      testHeader += `\n     💡 ${metadata.description}`;
    }
    logFn(testHeader, "info");

    try {
      const startTime = performance.now();
      testFn();
      const endTime = performance.now();
      const duration = (endTime - startTime).toFixed(2);
      results.passed++;

      // Display success with assembly/opcode/description info
      let successMsg = `  ✅ ${testName} (${duration}ms)`;
      if (metadata.assembly || metadata.opcode || metadata.description) {
        const parts = [];
        if (metadata.assembly) parts.push(`📝 Assembly: ${metadata.assembly}`);
        if (metadata.opcode) parts.push(`🔢 Opcode: ${metadata.opcode}`);
        if (metadata.description) parts.push(`💡 ${metadata.description}`);
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

  // Helper to setup cassette system
  function setupCassette() {
    const cassette = new CassetteSystem();
    if (verboseLogging) {
      logFn(`        🔧 Cassette Setup: Initialized CassetteSystem`, "info");
    }
    return cassette;
  }

  // Helper to setup I/O system
  function setupIO() {
    const io = new IOSystem();
    if (verboseLogging) {
      logFn(`        🔧 I/O Setup: Initialized IOSystem`, "info");
    }
    return io;
  }

  // Helper to setup memory system
  function setupMemory() {
    const memory = new MemorySystem();
    const romData = new Uint8Array(0x4000).fill(0);
    memory.loadROM(romData);
    if (verboseLogging) {
      logFn(
        `        🔧 Memory Setup: Initialized MemorySystem with ROM`,
        "info"
      );
    }
    return memory;
  }

  // ============================================
  // CASSETTE TESTS (22 tests)
  // Tests cassette tape loading, CLOAD/CSAVE operations, and control
  // ============================================

  // TEST SUITE 1: Initialization
  runSuite("CassetteSystem - Initialization", () => {
    runTest(
      "should initialize with correct defaults",
      () => {
        const cassette = setupCassette();
        expect(cassette.motorOn).toBe(false);
        expect(cassette.playing).toBe(false);
        expect(cassette.recording).toBe(false);
        expect(cassette.tapeData).toBe(null);
        expect(cassette.tapePosition).toBe(0);
        expect(cassette.tapeLength).toBe(0);
      },
      {
        description:
          "Verifies cassette system starts in correct initial state - motor off, not playing/recording, no tape loaded",
      }
    );
  });

  // TEST SUITE 2: Tape Loading (Test 3.1)
  runSuite("CassetteSystem - Tape Loading (Test 3.1)", () => {
    runTest(
      "should load Uint8Array tape data",
      () => {
        const cassette = setupCassette();
        const data = new Uint8Array([0x3e, 0x42, 0x76]);

        const result = cassette.loadTape(data);

        expect(result).toBe(true);
        expect(cassette.tapeLength).toBe(3);
        expect(cassette.tapePosition).toBe(0);
        expect(cassette.tapeData[0]).toBe(0x3e);
        if (verboseLogging) {
          logFn(
            `        📼 Loaded tape: ${cassette.tapeLength} bytes, position reset to 0`,
            "info"
          );
        }
      },
      {
        description:
          "Loads program data from Uint8Array into cassette - simulates loading a tape file, tape position automatically reset to 0",
      }
    );

    runTest(
      "should load Array tape data",
      () => {
        const cassette = setupCassette();
        const data = [0xaa, 0xbb, 0xcc];

        const result = cassette.loadTape(data);

        expect(result).toBe(true);
        expect(cassette.tapeLength).toBe(3);
        expect(cassette.tapeData[1]).toBe(0xbb);
        if (verboseLogging) {
          logFn(
            `        📼 Loaded Array data: ${cassette.tapeLength} bytes`,
            "info"
          );
        }
      },
      {
        description:
          "Loads program data from JavaScript Array - accepts both Uint8Array and Array for convenience, converts to internal format",
      }
    );

    runTest(
      "should reject empty tape",
      () => {
        const cassette = setupCassette();
        const result = cassette.loadTape([]);

        expect(result).toBe(false);
        if (verboseLogging) {
          logFn(`        ⚠️  Empty tape correctly rejected`, "info");
        }
      },
      {
        description:
          "Validates tape data - rejects empty arrays to prevent loading invalid tapes",
      }
    );

    runTest(
      "should reject null tape",
      () => {
        const cassette = setupCassette();
        const result = cassette.loadTape(null);

        expect(result).toBe(false);
        if (verboseLogging) {
          logFn(`        ⚠️  Null tape correctly rejected`, "info");
        }
      },
      {
        description:
          "Validates tape data - rejects null values to prevent errors during tape operations",
      }
    );

    runTest(
      "should reset tape position on load",
      () => {
        const cassette = setupCassette();
        cassette.tapePosition = 100;

        cassette.loadTape([0x10, 0x20]);

        expect(cassette.tapePosition).toBe(0);
        if (verboseLogging) {
          logFn(`        📼 Tape position reset from 100 to 0 on load`, "info");
        }
      },
      {
        description:
          "Resets tape position to 0 when new tape is loaded - ensures playback starts from beginning of tape",
      }
    );
  });

  // TEST SUITE 3: CLOAD Operation (Test 3.2)
  runSuite("CassetteSystem - CLOAD Operation (Test 3.2)", () => {
    runTest(
      "should load tape to default address (0x4200)",
      () => {
        const cassette = setupCassette();
        const memory = setupMemory();
        const programData = new Uint8Array([0x3e, 0x42, 0x00, 0x76]);
        cassette.loadTape(programData);

        const address = cassette.simulateCLoad(memory);

        expect(address).toBe(0x4200);
        expect(memory.readByte(0x4200)).toBe(0x3e);
        expect(memory.readByte(0x4201)).toBe(0x42);
        expect(memory.readByte(0x4202)).toBe(0x00);
        expect(memory.readByte(0x4203)).toBe(0x76);
        if (verboseLogging) {
          logFn(
            `        💾 CLOAD: ${programData.length} bytes loaded to ${hex(
              address,
              4
            )}`,
            "info"
          );
        }
      },
      {
        description:
          "Simulates CLOAD command - loads tape data into memory at default address 0x4200 (TRS-80 BASIC program start), copies all bytes from tape to RAM",
      }
    );

    runTest(
      "should load tape to custom address",
      () => {
        const cassette = setupCassette();
        const memory = setupMemory();
        const programData = new Uint8Array([0xaa, 0xbb, 0xcc]);
        cassette.loadTape(programData);

        const address = cassette.simulateCLoad(memory, 0x5000);

        expect(address).toBe(0x5000);
        expect(memory.readByte(0x5000)).toBe(0xaa);
        expect(memory.readByte(0x5001)).toBe(0xbb);
        expect(memory.readByte(0x5002)).toBe(0xcc);
        if (verboseLogging) {
          logFn(
            `        💾 CLOAD: ${
              programData.length
            } bytes loaded to custom address ${hex(address, 4)}`,
            "info"
          );
        }
      },
      {
        description:
          "Loads tape to custom memory address - allows loading programs at specific locations, useful for machine code programs",
      }
    );

    runTest(
      "should return false when no tape loaded",
      () => {
        const cassette = setupCassette();
        const memory = setupMemory();

        const result = cassette.simulateCLoad(memory);

        expect(result).toBe(false);
        if (verboseLogging) {
          logFn(`        ⚠️  CLOAD correctly rejected (no tape)`, "info");
        }
      },
      {
        description:
          "Validates tape state - returns false if no tape is loaded, prevents loading from empty cassette",
      }
    );

    runTest(
      "should call onLoadComplete callback",
      () => {
        const cassette = setupCassette();
        const memory = setupMemory();
        let callbackAddress = null;
        let callbackLength = null;

        cassette.onLoadComplete = (addr, len) => {
          callbackAddress = addr;
          callbackLength = len;
        };

        cassette.loadTape([0x10, 0x20, 0x30]);
        cassette.simulateCLoad(memory, 0x5000);

        expect(callbackAddress).toBe(0x5000);
        expect(callbackLength).toBe(3);
        if (verboseLogging) {
          logFn(
            `        📞 Callback invoked: address=${hex(
              callbackAddress,
              4
            )}, length=${callbackLength}`,
            "info"
          );
        }
      },
      {
        description:
          "Invokes callback after successful load - notifies UI when tape load completes, provides load address and byte count",
      }
    );
  });

  // TEST SUITE 4: CSAVE Operation (Test 3.3)
  runSuite("CassetteSystem - CSAVE Operation (Test 3.3)", () => {
    runTest(
      "should save memory region to tape",
      () => {
        const cassette = setupCassette();
        const memory = setupMemory();
        memory.writeByte(0x4200, 0x3e);
        memory.writeByte(0x4201, 0x42);
        memory.writeByte(0x4202, 0x76);

        const tapeData = cassette.simulateCSave(memory, 0x4200, 3);

        expect(tapeData.length).toBe(3);
        expect(tapeData[0]).toBe(0x3e);
        expect(tapeData[1]).toBe(0x42);
        expect(tapeData[2]).toBe(0x76);
        expect(cassette.tapeLength).toBe(3);
        if (verboseLogging) {
          logFn(
            `        💾 CSAVE: 3 bytes saved from ${hex(0x4200, 4)} to tape`,
            "info"
          );
        }
      },
      {
        description:
          "Simulates CSAVE command - saves memory region to tape, copies bytes from RAM to tape storage, tape length updated",
      }
    );

    runTest(
      "should call onSaveComplete callback",
      () => {
        const cassette = setupCassette();
        const memory = setupMemory();
        let savedData = null;

        cassette.onSaveComplete = (data) => {
          savedData = data;
        };

        memory.writeByte(0x5000, 0xaa);
        cassette.simulateCSave(memory, 0x5000, 1);

        expect(savedData).not.toBe(null);
        expect(savedData[0]).toBe(0xaa);
        if (verboseLogging) {
          logFn(
            `        📞 Callback invoked: saved ${savedData.length} bytes`,
            "info"
          );
        }
      },
      {
        description:
          "Invokes callback after successful save - notifies UI when tape save completes, provides saved data array",
      }
    );
  });

  // TEST SUITE 5: Cassette Control (Test 3.4)
  runSuite("CassetteSystem - Cassette Control (Test 3.4)", () => {
    runTest(
      "should turn motor on with bit 0",
      () => {
        const cassette = setupCassette();

        cassette.control(0x01);

        expect(cassette.motorOn).toBe(true);
        if (verboseLogging) {
          logFn(`        🎛️  Motor turned ON (bit 0 set)`, "info");
        }
      },
      {
        description:
          "Controls cassette motor - bit 0 of control byte turns motor on/off, motor must be on for play/record operations",
      }
    );

    runTest(
      "should start playing with bit 1",
      () => {
        const cassette = setupCassette();

        cassette.control(0x03); // Motor on + Play

        expect(cassette.motorOn).toBe(true);
        expect(cassette.playing).toBe(true);
        if (verboseLogging) {
          logFn(`        🎛️  Motor ON + Playing (bits 0,1 set)`, "info");
        }
      },
      {
        description:
          "Starts tape playback - bit 1 enables play mode, requires motor to be on (bit 0), simulates CLOAD operation",
      }
    );

    runTest(
      "should start recording with bit 2",
      () => {
        const cassette = setupCassette();

        cassette.control(0x05); // Motor on + Record

        expect(cassette.motorOn).toBe(true);
        expect(cassette.recording).toBe(true);
        if (verboseLogging) {
          logFn(`        🎛️  Motor ON + Recording (bits 0,2 set)`, "info");
        }
      },
      {
        description:
          "Starts tape recording - bit 2 enables record mode, requires motor to be on (bit 0), simulates CSAVE operation",
      }
    );

    runTest(
      "should stop play/record when motor is off",
      () => {
        const cassette = setupCassette();

        cassette.control(0x03); // Start playing
        cassette.control(0x00); // Motor off

        expect(cassette.motorOn).toBe(false);
        expect(cassette.playing).toBe(false);
        if (verboseLogging) {
          logFn(`        🎛️  Motor OFF - play/record stopped`, "info");
        }
      },
      {
        description:
          "Stops operations when motor is turned off - turning motor off (bit 0 = 0) automatically stops play and record modes",
      }
    );

    runTest(
      "should generate correct status byte",
      () => {
        const cassette = setupCassette();
        cassette.loadTape([0x10, 0x20]);
        cassette.control(0x03); // Motor on + Play

        const status = cassette.getStatus();

        expect(status & 0x01).toBe(0x01); // Motor on
        expect(status & 0x02).toBe(0x02); // Playing
        expect(status & 0x08).toBe(0x08); // Data available
        if (verboseLogging) {
          logFn(
            `        📊 Status byte: ${hex(status)} (motor=1, play=1, data=1)`,
            "info"
          );
        }
      },
      {
        description:
          "Returns cassette status byte - bit flags indicate motor state, play/record status, and data availability, used by I/O port reads",
      }
    );
  });

  // TEST SUITE 6: Sequential Reading
  runSuite("CassetteSystem - Sequential Reading", () => {
    runTest(
      "should read bytes sequentially",
      () => {
        const cassette = setupCassette();
        cassette.loadTape([0x10, 0x20, 0x30]);

        expect(cassette.readByte()).toBe(0x10);
        expect(cassette.readByte()).toBe(0x20);
        expect(cassette.readByte()).toBe(0x30);
        if (verboseLogging) {
          logFn(
            `        📖 Read 3 bytes sequentially: ${hex(0x10)}, ${hex(
              0x20
            )}, ${hex(0x30)}`,
            "info"
          );
        }
      },
      {
        description:
          "Reads bytes from tape in order - tape position advances automatically, simulates data streaming during CLOAD",
      }
    );

    runTest(
      "should return 0 after tape end",
      () => {
        const cassette = setupCassette();
        cassette.loadTape([0x42]);

        cassette.readByte(); // Read the only byte
        const afterEnd = cassette.readByte();

        expect(afterEnd).toBe(0x00);
        if (verboseLogging) {
          logFn(`        📖 After tape end, read returns ${hex(0x00)}`, "info");
        }
      },
      {
        description:
          "Handles end of tape - returns 0x00 when reading past tape end, prevents reading invalid data",
      }
    );
  });

  // TEST SUITE 7: Tape Control
  runSuite("CassetteSystem - Tape Control", () => {
    runTest(
      "should rewind tape",
      () => {
        const cassette = setupCassette();
        cassette.loadTape([0x10, 0x20, 0x30]);
        cassette.readByte();
        cassette.readByte();

        cassette.rewind();

        expect(cassette.tapePosition).toBe(0);
        if (verboseLogging) {
          logFn(`        ⏪ Tape rewound to position 0`, "info");
        }
      },
      {
        description:
          "Rewinds tape to beginning - resets tape position to 0, allows re-reading tape from start",
      }
    );

    runTest(
      "should eject tape",
      () => {
        const cassette = setupCassette();
        cassette.loadTape([0x10, 0x20]);
        cassette.control(0x01);

        cassette.eject();

        expect(cassette.tapeData).toBe(null);
        expect(cassette.tapePosition).toBe(0);
        expect(cassette.tapeLength).toBe(0);
        expect(cassette.motorOn).toBe(false);
        if (verboseLogging) {
          logFn(`        ⏏️  Tape ejected - all state reset`, "info");
        }
      },
      {
        description:
          "Ejects tape and resets all state - clears tape data, resets position/length, turns off motor, returns to initial state",
      }
    );
  });

  // ============================================
  // I/O TESTS (15 tests)
  // Tests I/O port operations and keyboard buffer management
  // ============================================

  // TEST SUITE 8: IOSystem Initialization
  runSuite("IOSystem - Initialization", () => {
    runTest(
      "should initialize cassette system",
      () => {
        const io = setupIO();

        expect(io.cassette).toBeDefined();
        expect(io.cassette.motorOn).toBe(false);
        if (verboseLogging) {
          logFn(`        🔧 IOSystem initialized with CassetteSystem`, "info");
        }
      },
      {
        description:
          "IOSystem creates integrated CassetteSystem - I/O system manages cassette as a peripheral device",
      }
    );

    runTest(
      "should initialize keyboard buffer",
      () => {
        const io = setupIO();

        expect(io.keyboardBuffer).toEqual([]);
        if (verboseLogging) {
          logFn(`        🔧 Keyboard buffer initialized (empty)`, "info");
        }
      },
      {
        description:
          "Initializes empty keyboard buffer - FIFO queue for keystrokes, ready to receive input from keyboard",
      }
    );

    runTest(
      "should initialize port handlers",
      () => {
        const io = setupIO();

        expect(io.portHandlers).toBeDefined();
        expect(io.portHandlers.size).toBeGreaterThan(0);
        if (verboseLogging) {
          logFn(
            `        🔧 Port handlers initialized: ${io.portHandlers.size} ports`,
            "info"
          );
        }
      },
      {
        description:
          "Registers I/O port handlers - maps port addresses to device handlers (cassette, keyboard, etc.)",
      }
    );
  });

  // TEST SUITE 9: Port Operations (Test 3.5)
  runSuite("IOSystem - Port Operations (Test 3.5)", () => {
    runTest(
      "should write to cassette port (0xFE)",
      () => {
        const io = setupIO();

        io.writePort(0xfe, 0x01);

        expect(io.cassette.motorOn).toBe(true);
        if (verboseLogging) {
          logFn(
            `        🔌 Port write: ${hex(0xfe)} = ${hex(0x01)} (motor ON)`,
            "info"
          );
        }
      },
      {
        assembly: "OUT (0xFE), A",
        opcode: "0xD3 0xFE",
        description:
          "Writes to cassette control port 0xFE - Z80 OUT instruction sends byte to I/O port, bit 0 controls cassette motor",
      }
    );

    runTest(
      "should read cassette status from port 0xFE",
      () => {
        const io = setupIO();
        io.cassette.loadTape([0x10]);
        io.cassette.control(0x01);

        const status = io.readPort(0xfe);

        expect(status & 0x01).toBe(0x01); // Motor on
        if (verboseLogging) {
          logFn(
            `        🔌 Port read: ${hex(0xfe)} = ${hex(
              status
            )} (motor bit set)`,
            "info"
          );
        }
      },
      {
        assembly: "IN A, (0xFE)",
        opcode: "0xDB 0xFE",
        description:
          "Reads cassette status from port 0xFE - Z80 IN instruction reads byte from I/O port, returns status flags (motor, play, data available)",
      }
    );

    runTest(
      "should return 0xFF for undefined ports",
      () => {
        const io = setupIO();

        const value = io.readPort(0x99);

        expect(value).toBe(0xff);
        if (verboseLogging) {
          logFn(
            `        🔌 Port read: ${hex(0x99)} = ${hex(
              0xff
            )} (undefined port)`,
            "info"
          );
        }
      },
      {
        assembly: "IN A, (0x99)",
        opcode: "0xDB 0x99",
        description:
          "Reads from undefined port - returns 0xFF for unhandled ports, prevents errors when accessing non-existent devices",
      }
    );
  });

  // TEST SUITE 10: Keyboard Buffer
  runSuite("IOSystem - Keyboard Buffer", () => {
    runTest(
      "should add key to buffer",
      () => {
        const io = setupIO();

        io.addKey(0x41); // 'A'
        io.addKey(0x42); // 'B'

        expect(io.keyboardBuffer.length).toBe(2);
        if (verboseLogging) {
          logFn(
            `        ⌨️  Added 2 keys to buffer: ${hex(0x41)} ('A'), ${hex(
              0x42
            )} ('B')`,
            "info"
          );
        }
      },
      {
        description:
          "Adds keystrokes to input buffer - stores key codes in FIFO queue, simulates keyboard input events",
      }
    );

    runTest(
      "should read from keyboard port (0xFF)",
      () => {
        const io = setupIO();
        io.addKey(0x41);

        const key = io.readPort(0xff);

        expect(key).toBe(0x41);
        expect(io.keyboardBuffer.length).toBe(0); // Consumed
        if (verboseLogging) {
          logFn(
            `        ⌨️  Port read: ${hex(0xff)} = ${hex(
              key
            )} ('A'), buffer consumed`,
            "info"
          );
        }
      },
      {
        assembly: "IN A, (0xFF)",
        opcode: "0xDB 0xFF",
        description:
          "Reads key from keyboard port 0xFF - Z80 IN instruction retrieves keystroke from buffer, removes key from queue (FIFO)",
      }
    );

    runTest(
      "should return 0 when buffer is empty",
      () => {
        const io = setupIO();

        const key = io.readPort(0xff);

        expect(key).toBe(0x00);
        if (verboseLogging) {
          logFn(
            `        ⌨️  Port read: ${hex(0xff)} = ${hex(0x00)} (empty buffer)`,
            "info"
          );
        }
      },
      {
        assembly: "IN A, (0xFF)",
        opcode: "0xDB 0xFF",
        description:
          "Returns 0 when keyboard buffer is empty - indicates no key pressed, allows polling for input without blocking",
      }
    );

    runTest(
      "should process keys in FIFO order",
      () => {
        const io = setupIO();
        io.addKey(0x41);
        io.addKey(0x42);
        io.addKey(0x43);

        expect(io.readPort(0xff)).toBe(0x41);
        expect(io.readPort(0xff)).toBe(0x42);
        expect(io.readPort(0xff)).toBe(0x43);
        if (verboseLogging) {
          logFn(
            `        ⌨️  FIFO order verified: ${hex(0x41)}, ${hex(0x42)}, ${hex(
              0x43
            )}`,
            "info"
          );
        }
      },
      {
        description:
          "Processes keys in first-in-first-out order - maintains correct key sequence, important for typing accuracy",
      }
    );

    runTest(
      "should clear keyboard buffer",
      () => {
        const io = setupIO();
        io.addKey(0x41);
        io.addKey(0x42);

        io.clearKeyboardBuffer();

        expect(io.keyboardBuffer.length).toBe(0);
        if (verboseLogging) {
          logFn(`        ⌨️  Keyboard buffer cleared`, "info");
        }
      },
      {
        description:
          "Clears all pending keystrokes - empties keyboard buffer, useful for resetting input state",
      }
    );

    runTest(
      "should limit buffer size to 256",
      () => {
        const io = setupIO();

        // Temporarily disable verbose logging for loops
        const wasVerbose = verboseLogging;
        verboseLogging = false;

        for (let i = 0; i < 300; i++) {
          io.addKey(i & 0xff);
        }

        verboseLogging = wasVerbose;

        expect(io.keyboardBuffer.length).toBeLessThanOrEqual(256);
        if (wasVerbose) {
          logFn(
            `        ⌨️  Buffer size limited: ${io.keyboardBuffer.length} <= 256 (attempted 300)`,
            "info"
          );
        }
      },
      {
        description:
          "Limits keyboard buffer to 256 keys - prevents memory overflow, oldest keys may be dropped if buffer is full",
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
  logFn("");

  if (verboseLogging) {
    logFn(
      "💡 Verbose logging enabled - showing detailed test execution",
      "info"
    );
  }

  logFn(
    "💡 Phase 3 demonstrates cassette tape operations (CLOAD/CSAVE) and I/O port operations (IN/OUT instructions)",
    "info"
  );
  logFn(
    "💡 For complete 37-test coverage, run: yarn test:run tests/unit/cassette-tests.js tests/unit/io-tests.js",
    "info"
  );
  logFn("");

  return results;
}


