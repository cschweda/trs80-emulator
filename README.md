# TRS-80 Model III Emulator

A web-based emulator for the TRS-80 Model III computer, built with JavaScript and Vite. This project is being developed in phases, starting with a complete Z80 CPU emulator and expanding to include memory management, I/O systems, video display, and a web-based user interface.

🌐 **Live Demo**: [https://trs80emu.netlify.app/](https://trs80emu.netlify.app/)

📋 **Complete Design Document**: [docs/TRS80-COMPLETE-BUILD-PROMPT.md](docs/TRS80-COMPLETE-BUILD-PROMPT.md)

## Current Status

**Phase 1: Z80 CPU Core** ✅ **COMPLETE**

The emulator currently implements a complete Z80 CPU with full instruction set support. A browser-based development console allows you to run comprehensive CPU tests directly in the browser.

### ✅ Implemented Features

- **Complete Z80 CPU Emulation**: Full instruction set implementation (252+ opcodes including CB, ED, DD, FD prefixes)
- **Browser Test Console**: Interactive test runner for Phase 1 CPU tests
- **Comprehensive Test Suite**: 130+ CPU tests with 100% pass rate

### 🚧 Planned Features (Future Phases)

- **Memory Management**: 16K ROM + 48K RAM with proper memory mapping
- **Video Display**: 128x48 pixel character-based graphics
- **Cassette Interface**: Load and save programs
- **BASIC Interpreter**: Run TRS-80 BASIC programs
- **Z80 Assembler**: In-browser assembly editing and compilation
- **Sample Programs**: 12 built-in BASIC programs and 5 assembly routines

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
- **Phase 1: Z80 CPU Test Runner**: Run comprehensive CPU tests directly in the browser with scrollable results
- **Interactive Test Results**: View detailed test execution and results with keyboard and mouse navigation
- **Real-time Logging**: See CPU operations, register states, and test outcomes
- **Design Document Link**: Direct link to the rendered design document
- **Full Viewport Layout**: All tabs take up the entire viewport width and height
- **Scrollable Content**: Both Phase 0 and Phase 1 tabs support mouse wheel scrolling and keyboard navigation (arrow keys, Page Up/Down)

To use the development console:

1. Visit [https://trs80emu.netlify.app/](https://trs80emu.netlify.app/)
2. Click "Phase 0: Design Doc" to view the design document inline (scrollable)
3. Click "Phase 1: Z80 CPU" to run CPU tests (console auto-focuses for scrolling)
4. View test results and execution details in the scrollable console
5. Use mouse wheel or keyboard (arrow keys, Page Up/Down) to navigate long test results
6. Use the link at the bottom to open the design document in a new page

For browser developer tools (F12), the console will show:

- CPU execution logs
- Memory access logs (when implemented)
- I/O port operations (when implemented)
- Test results
- Debug information

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
yarn test:run tests/unit/cpu-tests.js
```

### Phase-by-Phase Development

This project follows a phased development approach with test gates between phases:

```bash
# Run Phase 1 tests with workflow script (waits for user confirmation)
yarn phase:1

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

**Status**: Complete ✅ **CURRENT PHASE**

- Complete Z80 instruction set (252+ opcodes)
- All CB prefix instructions (bit operations, rotates, shifts)
- All ED prefix instructions (block operations, extended I/O)
- All DD/FD prefix instructions (IX/IY operations)
- Register operations (AF, BC, DE, HL, IX, IY, SP, PC)
- Flag calculations (S, Z, H, P/V, N, C)
- Cycle-accurate timing
- Browser-based test runner
- Interactive development console
- **Tests**: All 130 Phase 1 tests passing ✅ (100% success rate)
- **Live**: Available at [https://trs80emu.netlify.app/](https://trs80emu.netlify.app/)

#### Phase 1 Test Results

The browser-based development console provides real-time test execution and results. Here's what the Phase 1 Z80 CPU test suite looks like when all tests pass:

![Phase 1 Z80 CPU Test Results](docs/phase1-test-results.png)

The console displays:

- Test execution progress
- Detailed test results for each suite
- Summary statistics (Total, Passed, Failed)
- Success confirmation when all tests pass
- **Fully scrollable content**: The console automatically focuses when Phase 1 is activated, allowing you to scroll through all 130+ test results using mouse wheel or keyboard (arrow keys, Page Up/Down)

### ⏳ Phase 2: Memory Management System

**Status**: Pending

- 16K ROM + 48K RAM mapping
- ROM protection
- Video RAM shadowing
- Memory bank switching

### ⏳ Phase 3: Cassette I/O System

**Status**: Pending

- Cassette interface simulation
- Load/save programs
- Tape format support

### ⏳ Phase 4: Video Display System

**Status**: Pending

- 128x48 character display
- Graphics mode support
- Character ROM rendering

### ⏳ Phase 5: System Integration

**Status**: Pending

- ROM boot sequence
- BASIC interpreter integration
- Keyboard input handling

### ⏳ Phase 6: Sample Programs Library and User Interface

**Status**: Pending

- 12 BASIC sample programs
- 5 assembly routines
- Web-based UI
- Program editor

### ⏳ Phase 7: Z80 Assembler Integration

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
│   │   └── z80cpu.js          # Z80 CPU emulator (Phase 1 ✅)
│   ├── browser-test-runner.js # Browser test runner
│   ├── test-runner.js         # Test runner utilities
│   └── main.js                # Application entry point
├── tests/
│   └── unit/
│       └── cpu-tests.js       # Phase 1 CPU tests (130+ tests)
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

- `yarn phase:1` - Run Phase 1 test gate workflow

### Deployment

- `yarn deploy` - Run tests, build, and deploy to Netlify
- `yarn deploy:build` - Build and deploy (skip tests)
- `yarn netlify:build` - Run Netlify build locally
- `yarn netlify:dev` - Run Netlify dev server

## Memory Map

```
0x0000 - 0x3FFF: ROM (16KB)
0x4000 - 0x7FFF: RAM (16KB)
0x8000 - 0xFFFF: RAM (32KB)
```

## Port I/O

- Port 0x84: Keyboard input
- Port 0xEC: Video control
- Port 0xF4: Cassette I/O

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
