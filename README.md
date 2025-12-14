# TRS-80 Model III Emulator

A web-based emulator for the TRS-80 Model III computer, built with JavaScript and Vite. This project is being developed in phases, starting with a complete Z80 CPU emulator and expanding to include memory management, I/O systems, video display, and a web-based user interface.

🌐 **Live Demo**: [https://trs80emu.netlify.app/](https://trs80emu.netlify.app/)

📋 **Complete Design Document**: [docs/TRS80-COMPLETE-BUILD-PROMPT.md](docs/TRS80-COMPLETE-BUILD-PROMPT.md)

## Current Status

**Phase 5: Video Display System** ✅ **COMPLETE**

The emulator currently implements a complete Z80 CPU with full instruction set support, comprehensive memory management, cassette I/O system, BASIC program execution, and a full 128×48 pixel graphics display system. A browser-based development console allows you to run comprehensive tests directly in the browser with detailed assembly, opcodes, BASIC source code, and graphics display.

![Phase 1 Test Results](docs/phase1-test-results.png)
![Phase 4 BASIC Source & Results](docs/phase4-basic-modal.png)

### ✅ Implemented Features

- **Complete Z80 CPU Emulation**: Full instruction set implementation (252+ opcodes including CB, ED, DD, FD prefixes)
- **Memory Management System**: 16K ROM + 48K RAM with proper memory mapping, ROM protection, and program loading
- **Cassette I/O System**: Tape loading/saving simulation, CLOAD/CSAVE operations, cassette motor control
- **BASIC Program Execution**: ROM loading, program storage, CPU execution with ROM, CLOAD integration
- **Video Display System**: 64×16 character text display with 128×48 pixel graphics mode, SET/RESET/POINT commands, CHR$() graphics characters
- **Browser Test Console**: Interactive test runner for all phases with opcodes, assembly mnemonics, BASIC source code, and graphics display
- **Comprehensive Test Suites**:
  - 52 Phase 1 CPU tests with 100% pass rate (organized by complexity, showing opcodes and assembly)
  - 27 Phase 2 memory system tests with 100% pass rate (showing relevant Z80 memory opcodes)
  - 33 Phase 3 cassette & I/O tests with 100% pass rate (showing IN/OUT opcodes and descriptions)
  - 32 Phase 4 BASIC program tests with 100% pass rate (showing BASIC source code and expected output)
  - 61 Phase 5 video display tests with 100% pass rate (showing graphics patterns, SET/RESET/POINT, and CHR$() examples)

### 🚧 Planned Features (Future Phases)

- **System Integration**: Complete system boot, keyboard input, display updates (Phase 6)
- **Sample Programs Library**: 15 built-in BASIC programs and 5 assembly routines (Phase 7)
- **Z80 Assembler**: In-browser assembly editing and compilation (Phase 8)

## Technology Stack

- **Runtime**: Node.js 20 LTS
- **Build Tool**: Vite 5.4+
- **Package Manager**: Yarn 1.22.22
- **Testing**: Vitest 1.6+ with JSDOM
- **Deployment**: Netlify

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- Yarn 1.22.22

### Installation

```bash
# Install dependencies
yarn install
```

### Development

```bash
# Start development server
yarn dev
```

The emulator will be available at `http://localhost:3000`

### Browser Development Console

The emulator includes a built-in development console accessible at the live demo URL. The console provides:

- **Phase 0: Design Document**: View the complete design document inline in the console with full scrolling support
- **Phase 1: Z80 CPU Test Runner**: Run 52 comprehensive CPU tests with assembly mnemonics and opcode bytes displayed
- **Phase 2: Memory System Test Runner**: Run 27 memory system tests with relevant Z80 memory opcodes
- **Phase 3: Cassette & I/O Test Runner**: Run 33 cassette and I/O tests with IN/OUT opcodes and detailed descriptions
- **Phase 4: BASIC Program Test Runner**: Run 32 BASIC program execution tests with source code and expected output modals
- **Phase 5: Video Display Test Runner**: Run 61 video display tests with graphics patterns, SET/RESET/POINT commands, and CHR$() examples
- **Interactive Test Results**: View detailed test execution and results with keyboard and mouse navigation
- **BASIC Source Code Modal**: Click "View BASIC Source & Results" links to see program source code and expected PRINT output
- **Graphics Display Modal**: Click "View Graphics & Source" links to see rendered graphics (128×48) and BASIC source code
- **Real-time Logging**: See CPU operations, memory operations, register states, and test outcomes
- **Full Viewport Layout**: All tabs take up the entire viewport width and height
- **Scrollable Content**: All tabs support mouse wheel scrolling and keyboard navigation (arrow keys, Page Up/Down)
- **Smart Scroll Behavior**: Console content starts at the top when tests begin, allowing you to scroll down to view all results as they load

To use the development console:

1. Visit [https://trs80emu.netlify.app/](https://trs80emu.netlify.app/)
2. Click "Phase 0: Design Doc" to view the design document inline (scrollable)
3. Click "Phase 1: Z80 CPU" to run 52 CPU tests with assembly and opcodes displayed
4. Click "Phase 2: Memory System" to run 27 memory tests with memory opcodes displayed
5. Click "Phase 3: Cassette & I/O" to run 33 I/O tests with IN/OUT opcodes displayed
6. Click "Phase 4: BASIC Programs" to run 32 BASIC program tests
7. Click "Phase 5: Video Display" to run 61 video display tests with graphics patterns
8. **View BASIC Source**: Click "View BASIC Source & Results" links in Phase 4 tests to see program source code and expected output in a modal
9. **View Graphics**: Click "View Graphics & Source" links in Phase 5 tests to see rendered graphics (128×48) and BASIC source code in a modal
10. View test results and execution details in the scrollable console
11. Use mouse wheel or keyboard (arrow keys, Page Up/Down) to navigate long test results
12. The console automatically maintains scroll position at the top so you can see when content finishes loading

For browser developer tools (F12), the console will show:

- CPU execution logs (Phase 1)
- Memory access logs (Phase 2)
- I/O port operations (Phase 3)
- BASIC program execution (Phase 4)
- Graphics operations (Phase 5)
- Test results
- Debug information

**Note**: The browser console uses optimized logging for loop-based tests to reduce noise while maintaining full test coverage. Summary messages are provided for tests that verify large address ranges.

**Phase 4 Learning Features**: Each BASIC program test includes a clickable link to view the program source code and expected output in a modal window. This makes it easy to see both what the program does (source) and what it produces (output), perfect for learning BASIC programming.

**Phase 5 Learning Features**: Each graphics test includes a clickable link to view the rendered graphics (128×48 pixels, scaled 4x for visibility) and BASIC source code in a modal window. Graphics patterns include checkerboards, frames, crosshairs, filled shapes, and all CHR$() graphics characters (128-191), making it easy to see how SET, RESET, POINT, and CHR$() commands work.

### Testing

```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test:watch

# Run tests once (CI mode)
yarn test:run

# Run tests with coverage
yarn test:coverage

# Run tests for a specific phase
yarn test:run tests/unit/cpu-tests.js           # Phase 1: CPU tests (52 tests)
yarn test:run tests/unit/memory-tests.js        # Phase 2: Memory tests (27 tests)
yarn test:run tests/unit/cassette-tests.js tests/unit/io-tests.js  # Phase 3: Cassette & I/O tests (33 tests)
yarn test:run tests/unit/basic-program-tests.js # Phase 4: BASIC program tests (32 tests)
yarn test:run tests/unit/video-tests.js         # Phase 5: Video display tests (61 tests)
```

### Phase-by-Phase Development

This project follows a phased development approach with test gates between phases:

```bash
# Run Phase 1 tests with workflow script (waits for user confirmation)
yarn phase:1

# Run Phase 2 tests with workflow script (waits for user confirmation)
yarn phase:2

# Run Phase 3 tests
yarn phase:3

# Run Phase 4 tests
yarn phase:4

# Run Phase 5 tests
yarn phase:5

# Or manually run phase workflow
node scripts/phase-workflow.js <phase-number> <test-files>
```

## Phased Development Status

This project follows a phased development approach. See the [Complete Design Document](docs/TRS80-COMPLETE-BUILD-PROMPT.md) for full specifications.

### ✅ Phase 0: ROM Analysis and Setup

**Status**: Complete

- ROM file validation
- Base64 encoding scripts
- Project structure setup
- Netlify deployment configuration

### ✅ Phase 1: Z80 CPU Core Implementation

**Status**: Complete ✅

- Complete Z80 instruction set (252+ opcodes)
- All CB prefix instructions (bit operations, rotates, shifts)
- All ED prefix instructions (block operations, extended I/O)
- All DD/FD prefix instructions (IX/IY operations)
- Register operations (AF, BC, DE, HL, IX, IY, SP, PC)
- Flag calculations (S, Z, H, P/V, N, C)
- Cycle-accurate timing
- Browser-based test runner
- Interactive development console
- **Tests**: All 52 Phase 1 tests passing ✅ (100% success rate)
- **Learning Tool**: All tests display assembly mnemonics and opcode bytes in the web UI
- **Live**: Available at [https://trs80emu.netlify.app/](https://trs80emu.netlify.app/)

**Screenshot**: See `docs/phase1-test-results.png` for Phase 1 test results display

#### Phase 1 Test Results

The browser-based development console provides real-time test execution and results. The console displays:

- **Assembly mnemonics** (e.g., "LD A, 0x42", "LDIR", "JP 0x5000") for each instruction test
- **Opcode bytes** (e.g., "0x3E 0x42", "0xED 0xB0", "0xC3 0x00 0x50") showing the actual machine code
- Test execution progress organized by complexity levels (Levels 1-13)
- Detailed test results for each suite
- Summary statistics (Total, Passed, Failed)
- Success confirmation when all tests pass
- **Fully scrollable content**: The console automatically focuses when Phase 1 is activated, starting at the top so you can scroll down to view all 52 test results using mouse wheel or keyboard (arrow keys, Page Up/Down)

**Learning Features**: Each test that executes Z80 instructions shows both the assembly mnemonic and the opcode bytes, making this a valuable learning tool for understanding Z80 assembly language and machine code.

### ✅ Phase 2: Memory Management System

**Status**: Complete ✅

- **16K ROM + 48K RAM mapping**: Complete 64KB address space (0x0000-0x3FFF ROM, 0x4000-0xFFFF RAM)
- **ROM protection**: Writes to ROM area are ignored (except video RAM)
- **Video RAM area**: 0x3C00-0x3FFF (1KB) is writable even though it's in ROM space
- **Program loading**: Load programs at custom addresses with automatic validation
- **16-bit word operations**: Little-endian word read/write support
- **Address wrapping**: Automatic 16-bit address masking for safety
- **ROM size support**: Handles both 14KB and 16KB ROMs (14KB ROMs are auto-padded)
- **Memory statistics**: Get detailed memory usage and status information
- **RAM management**: Clear RAM while preserving ROM
- **Browser-based test runner**: Interactive test execution with optimized logging
- **Tests**: All 27 Phase 2 tests passing ✅ (100% success rate)
- **Learning Tool**: All memory operation tests display relevant Z80 opcodes and assembly instructions
- **Live**: Available at [https://trs80emu.netlify.app/](https://trs80emu.netlify.app/)

#### Phase 2 Test Results

The browser-based development console provides real-time test execution and results for the memory system. The Phase 2 test suite includes:

- **Initialization tests** (3 tests): Memory system setup and statistics
- **ROM loading tests** (3 tests): 16KB ROM loading, size validation, data integrity (shows opcodes stored in ROM)
- **Memory reading tests** (3 tests): ROM reads, RAM reads, 16-bit word reads (shows LD A, (nn), LD HL, (nn) opcodes)
- **Memory writing tests** (3 tests): RAM writes, high RAM writes, 16-bit word writes (shows LD (nn), A, LD (nn), HL opcodes)
- **ROM protection tests** (3 tests): Write protection, video RAM writability, full range verification (shows ROM protection behavior)
- **RAM operations tests** (3 tests): Sequential reads/writes, boundary testing (shows LD (HL), A and LD A, (HL) patterns)
- **Program loading tests** (5 tests): Default address, custom address, array support, validation, edge cases (shows complete program opcodes)
- **RAM management tests** (2 tests): RAM clearing, ROM preservation (shows memory management operations)
- **Address wrapping tests** (2 tests): 16-bit wrapping, address masking (shows 16-bit address handling)

All 27 tests pass with 100% success rate, verifying proper memory management, ROM protection, and program loading capabilities.

**Learning Features**: Each memory operation test displays the relevant Z80 assembly instruction and opcode bytes (e.g., "LD A, (0x4000)" with opcode "0x3A 0x00 0x40"), making it easy to understand how the Z80 CPU accesses memory. This helps learners connect memory operations to actual Z80 instructions.

**Optimized Logging**: The test runner uses intelligent logging that reduces verbosity for loop-based tests (e.g., video RAM range testing) while maintaining full test coverage. This provides a clean, readable output while ensuring all assertions are verified.

### ✅ Phase 3: Cassette I/O System

**Status**: Complete ✅

- **Cassette interface simulation**: Tape loading/saving, CLOAD/CSAVE operations
- **Cassette motor control**: Port 0xFE control, motor on/off states
- **Tape data management**: Load tape data, simulate CLOAD operations
- **I/O port handling**: Port 0xFF (keyboard), Port 0xFE (cassette), Port 0xEC (system control)
- **Browser-based test runner**: Interactive test execution with IN/OUT opcodes displayed
- **Tests**: All 33 Phase 3 tests passing ✅ (100% success rate)
- **Learning Tool**: All I/O tests display assembly mnemonics (IN/OUT) and opcode bytes
- **Live**: Available at [https://trs80emu.netlify.app/](https://trs80emu.netlify.app/)

### ✅ Phase 4: BASIC Program Execution

**Status**: Complete ✅

- **ROM loading**: Load ModelIII.rom (14KB or 16KB) into memory system
- **Program storage**: Store BASIC programs at default (0x4200) or custom addresses
- **CPU execution with ROM**: Execute Z80 instructions from ROM (BASIC interpreter)
- **CLOAD integration**: Load programs via cassette system simulation
- **Memory layout**: Proper ROM (0x0000-0x3FFF) and RAM (0x4000-0xFFFF) separation
- **Program execution flow**: Programs can call ROM routines, use stack operations
- **Browser-based test runner**: Interactive test execution with BASIC source code display
- **BASIC Source Modal**: Click links to view program source code and expected output
- **Tests**: 32 Phase 4 unit tests with 100% pass rate
- **Learning Tool**: All tests display BASIC source code, expected output, assembly mnemonics, and opcode bytes
- **Live**: Available at [https://trs80emu.netlify.app/](https://trs80emu.netlify.app/)

#### Phase 4 Test Coverage

The Phase 4 test suite includes:

- **ROM Loading tests** (4 tests): ROM validation, size handling, data reading, write protection
- **Program Storage tests** (4 tests): Default address, custom address, multiple programs, ROM preservation
- **CPU Execution with ROM tests** (4 tests): Instruction execution, jumps, calls, multi-instruction sequences
- **Program Execution Flow tests** (3 tests): RAM execution, ROM routine calls, stack operations
- **CLOAD Integration tests** (3 tests): CLOAD simulation, program execution after load, I/O operations
- **Memory Layout tests** (4 tests): Address ranges, ROM/RAM separation, program boundaries
- **Simple BASIC Programs tests** (4 tests): PRINT statements, multi-line programs, variables, GOTO statements
- **Advanced BASIC Programs tests** (9 tests): GOTO loops, random numbers, nested loops, arithmetic, strings, conditionals
- **Complex Scenarios tests** (3 tests): Large programs, stack operations, loops
- **Integration tests** (3 tests): Complete CLOAD/RUN flow, I/O operations, program persistence

**Learning Features**: Each BASIC program test includes a "View BASIC Source & Results" link that opens a modal showing:

- The program's BASIC source code
- The expected program output (from PRINT statements)

This makes it easy to see both what the program does and what it produces, perfect for learning BASIC programming on the TRS-80.

**Screenshot**: See `docs/phase4-basic-modal.png` for the BASIC source code and results modal display

### ✅ Phase 5: Video Display System

**Status**: Complete ✅ **CURRENT PHASE**

- **64×16 character text display**: Full character-based text mode with ASCII and graphics characters
- **128×48 pixel graphics mode**: Character-based graphics using 2×3 pixel blocks
- **SET/RESET/POINT commands**: Full implementation of BASIC graphics commands
- **CHR$() graphics characters**: All 64 graphics characters (128-191) for pixel-level graphics
- **Character ROM**: Complete character set with ASCII (0-127) and graphics (128-191)
- **Video RAM**: 1KB video memory at 0x3C00-0x3FFF
- **Graphics display modal**: View rendered graphics (128×48, scaled 4x) with BASIC source code
- **Browser-based test runner**: Interactive test execution with graphics display
- **Tests**: 61 Phase 5 tests with 100% pass rate
- **Learning Tool**: All tests display graphics patterns, BASIC source code, and demonstrate SET/RESET/POINT/CHR$() usage
- **Live**: Available at [https://trs80emu.netlify.app/](https://trs80emu.netlify.app/)

#### Phase 5 Test Coverage

The Phase 5 test suite includes:

- **Initialization tests** (6 tests): Video system setup, dimensions, character ROM loading
- **Character ROM tests** (3 tests): Graphics character generation, pattern verification
- **SET Command tests** (10 tests): Pixel setting, boundary checking, pattern creation (lines, rectangles, diagonals)
- **RESET Command tests** (4 tests): Pixel clearing, pattern modification, border creation
- **POINT Command tests** (6 tests): Pixel state detection, boundary handling
- **CHR$() Graphics tests** (4 tests): Graphics character usage, pattern combinations
- **Screen Operations tests** (5 tests): Screen clearing, string writing, snapshots
- **Edge Cases tests** (7 tests): Boundary coordinates, rapid operations, coordinate mapping
- **Integration tests** (2 tests): ROM/RAM integration, memory independence
- **Visual Verification tests** (8 tests): Checkerboard patterns, screen frames, all CHR$() characters, crosshairs, filled shapes

**Learning Features**: Each graphics test includes a "View Graphics & Source" link that opens a modal showing:

- The rendered graphics display (128×48 pixels, scaled 4x for visibility)
- The BASIC source code that creates the graphics pattern

This makes it easy to see both the code and the visual result, perfect for learning TRS-80 graphics programming with SET, RESET, POINT, and CHR$() commands.

### ⏳ Phase 6: System Integration

**Status**: Pending

- ROM boot sequence
- Complete system initialization
- Keyboard input handling
- Component integration

### ⏳ Phase 7: Sample Programs Library and User Interface

**Status**: Pending

- 15 BASIC sample programs (from Phase 4 data)
- 5 assembly routines
- Web-based UI enhancements
- Program editor

### ⏳ Phase 8: Z80 Assembler Integration

**Status**: Pending

- In-browser assembler
- Source code editing
- Symbol table display
- Error reporting

## Deployment

### Netlify Deployment

This project is configured for automatic deployment on Netlify.

#### Prerequisites

1. Netlify account
2. Netlify CLI installed (optional): `npm install -g netlify-cli`

#### Deployment Steps

1. **Connect Repository**:

   - Log in to [Netlify](https://app.netlify.com)
   - Click "New site from Git"
   - Connect your Git repository

2. **Build Settings** (automatically configured via `netlify.toml`):

   - **Build command**: `yarn build` (includes documentation rendering)
   - **Publish directory**: `dist`
   - **Node version**: 20
   - **Yarn version**: 1.22.22
   - **Live URL**: [https://trs80emu.netlify.app/](https://trs80emu.netlify.app/)
   - **Note**: The build process automatically renders all Markdown documentation files from `docs/` to HTML in `public/docs/` for web deployment

3. **Deploy**:
   - Netlify will automatically deploy on every push to the main branch
   - Or use Netlify CLI: `netlify deploy --prod`

#### Manual Deployment

```bash
# Build for production
yarn build

# Deploy to Netlify (requires Netlify CLI)
netlify deploy --prod
```

#### Environment Variables

If needed, configure environment variables in Netlify dashboard:

- Settings → Environment variables

## Project Structure

```
trs80-emulator/
├── src/
│   ├── core/
│   │   ├── z80cpu.js          # Z80 CPU emulator (Phase 1 ✅)
│   │   ├── memory.js          # Memory management system (Phase 2 ✅)
│   │   └── io.js              # I/O system (Phase 3 ✅)
│   ├── peripherals/
│   │   ├── cassette.js        # Cassette system (Phase 3 ✅)
│   │   └── video.js           # Video display system (Phase 5 ✅)
│   ├── data/
│   │   └── basic-programs.js  # BASIC program examples (Phase 4 ✅)
│   ├── browser-test-runner.js           # Browser test runner for Phase 1 (52 tests)
│   ├── browser-test-runner-phase2.js    # Browser test runner for Phase 2 (27 tests)
│   ├── browser-test-runner-phase3.js    # Browser test runner for Phase 3 (33 tests)
│   ├── browser-test-runner-phase4.js    # Browser test runner for Phase 4 (32 tests)
│   ├── browser-test-runner-phase5.js    # Browser test runner for Phase 5 (61 tests)
│   ├── test-runner.js         # Test runner utilities
│   └── main.js                # Application entry point
├── tests/
│   └── unit/
│       ├── cpu-tests.js       # Phase 1 CPU tests (52 tests, organized by complexity)
│       ├── memory-tests.js    # Phase 2 Memory tests (27 tests)
│       ├── cassette-tests.js  # Phase 3 Cassette tests
│       ├── io-tests.js        # Phase 3 I/O tests
│       ├── basic-program-tests.js  # Phase 4 BASIC program tests (32 tests)
│       └── video-tests.js     # Phase 5 Video display tests (61 tests)
├── scripts/
│   ├── postbuild.js           # Post-build script with serve instructions
│   ├── render-docs.js         # Markdown to HTML documentation renderer
│   ├── phase-workflow.js      # Phase gate workflow
│   └── rom-to-base64.js       # ROM encoding utilities
├── docs/
│   ├── TRS80-COMPLETE-BUILD-PROMPT.md  # Complete design document
│   ├── TRS80-COMPLETE-TEST-SUITE.md    # Test suite documentation
│   └── IMPROVEMENTS-APPLIED.md          # Applied improvements log
├── public/
│   └── docs/                            # Rendered HTML documentation (generated)
├── dist/                      # Build output (gitignored)
├── netlify.toml              # Netlify deployment configuration
└── package.json               # Project dependencies and scripts
```

## Scripts

### Development

- `yarn dev` - Start development server (http://localhost:3000)
- `yarn build` - Build for production
- `yarn build:serve` - Build and serve locally with auto-open browser
- `yarn preview` - Preview production build (http://localhost:5150)

### Testing

- `yarn test` - Run tests in watch mode
- `yarn test:run` - Run tests once (CI mode)
- `yarn test:coverage` - Run tests with coverage
- `yarn test:ui` - Run tests with Vitest UI

### Phase Workflows

- `yarn phase:1` - Run Phase 1 test gate workflow (52 CPU tests)
- `yarn phase:2` - Run Phase 2 test gate workflow (27 memory tests)
- `yarn phase:3` - Run Phase 3 test gate workflow (33 cassette & I/O tests)
- `yarn phase:4` - Run Phase 4 test gate workflow (32 BASIC program tests)
- `yarn phase:5` - Run Phase 5 test gate workflow (61 video display tests)

### Deployment

- `yarn deploy` - Run tests, build, and deploy to Netlify
- `yarn deploy:build` - Build and deploy (skip tests)
- `yarn netlify:build` - Run Netlify build locally
- `yarn netlify:dev` - Run Netlify dev server

## Memory Map

```
0x0000 - 0x3BFF: ROM (14KB) - Read-only, protected
0x3C00 - 0x3FFF: Video RAM (1KB) - Writable (shadowed in ROM space)
0x4000 - 0xFFFF: RAM (48KB) - Read/write
```

**Total**: 64KB address space (16KB ROM + 48KB RAM)

**Note**: The memory system supports both 14KB and 16KB ROMs. 14KB ROMs are automatically padded to 16KB.

## Port I/O

- Port 0xFF: Keyboard input
- Port 0xFE: Cassette I/O
- Port 0xEC: System control

## Contributing

1. Follow the phased development approach
2. Write tests for new features
3. Ensure all tests pass before proceeding to next phase
4. Follow the code style and JSDoc annotations

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Documentation

- **[Complete Design Document](docs/TRS80-COMPLETE-BUILD-PROMPT.md)** - Full specification and implementation guide
- **[Test Suite Documentation](docs/TRS80-COMPLETE-TEST-SUITE.md)** - Comprehensive test specifications
- **[Improvements Log](docs/IMPROVEMENTS-APPLIED.md)** - Applied improvements and enhancements

## References

- [Z80 Instruction Set Reference](https://en.wikipedia.org/wiki/Z80_instruction_set)
- [TRS-80 Model III Technical Reference](https://en.wikipedia.org/wiki/TRS-80_Model_III)
- [Vite Documentation](https://vitejs.dev/)
- [Vitest Documentation](https://vitest.dev/)
- [Netlify Documentation](https://docs.netlify.com/)

## Acknowledgments

- Z80 assembler reference from cschweda-z80-assembler project
- TRS-80 Model III ROM provided for emulation
