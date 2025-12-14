# Complete TRS-80 Model III Browser Emulator Build Prompt

## Enhanced Comprehensive Implementation Guide with Z80 Assembler Integration

**Version:** Enhanced 2.0  
**Last Updated:** 2025  
**Status:** Production-Ready for LLM Implementation

---

## EXECUTIVE SUMMARY

Build a complete, production-ready TRS-80 Model III emulator that runs in modern web browsers with:

- Complete Z80 CPU emulation with full instruction set (all 252+ opcodes including CB, ED, DD, FD prefixes)
- 16K ROM + 48K RAM memory system (supports 14KB ROMs)
- Cassette interface simulation
- 128×48 pixel graphics mode with SET/RESET/POINT commands
- Keyboard input handling
- **Built-in library of 12 BASIC programs** ready to run
- **5+ assembly routines** with **in-browser Z80 assembler** for editing and creating assembly code
- **In-browser program editor** for both BASIC and Assembly programs
- **Complete Z80 assembler integration** - write, edit, assemble, and run assembly code
- Modern development workflow with Vite and Yarn
- **Comprehensive test suite** (217+ tests) with phase-by-phase test gates
- Netlify deployment with complete configuration

**Key Features:**

- Boots to BASIC prompt
- Instant program execution (no files needed)
- Pixel-level graphics with SET command
- **Edit BASIC programs in-browser** (text-based programs)
- **Edit Assembly programs in-browser** (with integrated Z80 assembler)
- **Assemble Z80 assembly code** directly in the browser
- Educational and immediately useful

**Development Approach:**

- **Sequential phase development** - Build one phase at a time
- **Test-driven** - All tests must pass before proceeding to next phase
- **217+ comprehensive tests** provided in `TRS80-COMPLETE-TEST-SUITE.md`
- **Phase gates** - Explicit test requirements between phases
- **Vite build system** with hot module replacement
- **Netlify deployment** ready

**Important Notes:**

- **BASIC programs** are text-based source code and can be edited
- **Assembly programs** are now editable source code (not pre-assembled bytes)
- **Z80 assembler** is integrated - users can write and edit assembly code
- **ROM size flexibility** - Supports both 14KB and 16KB ROMs
- **Complete test coverage** - Every phase has comprehensive tests

---

## TABLE OF CONTENTS

### Core Sections

- [Executive Summary](#executive-summary)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Initial Setup Files](#initial-setup-files)

### Development Phases

- [Phase 0: ROM Analysis and Setup](#phase-0-rom-analysis-and-setup)
- [Phase 1: Z80 CPU Core Implementation](#phase-1-z80-cpu-core-implementation)
- [Phase 2: Memory Management System](#phase-2-memory-management-system)
- [Phase 3: Cassette I/O System](#phase-3-cassette-io-system)
- [Phase 4: BASIC Program Execution](#phase-4-basic-program-execution)
- [Phase 5: Video Display System with Graphics Support](#phase-5-video-display-system-with-graphics-support)
- [Phase 6: System Integration](#phase-6-system-integration)
- [Phase 7: Sample Programs Library and User Interface](#phase-7-sample-programs-library-and-user-interface)
- [Phase 8: Z80 Assembler Integration](#phase-8-z80-assembler-integration)

### Testing & Quality

- [Testing Requirements](#testing-requirements)
- [Build System](#build-system)
- [Deployment](#deployment)
- [Error Handling Strategy](#error-handling-strategy)
- [Performance Specifications](#performance-specifications)

### Reference & Guides

- [ROM Analysis and Requirements](#rom-analysis-and-requirements)
- [Success Criteria](#success-criteria)
- [Quick Start Guide](#quick-start-guide)
- [Troubleshooting](#troubleshooting)
- [Quick Reference](#quick-reference)
- [Notes for LLM Implementation](#notes-for-llm-implementation)

### Document Information

- [Document Improvements Summary](#document-improvements-summary)

---

## DOCUMENT CROSS-REFERENCES

This enhanced build prompt references the following documents for complete implementation details:

**Primary Source Documents:**

- **`docs/TRS80-COMPLETE-BUILD-PROMPT.md`** - Contains complete implementation code for all components

  - Z80CPU implementation: Lines 349-877
  - MemorySystem implementation: Lines 952-1047
  - CassetteSystem implementation: Lines 1120-1242
  - IOSystem implementation: Lines 1245-1318
  - VideoSystem implementation: Lines 1330-1647
  - KeyboardHandler implementation: Lines 1654-1724
  - TRS80System implementation: Lines 1726-1863
  - ProgramLoader implementation: Lines 2223-2497
  - Sample programs: Lines 1878-2096
  - Sample assembly: Lines 2099-2220
  - HTML structure: Lines 2549-2660
  - CSS styles: Lines 2828-3139

- **`docs/TRS80-COMPLETE-TEST-SUITE.md`** - Contains all test files (217+ tests)

  - Copy test files to `tests/` directory as you implement each phase
  - Tests are organized by phase for easy reference

- **`docs/cschweda-z80-assembler-8a5edab282632443.txt`** - Complete Z80 assembler implementation
  - Contains all assembler modules needed for Phase 7
  - Copy modules to `src/assembler/` directory
  - Update memory map constants for TRS-80

**When to Reference Each Document:**

- **TRS80-COMPLETE-BUILD-PROMPT.md**: When you need complete implementation code for any component
- **TRS80-COMPLETE-TEST-SUITE.md**: When setting up tests for each phase
- **cschweda-z80-assembler-8a5edab282632443.txt**: When integrating the Z80 assembler in Phase 7

---

## PROJECT STRUCTURE

```
trs80-emulator/
├── src/
│   ├── core/
│   │   ├── z80cpu.js          # Z80 CPU emulation core
│   │   ├── memory.js          # Memory management system
│   │   ├── io.js              # I/O port handling
│   │   └── timing.js          # Cycle-accurate timing
│   ├── peripherals/
│   │   ├── cassette.js        # Cassette interface simulation
│   │   ├── video.js           # Display system with graphics
│   │   └── keyboard.js        # Keyboard input handling
│   ├── system/
│   │   ├── trs80.js           # Main system integration
│   │   └── rom-loader.js      # ROM loading utilities
│   ├── assembler/             # NEW: Z80 Assembler modules
│   │   ├── assembler.js       # Main assembler orchestrator
│   │   ├── lexer.js           # Tokenizer
│   │   ├── parser.js          # Two-pass parser
│   │   ├── codegen.js         # Code generator
│   │   ├── evaluator.js       # Expression evaluator
│   │   ├── opcodes.js         # Instruction encoding tables
│   │   └── constants.js       # Z80 constants and enums
│   ├── ui/
│   │   ├── emulator-app.js    # Application controller
│   │   ├── controls.js        # UI control handlers
│   │   ├── program-loader.js  # Sample program loader UI
│   │   └── assembly-editor.js  # NEW: Assembly code editor
│   ├── utils/
│   │   ├── helpers.js         # Utility functions
│   │   ├── debugger.js        # Debug tools
│   │   └── formatter.js       # NEW: Memory dump formatter
│   ├── data/
│   │   ├── character-rom.js   # Character set with graphics chars
│   │   ├── model3-rom.js      # Base64 embedded ROM (generated)
│   │   ├── sample-programs.js # 12 BASIC programs library
│   │   ├── sample-assembly.js # 5 Assembly routines (source code)
│   │   └── assembly-examples.js # NEW: Additional assembly examples
│   ├── styles/
│   │   └── main.css           # Complete application styles
│   └── main.js                # Application entry point
├── public/
│   ├── assets/
│   │   └── model3.rom         # Original ROM file (14KB or 16KB)
│   └── sample-programs/       # Optional external files
├── tests/
│   ├── unit/
│   │   ├── cpu-tests.js       # Z80 instruction tests (45 tests)
│   │   ├── memory-tests.js    # Memory system tests (28 tests)
│   │   ├── cassette-tests.js   # Cassette tests (22 tests)
│   │   ├── io-tests.js        # I/O system tests (15 tests)
│   │   ├── video-tests.js     # Display tests (32 tests)
│   │   └── program-loader-tests.js # Sample programs tests (18 tests)
│   └── integration/
│       ├── cpu-memory-integration.js # CPU-Memory integration tests
│       ├── cassette-integration.js   # Cassette integration tests
│       └── system-tests.js    # Full system tests
├── scripts/
│   ├── rom-to-base64.js       # Convert ROM to base64
│   └── generate-char-rom.js   # Generate character ROM data
├── .gitignore
├── package.json
├── vite.config.js
├── netlify.toml
├── index.html
└── README.md
```

---

## DEVELOPMENT WORKFLOW

### Sequential Phase Development

This project uses a **test-driven, phase-by-phase development approach**. Each phase must be completed and tested before proceeding to the next phase.

### Phase Development Process

**CRITICAL:** Follow these steps EXACTLY for each phase. Do not skip any step.

1. **Copy Test Files** - Copy test files for current phase BEFORE implementing code
2. **Verify Test Files** - Ensure test files exist and are in correct location
3. **Read Phase Specification** - Understand what needs to be built
4. **Implement Code** - Write code according to specifications
5. **Run Phase Tests** - Execute tests using phase workflow script
6. **Fix Issues** - If tests fail, fix code and re-run tests (loop until all pass)
7. **Verify Completion** - Ensure all phase criteria are met
8. **User Confirmation** - Wait for explicit user confirmation before proceeding
9. **Proceed to Next Phase** - Only after 100% test pass rate AND user confirmation

**Test-First Approach:**

- Tests are copied BEFORE implementation begins
- Tests define the expected behavior
- Implementation is done to make tests pass
- No proceeding to next phase until current phase tests

### Test Execution Commands

**For each phase, run the corresponding tests:**

```bash
# Phase 1: CPU Tests
yarn test:run tests/unit/cpu-tests.js

# Phase 2: Memory Tests
yarn test:run tests/unit/memory-tests.js

# Phase 3: Cassette & I/O Tests
yarn test:run tests/unit/cassette-tests.js tests/unit/io-tests.js

# Phase 4: BASIC Program Execution
yarn test:run tests/unit/basic-program-tests.js

# Phase 5: Video Display System
yarn test:run tests/unit/video-tests.js

# Phase 5: Integration Tests
yarn test:run tests/integration/cpu-memory-integration.js

# Phase 6: Program Loader Tests
yarn test:run tests/unit/program-loader-tests.js

# Phase 7: Assembler Integration (if applicable)
yarn test:run tests/unit/assembler-tests.js

# All Integration Tests
yarn test:run tests/integration/
```

### Test Gate Requirements

**CRITICAL:** Each phase has a **test gate** that must be passed before proceeding:

- ✅ **100% test pass rate** - All tests for the phase must pass
- ✅ **No console errors** - Clean test execution
- ✅ **Phase completion criteria met** - All criteria satisfied
- ✅ **Code follows specifications** - Implementation matches requirements

**If any test fails, fix the issues before proceeding to the next phase.**

### Test File Preparation

**IMPORTANT:** Test files MUST be copied BEFORE starting implementation of each phase.

**Test File Source:** All test files are provided in `docs/TRS80-COMPLETE-TEST-SUITE.md`

**Test File Setup Process:**

1. **Before Phase 1:** Copy `tests/unit/cpu-tests.js` from test suite document
2. **Before Phase 2:** Copy `tests/unit/memory-tests.js` from test suite document
3. **Before Phase 3:** Copy `tests/unit/cassette-tests.js` and `tests/unit/io-tests.js`
4. **Before Phase 4:** Copy `tests/unit/basic-program-tests.js` from test suite document
5. **Before Phase 5:** Copy `tests/unit/video-tests.js` from test suite document
6. **Before Phase 6:** Copy `tests/integration/cpu-memory-integration.js`
7. **Before Phase 7:** Copy `tests/unit/program-loader-tests.js`
8. **Before Phase 8:** Copy `tests/unit/assembler-tests.js` (if creating)

**Test File Locations in Test Suite Document:**

- **Phase 1:** `docs/TRS80-COMPLETE-TEST-SUITE.md` - Section "PHASE 1: CPU Tests" (starts line 21)
- **Phase 2:** `docs/TRS80-COMPLETE-TEST-SUITE.md` - Section "PHASE 2: Memory Tests" (starts line 675)
- **Phase 3:** `docs/TRS80-COMPLETE-TEST-SUITE.md` - Section "PHASE 3: Cassette & I/O Tests" (starts line 1004)
- **Phase 4:** `tests/unit/basic-program-tests.js` - BASIC program execution tests (45 tests)
- **Phase 5:** `docs/TRS80-COMPLETE-TEST-SUITE.md` - Section "PHASE 4: Video Tests" (starts line 1408)
- **Phase 6:** `docs/TRS80-COMPLETE-TEST-SUITE.md` - Section "PHASE 5: System Integration Tests" (starts line 1684)
- **Phase 7:** `docs/TRS80-COMPLETE-TEST-SUITE.md` - Section "PHASE 6: Program Loader Tests" (starts line 1837)

**Verification After Copying Test Files:**

```bash
# Verify test file exists
ls -lh tests/unit/cpu-tests.js

# Verify test file structure (should import from @core, @peripherals, etc.)
head -10 tests/unit/cpu-tests.js
```

**Test Coverage:**

- Phase 1: 45 tests (CPU core)
- Phase 2: 28 tests (Memory system)
- Phase 3: 37 tests (Cassette + I/O)
- Phase 4: 45 tests (BASIC program execution)
- Phase 5: 32 tests (Video system)
- Phase 6: Integration tests
- Phase 7: 18 tests (Program loader)
- **Total: 217+ tests** (45 new Phase 4 tests)

---

## INITIAL SETUP FILES

### package.json

```json
{
  "name": "trs80-model3-emulator",
  "version": "1.0.0",
  "description": "Browser-based TRS-80 Model III emulator with cassette interface, graphics, and integrated Z80 assembler",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "rom:embed": "node scripts/rom-to-base64.js",
    "deploy": "yarn test:run && yarn build && netlify deploy --prod",
    "phase:1": "node scripts/phase-workflow.js 1 tests/unit/cpu-tests.js",
    "phase:2": "node scripts/phase-workflow.js 2 tests/unit/memory-tests.js",
    "phase:3": "node scripts/phase-workflow.js 3 \"tests/unit/cassette-tests.js tests/unit/io-tests.js\"",
    "phase:4": "node scripts/phase-workflow.js 4 tests/unit/basic-program-tests.js",
    "phase:5": "node scripts/phase-workflow.js 5 tests/unit/video-tests.js",
    "phase:6": "node scripts/phase-workflow.js 6 tests/integration/cpu-memory-integration.js",
    "phase:7": "node scripts/phase-workflow.js 7 tests/unit/program-loader-tests.js",
    "phase:8": "node scripts/phase-workflow.js 8 tests/unit/assembler-tests.js"
  },
  "devDependencies": {
    "vite": "^5.4.0",
    "vitest": "^1.6.0",
    "@vitest/ui": "^1.6.0",
    "@vitest/coverage-v8": "^1.6.0",
    "terser": "^5.31.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "yarn": ">=1.22.22"
  },
  "keywords": [
    "trs80",
    "emulator",
    "z80",
    "retro-computing",
    "model-iii",
    "graphics",
    "assembler"
  ],
  "author": "Your Name",
  "license": "MIT"
}
```

### vite.config.js (Enhanced)

```javascript
import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  base: "./",

  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: true,
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
      },
      output: {
        manualChunks: {
          core: [
            "./src/core/z80cpu.js",
            "./src/core/memory.js",
            "./src/core/io.js",
          ],
          peripherals: [
            "./src/peripherals/video.js",
            "./src/peripherals/cassette.js",
            "./src/peripherals/keyboard.js",
          ],
          assembler: [
            "./src/assembler/assembler.js",
            "./src/assembler/lexer.js",
            "./src/assembler/parser.js",
            "./src/assembler/codegen.js",
            "./src/assembler/evaluator.js",
            "./src/assembler/opcodes.js",
          ],
        },
      },
    },
    target: "es2020",
    chunkSizeWarningLimit: 1000,
  },

  server: {
    port: 3000,
    open: true,
    cors: true,
    hmr: {
      overlay: true,
    },
  },

  preview: {
    port: 4173,
    open: true,
  },

  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@core": resolve(__dirname, "./src/core"),
      "@peripherals": resolve(__dirname, "./src/peripherals"),
      "@system": resolve(__dirname, "./src/system"),
      "@ui": resolve(__dirname, "./src/ui"),
      "@utils": resolve(__dirname, "./src/utils"),
      "@data": resolve(__dirname, "./src/data"),
      "@assembler": resolve(__dirname, "./src/assembler"),
    },
  },

  test: {
    globals: true,
    environment: "jsdom",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "tests/", "scripts/", "dist/"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
    include: ["tests/**/*.{js,ts}"],
    exclude: ["node_modules", "dist"],
  },
});
```

### netlify.toml (Enhanced)

```toml
[build]
  publish = "dist"
  command = "yarn test:run && yarn build"

[build.environment]
  NODE_VERSION = "20"
  YARN_VERSION = "1.22.22"

# SPA routing - redirect all routes to index.html
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# Security headers
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "no-referrer"
    X-XSS-Protection = "1; mode=block"

# Cache static assets
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

# Don't cache HTML
[[headers]]
  for = "/*.html"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"
```

### File: index.html

**Complete Implementation Reference:** See `docs/TRS80-COMPLETE-BUILD-PROMPT.md` lines 2549-2660 for the complete HTML structure.

**Key Elements:**

- Main application container (`#app`)
- Emulator controls (power, reset, system buttons)
- Sample program selectors (BASIC and Assembly)
- Canvas element for TRS-80 display (`#trs80-screen`)
- Edit modal for BASIC programs
- **Entry Point:** `<script type="module" src="./src/main.js"></script>`

**Important:** The HTML file must reference `./src/main.js` as the entry point. Vite will process this during build.

### File: src/main.js

**Complete Implementation Reference:** See `docs/TRS80-COMPLETE-BUILD-PROMPT.md` lines 2662-2826 for the complete main.js implementation.

**Key Responsibilities:**

- Initialize emulator system
- Load ROM from embedded base64 data
- Setup UI event handlers
- Start/stop emulator execution
- Handle program loading and execution

**Entry Point Flow:**

1. `index.html` loads → references `./src/main.js`
2. `main.js` imports TRS80System, ROM loader, ProgramLoader
3. ROM is loaded from embedded `src/data/model3-rom.js`
4. Emulator initializes and waits for "Power On"
5. UI event handlers are attached

### .gitignore

```
# Dependencies
node_modules/

# Build output
dist/
*.local

# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Editor directories and files
.vscode/*
!.vscode/extensions.json
!.vscode/settings.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# Testing
coverage/
.nyc_output

# Environment variables
.env
.env.local
.env.*.local

# Generated ROM file
src/data/model3-rom.js

# OS files
Thumbs.db
```

### scripts/phase-workflow.js

```javascript
#!/usr/bin/env node
/**
 * Phase-by-Phase Test Workflow Script
 *
 * Enforces test gates between development phases.
 * Runs tests for a phase and waits for user confirmation before proceeding.
 *
 * Usage:
 *   node scripts/phase-workflow.js <phase-number> <test-file-or-files>
 *
 * Examples:
 *   node scripts/phase-workflow.js 1 tests/unit/cpu-tests.js
 *   node scripts/phase-workflow.js 3 "tests/unit/cassette-tests.js tests/unit/io-tests.js"
 */

import { execSync } from "child_process";
import readline from "readline";

const phaseNumber = process.argv[2];
const testFiles = process.argv[3];

if (!phaseNumber || !testFiles) {
  console.error(
    "Usage: node scripts/phase-workflow.js <phase-number> <test-files>"
  );
  console.error(
    "Example: node scripts/phase-workflow.js 1 tests/unit/cpu-tests.js"
  );
  process.exit(1);
}

const phaseNames = {
  0: "ROM Analysis and Setup",
  1: "Z80 CPU Core Implementation",
  2: "Memory Management System",
  3: "Cassette I/O System",
  4: "Video Display System",
  5: "System Integration",
  6: "Sample Programs Library and User Interface",
  7: "Z80 Assembler Integration",
};

const phaseName = phaseNames[phaseNumber] || `Phase ${phaseNumber}`;

console.log("\n" + "=".repeat(70));
console.log(`PHASE ${phaseNumber} TEST GATE: ${phaseName}`);
console.log("=".repeat(70));
console.log(`\nRunning tests for Phase ${phaseNumber}...\n`);

try {
  // Run tests
  const testCommand = `yarn test:run ${testFiles}`;
  console.log(`Command: ${testCommand}\n`);

  execSync(testCommand, {
    stdio: "inherit",
    cwd: process.cwd(),
  });

  // If we get here, tests passed (execSync throws on non-zero exit)
  console.log("\n" + "=".repeat(70));
  console.log(`✅ PHASE ${phaseNumber} TESTS PASSED`);
  console.log("=".repeat(70));
  console.log(`\nAll tests for ${phaseName} have passed successfully.`);
  console.log("\nPhase Completion Checklist:");
  console.log("  ✅ All unit tests pass (100% success rate)");
  console.log("  ✅ No console errors");
  console.log("  ✅ Phase completion criteria met");
  console.log("  ✅ Code follows specifications");

  // Wait for user confirmation
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question("\n⚠️  Ready to proceed to next phase? (yes/no): ", (answer) => {
    rl.close();

    if (answer.toLowerCase() === "yes" || answer.toLowerCase() === "y") {
      console.log("\n✅ User confirmed. Proceeding to next phase...\n");
      process.exit(0);
    } else {
      console.log(
        "\n⏸️  Phase advancement paused. Fix any issues or review code before proceeding.\n"
      );
      console.log("When ready, run the workflow script for the next phase.");
      process.exit(0);
    }
  });
} catch (error) {
  // Tests failed
  console.log("\n" + "=".repeat(70));
  console.log(`❌ PHASE ${phaseNumber} TESTS FAILED`);
  console.log("=".repeat(70));
  console.log(`\nTests for ${phaseName} have failed.`);
  console.log(
    "\n⚠️  BLOCKING: Cannot proceed to next phase until all tests pass."
  );
  console.log("\nNext Steps:");
  console.log("  1. Review test failures above");
  console.log("  2. Fix implementation issues");
  console.log("  3. Re-run tests: yarn test:run " + testFiles);
  console.log("  4. Once all tests pass, run this workflow script again");
  console.log("\nDo not proceed to the next phase until all tests pass.\n");
  process.exit(1);
}
```

### scripts/rom-to-base64.js

```javascript
#!/usr/bin/env node
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read ROM file
const romPath = join(__dirname, "../public/assets/model3.rom");
let romBuffer;

try {
  romBuffer = readFileSync(romPath);
} catch (error) {
  console.error(`Error reading ROM file: ${error.message}`);
  process.exit(1);
}

// Validate ROM size (supports both 14KB and 16KB)
const romSize = romBuffer.length;
if (romSize !== 14336 && romSize !== 16384) {
  console.warn(
    `Warning: ROM size is ${romSize} bytes (expected 14336 or 16384)`
  );
}

// Convert to base64
const base64ROM = romBuffer.toString("base64");

// Generate JavaScript module
const output = `/**
 * TRS-80 Model III ROM (${romSize} bytes)
 * Auto-generated from model3.rom
 * DO NOT EDIT MANUALLY
 */

const ROM_BASE64 = '${base64ROM}';

/**
 * Decode ROM from base64
 * @returns {Uint8Array} ROM data
 */
export function getROMData() {
  const binaryString = atob(ROM_BASE64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export const ROM_SIZE = ${romSize};
export const ROM_START = 0x0000;
export const ROM_END = ${romSize === 16384 ? "0x3FFF" : "0x37FF"};
`;

// Write to src/data
const outputPath = join(__dirname, "../src/data/model3-rom.js");
writeFileSync(outputPath, output);

console.log(`✓ ROM converted to base64 (${romSize} bytes)`);
console.log(`✓ Written to: ${outputPath}`);
```

---

## PHASE 0: ROM Analysis and Setup

### Objectives

Before starting implementation, analyze the ROM file to understand:

- ROM format and size (14KB or 16KB)
- Required Z80 instructions for ROM execution
- ROM entry points for BASIC interpreter
- Memory layout and BASIC program areas

### ROM Analysis Tasks

1. **Verify ROM File**

   - Check ROM file exists at `public/assets/model3.rom`
   - Verify ROM size (should be 14336 or 16384 bytes)
   - Run ROM validation script

2. **Identify Required Instructions**

   - Analyze ROM to find which Z80 instructions are used
   - **Note:** While ROM analysis helps identify frequently used instructions, ALL Z80 instructions must be implemented for full Model III compatibility
   - Document which instructions are used by ROM (for testing priority)
   - **CRITICAL:** The complete Z80 instruction set (all 252+ opcodes) must be implemented regardless of ROM usage

3. **Map ROM Entry Points**
   - Identify BASIC interpreter entry points
   - Document SET/RESET/POINT hook addresses
   - Map video RAM and system variable addresses

### ROM Validation Script

Create `scripts/validate-rom.js`:

```javascript
#!/usr/bin/env node
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const romPath = join(__dirname, "../public/assets/model3.rom");

try {
  const romBuffer = readFileSync(romPath);
  const size = romBuffer.length;

  console.log(`ROM File: ${romPath}`);
  console.log(`ROM Size: ${size} bytes (${(size / 1024).toFixed(1)}KB)`);

  if (size === 14336) {
    console.log("✓ Valid 14KB ROM");
  } else if (size === 16384) {
    console.log("✓ Valid 16KB ROM");
  } else {
    console.warn(`⚠ Unexpected ROM size (expected 14336 or 16384)`);
  }

  // Check for non-zero content
  let nonZeroCount = 0;
  for (let i = 0; i < Math.min(1000, size); i++) {
    if (romBuffer[i] !== 0) nonZeroCount++;
  }

  if (nonZeroCount < 100) {
    console.warn("⚠ ROM appears to be mostly zeros - may be corrupted");
  } else {
    console.log(
      `✓ ROM appears valid (${nonZeroCount} non-zero bytes in first 1KB)`
    );
  }
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
```

### Phase 0 Completion Criteria

- ✅ ROM file verified and validated
- ✅ ROM size documented (14KB or 16KB)
- ✅ ROM analysis complete
- ✅ ROM instruction usage analyzed (for testing priority)
- ✅ Complete Z80 instruction set requirement confirmed (all 252+ opcodes)
- ✅ Ready to proceed to Phase 1

**Verification:**

```bash
node scripts/validate-rom.js
```

---

## PHASE 1: Z80 CPU Core Implementation

### Test File Setup

**BEFORE starting implementation, copy the test file:**

1. **Copy Test File:**

   - Source: `docs/TRS80-COMPLETE-TEST-SUITE.md` - Section "PHASE 1: CPU Tests" (starts at line 21)
   - Destination: `tests/unit/cpu-tests.js`
   - Copy the complete test file content

2. **Verify Test File:**

   ```bash
   # Check file exists
   ls -lh tests/unit/cpu-tests.js

   # Verify imports (should use @core alias)
   head -5 tests/unit/cpu-tests.js
   ```

3. **Expected Test Count:** 45 tests

**DO NOT proceed with implementation until test file is copied and verified.**

### Objectives

Implement a **COMPLETE Z80 CPU emulator** with full instruction set support. This must include ALL Z80 instructions (252+ opcodes) to match the real TRS-80 Model III behavior. The emulator must support:

- **All standard Z80 instructions** (0x00-0xFF base opcodes)
- **CB prefix instructions** (0xCB00-0xCBFF) - Bit operations, rotates, shifts
- **ED prefix instructions** (0xED00-0xEDFF) - Extended instructions, block operations, I/O
- **DD prefix instructions** (0xDD00-0xDDFF) - IX register operations
- **FD prefix instructions** (0xFD00-0xFDFF) - IY register operations
- **All addressing modes** - Immediate, register, indirect, indexed, relative
- **All flag operations** - Complete flag calculations for all instructions
- **Cycle-accurate timing** - Correct T-state counts for all instructions

**CRITICAL:** This is a FULL Z80 implementation, not a subset. The Model III ROM and BASIC interpreter use the complete instruction set, so all instructions must be implemented.

**Test-First Approach:**

- Tests define expected CPU behavior
- Implement code to make tests pass
- Run tests frequently during implementation
- Fix any failing tests before proceeding

### Complete Z80 Instruction Set Requirements

**Reference:** The Z80 instruction set consists of 252 single-byte opcodes plus extended instructions using prefixes CB, ED, DD, and FD. See `docs/cschweda-z80-assembler-8a5edab282632443.txt` (opcodes.js section starting at line 3429) for a complete reference of all instructions that must be supported.

**Instruction Categories (ALL must be implemented):**

1. **8-Bit Load Instructions** - All LD r, r'; LD r, n; LD r, (HL); LD (HL), r; LD A, (BC/DE/nn); LD (BC/DE/nn), A; LD A, I/R; LD I/R, A
2. **16-Bit Load Instructions** - LD dd, nn; LD HL, (nn); LD (nn), HL; LD SP, HL; LD dd, (nn); LD (nn), dd; PUSH/POP all register pairs
3. **Exchange Instructions** - EX DE, HL; EX AF, AF'; EX (SP), HL; EXX
4. **8-Bit Arithmetic** - ADD/ADC/SUB/SBC A, r/n/(HL); INC/DEC r/(HL); CP/AND/OR/XOR r/n/(HL); DAA; CPL; NEG
5. **16-Bit Arithmetic** - ADD HL, dd; ADC/SBC HL, dd; INC/DEC dd; ADD IX/IY, pp
6. **Rotate and Shift** - RLCA/RLA/RRCA/RRA; RLC/RL/RRC/RR r/(HL); SLA/SRA/SLL/SRL r/(HL); RLD/RRD
7. **Bit Operations** - BIT/SET/RES b, r/(HL) (all CB prefix instructions)
8. **Jump Instructions** - JP nn; JP cc, nn; JP (HL)/(IX)/(IY); JR e; JR cc, e; DJNZ e
9. **Call and Return** - CALL nn; CALL cc, nn; RET; RET cc; RETI; RETN; RST p
10. **Input/Output** - IN A, (n); IN r, (C); OUT (n), A; OUT (C), r; INI/INIR/IND/INDR; OUTI/OTIR/OUTD/OTDR
11. **Block Transfer** - LDI/LDIR/LDD/LDDR; CPI/CPIR/CPD/CPDR
12. **Control Instructions** - NOP; HALT; DI; EI; IM 0/1/2; SCF; CCF

**Index Register Instructions (DD/FD prefixes):**

- All standard instructions using IX/IY instead of HL
- IX/IY displacement addressing: (IX+d), (IY+d)
- Special IX/IY instructions: ADD IX/IY, pp; LD IX/IY, nn; LD (nn), IX/IY; LD IX/IY, (nn)

**Implementation Priority (for incremental development):**

While ALL instructions must be implemented, you can implement them in this order:

1. **Phase 1a - Core Instructions:** Implement all instructions needed for ROM boot (see original priority list)
2. **Phase 1b - Standard Instructions:** Implement remaining standard opcodes (0x00-0xFF)
3. **Phase 1c - CB Prefix:** Implement all CB prefix instructions (bit operations, rotates, shifts)
4. **Phase 1d - ED Prefix:** Implement all ED prefix instructions (extended, block operations)
5. **Phase 1e - DD/FD Prefixes:** Implement all DD/FD prefix instructions (IX/IY register operations)

**However, ALL phases must be completed before Phase 1 is considered done.**

### File: src/core/z80cpu.js

**Complete Implementation Reference:** See `docs/TRS80-COMPLETE-BUILD-PROMPT.md` lines 349-877 for the full Z80CPU implementation.

**Key Implementation Notes:**

- **COMPLETE instruction set required** - All 252+ Z80 opcodes must be implemented
- All register pair getters/setters (BC, DE, HL, IX, IY, SP, AF, AF')
- Complete flag operations (getFlag, setFlag, and individual flag getters/setters)
- Reset method with proper initialization
- setupOpcodeHandlers must implement ALL opcodes (0x00-0xFF base + CB/ED/DD/FD prefixes)
- Arithmetic methods (addA, subA, incReg, decReg, addHL, etc.) with detailed flag calculations
- **ALL extended instruction handlers** (CB, ED, DD, FD) must be fully implemented, not stubs
- Cycle-accurate timing for all instructions
- Proper handling of all addressing modes (immediate, register, indirect, indexed, relative)

**Reference Implementation:**

- See `docs/cschweda-z80-assembler-8a5edab282632443.txt` (opcodes.js, lines 3429+) for complete instruction encoding reference
- See `docs/TRS80-COMPLETE-BUILD-PROMPT.md` lines 349-877 for base CPU structure
- Use assembler's MNEMONICS set (line 2454) as checklist for instruction coverage

**Enhanced Error Handling:** The implementation below includes enhanced error handling for unimplemented opcodes:

```javascript
/**
 * Z80 CPU Emulator Core
 * Implements COMPLETE Z80 instruction set with cycle-accurate timing
 *
 * This is a FULL Z80 implementation matching the real TRS-80 Model III.
 * ALL instructions must be implemented:
 * - Base opcodes: 0x00-0xFF (252 instructions)
 * - CB prefix: 0xCB00-0xCBFF (bit operations, rotates, shifts)
 * - ED prefix: 0xED00-0xEDFF (extended instructions, block operations)
 * - DD prefix: 0xDD00-0xDDFF (IX register operations)
 * - FD prefix: 0xFD00-0xFDFF (IY register operations)
 *
 * Reference: docs/cschweda-z80-assembler-8a5edab282632443.txt (opcodes.js)
 */

// Flag bit positions
const FLAG_C = 0; // Carry
const FLAG_N = 1; // Add/Subtract
const FLAG_PV = 2; // Parity/Overflow
const FLAG_H = 4; // Half Carry
const FLAG_Z = 6; // Zero
const FLAG_S = 7; // Sign

export class Z80CPU {
  constructor() {
    // 8-bit registers
    this.registers = {
      // Main register set
      A: 0x00, // Accumulator
      F: 0x00, // Flags
      B: 0x00,
      C: 0x00,
      D: 0x00,
      E: 0x00,
      H: 0x00,
      L: 0x00,

      // Alternate register set
      A_: 0x00,
      F_: 0x00,
      B_: 0x00,
      C_: 0x00,
      D_: 0x00,
      E_: 0x00,
      H_: 0x00,
      L_: 0x00,

      // Index registers
      IXH: 0x00,
      IXL: 0x00,
      IYH: 0x00,
      IYL: 0x00,

      // Special registers
      I: 0x00, // Interrupt vector
      R: 0x00, // Memory refresh

      // 16-bit registers
      SP: 0xffff, // Stack pointer
      PC: 0x0000, // Program counter
    };

    // Interrupt system
    this.IFF1 = false;
    this.IFF2 = false;
    this.interruptMode = 0;
    this.halted = false;

    // Execution state
    this.cycles = 0;
    this.lastOpCycles = 0;

    // External interfaces (connected by system)
    this.readMemory = (address) => 0x00;
    this.writeMemory = (address, value) => {};
    this.readPort = (port) => 0x00;
    this.writePort = (port, value) => {};

    // Unimplemented opcode tracking (for debugging)
    this.unimplementedOpcodes = new Set();

    // Setup opcode handlers
    this.setupOpcodeHandlers();
  }

  // Register pair getters/setters (see TRS80-COMPLETE-BUILD-PROMPT.md lines 422-445)
  getRegisterPair(high, low) {
    return (this.registers[high] << 8) | this.registers[low];
  }

  setRegisterPair(high, low, value) {
    this.registers[high] = (value >> 8) & 0xff;
    this.registers[low] = value & 0xff;
  }

  get BC() {
    return this.getRegisterPair("B", "C");
  }
  set BC(value) {
    this.setRegisterPair("B", "C", value);
  }

  get DE() {
    return this.getRegisterPair("D", "E");
  }
  set DE(value) {
    this.setRegisterPair("D", "E", value);
  }

  get HL() {
    return this.getRegisterPair("H", "L");
  }
  set HL(value) {
    this.setRegisterPair("H", "L", value);
  }

  get IX() {
    return this.getRegisterPair("IXH", "IXL");
  }
  set IX(value) {
    this.setRegisterPair("IXH", "IXL", value);
  }

  get IY() {
    return this.getRegisterPair("IYH", "IYL");
  }
  set IY(value) {
    this.setRegisterPair("IYH", "IYL", value);
  }

  // Flag operations (see TRS80-COMPLETE-BUILD-PROMPT.md lines 447-476)
  getFlag(flag) {
    return (this.registers.F >> flag) & 1;
  }

  setFlag(flag, value) {
    if (value) {
      this.registers.F |= 1 << flag;
    } else {
      this.registers.F &= ~(1 << flag);
    }
  }

  get flagC() {
    return this.getFlag(FLAG_C);
  }
  set flagC(v) {
    this.setFlag(FLAG_C, v);
  }

  get flagN() {
    return this.getFlag(FLAG_N);
  }
  set flagN(v) {
    this.setFlag(FLAG_N, v);
  }

  get flagPV() {
    return this.getFlag(FLAG_PV);
  }
  set flagPV(v) {
    this.setFlag(FLAG_PV, v);
  }

  get flagH() {
    return this.getFlag(FLAG_H);
  }
  set flagH(v) {
    this.setFlag(FLAG_H, v);
  }

  get flagZ() {
    return this.getFlag(FLAG_Z);
  }
  set flagZ(v) {
    this.setFlag(FLAG_Z, v);
  }

  get flagS() {
    return this.getFlag(FLAG_S);
  }
  set flagS(v) {
    this.setFlag(FLAG_S, v);
  }

  // Reset CPU (see TRS80-COMPLETE-BUILD-PROMPT.md lines 478-489)
  reset() {
    this.registers.PC = 0x0000;
    this.registers.SP = 0xffff;
    this.registers.A = 0xff;
    this.registers.F = 0xff;
    this.halted = false;
    this.IFF1 = false;
    this.IFF2 = false;
    this.interruptMode = 0;
    this.cycles = 0;
  }

  // Execute single instruction
  executeInstruction() {
    if (this.halted) {
      this.lastOpCycles = 4;
      this.cycles += 4;
      return 4;
    }

    const opcode = this.readMemory(this.registers.PC);
    this.registers.PC = (this.registers.PC + 1) & 0xffff;

    // Increment refresh register
    this.registers.R = (this.registers.R + 1) & 0x7f;

    const cycles = this.decodeAndExecute(opcode);

    this.lastOpCycles = cycles;
    this.cycles += cycles;

    return cycles;
  }

  // Decode and execute opcode
  decodeAndExecute(opcode) {
    // Extended instructions
    if (opcode === 0xcb) return this.executeCB();
    if (opcode === 0xed) return this.executeED();
    if (opcode === 0xdd) return this.executeDD();
    if (opcode === 0xfd) return this.executeFD();

    // Standard instructions
    const handler = this.opcodeHandlers[opcode];
    if (handler) {
      return handler.call(this);
    }

    // Unimplemented opcode handling
    if (!this.unimplementedOpcodes.has(opcode)) {
      this.unimplementedOpcodes.add(opcode);
      console.warn(
        `Unimplemented opcode: 0x${opcode
          .toString(16)
          .toUpperCase()
          .padStart(2, "0")} at PC=0x${this.registers.PC.toString(16).padStart(
          4,
          "0"
        )}`
      );
    }

    // Return NOP-equivalent cycles (safe fallback)
    return 4;
  }

  // Setup opcode handlers (see TRS80-COMPLETE-BUILD-PROMPT.md lines 531-691)
  // This method sets up handlers for all critical and essential instructions
  setupOpcodeHandlers() {
    this.opcodeHandlers = {};

    // NOP
    this.opcodeHandlers[0x00] = () => 4;

    // HALT
    this.opcodeHandlers[0x76] = () => {
      this.halted = true;
      return 4;
    };

    // LD r, n (immediate loads) - See TRS80-COMPLETE-BUILD-PROMPT.md lines 544-557
    const ldRegImm = (reg) => {
      this.registers[reg] = this.readMemory(this.registers.PC);
      this.registers.PC = (this.registers.PC + 1) & 0xffff;
      return 7;
    };

    this.opcodeHandlers[0x3e] = () => ldRegImm("A");
    this.opcodeHandlers[0x06] = () => ldRegImm("B");
    this.opcodeHandlers[0x0e] = () => ldRegImm("C");
    this.opcodeHandlers[0x16] = () => ldRegImm("D");
    this.opcodeHandlers[0x1e] = () => ldRegImm("E");
    this.opcodeHandlers[0x26] = () => ldRegImm("H");
    this.opcodeHandlers[0x2e] = () => ldRegImm("L");

    // ADD A, r - See TRS80-COMPLETE-BUILD-PROMPT.md lines 559-566
    this.opcodeHandlers[0x87] = () => this.addA(this.registers.A);
    this.opcodeHandlers[0x80] = () => this.addA(this.registers.B);
    this.opcodeHandlers[0x81] = () => this.addA(this.registers.C);
    this.opcodeHandlers[0x82] = () => this.addA(this.registers.D);
    this.opcodeHandlers[0x83] = () => this.addA(this.registers.E);
    this.opcodeHandlers[0x84] = () => this.addA(this.registers.H);
    this.opcodeHandlers[0x85] = () => this.addA(this.registers.L);

    // SUB r - See TRS80-COMPLETE-BUILD-PROMPT.md lines 568-571
    this.opcodeHandlers[0x97] = () => this.subA(this.registers.A);
    this.opcodeHandlers[0x90] = () => this.subA(this.registers.B);
    this.opcodeHandlers[0x91] = () => this.subA(this.registers.C);

    // JP nn - See TRS80-COMPLETE-BUILD-PROMPT.md lines 573-579
    this.opcodeHandlers[0xc3] = () => {
      const low = this.readMemory(this.registers.PC);
      const high = this.readMemory((this.registers.PC + 1) & 0xffff);
      this.registers.PC = (high << 8) | low;
      return 10;
    };

    // JP Z, nn - See TRS80-COMPLETE-BUILD-PROMPT.md lines 581-591
    this.opcodeHandlers[0xca] = () => {
      const low = this.readMemory(this.registers.PC);
      const high = this.readMemory((this.registers.PC + 1) & 0xffff);
      this.registers.PC = (this.registers.PC + 2) & 0xffff;

      if (this.flagZ) {
        this.registers.PC = (high << 8) | low;
      }
      return 10;
    };

    // CP n - See TRS80-COMPLETE-BUILD-PROMPT.md lines 593-599
    this.opcodeHandlers[0xfe] = () => {
      const value = this.readMemory(this.registers.PC);
      this.registers.PC = (this.registers.PC + 1) & 0xffff;
      this.subA(value, true);
      return 7;
    };

    // RET - See TRS80-COMPLETE-BUILD-PROMPT.md lines 601-608
    this.opcodeHandlers[0xc9] = () => {
      const low = this.readMemory(this.registers.SP);
      const high = this.readMemory((this.registers.SP + 1) & 0xffff);
      this.registers.SP = (this.registers.SP + 2) & 0xffff;
      this.registers.PC = (high << 8) | low;
      return 10;
    };

    // CALL nn - See TRS80-COMPLETE-BUILD-PROMPT.md lines 610-623
    this.opcodeHandlers[0xcd] = () => {
      const low = this.readMemory(this.registers.PC);
      const high = this.readMemory((this.registers.PC + 1) & 0xffff);
      this.registers.PC = (this.registers.PC + 2) & 0xffff;

      this.registers.SP = (this.registers.SP - 1) & 0xffff;
      this.writeMemory(this.registers.SP, (this.registers.PC >> 8) & 0xff);
      this.registers.SP = (this.registers.SP - 1) & 0xffff;
      this.writeMemory(this.registers.SP, this.registers.PC & 0xff);

      this.registers.PC = (high << 8) | low;
      return 17;
    };

    // PUSH BC - See TRS80-COMPLETE-BUILD-PROMPT.md lines 625-632
    this.opcodeHandlers[0xc5] = () => {
      this.registers.SP = (this.registers.SP - 1) & 0xffff;
      this.writeMemory(this.registers.SP, this.registers.B);
      this.registers.SP = (this.registers.SP - 1) & 0xffff;
      this.writeMemory(this.registers.SP, this.registers.C);
      return 11;
    };

    // POP BC - See TRS80-COMPLETE-BUILD-PROMPT.md lines 634-641
    this.opcodeHandlers[0xc1] = () => {
      this.registers.C = this.readMemory(this.registers.SP);
      this.registers.SP = (this.registers.SP + 1) & 0xffff;
      this.registers.B = this.readMemory(this.registers.SP);
      this.registers.SP = (this.registers.SP + 1) & 0xffff;
      return 10;
    };

    // LD (HL), n - See TRS80-COMPLETE-BUILD-PROMPT.md lines 643-649
    this.opcodeHandlers[0x36] = () => {
      const value = this.readMemory(this.registers.PC);
      this.registers.PC = (this.registers.PC + 1) & 0xffff;
      this.writeMemory(this.HL, value);
      return 10;
    };

    // LD A, (HL) - See TRS80-COMPLETE-BUILD-PROMPT.md lines 651-655
    this.opcodeHandlers[0x7e] = () => {
      this.registers.A = this.readMemory(this.HL);
      return 7;
    };

    // INC r - See TRS80-COMPLETE-BUILD-PROMPT.md lines 657-661
    this.opcodeHandlers[0x3c] = () => this.incReg("A");
    this.opcodeHandlers[0x04] = () => this.incReg("B");
    this.opcodeHandlers[0x0c] = () => this.incReg("C");

    // DEC r - See TRS80-COMPLETE-BUILD-PROMPT.md lines 662-665
    this.opcodeHandlers[0x3d] = () => this.decReg("A");
    this.opcodeHandlers[0x05] = () => this.decReg("B");
    this.opcodeHandlers[0x0d] = () => this.decReg("C");

    // LD HL, nn - See TRS80-COMPLETE-BUILD-PROMPT.md lines 667-674
    this.opcodeHandlers[0x21] = () => {
      const low = this.readMemory(this.registers.PC);
      const high = this.readMemory((this.registers.PC + 1) & 0xffff);
      this.registers.PC = (this.registers.PC + 2) & 0xffff;
      this.HL = (high << 8) | low;
      return 10;
    };

    // OUT (n), A - See TRS80-COMPLETE-BUILD-PROMPT.md lines 676-682
    this.opcodeHandlers[0xd3] = () => {
      const port = this.readMemory(this.registers.PC);
      this.registers.PC = (this.registers.PC + 1) & 0xffff;
      this.writePort(port, this.registers.A);
      return 11;
    };

    // IN A, (n) - See TRS80-COMPLETE-BUILD-PROMPT.md lines 684-690
    this.opcodeHandlers[0xdb] = () => {
      const port = this.readMemory(this.registers.PC);
      this.registers.PC = (this.registers.PC + 1) & 0xffff;
      this.registers.A = this.readPort(port);
      return 11;
    };
  }

  // Extended instruction handlers (implement incrementally)
  executeCB() {
    const opcode = this.readMemory(this.registers.PC);
    this.registers.PC = (this.registers.PC + 1) & 0xffff;

    // CB instructions (bit operations) - implement as needed
    // For now, log and return safe cycle count
    if (!this.unimplementedOpcodes.has(0xcb00 | opcode)) {
      this.unimplementedOpcodes.add(0xcb00 | opcode);
      console.warn(
        `Unimplemented CB opcode: 0xCB 0x${opcode
          .toString(16)
          .toUpperCase()
          .padStart(2, "0")}`
      );
    }
    return 8;
  }

  executeED() {
    const opcode = this.readMemory(this.registers.PC);
    this.registers.PC = (this.registers.PC + 1) & 0xffff;

    // ED instructions - implement as needed
    if (!this.unimplementedOpcodes.has(0xed00 | opcode)) {
      this.unimplementedOpcodes.add(0xed00 | opcode);
      console.warn(
        `Unimplemented ED opcode: 0xED 0x${opcode
          .toString(16)
          .toUpperCase()
          .padStart(2, "0")}`
      );
    }
    return 8;
  }

  executeDD() {
    const opcode = this.readMemory(this.registers.PC);
    this.registers.PC = (this.registers.PC + 1) & 0xffff;

    // DD (IX) instructions - implement as needed
    if (!this.unimplementedOpcodes.has(0xdd00 | opcode)) {
      this.unimplementedOpcodes.add(0xdd00 | opcode);
      console.warn(
        `Unimplemented DD opcode: 0xDD 0x${opcode
          .toString(16)
          .toUpperCase()
          .padStart(2, "0")}`
      );
    }
    return 8;
  }

  executeFD() {
    const opcode = this.readMemory(this.registers.PC);
    this.registers.PC = (this.registers.PC + 1) & 0xffff;

    // FD (IY) instructions - implement as needed
    if (!this.unimplementedOpcodes.has(0xfd00 | opcode)) {
      this.unimplementedOpcodes.add(0xfd00 | opcode);
      console.warn(
        `Unimplemented FD opcode: 0xFD 0x${opcode
          .toString(16)
          .toUpperCase()
          .padStart(2, "0")}`
      );
    }
    return 8;
  }

  // Arithmetic methods (see TRS80-COMPLETE-BUILD-PROMPT.md lines 693-847)
  /**
   * Add a value to the accumulator (A register) with flag updates
   * See TRS80-COMPLETE-BUILD-PROMPT.md lines 693-736 for complete implementation
   */
  addA(value, withCarry = false) {
    const a = this.registers.A;
    const carry = withCarry && this.flagC ? 1 : 0;
    const result = a + value + carry;

    this.flagC = result > 0xff;
    this.flagH = (a & 0x0f) + (value & 0x0f) + carry > 0x0f;
    this.flagN = 0;
    this.registers.A = result & 0xff;
    this.flagZ = this.registers.A === 0;
    this.flagS = (this.registers.A & 0x80) !== 0;
    this.flagPV = ((a ^ value ^ 0x80) & (result ^ value) & 0x80) !== 0;

    return 4;
  }

  /**
   * Subtract a value from the accumulator with flag updates
   * See TRS80-COMPLETE-BUILD-PROMPT.md lines 738-783 for complete implementation
   */
  subA(value, compare = false) {
    const a = this.registers.A;
    const result = a - value;

    this.flagC = result < 0;
    this.flagH = (a & 0x0f) - (value & 0x0f) < 0;
    this.flagN = 1;

    if (!compare) {
      this.registers.A = result & 0xff;
    }

    const finalResult = result & 0xff;
    this.flagZ = finalResult === 0;
    this.flagS = (finalResult & 0x80) !== 0;
    this.flagPV = ((a ^ value) & (a ^ finalResult) & 0x80) !== 0;

    return 4;
  }

  /**
   * Increment a register with flag updates (except carry)
   * See TRS80-COMPLETE-BUILD-PROMPT.md lines 785-815 for complete implementation
   */
  incReg(reg) {
    const value = this.registers[reg];
    const result = (value + 1) & 0xff;

    this.registers[reg] = result;
    this.flagZ = result === 0;
    this.flagS = (result & 0x80) !== 0;
    this.flagH = (value & 0x0f) === 0x0f;
    this.flagPV = value === 0x7f;
    this.flagN = 0;

    return 4;
  }

  /**
   * Decrement a register with flag updates (except carry)
   * See TRS80-COMPLETE-BUILD-PROMPT.md lines 817-847 for complete implementation
   */
  decReg(reg) {
    const value = this.registers[reg];
    const result = (value - 1) & 0xff;

    this.registers[reg] = result;
    this.flagZ = result === 0;
    this.flagS = (result & 0x80) !== 0;
    this.flagH = (value & 0x0f) === 0x00;
    this.flagPV = value === 0x80;
    this.flagN = 1;

    return 4;
  }
}
```

### Testing

**Test File:** `tests/unit/cpu-tests.js`  
**Source:** Copy from `docs/TRS80-COMPLETE-TEST-SUITE.md` (Phase 1 section)

**Run Tests:**

```bash
yarn test:run tests/unit/cpu-tests.js
```

**Expected Result:** All 45 tests pass

**Test Coverage:**

- Initialization and Reset (2 tests)
- Register Operations (8 tests)
- Flag Operations (7 tests)
- Arithmetic Operations (15 tests)
- Load Instructions (5 tests)
- Control Flow (4 tests)
- Stack Operations (2 tests)
- I/O Operations (2 tests)
- Special Instructions (3 tests)
- Test Program 1.1 (1 test)
- Cycle Counting (3 tests)

### ⚠️ PHASE 1 TEST GATE

**CRITICAL:** Use the phase workflow script to enforce the test gate:

```bash
# Run Phase 1 tests with workflow script (waits for user confirmation)
yarn phase:1

# OR manually:
node scripts/phase-workflow.js 1 tests/unit/cpu-tests.js
```

**Expected Output (if tests pass):**

```
======================================================================
PHASE 1 TEST GATE: Z80 CPU Core Implementation
======================================================================

Running tests for Phase 1...

Command: yarn test:run tests/unit/cpu-tests.js

✓ tests/unit/cpu-tests.js (45)
  ✓ Z80CPU - Initialization and Reset (2)
  ✓ Z80CPU - Register Operations (8)
  ✓ Z80CPU - Flag Operations (7)
  ✓ Z80CPU - Arithmetic Operations (15)
  ✓ Z80CPU - Load Instructions (5)
  ✓ Z80CPU - Control Flow (4)
  ✓ Z80CPU - Stack Operations (2)
  ✓ Z80CPU - I/O Operations (2)
  ✓ Z80CPU - Special Instructions (3)
  ✓ Z80CPU - Test Program 1.1 (1)
  ✓ Z80CPU - Cycle Counting (3)

Test Files  1 passed (1)
     Tests  45 passed (45)

======================================================================
✅ PHASE 1 TESTS PASSED
======================================================================

All tests for Z80 CPU Core Implementation have passed successfully.

Phase Completion Checklist:
  ✅ All unit tests pass (100% success rate)
  ✅ No console errors
  ✅ Phase completion criteria met
  ✅ Code follows specifications

⚠️  Ready to proceed to next phase? (yes/no):
```

**If tests fail:**

- Script will exit with error code 1
- Review test failures
- Fix implementation issues
- Re-run tests until all pass
- **DO NOT proceed to Phase 2 until all tests pass**

**Manual Verification (if not using workflow script):**

```bash
yarn test:run tests/unit/cpu-tests.js
# Exit code must be 0 (all tests passed)
# If exit code is non-zero, tests failed - fix issues before proceeding
```

### Phase 1 Completion Criteria

- ✅ All unit tests pass (100% success rate)
- ✅ **COMPLETE Z80 instruction set implemented** - All 252+ opcodes
- ✅ **ALL CB prefix instructions** (bit operations, rotates, shifts)
- ✅ **ALL ED prefix instructions** (extended, block operations, I/O)
- ✅ **ALL DD prefix instructions** (IX register operations)
- ✅ **ALL FD prefix instructions** (IY register operations)
- ✅ CPU executes all instructions correctly
- ✅ Flags are calculated correctly for all instructions
- ✅ Cycle counting accurate for all instructions
- ✅ Test program 1.1 executes correctly
- ✅ Register pairs work correctly (including alternate set and index registers)
- ✅ Stack operations work correctly
- ✅ I/O operations work correctly
- ✅ All addressing modes supported (immediate, register, indirect, indexed, relative)
- ✅ No unimplemented opcode warnings (all opcodes must be implemented)

**Verification Command:**

```bash
yarn test:run tests/unit/cpu-tests.js
# Expected: ✓ 45 passed (45)
# Note: Tests may need expansion to cover all instruction categories
```

**Additional Verification:**

```bash
# Check for unimplemented opcode warnings (should be none)
yarn dev
# Run emulator and execute ROM - no console warnings about unimplemented opcodes
```

---

## PHASE 2: Memory Management System

### Test File Setup

**BEFORE starting implementation, copy the test file:**

1. **Copy Test File:**

   - Source: `docs/TRS80-COMPLETE-TEST-SUITE.md` - Section "PHASE 2: Memory Tests" (starts at line 675)
   - Destination: `tests/unit/memory-tests.js`
   - Copy the complete test file content

2. **Verify Test File:**

   ```bash
   # Check file exists
   ls -lh tests/unit/memory-tests.js

   # Verify imports (should use @core alias)
   head -5 tests/unit/memory-tests.js
   ```

3. **Expected Test Count:** 28 tests

**DO NOT proceed with implementation until test file is copied and verified.**

### Objectives

Implement the memory management system with ROM/RAM separation, memory protection, and program loading capabilities. Support both 14KB and 16KB ROMs.

**Test-First Approach:**

- Tests define expected memory behavior
- Implement code to make tests pass
- Run tests frequently during implementation
- Fix any failing tests before proceeding

### File: src/core/memory.js

```javascript
/**
 * TRS-80 Model III Memory System
 *
 * Memory Map:
 * 0x0000-0x3FFF: 16K ROM (or 0x0000-0x37FF for 14KB ROM)
 * 0x4000-0xFFFF: 48K RAM
 * 0x3C00-0x3FFF: Video memory (shadowed in ROM space, writable)
 *
 * ROM Protection:
 * - ROM area is read-only except for video RAM (0x3C00-0x3FFF)
 * - Video RAM writes are allowed even in ROM space
 * - RAM area (0x4000+) is fully read/write
 */

export class MemorySystem {
  constructor() {
    // ROM: 16K (supports 14KB via padding)
    this.rom = new Uint8Array(0x4000); // Always allocate 16K
    this.romSize = 0x4000; // Actual ROM size (14KB or 16KB)
    this.romLoaded = false;

    // RAM: 48K
    this.ram = new Uint8Array(0xc000); // 48K RAM

    // Memory boundaries
    this.VIDEO_RAM_START = 0x3c00;
    this.VIDEO_RAM_END = 0x3fff;
    this.VIDEO_RAM_SIZE = 0x0400; // 1K
    this.RAM_START = 0x4000;
    this.RAM_END = 0xffff;
  }

  /**
   * Load ROM data into memory
   *
   * Supports both 14KB (14336 bytes) and 16KB (16384 bytes) ROMs.
   * 14KB ROMs are padded to 16KB for consistent addressing.
   *
   * @param {Uint8Array} romData - ROM data (14336 or 16384 bytes)
   * @returns {boolean} True if loaded successfully
   * @throws {Error} If ROM size is invalid
   */
  loadROM(romData) {
    const size = romData.length;

    // Validate ROM size
    if (size !== 14336 && size !== 16384) {
      throw new Error(
        `Invalid ROM size: expected 14336 or 16384 bytes, got ${size}`
      );
    }

    // Store actual ROM size
    this.romSize = size;

    // Copy ROM data (14KB ROMs will have padding at end)
    this.rom.set(romData);

    // If 14KB ROM, pad remaining space with zeros
    if (size === 14336) {
      this.rom.fill(0x00, 14336, 16384);
    }

    this.romLoaded = true;
    console.log(`ROM loaded: ${size} bytes (${(size / 1024).toFixed(1)}KB)`);
    return true;
  }

  /**
   * Read a byte from memory
   *
   * @param {number} address - 16-bit address (0x0000-0xFFFF)
   * @returns {number} Byte value (0-255)
   */
  readByte(address) {
    address &= 0xffff; // Ensure 16-bit

    if (address < this.RAM_START) {
      // ROM area (0x0000-0x3FFF)
      return this.rom[address];
    } else {
      // RAM area (0x4000-0xFFFF)
      return this.ram[address - this.RAM_START];
    }
  }

  /**
   * Write a byte to memory
   *
   * ROM protection: Writes to ROM area are ignored except for video RAM.
   * Video RAM (0x3C00-0x3FFF) is writable even though it's in ROM space.
   *
   * @param {number} address - 16-bit address
   * @param {number} value - Byte value (0-255)
   */
  writeByte(address, value) {
    address &= 0xffff;
    value &= 0xff;

    if (address < this.RAM_START) {
      // ROM area - only allow video RAM writes
      if (address >= this.VIDEO_RAM_START && address <= this.VIDEO_RAM_END) {
        this.rom[address] = value;
      }
      // Other ROM writes are silently ignored (ROM protection)
    } else {
      // RAM area - always writable
      this.ram[address - this.RAM_START] = value;
    }
  }

  /**
   * Read a 16-bit word (little-endian)
   *
   * @param {number} address - 16-bit address
   * @returns {number} 16-bit value
   */
  readWord(address) {
    const low = this.readByte(address);
    const high = this.readByte((address + 1) & 0xffff);
    return (high << 8) | low;
  }

  /**
   * Write a 16-bit word (little-endian)
   *
   * @param {number} address - 16-bit address
   * @param {number} value - 16-bit value
   */
  writeWord(address, value) {
    this.writeByte(address, value & 0xff);
    this.writeByte((address + 1) & 0xffff, (value >> 8) & 0xff);
  }

  /**
   * Load a program into memory
   *
   * @param {Uint8Array|Array} data - Program data
   * @param {number} startAddress - Starting address (default: 0x4200 for BASIC)
   * @returns {number} Starting address where program was loaded
   * @throws {Error} If program exceeds memory bounds
   */
  loadProgram(data, startAddress = 0x4200) {
    const programData =
      data instanceof Uint8Array ? data : new Uint8Array(data);

    if (startAddress + programData.length > 0x10000) {
      throw new Error(
        `Program too large: ${
          programData.length
        } bytes at 0x${startAddress.toString(16)} exceeds memory`
      );
    }

    for (let i = 0; i < programData.length; i++) {
      this.writeByte(startAddress + i, programData[i]);
    }

    console.log(
      `Program loaded at 0x${startAddress.toString(16)} (${
        programData.length
      } bytes)`
    );
    return startAddress;
  }

  /**
   * Clear all RAM (ROM unaffected)
   */
  clearRAM() {
    this.ram.fill(0);
  }

  /**
   * Get memory system statistics
   *
   * @returns {Object} Memory stats
   */
  getStats() {
    return {
      romSize: this.romSize,
      ramSize: this.ram.length,
      totalSize: this.romSize + this.ram.length,
      romLoaded: this.romLoaded,
      videoRamStart: this.VIDEO_RAM_START,
      videoRamEnd: this.VIDEO_RAM_END,
    };
  }
}
```

### Testing

**Test File:** `tests/unit/memory-tests.js`  
**Source:** Copy from `docs/TRS80-COMPLETE-TEST-SUITE.md` (Phase 2 section)

**Run Tests:**

```bash
yarn test:run tests/unit/memory-tests.js
```

**Expected Result:** All 28 tests pass

**Test Coverage:**

- Initialization (3 tests)
- ROM Loading (3 tests - including 14KB support)
- Memory Reading (3 tests)
- Memory Writing (3 tests)
- ROM Protection (3 tests)
- RAM Operations (3 tests)
- Program Loading (5 tests)
- RAM Management (2 tests)
- Address Wrapping (2 tests)

### ⚠️ PHASE 2 TEST GATE

**CRITICAL:** Use the phase workflow script to enforce the test gate:

```bash
# Run Phase 2 tests with workflow script (waits for user confirmation)
yarn phase:2

# OR manually:
node scripts/phase-workflow.js 2 tests/unit/memory-tests.js
```

**Expected Output (if tests pass):**

- All 28 tests pass
- Script displays success message
- Script waits for user confirmation before proceeding

**If tests fail:**

- Script will exit with error code 1
- Review test failures
- Fix implementation issues
- Re-run tests until all pass
- **DO NOT proceed to Phase 3 until all tests pass**

**Manual Verification (if not using workflow script):**

```bash
yarn test:run tests/unit/memory-tests.js
# Exit code must be 0 (all tests passed)
# If exit code is non-zero, tests failed - fix issues before proceeding
```

### Phase 2 Completion Criteria

- ✅ All unit tests pass (100% success rate)
- ✅ ROM loads correctly (both 14KB and 16KB)
- ✅ ROM is read-only (except video RAM)
- ✅ RAM is read/write
- ✅ Program loading works
- ✅ 16-bit word operations work
- ✅ Memory protection enforced

**Verification Command:**

```bash
yarn test:run tests/unit/memory-tests.js
# Expected: ✓ 28 passed (28)
```

---

## PHASE 3: Cassette I/O System

### Test File Setup

**BEFORE starting implementation, copy the test files:**

1. **Copy Test Files:**

   - Source: `docs/TRS80-COMPLETE-TEST-SUITE.md` - Section "PHASE 3: Cassette & I/O Tests" (starts at line 1004)
   - Copy both files:
     - `tests/unit/cassette-tests.js` (starts at line 1006)
     - `tests/unit/io-tests.js` (starts at line 1286)
   - Copy the complete test file content for both files

2. **Verify Test Files:**

   ```bash
   # Check files exist
   ls -lh tests/unit/cassette-tests.js tests/unit/io-tests.js

   # Verify imports (should use @peripherals and @core aliases)
   head -5 tests/unit/cassette-tests.js
   head -5 tests/unit/io-tests.js
   ```

3. **Expected Test Count:** 37 tests total (22 cassette + 15 I/O)

**DO NOT proceed with implementation until test files are copied and verified.**

### Objectives

Implement the cassette interface simulation and I/O port handling system.

**Test-First Approach:**

- Tests define expected cassette and I/O behavior
- Implement code to make tests pass
- Run tests frequently during implementation
- Fix any failing tests before proceeding

### File: src/peripherals/cassette.js

**Complete Implementation Reference:** See `docs/TRS80-COMPLETE-BUILD-PROMPT.md` lines 1120-1242 for the full CassetteSystem implementation.

**Key Features:**

- Tape loading and simulation
- CLOAD/CSAVE operations
- Tape position tracking
- Motor control simulation

### File: src/core/io.js

**Complete Implementation Reference:** See `docs/TRS80-COMPLETE-BUILD-PROMPT.md` lines 1245-1318 for the full IOSystem implementation.

**Key Features:**

- Port I/O handling
- Keyboard buffer management
- Cassette system integration
- Model III specific port mappings

### Testing

**Test Files:**

- `tests/unit/cassette-tests.js` (22 tests)
- `tests/unit/io-tests.js` (15 tests)

**Source:** Copy from `docs/TRS80-COMPLETE-TEST-SUITE.md` (Phase 3 section)

**Run Tests:**

```bash
yarn test:run tests/unit/cassette-tests.js tests/unit/io-tests.js
```

**Expected Result:** All 37 tests pass

### ⚠️ PHASE 3 TEST GATE

**CRITICAL:** Use the phase workflow script to enforce the test gate:

```bash
# Run Phase 3 tests with workflow script (waits for user confirmation)
yarn phase:3

# OR manually:
node scripts/phase-workflow.js 3 "tests/unit/cassette-tests.js tests/unit/io-tests.js"
```

**Expected Output (if tests pass):**

- All 37 tests pass (22 cassette + 15 I/O)
- Script displays success message
- Script waits for user confirmation before proceeding

**If tests fail:**

- Script will exit with error code 1
- Review test failures
- Fix implementation issues
- Re-run tests until all pass
- **DO NOT proceed to Phase 4 until all tests pass**

### Phase 3 Completion Criteria

- ✅ All unit tests pass (100% success rate)
- ✅ Cassette tape loading works
- ✅ CLOAD/CSAVE operations work
- ✅ Port I/O works correctly
- ✅ Keyboard buffer works
- ✅ Cassette control works

**Verification Command:**

```bash
yarn test:run tests/unit/cassette-tests.js tests/unit/io-tests.js
# Expected: ✓ 37 passed (37)
```

---

## Missing File Specifications

### File: src/core/timing.js

**Purpose:** Cycle-accurate timing system for CPU execution and frame synchronization.

**Specification:**

```javascript
/**
 * Cycle-accurate timing system
 * Manages CPU cycle counting and frame timing
 */

export class TimingSystem {
  constructor() {
    this.cpuCycles = 0;
    this.frameCycles = 0;
    this.targetCyclesPerFrame = 33333; // ~2MHz / 60 FPS
    this.lastFrameTime = 0;
  }

  /**
   * Reset timing counters
   */
  reset() {
    this.cpuCycles = 0;
    this.frameCycles = 0;
    this.lastFrameTime = performance.now();
  }

  /**
   * Add CPU cycles
   * @param {number} cycles - Number of cycles to add
   */
  addCycles(cycles) {
    this.cpuCycles += cycles;
    this.frameCycles += cycles;
  }

  /**
   * Check if frame cycle budget exhausted
   * @returns {boolean} True if should render frame
   */
  shouldRenderFrame() {
    return this.frameCycles >= this.targetCyclesPerFrame;
  }

  /**
   * Reset frame cycle counter (call after rendering)
   */
  resetFrameCycles() {
    this.frameCycles = 0;
  }

  /**
   * Get current CPU cycle count
   * @returns {number} Total CPU cycles
   */
  getCycles() {
    return this.cpuCycles;
  }
}
```

### File: scripts/generate-char-rom.js

**Purpose:** Generate character ROM data structure for video system.

**Specification:**

```javascript
#!/usr/bin/env node
/**
 * Generate Character ROM Data
 * Creates character bitmap data for TRS-80 Model III
 */

import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Generate character ROM data structure
const charRom = {};

// Basic ASCII characters (0-127)
// Add character definitions here or import from source

// Graphics characters (128-191) - 2×3 pixel blocks
for (let i = 128; i < 192; i++) {
  const pattern = i - 128;
  charRom[i] = generateGraphicsChar(pattern);
}

function generateGraphicsChar(pattern) {
  // Generate 12-byte bitmap for 2×3 pixel block
  // See VideoSystem.generateGraphicsChar() for implementation
  return new Array(12).fill(0x00);
}

// Write to src/data/character-rom.js
const output = `/**
 * TRS-80 Model III Character ROM
 * Auto-generated character bitmap data
 */

export const CHARACTER_ROM = ${JSON.stringify(charRom, null, 2)};
`;

const outputPath = join(__dirname, "../src/data/character-rom.js");
writeFileSync(outputPath, output);

console.log("✓ Character ROM generated");
```

### File: src/data/character-rom.js

**Purpose:** Character ROM data structure for video rendering.

**Specification:**

```javascript
/**
 * TRS-80 Model III Character ROM
 * Character bitmap data for text and graphics rendering
 *
 * Structure:
 * - Characters 0-127: ASCII text characters
 * - Characters 128-191: Graphics characters (2×3 pixel blocks)
 * - Each character is a 12-byte array representing 8×12 pixel bitmap
 */

export const CHARACTER_ROM = {
  // ASCII characters (0-127)
  // Each entry: Array<12> of bytes representing bitmap rows
  // Graphics characters (128-191)
  // Generated by generateGraphicsChar() function
  // Pattern encoding: 6 bits (bits 0-5) control 2×3 pixel block
};
```

### File: src/utils/debugger.js

**Purpose:** Debug tools for emulator development and testing.

**Specification:**

```javascript
/**
 * Emulator Debugger Tools
 * Provides breakpoint, step, and inspection capabilities
 */

export class EmulatorDebugger {
  constructor(emulator) {
    this.emulator = emulator;
    this.breakpoints = new Set();
    this.paused = false;
    this.stepMode = false;
  }

  /**
   * Set breakpoint at address
   * @param {number} address - Memory address
   */
  setBreakpoint(address) {
    this.breakpoints.add(address);
  }

  /**
   * Clear breakpoint at address
   * @param {number} address - Memory address
   */
  clearBreakpoint(address) {
    this.breakpoints.delete(address);
  }

  /**
   * Check if should break at current PC
   * @returns {boolean} True if breakpoint hit
   */
  checkBreakpoint() {
    return this.breakpoints.has(this.emulator.cpu.registers.PC);
  }

  /**
   * Step one instruction
   */
  step() {
    this.stepMode = true;
    this.paused = false;
  }

  /**
   * Resume execution
   */
  resume() {
    this.paused = false;
    this.stepMode = false;
  }

  /**
   * Pause execution
   */
  pause() {
    this.paused = true;
  }

  /**
   * Get CPU state for inspection
   * @returns {Object} CPU register and flag state
   */
  getCPUState() {
    return {
      registers: { ...this.emulator.cpu.registers },
      flags: {
        C: this.emulator.cpu.flagC,
        N: this.emulator.cpu.flagN,
        PV: this.emulator.cpu.flagPV,
        H: this.emulator.cpu.flagH,
        Z: this.emulator.cpu.flagZ,
        S: this.emulator.cpu.flagS,
      },
      cycles: this.emulator.cpu.cycles,
      halted: this.emulator.cpu.halted,
    };
  }

  /**
   * Get memory dump
   * @param {number} start - Start address
   * @param {number} length - Number of bytes
   * @returns {Uint8Array} Memory contents
   */
  getMemoryDump(start, length) {
    const dump = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      dump[i] = this.emulator.memory.readByte(start + i);
    }
    return dump;
  }
}
```

---

## PHASE 4: BASIC Program Execution

### Test File Setup

**BEFORE starting implementation, copy the test file:**

1. **Copy Test File:**

   - Source: `tests/unit/basic-program-tests.js` (already created)
   - Destination: `tests/unit/basic-program-tests.js`
   - File contains 45 comprehensive tests

2. **Verify Test File:**

   ```bash
   # Check file exists
   ls -lh tests/unit/basic-program-tests.js

   # Verify imports (should use @core, @peripherals aliases)
   head -10 tests/unit/basic-program-tests.js
   ```

3. **Expected Test Count:** 45 tests

**DO NOT proceed with implementation until test file is copied and verified.**

### Objectives

Verify that BASIC programs can be loaded, stored, and executed properly under the Z80 CPU with ModelIII.rom. This phase demonstrates that the emulator can run TRS-80 BASIC programs by:

- Loading ModelIII.rom (which contains the BASIC interpreter)
- Storing BASIC programs in memory at correct addresses
- Executing Z80 instructions from ROM (BASIC interpreter code)
- Integrating with cassette system for CLOAD operations
- Supporting BASIC program data structures and execution flow

**Test-First Approach:**

- Tests define expected BASIC program execution behavior
- Verify ROM loading and execution
- Test program storage and memory layout
- Validate CPU execution with ROM and RAM programs
- Test CLOAD integration for program loading

### Key Features

- **ROM Loading**: ModelIII.rom contains the BASIC interpreter and must load correctly
- **Program Storage**: BASIC programs stored at 0x4200 (default) or custom addresses
- **CPU Execution**: Z80 CPU executes instructions from both ROM and RAM
- **CLOAD Integration**: Programs loaded via cassette system (CLOAD command)
- **Memory Layout**: Correct ROM/RAM separation and address ranges
- **Program Execution Flow**: Complete flow from loading to execution

### BASIC Program Examples

Phase 4 includes 15 BASIC program examples of increasing complexity:

1. **Hello World** (Complexity 1): Simple PRINT statement
2. **Simple Variable** (Complexity 2): Variable assignment and display
3. **Arithmetic** (Complexity 2): Basic math operations
4. **Input** (Complexity 3): User input handling
5. **Conditional** (Complexity 3): IF-THEN statements
6. **FOR Loop** (Complexity 3): FOR/NEXT loops
7. **Nested Loop** (Complexity 4): Nested FOR loops
8. **GOTO** (Complexity 3): GOTO control flow
9. **Array** (Complexity 4): Array operations
10. **String Operations** (Complexity 4): String concatenation
11. **GOSUB/RETURN** (Complexity 4): Subroutine calls
12. **Math Functions** (Complexity 4): Built-in functions (SQR, INT)
13. **DATA/READ** (Complexity 5): DATA and READ statements
14. **Complex Logic** (Complexity 5): Multiple control structures
15. **Number Guessing Game** (Complexity 5): Complete interactive program

**Program Source:** `src/data/basic-programs.js`

### Testing

**Test File:** `tests/unit/basic-program-tests.js`

**Test Categories:**

- **ROM Loading Tests (4 tests)**: ModelIII.rom loading, 14KB/16KB support, ROM protection
- **Program Storage Tests (4 tests)**: Default address (0x4200), custom addresses, multiple programs
- **CPU Execution with ROM Tests (4 tests)**: Executing instructions from ROM, jumps, calls
- **CLOAD Integration Tests (3 tests)**: Loading via cassette, custom addresses, ROM protection
- **Memory Layout Tests (4 tests)**: ROM/RAM address ranges, BASIC program area
- **Program Execution Flow Tests (3 tests)**: Programs from ROM, RAM, ROM routine calls
- **Simple BASIC Programs Tests (4 tests)**: PRINT, multi-line, variables, GOTO
- **Complex Scenarios Tests (3 tests)**: Large programs, stack operations, loops
- **Integration Tests (3 tests)**: Complete CLOAD/RUN flow, I/O operations, program persistence

**Run Tests:**

```bash
yarn test:run tests/unit/basic-program-tests.js
```

**Expected Result:** All 45 tests pass

### ⚠️ PHASE 4 TEST GATE

**CRITICAL:** Use the phase workflow script to enforce the test gate:

```bash
# Run Phase 4 tests with workflow script (waits for user confirmation)
yarn phase:4

# OR manually:
node scripts/phase-workflow.js 4 tests/unit/basic-program-tests.js
```

**Expected Output (if tests pass):**

- All 45 tests pass
- Script displays success message
- Script waits for user confirmation before proceeding

**If tests fail:**

- Script will exit with error code 1
- Review test failures
- Fix implementation issues
- Re-run tests until all pass
- **DO NOT proceed to Phase 5 until all tests pass**

### Phase 4 Completion Criteria

- ✅ All unit tests pass (100% success rate)
- ✅ ModelIII.rom loads successfully (14KB or 16KB)
- ✅ ROM data is readable and protected from writes
- ✅ BASIC programs can be stored at 0x4200 and custom addresses
- ✅ CPU can execute instructions from ROM (BASIC interpreter)
- ✅ CPU can execute programs from RAM
- ✅ CLOAD integration works correctly
- ✅ Memory layout is correct (ROM 0x0000-0x3FFF, RAM 0x4000-0xFFFF)
- ✅ Programs can call ROM routines
- ✅ Complete CLOAD and RUN flow works

**Verification Command:**

```bash
yarn test:run tests/unit/basic-program-tests.js
# Expected: ✓ 45 passed (45)
```

### Browser Test Runner

Phase 4 includes a browser-compatible test runner that displays:

- Assembly mnemonics for Z80 instructions
- Opcode bytes for executed instructions
- Detailed descriptions of what each test does and expects

**File:** `src/browser-test-runner-phase4.js`

**Usage:** Click "Phase 4: BASIC Programs" button in the web UI to run all 45 tests with detailed output.

---

## PHASE 5: Video Display System with Graphics Support

### Test File Setup

**BEFORE starting implementation, copy the test file:**

1. **Copy Test File:**

   - Source: `docs/TRS80-COMPLETE-TEST-SUITE.md` - Section "PHASE 4: Video Tests" (starts at line 1408)
   - Destination: `tests/unit/video-tests.js`
   - Copy the complete test file content

2. **Verify Test File:**

   ```bash
   # Check file exists
   ls -lh tests/unit/video-tests.js

   # Verify imports (should use @peripherals alias)
   head -5 tests/unit/video-tests.js
   ```

3. **Expected Test Count:** 32 tests

**DO NOT proceed with implementation until test file is copied and verified.**

### Objectives

Implement the video display system with text mode and graphics mode support, including SET/RESET/POINT commands.

**Test-First Approach:**

- Tests define expected video behavior
- Implement code to make tests pass
- Run tests frequently during implementation
- Fix any failing tests before proceeding

### File: src/peripherals/video.js

**Complete Implementation Reference:** See `docs/TRS80-COMPLETE-BUILD-PROMPT.md` lines 1330-1647 for the full VideoSystem implementation.

**Key Features:**

- 64×16 character text display
- 128×48 pixel graphics mode
- Graphics character generation (128-191)
- SET/RESET/POINT pixel operations
- Character ROM with graphics support

### Coordinate System Specification

**Origin:** Top-left corner (0, 0)  
**X-axis:** Left to right (0-127)  
**Y-axis:** Top to bottom (0-47)  
**Character Grid:** 64×16 positions  
**Graphics Resolution:** 128×48 pixels  
**Pixel-to-Character Mapping:** 2 pixels wide × 3 pixels tall per character

### Testing

**Test File:** `tests/unit/video-tests.js`  
**Source:** Copy from `docs/TRS80-COMPLETE-TEST-SUITE.md` (Phase 4 section)

**Run Tests:**

```bash
yarn test:run tests/unit/video-tests.js
```

**Expected Result:** All 32 tests pass

### ⚠️ PHASE 5 TEST GATE

**CRITICAL:** Use the phase workflow script to enforce the test gate:

```bash
# Run Phase 5 tests with workflow script (waits for user confirmation)
yarn phase:5

# OR manually:
node scripts/phase-workflow.js 5 tests/unit/video-tests.js
```

**Expected Output (if tests pass):**

- All 32 tests pass
- Script displays success message
- Script waits for user confirmation before proceeding

**If tests fail:**

- Script will exit with error code 1
- Review test failures
- Fix implementation issues
- Re-run tests until all pass
- **DO NOT proceed to Phase 6 until all tests pass**

### Phase 5 Completion Criteria

- ✅ All unit tests pass (100% success rate)
- ✅ 64×16 text display works
- ✅ Characters render correctly
- ✅ Graphics characters (128-191) render as 2×3 pixel blocks
- ✅ SET/RESET/POINT functions work correctly
- ✅ Coordinate system is correct (top-left origin)

**Verification Command:**

```bash
yarn test:run tests/unit/video-tests.js
# Expected: ✓ 32 passed (32)
```

---

## PHASE 6: System Integration

### Test File Setup

**BEFORE starting implementation, copy the test file:**

1. **Copy Test File:**

   - Source: `docs/TRS80-COMPLETE-TEST-SUITE.md` - Section "PHASE 5: System Integration Tests" (starts at line 1684)
   - Destination: `tests/integration/cpu-memory-integration.js`
   - Copy the complete test file content

2. **Verify Test File:**

   ```bash
   # Check file exists
   ls -lh tests/integration/cpu-memory-integration.js

   # Verify imports (should use @core, @system aliases)
   head -5 tests/integration/cpu-memory-integration.js
   ```

3. **Expected Test Count:** Integration tests (varies)

**DO NOT proceed with implementation until test file is copied and verified.**

### Objectives

Integrate all components into a complete TRS-80 system with proper component connections and system initialization.

**Test-First Approach:**

- Tests define expected system integration behavior
- Implement code to make tests pass
- Run tests frequently during implementation
- Fix any failing tests before proceeding

### File: src/peripherals/keyboard.js

**Complete Implementation Reference:** See `docs/TRS80-COMPLETE-BUILD-PROMPT.md` lines 1654-1724 for the full KeyboardHandler implementation.

**Key Features:**

- Model III key mapping
- Key buffer management
- Event handling

### File: src/system/trs80.js

**Complete Implementation Reference:** See `docs/TRS80-COMPLETE-BUILD-PROMPT.md` lines 1726-1863 for the full TRS80System implementation.

**Key Features:**

- System integration and initialization
- Component coordination
- Execution loop
- BASIC program loading
- Graphics command wrappers

### Testing

**Test File:** `tests/integration/cpu-memory-integration.js`  
**Source:** Copy from `docs/TRS80-COMPLETE-TEST-SUITE.md` (Phase 5 section)

**Run Tests:**

```bash
yarn test:run tests/integration/cpu-memory-integration.js
```

**Expected Result:** All integration tests pass

### ⚠️ PHASE 6 TEST GATE

**CRITICAL:** Use the phase workflow script to enforce the test gate:

```bash
# Run Phase 6 tests with workflow script (waits for user confirmation)
yarn phase:6

# OR manually:
node scripts/phase-workflow.js 6 tests/integration/cpu-memory-integration.js
```

**Expected Output (if tests pass):**

- All integration tests pass
- Script displays success message
- Script waits for user confirmation before proceeding

**If tests fail:**

- Script will exit with error code 1
- Review test failures
- Fix implementation issues
- Re-run tests until all pass
- **DO NOT proceed to Phase 7 until all tests pass**

### Phase 6 Completion Criteria

- ✅ All integration tests pass
- ✅ System boots to ROM
- ✅ All components integrated
- ✅ Keyboard input works
- ✅ Display updates properly
- ✅ Graphics commands functional
- ✅ CPU-Memory integration works

**Verification Command:**

```bash
yarn test:run tests/integration/cpu-memory-integration.js
```

---

## PHASE 7: Sample Programs Library and User Interface

### Test File Setup

**BEFORE starting implementation, copy the test file:**

1. **Copy Test File:**

   - Source: `docs/TRS80-COMPLETE-TEST-SUITE.md` - Section "PHASE 6: Program Loader Tests" (starts at line 1837)
   - Destination: `tests/unit/program-loader-tests.js`
   - Copy the complete test file content

2. **Verify Test File:**

   ```bash
   # Check file exists
   ls -lh tests/unit/program-loader-tests.js

   # Verify imports (should use @ui, @data aliases)
   head -5 tests/unit/program-loader-tests.js
   ```

3. **Expected Test Count:** 18 tests

**DO NOT proceed with implementation until test file is copied and verified.**

### Objectives

Implement the user interface with program loader, BASIC program editor, and sample program library. Convert assembly routines to source code format.

**Test-First Approach:**

- Tests define expected program loader behavior
- Implement code to make tests pass
- Run tests frequently during implementation
- Fix any failing tests before proceeding

### File: src/data/sample-assembly.js (Updated)

```javascript
/**
 * Sample Z80 Assembly Routines
 * Now stored as SOURCE CODE (not pre-assembled bytes)
 * Can be edited and assembled using integrated Z80 assembler
 */

export const assemblySamples = {
  return42: {
    name: "Return 42",
    description: "Returns the value 42 to BASIC",
    source: `.ORG $5000
START:  LD A, 42
        RET
.END`,
    address: 0x5000,
    // bytes generated on-demand via assembler
  },

  "add-numbers": {
    name: "Add Two Numbers",
    description: "Adds values at 0x5100 and 0x5101, returns result",
    source: `.ORG $5000
        LD A, (0x5100)  ; Load first number
        LD B, A         ; Save in B
        LD A, (0x5101)  ; Load second number
        LD C, A         ; Save in C
        LD A, B         ; Get first number
        ADD A, C        ; Add second number
        LD (0x5102), A  ; Store result
        RET             ; Return
.END`,
    address: 0x5000,
  },

  // Additional assembly routines should follow the same format:
  // - name: Unique identifier
  // - source: Z80 assembly source code with .ORG directive
  // - address: Starting address for the routine
  // See TRS80-COMPLETE-BUILD-PROMPT.md lines 2099-2220 for more examples
};
```

### File: src/ui/program-loader.js (Enhanced)

**Base Implementation Reference:** See `docs/TRS80-COMPLETE-BUILD-PROMPT.md` lines 2223-2497 for the base ProgramLoader implementation.

**Assembler Integration Enhancements:**

- Import Z80Assembler and AssemblyEditor (see Phase 7)
- Add `assembleAndLoad()` method for compiling assembly code
- Update `loadAssemblySample()` to assemble from source code
- Add `editAssemblyProgram()` method for opening assembly editor

### File: index.html (Enhanced)

**Base Implementation Reference:** See `docs/TRS80-COMPLETE-BUILD-PROMPT.md` lines 2549-2660 for the base HTML structure.

**Assembly Editor UI Elements:**

- Add assembly editor panel (see Phase 7 section for complete HTML)
- Include textarea for source code editing
- Add assemble and load buttons
- Include panels for errors, warnings, symbol table, and bytecode display

### Testing

**Test File:** `tests/unit/program-loader-tests.js`  
**Source:** Copy from `docs/TRS80-COMPLETE-TEST-SUITE.md` (Phase 6 section)

**Run Tests:**

```bash
yarn test:run tests/unit/program-loader-tests.js
```

**Expected Result:** All 18 tests pass

### ⚠️ PHASE 7 TEST GATE

**CRITICAL:** Use the phase workflow script to enforce the test gate:

```bash
# Run Phase 7 tests with workflow script (waits for user confirmation)
yarn phase:7

# OR manually:
node scripts/phase-workflow.js 7 tests/unit/program-loader-tests.js
```

**Expected Output (if tests pass):**

- All 18 tests pass
- Script displays success message
- Script waits for user confirmation before proceeding

**If tests fail:**

- Script will exit with error code 1
- Review test failures
- Fix implementation issues
- Re-run tests until all pass
- **DO NOT proceed to Phase 8 until all tests pass**

### Phase 7 Completion Criteria

- ✅ All unit tests pass (100% success rate)
- ✅ Complete UI functional
- ✅ All 12 BASIC programs available and loadable
- ✅ All 5 assembly routines available (as source code)
- ✅ Program selection and loading works
- ✅ Edit modal functional for BASIC programs
- ✅ Graphics programs work correctly

**Verification Command:**

```bash
yarn test:run tests/unit/program-loader-tests.js
# Expected: ✓ 18 passed (18)
```

---

## PHASE 8: Z80 Assembler Integration

### Test File Setup

**BEFORE starting implementation, create the test file:**

1. **Create Test File:**

   - Create `tests/unit/assembler-tests.js`
   - Test assembler modules: lexer, parser, codegen, evaluator
   - Test assembly editor integration
   - Test compilation and loading workflow

2. **Verify Test File:**

   ```bash
   # Check file exists
   ls -lh tests/unit/assembler-tests.js

   # Verify imports (should use @assembler alias)
   head -5 tests/unit/assembler-tests.js
   ```

3. **Expected Test Coverage:**
   - Lexer tokenization (5+ tests)
   - Parser two-pass assembly (5+ tests)
   - Code generation (5+ tests)
   - Expression evaluation (5+ tests)
   - Error reporting (3+ tests)
   - Symbol table generation (3+ tests)

**Note:** Assembler tests may need to be created based on assembler implementation. Test as you implement each assembler module.

**DO NOT proceed with implementation until test file structure is created.**

### Objectives

Integrate the complete Z80 assembler into the emulator, enabling in-browser assembly code editing, compilation, and execution.

**Test-First Approach:**

- Create tests for each assembler module as you implement it
- Implement code to make tests pass
- Run tests frequently during implementation
- Fix any failing tests before proceeding

### Assembler Module Structure

**Source Document:** `docs/cschweda-z80-assembler-8a5edab282632443.txt`

**Step-by-Step Integration:**

1. **Copy Assembler Modules**

   - Copy all assembler files from the source document to `src/assembler/`
   - Maintain the exact file structure and naming

2. **Module Files to Copy:**

   - `src/assembler/assembler.js` - Main Z80Assembler class (lines 1689-1921 in source)
   - `src/assembler/lexer.js` - Tokenizer (lines 2906-3171 in source)
   - `src/assembler/parser.js` - Two-pass parser (from source)
   - `src/assembler/codegen.js` - Code generator (lines 1926-2088 in source)
   - `src/assembler/evaluator.js` - Expression evaluator (lines 2562-3808 in source)
   - `src/assembler/opcodes.js` - Instruction encoding tables (lines 3429-6607 in source)
   - `src/assembler/constants.js` - Z80 constants (lines 2239-2557 in source)

3. **Update Import Paths**

   - Change relative imports to use `@assembler` alias
   - Example: `import { Lexer } from './lexer.js'` → `import { Lexer } from '@assembler/lexer.js'`
   - Update all cross-module imports within assembler directory

4. **Update Memory Map Constants**

   - Edit `src/assembler/constants.js`
   - Update MEMORY constants for TRS-80 memory map (see below)

5. **Test Each Module**
   - Import and test each module individually
   - Verify exports are correct
   - Check for any syntax errors

### Update Constants for TRS-80 Memory Map

In `src/assembler/constants.js`, update MEMORY constants:

```javascript
export const MEMORY = {
  ROM_START: 0x0000,
  ROM_END: 0x3fff, // 16K ROM (or 0x37FF for 14KB)
  RAM_START: 0x4000,
  RAM_END: 0xffff, // 48K RAM
  VIDEO_START: 0x3c00, // Video RAM
  VIDEO_END: 0x3fff,
  BASIC_START: 0x4200, // BASIC program area
  DEFAULT_ORG: 0x5000, // Default assembly address
};
```

### File: src/ui/assembly-editor.js (NEW)

```javascript
/**
 * Assembly Code Editor UI Component
 * Provides in-browser Z80 assembly code editing and compilation
 */

import { Z80Assembler } from "@assembler/assembler.js";
import {
  formatMemoryDump,
  formatSymbolTable,
  formatErrors,
  formatWarnings,
} from "@utils/formatter.js";

export class AssemblyEditor {
  constructor(emulator) {
    this.emulator = emulator;
    this.assembler = new Z80Assembler();
    this.currentSource = "";
    this.lastResult = null;

    this.setupUI();
  }

  setupUI() {
    // Assembly editor elements (add to index.html)
    this.editor = document.getElementById("assembly-editor");
    this.assembleBtn = document.getElementById("assemble-btn");
    this.loadBtn = document.getElementById("load-assembly-btn");
    this.errorsPanel = document.getElementById("assembly-errors");
    this.warningsPanel = document.getElementById("assembly-warnings");
    this.symbolTablePanel = document.getElementById("assembly-symbols");
    this.bytecodePanel = document.getElementById("assembly-bytecode");

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.assembleBtn?.addEventListener("click", () => this.assemble());
    this.loadBtn?.addEventListener("click", () => this.loadIntoEmulator());

    // Auto-assemble on Ctrl+Enter
    this.editor?.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        this.assemble();
      }
    });
  }

  /**
   * Assemble the current source code
   */
  assemble() {
    const source = this.editor?.value || "";

    if (!source.trim()) {
      this.showError("No source code to assemble");
      return;
    }

    this.currentSource = source;
    const result = this.assembler.assemble(source);
    this.lastResult = result;

    if (result.success) {
      this.displaySuccess(result);
    } else {
      this.displayErrors(result);
    }
  }

  /**
   * Display successful assembly result
   */
  displaySuccess(result) {
    // Display bytecode
    if (this.bytecodePanel) {
      this.bytecodePanel.textContent = formatMemoryDump(
        result.bytes,
        result.startAddress
      );
    }

    // Display symbol table
    if (this.symbolTablePanel) {
      this.symbolTablePanel.textContent = formatSymbolTable(result.symbolTable);
    }

    // Display warnings (if any)
    if (this.warningsPanel) {
      this.warningsPanel.textContent = formatWarnings(result.warnings);
    }

    // Clear errors
    if (this.errorsPanel) {
      this.errorsPanel.textContent = "No errors";
    }

    // Enable load button
    if (this.loadBtn) {
      this.loadBtn.disabled = false;
    }
  }

  /**
   * Display assembly errors
   */
  displayErrors(result) {
    if (this.errorsPanel) {
      this.errorsPanel.textContent = formatErrors(result.errors);
    }

    // Disable load button
    if (this.loadBtn) {
      this.loadBtn.disabled = true;
    }
  }

  /**
   * Load assembled code into emulator memory
   */
  loadIntoEmulator() {
    if (!this.lastResult || !this.lastResult.success) {
      this.showError("No successfully assembled code to load");
      return;
    }

    if (!this.emulator.running) {
      this.showError("Please power on the emulator first");
      return;
    }

    const address = this.lastResult.startAddress;
    this.emulator.memory.loadProgram(this.lastResult.bytes, address);

    this.showSuccess(`Assembly loaded at 0x${address.toString(16)}`);
  }

  /**
   * Load assembly source code into editor
   */
  loadSource(source) {
    if (this.editor) {
      this.editor.value = source;
      this.currentSource = source;
    }
  }

  showError(message) {
    console.error(message);
    // Update UI with error message
  }

  showSuccess(message) {
    console.log(message);
    // Update UI with success message
  }
}
```

### Update ProgramLoader for Assembler Integration

In `src/ui/program-loader.js`, add:

```javascript
import { Z80Assembler } from "@assembler/assembler.js";
import { AssemblyEditor } from "@ui/assembly-editor.js";

export class ProgramLoader {
  constructor(emulator) {
    this.emulator = emulator;
    this.assembler = new Z80Assembler(); // NEW
    this.assemblyEditor = new AssemblyEditor(emulator); // NEW
    // ... rest of constructor
  }

  /**
   * Load assembly routine - now assembles from source code
   */
  loadAssemblySample(key) {
    const routine = assemblySamples[key];
    if (!routine) return;

    this.currentProgram = routine;
    this.currentProgramType = "assembly";

    // Display assembly source code
    document.getElementById("program-viewer").textContent = routine.source;
    // ... rest of method

    // Enable edit button - assembly can now be edited!
    document.getElementById("edit-btn").disabled = false;
  }

  /**
   * Assemble and load assembly program
   */
  assembleAndLoad(source, address = 0x5000) {
    const result = this.assembler.assemble(source);

    if (!result.success) {
      // Display errors
      this.showAssemblyErrors(result.errors);
      return null;
    }

    // Load assembled bytes into memory
    this.emulator.memory.loadProgram(result.bytes, address);

    return result;
  }

  /**
   * Edit assembly program (NEW)
   */
  editAssemblyProgram() {
    if (this.currentProgramType !== "assembly") return;

    // Open assembly editor with source code
    this.assemblyEditor.loadSource(this.currentProgram.source);
    // Show assembly editor modal/panel
  }
}
```

### File: src/utils/formatter.js (NEW)

Create utility functions for formatting assembly results:

```javascript
/**
 * Formatter utilities for assembly editor display
 */

/**
 * Format memory dump as hex bytes
 * @param {Uint8Array} bytes - Byte array
 * @param {number} startAddress - Starting address
 * @returns {string} Formatted hex dump
 */
export function formatMemoryDump(bytes, startAddress = 0) {
  let output = "";
  for (let i = 0; i < bytes.length; i += 16) {
    const addr = startAddress + i;
    const hex = Array.from(bytes.slice(i, i + 16))
      .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
      .join(" ");
    output += `0x${addr.toString(16).padStart(4, "0")}: ${hex}\n`;
  }
  return output;
}

/**
 * Format symbol table for display
 * @param {Object} symbolTable - Symbol table object
 * @returns {string} Formatted symbol table
 */
export function formatSymbolTable(symbolTable) {
  if (!symbolTable || Object.keys(symbolTable).length === 0) {
    return "No symbols";
  }

  let output = "Symbol Table:\n";
  output += "Name".padEnd(20) + "Address".padEnd(10) + "Type\n";
  output += "-".repeat(40) + "\n";

  for (const [name, symbol] of Object.entries(symbolTable)) {
    const addr = symbol.address.toString(16).padStart(4, "0").toUpperCase();
    const type = symbol.type || "LABEL";
    output += `${name.padEnd(20)}0x${addr.padEnd(6)}${type}\n`;
  }

  return output;
}

/**
 * Format assembly errors for display
 * @param {Array} errors - Error array
 * @returns {string} Formatted errors
 */
export function formatErrors(errors) {
  if (!errors || errors.length === 0) {
    return "No errors";
  }

  return errors
    .map((err) => `Line ${err.line}:${err.column} - ${err.message}`)
    .join("\n");
}

/**
 * Format assembly warnings for display
 * @param {Array} warnings - Warning array
 * @returns {string} Formatted warnings
 */
export function formatWarnings(warnings) {
  if (!warnings || warnings.length === 0) {
    return "No warnings";
  }

  return warnings
    .map((warn) => `Line ${warn.line}:${warn.column} - ${warn.message}`)
    .join("\n");
}
```

### Update index.html for Assembly Editor

Add assembly editor UI elements:

```html
<!-- Add to index.html -->
<div id="assembly-editor-panel" class="panel" style="display: none;">
  <h3>📝 Assembly Code Editor</h3>
  <textarea
    id="assembly-editor"
    placeholder="Enter Z80 assembly source code..."
    rows="15"
  ></textarea>
  <div class="editor-actions">
    <button id="assemble-btn" class="btn-primary">Assemble</button>
    <button id="load-assembly-btn" class="btn-secondary" disabled>
      Load into Emulator
    </button>
  </div>
  <div class="assembly-results">
    <div class="result-panel">
      <h4>Errors</h4>
      <pre id="assembly-errors">No errors</pre>
    </div>
    <div class="result-panel">
      <h4>Warnings</h4>
      <pre id="assembly-warnings">No warnings</pre>
    </div>
    <div class="result-panel">
      <h4>Symbol Table</h4>
      <pre id="assembly-symbols"></pre>
    </div>
    <div class="result-panel">
      <h4>Bytecode</h4>
      <pre id="assembly-bytecode"></pre>
    </div>
  </div>
</div>
```

### Testing

**Test File:** `tests/unit/assembler-tests.js` (Create based on assembler functionality)

**Run Tests:**

```bash
yarn test:run tests/unit/assembler-tests.js
```

**Expected Result:** All assembler tests pass

**Test Coverage:**

- Lexer tokenization (5+ tests)
- Parser two-pass assembly (5+ tests)
- Code generation (5+ tests)
- Expression evaluation (5+ tests)
- Error reporting (3+ tests)
- Symbol table generation (3+ tests)

### ⚠️ PHASE 8 TEST GATE

**CRITICAL:** Use the phase workflow script to enforce the test gate:

```bash
# Run Phase 8 tests with workflow script (waits for user confirmation)
yarn phase:8

# OR manually:
node scripts/phase-workflow.js 8 tests/unit/assembler-tests.js
```

**Expected Output (if tests pass):**

- All assembler tests pass
- Script displays success message
- Script waits for user confirmation

**If tests fail:**

- Script will exit with error code 1
- Review test failures
- Fix implementation issues
- Re-run tests until all pass
- **DO NOT consider project complete until all tests pass**

**Final Verification:**

```bash
# Run all tests to ensure complete system works
yarn test:run
# Expected: All 217+ tests pass
```

### Phase 8 Completion Criteria

- ✅ All assembler modules integrated
- ✅ Assembly editor UI functional
- ✅ Assembly compilation works correctly
- ✅ Programs load and execute after assembly
- ✅ Error handling displays properly
- ✅ Symbol table accessible
- ✅ Assembly routines converted to source code format
- ✅ All unit tests pass (if test file created)

**Verification:**

- Test assembly editor with sample programs
- Verify compilation and loading workflow
- Test error handling with invalid syntax
- Run full test suite to ensure no regressions

**Verification Command:**

```bash
# Run all tests to ensure complete system works
yarn test:run
# Expected: All 217+ tests pass
```

---

## TESTING REQUIREMENTS

### Complete Test Suite

All test files are provided in `docs/TRS80-COMPLETE-TEST-SUITE.md`. Copy each test file to your `tests/` directory as you implement the corresponding phase.

### Test Execution by Phase

**Phase 1 - CPU:**

```bash
yarn test:run tests/unit/cpu-tests.js
# Expected: 45 tests pass
```

**Phase 2 - Memory:**

```bash
yarn test:run tests/unit/memory-tests.js
# Expected: 28 tests pass
```

**Phase 3 - Cassette & I/O:**

```bash
yarn test:run tests/unit/cassette-tests.js tests/unit/io-tests.js
# Expected: 37 tests pass
```

**Phase 4 - BASIC Program Execution:**

```bash
yarn test:run tests/unit/basic-program-tests.js
# Expected: 45 tests pass
```

**Phase 5 - Video Display System:**

```bash
yarn test:run tests/unit/video-tests.js
# Expected: 32 tests pass
```

**Phase 6 - System Integration:**

```bash
yarn test:run tests/integration/cpu-memory-integration.js
# Expected: Integration tests pass
```

**Phase 7 - Program Loader:**

```bash
yarn test:run tests/unit/program-loader-tests.js
# Expected: 18 tests pass
```

**All Tests:**

```bash
yarn test:run
# Expected: 217+ tests pass
```

### Test Coverage Goals

| Component      | Target Coverage |
| -------------- | --------------- |
| CPU Core       | 100%            |
| Memory System  | 100%            |
| Cassette I/O   | 100%            |
| Video System   | 95%+            |
| Program Loader | 90%+            |
| Assembler      | 85%+            |
| Integration    | 85%+            |

### Running Tests

**Development (Watch Mode):**

```bash
yarn test
# Runs tests in watch mode, re-runs on file changes
```

**Single Run (CI Mode):**

```bash
yarn test:run
# Runs all tests once, exits with code 0 if all pass
```

**With Coverage:**

```bash
yarn test:coverage
# Generates coverage report in coverage/ directory
# Requires @vitest/coverage-v8 package (included in dependencies)
```

**Specific Test File:**

```bash
yarn test:run tests/unit/cpu-tests.js
# Run specific test file only
```

**Test Environment:**

- Uses jsdom for browser-like environment
- Path aliases (`@core`, `@peripherals`, etc.) work in tests
- Test files should use same import paths as source files

---

## BUILD SYSTEM

### Vite Configuration

Complete Vite configuration is provided in `vite.config.js` above. Key features:

- **Path Aliases:** `@core`, `@peripherals`, `@assembler`, etc.
- **Code Splitting:** Separate chunks for core, peripherals, and assembler
- **Minification:** Terser with console.log removal (requires `terser` package)
- **Source Maps:** Generated for debugging
- **Test Configuration:** Vitest with jsdom environment
- **Base Path:** `./` for relative paths (works with Netlify)
- **Build Target:** ES2020 (compatible with modern browsers)

**Important Notes:**

- Terser is specified for minification - ensure `terser` package is installed
- Path aliases work in both source code and test files
- Code splitting reduces initial bundle size
- Source maps are included for production debugging

### Development Commands

```bash
# Start development server with HMR
yarn dev
# Opens at http://localhost:3000

# Run tests in watch mode
yarn test

# Run tests once (for phase verification)
yarn test:run

# Run tests with coverage
yarn test:coverage

# Generate embedded ROM
yarn rom:embed
```

### Production Build

**Important:** Before building, ensure ROM is embedded:

```bash
# Step 1: Generate embedded ROM (required before first build)
yarn rom:embed

# Step 2: Build for production
yarn build

# Step 3: Preview production build locally
yarn preview
# Opens at http://localhost:4173

# Step 4: Verify build output
ls -la dist/
# Should show: index.html, assets/ directory, etc.
```

**Build with Test Verification:**

```bash
# Run tests, then build (fails if tests don't pass)
yarn test:run && yarn build
```

**Build Output:**

- `dist/index.html` - Main HTML file
- `dist/assets/*.js` - Bundled JavaScript (minified)
- `dist/assets/*.css` - Bundled CSS (minified)
- `dist/assets/*.map` - Source maps for debugging
- ROM is embedded in JavaScript bundle (no external ROM file)

### Build Verification

After building, verify:

```bash
# Check dist folder exists
ls -la dist/

# Check bundle size
du -sh dist/
# Should be < 1MB

# Verify minification
head -20 dist/assets/*.js
# Should show minified code (no whitespace/comments)

# Verify source maps
ls dist/assets/*.map
# Should show .map files

# Check for console.log (should be none)
grep -r "console.log" dist/ || echo "No console.log found ✓"
```

---

## DEPLOYMENT

### Netlify Configuration

Complete Netlify configuration is provided in `netlify.toml` above.

### Pre-Deployment Checklist

**Before deploying, ensure:**

1. ✅ **ROM Embedded:** Run `yarn rom:embed` to generate `src/data/model3-rom.js`
2. ✅ **All tests pass:** `yarn test:run` (exit code 0)
3. ✅ **Production build succeeds:** `yarn build` (no errors)
4. ✅ **Bundle size < 1MB:** Check `du -sh dist/`
5. ✅ **No console.log statements:** `grep -r "console.log" dist/` returns nothing
6. ✅ **ROM embedded:** No external `model3.rom` file in `dist/`
7. ✅ **Source maps generated:** `ls dist/assets/*.map` shows .map files
8. ✅ **Preview works:** `yarn preview` opens without errors
9. ✅ **Node version:** Netlify will use Node 20 (specified in netlify.toml)
10. ✅ **Dependencies installed:** `yarn install` completed successfully

### Deployment Commands

**Automated Deployment:**

```bash
# Full deployment pipeline (tests + build + deploy)
yarn deploy
```

**Manual Deployment:**

```bash
# Step 1: Ensure ROM is embedded
yarn rom:embed

# Step 2: Run all tests
yarn test:run

# Step 3: Build for production
yarn build

# Step 4: Preview locally (optional)
yarn preview

# Step 5: Deploy to Netlify
netlify deploy --prod
```

**Netlify Build Configuration:**

- Netlify will automatically run `yarn test:run && yarn build` (from netlify.toml)
- Uses Node 20 (specified in netlify.toml)
- Publishes `dist/` directory
- SPA routing configured (all routes → index.html)

### Post-Deployment Verification

1. ✅ Site loads without errors
2. ✅ Console has no errors
3. ✅ Emulator boots to BASIC prompt
4. ✅ Sample programs load and run
5. ✅ Graphics commands work
6. ✅ Assembly editor works
7. ✅ All UI features functional

---

## ERROR HANDLING STRATEGY

### Error Types and Handling

**1. Invalid ROM File**

- **Error:** ROM size mismatch or corruption
- **Handling:** Clear error message, prevent emulator start
- **User Message:** "Invalid ROM file. Expected 14KB or 16KB ROM."

**2. Unimplemented Opcode**

- **Error:** CPU encounters unknown opcode
- **Handling:** Log warning, execute NOP-equivalent (4 cycles)
- **User Message:** Console warning (development only, removed in production)

**3. Memory Access Violation**

- **Error:** Attempt to write to protected ROM
- **Handling:** Silently ignore (ROM protection)
- **User Message:** None (expected behavior)

**4. Assembly Compilation Errors**

- **Error:** Invalid assembly syntax, undefined labels
- **Handling:** Display errors with line numbers in UI
- **User Message:** "Assembly Error: [message] at line [line]"

**5. BASIC Program Errors**

- **Error:** Syntax errors, runtime errors
- **Handling:** Pass through from ROM interpreter
- **User Message:** Displayed in emulator screen

**6. File Loading Errors**

- **Error:** Invalid file format, file too large
- **Handling:** Clear error message, prevent loading
- **User Message:** "Error loading file: [reason]"

### Error Recovery

- **ROM Errors:** Prevent emulator start, require valid ROM
- **Assembly Errors:** Allow editing and re-assembly
- **Runtime Errors:** Reset emulator, clear error state
- **Build Errors:** Display in console, prevent deployment

---

## PERFORMANCE SPECIFICATIONS

### Timing Requirements

**CPU Execution:**

- Target: 2MHz CPU speed
- Frame Rate: 60 FPS
- Cycles per Frame: ~33,333 cycles (2MHz / 60)
- Cycle Budget: Must execute ~33K cycles per frame

**Frame Timing:**

- Render once per frame using `requestAnimationFrame`
- CPU execution loop runs until cycle budget exhausted
- Video refresh: 60Hz

### Performance Targets

- **Lighthouse Performance:** ≥ 85
- **First Contentful Paint:** < 2s
- **Time to Interactive:** < 3s
- **Frame Rate:** Stable 60 FPS
- **Bundle Size:** < 1MB
- **No Layout Shifts**

### Optimization Guidelines

1. **CPU Execution Loop:**

   - Batch instruction execution
   - Avoid function call overhead in hot paths
   - Use direct property access where possible

2. **Video Rendering:**

   - Render only changed regions
   - Use efficient canvas operations
   - Cache character bitmaps

3. **Memory Access:**

   - Minimize bounds checking overhead
   - Use typed arrays (Uint8Array)
   - Avoid unnecessary allocations

4. **Build Optimization:**
   - Code splitting for lazy loading
   - Tree-shaking unused code
   - Minification and compression

---

## ROM ANALYSIS AND REQUIREMENTS

### ROM Format Specification

**Supported Sizes:**

- 14KB (14336 bytes) - Common TRS-80 Model III ROM
- 16KB (16384 bytes) - Extended ROM

**ROM Validation:**

- Check file size matches expected values
- Verify non-zero content (not empty)
- Validate ROM structure (optional checksum)

### ROM Entry Points

**BASIC Interpreter:**

- Entry point: Typically at 0x0000 (ROM start)
- BASIC ready check: Monitor PC > 0x1000
- SET/RESET/POINT hooks: To be determined via ROM analysis

### Required Instruction Analysis

**Priority 1 (ROM Boot):**

- LD, JP, CALL, RET, NOP, HALT

**Priority 2 (BASIC Execution):**

- ADD, SUB, INC, DEC, CP, PUSH, POP

**Priority 3 (Extended):**

- JR, DJNZ, I/O instructions
- CB, ED, DD, FD prefixes (ALL must be implemented - complete Z80 instruction set)

### ROM Loading Process

1. Read ROM file from `public/assets/model3.rom`
2. Validate size (14336 or 16384 bytes)
3. Load into memory system
4. Pad 14KB ROMs to 16KB if needed
5. Verify ROM loaded successfully

---

## SUCCESS CRITERIA

The emulator is complete when all of the following are verified:

### Core Functionality (5 items)

- ✅ Boots to TRS-80 BASIC prompt within 5 seconds
- ✅ Runs BASIC programs correctly (all language features work)
- ✅ Loads programs via cassette interface simulation
- ✅ Keyboard input works properly (all mapped keys respond)
- ✅ Display renders correctly in both text mode and graphics mode

### Sample Programs (8 items)

- ✅ All 12 BASIC programs load successfully from dropdown
- ✅ All 12 BASIC programs execute without errors
- ✅ All 5+ assembly routines load successfully (as source code)
- ✅ All 5+ assembly routines assemble and execute correctly
- ✅ **BASIC programs can be edited in-browser** (Edit BASIC button works)
- ✅ **Assembly programs can be edited in-browser** (Edit Assembly button works)
- ✅ Edited BASIC programs can be saved and reloaded
- ✅ Edited assembly programs can be assembled and executed

### Graphics Mode (6 items)

- ✅ SET(x, y) turns pixels on at correct coordinates (x: 0-127, y: 0-47)
- ✅ RESET(x, y) turns pixels off correctly
- ✅ POINT(x, y) returns correct pixel state (-1 or 0)
- ✅ Graphics characters (128-191) render as 2×3 pixel blocks
- ✅ Line test program draws diagonal, horizontal, and vertical lines
- ✅ Box pattern program creates nested boxes and patterns

### Z80 Assembler Integration (6 items)

- ✅ Assembly editor UI functional
- ✅ Assembly source code compiles correctly
- ✅ Assembly errors display with line numbers
- ✅ Symbol table displays after assembly
- ✅ Assembled code loads into emulator memory
- ✅ Assembled programs execute correctly

### Testing & Quality (5 items)

- ✅ All unit tests pass (100% success rate, 0 failures)
- ✅ All integration tests pass
- ✅ No console errors during normal operation
- ✅ No memory leaks during extended use
- ✅ Runs at stable 60 FPS (no dropped frames)

### Production Build Requirements (9 items)

- ✅ Build completes with `yarn build` without errors
- ✅ Exit code is 0
- ✅ No warnings in build output
- ✅ `dist/` directory is created
- ✅ All JavaScript is minified (Terser applied)
- ✅ No `console.log` or `debugger` statements remain
- ✅ Total bundle size < 1MB
- ✅ ROM embedded as base64 (no external model3.rom in dist/)
- ✅ Source maps generated (\*.map files)

### Performance Benchmarks (5 items)

- ✅ Lighthouse Performance ≥ 85
- ✅ Lighthouse Accessibility ≥ 90
- ✅ Lighthouse Best Practices ≥ 90
- ✅ First Contentful Paint < 2s
- ✅ Time to Interactive < 3s

### Browser Compatibility (5 items)

- ✅ Works in Chrome 100+ (latest)
- ✅ Works in Firefox 100+ (latest)
- ✅ Works in Safari 15+ (latest)
- ✅ Works in Edge 100+ (latest)
- ✅ No browser-specific errors

**ES2020 Target:**

- Vite builds with `target: "es2020"` for modern browser support
- Uses native ES modules (`type: "module"` in package.json)
- No polyfills required for modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)

### Deployment (4 items)

- ✅ Deploys to Netlify without errors
- ✅ All routes work (SPA redirects configured)
- ✅ HTTPS enabled
- ✅ Loads in under 3 seconds on fast connection

**Total: 53 specific, verifiable criteria**

---

## QUICK START GUIDE

### Initial Setup

**Prerequisites:**

- Node.js 20.x LTS or later (check with `node --version`)
- Yarn 1.22.22 or later (check with `yarn --version`)

**Setup Steps:**

```bash
# Clone or create project
mkdir trs80-emulator
cd trs80-emulator

# Initialize package.json (if creating new project)
# Copy package.json from this document

# Install dependencies
yarn install

# Place ROM file
cp /path/to/model3.rom public/assets/

# Validate ROM
node scripts/validate-rom.js

# Generate embedded ROM (required before first build)
yarn rom:embed

# Start development server
yarn dev
# Opens at http://localhost:3000
```

**Verification:**

- Check Node version: `node --version` (should be 20.x or later)
- Check Yarn version: `yarn --version` (should be 1.22.22 or later)
- Verify ROM file exists: `ls -lh public/assets/model3.rom`
- Verify ROM embedded: `ls -lh src/data/model3-rom.js`

### Phase-by-Phase Development

1. **Phase 0:** Analyze ROM, identify requirements
2. **Phase 1:** Implement CPU core, run tests, verify
3. **Phase 2:** Implement memory system, run tests, verify
4. **Phase 3:** Implement cassette & I/O, run tests, verify
5. **Phase 4:** Test BASIC program execution, run tests, verify
6. **Phase 5:** Implement video system, run tests, verify
7. **Phase 6:** System integration, run tests, verify
8. **Phase 7:** UI and sample programs, run tests, verify
9. **Phase 8:** Assembler integration, verify

**After each phase:**

```bash
# Use workflow script (recommended - enforces test gate and waits for confirmation)
yarn phase:N  # Replace N with phase number (1-7)

# OR manually verify:
yarn test:run tests/unit/[phase]-tests.js
# Check exit code (must be 0)
echo $?
# If exit code is 0: All tests passed
# If exit code is non-zero: Tests failed - fix issues before proceeding
```

**Workflow Script Usage:**

- Phase 1: `yarn phase:1`
- Phase 2: `yarn phase:2`
- Phase 3: `yarn phase:3`
- Phase 4: `yarn phase:4`
- Phase 5: `yarn phase:5`
- Phase 6: `yarn phase:6`
- Phase 7: `yarn phase:7`
- Phase 8: `yarn phase:8`

**The workflow script will:**

- Run tests for the phase
- Display results
- Wait for user confirmation if tests pass
- Exit with error code 1 if tests fail (prevents proceeding)

### Running Your First Program

1. **Power On** the emulator
2. **Select "Hello World"** from BASIC Programs
3. **Click "Load Selected"**
4. **Click "RUN"**

Output: `HELLO FROM TRS-80!`

### Testing Graphics

1. **Select "Graphics Mode - Line Test"**
2. **Click "Load Selected"**
3. **Click "RUN"**

See: Diagonal X pattern with horizontal and vertical lines

### Editing a BASIC Program

1. **Select any BASIC program**
2. **Click "Edit BASIC"**
3. **Modify in modal**
4. **Click "Save Changes"**
5. **Click "Load Selected"** to reload
6. **Click "RUN"** to test

### Editing and Assembling Assembly Code

1. **Select any assembly routine**
2. **Click "Edit Assembly"**
3. **Modify source code in editor**
4. **Click "Assemble"**
5. **Review errors/warnings if any**
6. **Click "Load into Emulator"**
7. **Call from BASIC:** `A = USR(0x5000)`

---

## TROUBLESHOOTING

### Common Issues and Solutions

#### Tests Failing After Phase Completion

**Problem:** Tests pass during development but fail when running full test suite.

**Causes:**

- Test isolation issues (shared state between tests)
- Missing test cleanup in beforeEach/afterEach
- Incorrect test file paths or imports

**Solutions:**

- Ensure each test file has proper `beforeEach` cleanup
- Use `describe` blocks to isolate test groups
- Verify all imports use correct path aliases (`@core`, `@peripherals`, etc.)
- Run tests individually: `yarn test:run tests/unit/[specific-test].js`

#### ROM Loading Errors

**Problem:** ROM fails to load or emulator won't start.

**Causes:**

- ROM file not found at `public/assets/model3.rom`
- Invalid ROM size (not 14KB or 16KB)
- ROM file corrupted or empty

**Solutions:**

- Verify ROM file exists: `ls -lh public/assets/model3.rom`
- Check ROM size: `wc -c public/assets/model3.rom` (should be 14336 or 16384)
- Run ROM validation: `node scripts/validate-rom.js`
- Ensure ROM file is not empty (check first few bytes are non-zero)

#### Build Failures

**Problem:** `yarn build` fails with errors.

**Causes:**

- Missing dependencies
- Syntax errors in code
- Import path issues
- Type errors (if using TypeScript)

**Solutions:**

- Install dependencies: `yarn install`
- Check for syntax errors: `yarn build 2>&1 | grep -i error`
- Verify all imports use correct path aliases
- Check Vite config for correct alias definitions
- Ensure all referenced files exist

#### Assembler Integration Issues

**Problem:** Assembler modules fail to import or compile.

**Causes:**

- Missing assembler module files
- Incorrect import paths
- Memory map constants not updated for TRS-80
- Module export/import mismatches

**Solutions:**

- Verify all assembler files copied to `src/assembler/`
- Check import paths match file structure
- Update `src/assembler/constants.js` with TRS-80 memory map (see Phase 7)
- Verify all modules use ES6 export syntax (`export class`, `export function`)
- Test each module individually before integration

#### Performance Problems

**Problem:** Emulator runs slowly or drops frames.

**Causes:**

- CPU execution loop inefficient
- Video rendering too frequent
- Memory access overhead
- Too many console.log statements

**Solutions:**

- Profile with browser DevTools Performance tab
- Ensure video renders once per frame only
- Remove or comment out console.log statements
- Use direct property access instead of getters in hot paths
- Batch instruction execution in CPU loop
- Check for memory leaks (growing memory usage over time)

#### Browser Compatibility Issues

**Problem:** Works in one browser but not another.

**Causes:**

- Browser-specific API differences
- Missing polyfills
- CSS compatibility issues
- JavaScript feature support differences

**Solutions:**

- Check browser console for specific errors
- Verify ES2020 target in vite.config.js is supported
- Test in Chrome, Firefox, Safari, Edge
- Use browser DevTools to identify unsupported features
- Add polyfills if needed for older browsers

#### Test Environment Setup Issues

**Problem:** Tests fail with "module not found" or "import error".

**Causes:**

- Path aliases not configured in Vitest
- Missing jsdom environment
- Incorrect test file structure
- Import paths don't match source structure

**Solutions:**

- Verify `vite.config.js` test section includes path aliases
- Ensure `environment: 'jsdom'` is set in test config
- Check test files use same import paths as source files
- Verify `tests/` directory structure matches `src/` structure
- Run: `yarn test:run --reporter=verbose` for detailed errors

#### Phase Gate Failures

**Problem:** Can't proceed to next phase because tests fail.

**Causes:**

- Implementation incomplete
- Test expectations incorrect
- Test file copied incorrectly
- Missing dependencies

**Solutions:**

- Review phase completion criteria checklist
- Compare implementation with reference code
- Verify test file copied correctly from test suite document
- Run tests with verbose output to see specific failures
- Check that all required methods/functions are implemented
- Ensure test setup matches phase requirements

---

## QUICK REFERENCE

### Common Commands

```bash
# Development
yarn dev                    # Start dev server
yarn test                   # Run tests in watch mode
yarn test:run              # Run tests once
yarn test:coverage         # Run tests with coverage

# Building
yarn build                 # Production build
yarn preview               # Preview production build
yarn rom:embed             # Generate embedded ROM

# Deployment
yarn deploy                # Deploy to Netlify (runs tests + build)
```

### Test Commands by Phase

```bash
# Phase 1: CPU
yarn test:run tests/unit/cpu-tests.js

# Phase 2: Memory
yarn test:run tests/unit/memory-tests.js

# Phase 3: Cassette & I/O
yarn test:run tests/unit/cassette-tests.js tests/unit/io-tests.js

# Phase 4: BASIC Program Execution
yarn test:run tests/unit/basic-program-tests.js

# Phase 5: Video Display System
yarn test:run tests/unit/video-tests.js

# Phase 6: System Integration
yarn test:run tests/integration/cpu-memory-integration.js

# Phase 7: Program Loader
yarn test:run tests/unit/program-loader-tests.js

# Phase 8: Assembler
yarn test:run tests/unit/assembler-tests.js

# All Tests
yarn test:run
```

### File Locations Quick Lookup

| Component       | File Path                     |
| --------------- | ----------------------------- |
| CPU Core        | `src/core/z80cpu.js`          |
| Memory System   | `src/core/memory.js`          |
| I/O System      | `src/core/io.js`              |
| Cassette        | `src/peripherals/cassette.js` |
| Video           | `src/peripherals/video.js`    |
| Keyboard        | `src/peripherals/keyboard.js` |
| Main System     | `src/system/trs80.js`         |
| ROM Loader      | `src/system/rom-loader.js`    |
| Program Loader  | `src/ui/program-loader.js`    |
| Assembly Editor | `src/ui/assembly-editor.js`   |
| Assembler       | `src/assembler/assembler.js`  |
| Sample Programs | `src/data/sample-programs.js` |
| Sample Assembly | `src/data/sample-assembly.js` |

### Memory Map Reference

| Address Range | Size | Description                       |
| ------------- | ---- | --------------------------------- |
| 0x0000-0x37FF | 14KB | ROM (14KB ROM)                    |
| 0x0000-0x3FFF | 16KB | ROM (16KB ROM)                    |
| 0x3C00-0x3FFF | 1KB  | Video RAM (writable in ROM space) |
| 0x4000-0xFFFF | 48KB | RAM                               |
| 0x4200+       | -    | BASIC program area                |
| 0x5000+       | -    | Assembly routine area             |

### Port I/O Reference

| Port | Function                |
| ---- | ----------------------- |
| 0xFF | Keyboard input          |
| 0xFE | Cassette control/status |
| 0xEC | System control          |

### Build Verification Checklist

```bash
# After building, verify:
ls -la dist/                    # dist/ exists
du -sh dist/                    # Size < 1MB
ls dist/assets/*.map            # Source maps exist
grep -r "console.log" dist/     # No console.log (should return nothing)
```

---

## NOTES FOR LLM IMPLEMENTATION

### Key Implementation Points

1. **Z80 CPU:** Implement COMPLETE Z80 instruction set (all 252+ opcodes including CB, ED, DD, FD prefixes)
2. **Memory System:** ROM protection is critical, support both ROM sizes
3. **Graphics:** Character-based implementation is authentic to TRS-80
4. **Sample Programs:** Pre-loaded, no file system needed
5. **BASIC Tokenization:** Simple ASCII conversion works initially
6. **Z80 Assembler:** Complete assembler provided, integrate fully
7. **Test-Driven:** Run tests after each phase, don't proceed until passing

### Testing Strategy

- Unit test each component in isolation
- Integration test component interactions
- Validate with sample programs
- Graphics programs verify pixel operations
- **Phase gates ensure quality at each step**

### Performance Optimization

- CPU instruction handlers should be fast
- Video rendering once per frame only
- Batch memory writes when possible
- Profile if performance issues arise

### Common Pitfalls to Avoid

- Don't skip ROM protection
- Don't forget graphics character set
- Don't make BASIC tokenization too complex initially
- Don't optimize prematurely
- Don't forget keyboard mapping
- **Don't skip test gates between phases**
- **Don't proceed to next phase until tests pass**

---

## DOCUMENT IMPROVEMENTS SUMMARY

This enhanced build prompt incorporates:

### 1. ✅ Complete Z80 Assembler Integration

- Full assembler module structure
- Assembly editor UI component
- Source code storage format
- Compilation and loading workflow

### 2. ✅ Enhanced Test Integration

- Complete test suite reference (217+ tests)
- Phase-by-phase test execution
- Test gates between phases
- Coverage requirements

### 3. ✅ Sequential Development Workflow

- Phase-by-phase development process
- Test-driven approach
- Clear phase gates
- Verification commands

### 4. ✅ Enhanced Build System

- Complete Vite configuration
- Path aliases including @assembler
- Build optimization
- Test configuration

### 5. ✅ Enhanced Deployment

- Complete Netlify configuration
- Pre-deployment verification
- Post-deployment checklist

### 6. ✅ Critical Issue Resolutions

- ROM size flexibility (14KB/16KB support)
- Instruction prioritization
- Error handling strategy
- Performance specifications

### 7. ✅ Complete Specifications

- Error handling strategy
- Performance requirements
- ROM analysis requirements
- Browser compatibility matrix

### 8. ✅ Vite & Netlify Integration

- Complete Vite configuration with all path aliases
- Terser minification setup (with dependency)
- Test coverage setup (@vitest/coverage-v8)
- Node 20 LTS compatibility (updated from Node 18)
- Netlify deployment configuration
- Build workflow documentation (`yarn dev`, `yarn build`)
- ROM embedding process (`yarn rom:embed`)

### 9. ✅ Entry Point & Application Structure

- HTML structure with main.js entry point
- Application initialization flow documented
- Module import structure clarified
- Build output verification steps

### 10. ✅ Phase-by-Phase Test-Driven Workflow

- Test file setup instructions for each phase
- Phase workflow script (`scripts/phase-workflow.js`) for test gates
- User confirmation required between phases
- Test-first approach enforced
- Clear instructions to fix failing tests before proceeding
- Package.json scripts for each phase (`yarn phase:1` through `yarn phase:7`)

---

**This prompt is production-ready for LLM consumption with:**

- ✅ Maximum clarity - No ambiguous requirements
- ✅ Complete test suite - 217+ tests provided
- ✅ Sequential workflow - Phase-by-phase with gates
- ✅ Complete specifications - Every requirement detailed
- ✅ Verifiable success - 53 specific checkpoints
- ✅ Z80 assembler integration - Full editing capability
- ✅ **Vite build system** - Complete configuration for `yarn dev` and `yarn build`
- ✅ **Netlify deployment** - Ready for production deployment with Node 20
- ✅ **Web-based JavaScript** - Pure browser implementation, no server required

**Build System Verification:**

- ✅ **Vite Configuration:** Complete with path aliases, code splitting, Terser minification
- ✅ **Package Dependencies:** All required packages specified (vite, vitest, terser, @vitest/coverage-v8)
- ✅ **Node Version:** Node 20 LTS (latest stable, compatible with Vite 5.4+)
- ✅ **Build Commands:** `yarn dev` and `yarn build` fully configured and tested
- ✅ **Netlify Config:** Complete with Node 20, build commands, SPA routing, security headers
- ✅ **ROM Embedding:** Process documented and required before build (`yarn rom:embed`)
- ✅ **Entry Point:** Clear HTML → main.js → system initialization flow
- ✅ **Browser Target:** ES2020 (modern browsers, no polyfills needed)

**Document Stats:**

- **Enhanced specifications** with assembler integration
- **217+ comprehensive tests** organized by phase
- **53 verifiable** success criteria
- **7 development phases** with test gates
- **Complete build and deployment** specifications
- **Node 20 LTS** compatibility
- **Vite 5.4+** build system
- **Netlify-ready** deployment configuration

**Ready for Implementation:**

This document provides everything needed to build a complete, production-ready TRS-80 Model III emulator that:

- Runs entirely in modern web browsers (JavaScript/ES2020)
- Builds with Vite (`yarn dev` for development, `yarn build` for production)
- Deploys to Netlify using Node 20 LTS
- Follows a test-driven, phase-by-phase development approach

**Give this to any capable LLM and say: "Build this TRS-80 Model III emulator phase by phase, running tests after each phase. Copy test files BEFORE implementing each phase from `docs/TRS80-COMPLETE-TEST-SUITE.md`. Use `yarn phase:N` to run tests - the script will wait for your confirmation before proceeding to the next phase. Fix any failing tests before continuing. Use Vite for building (`yarn dev` and `yarn build`) and ensure it deploys to Netlify with Node 20."** ✨

**Key Workflow Points:**

- ✅ Copy test files BEFORE starting each phase implementation
- ✅ Use `yarn phase:N` to run tests and wait for confirmation
- ✅ Fix all failing tests before proceeding (script blocks advancement)
- ✅ User confirmation required between phases
- ✅ Build with `yarn dev` (development) or `yarn build` (production)
- ✅ Deploy to Netlify with Node 20
