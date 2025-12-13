# TRS-80 Model III Emulator

A complete, web-based emulator for the TRS-80 Model III computer, built with JavaScript and Vite. This project implements a full Z80 CPU emulator with complete instruction set support, memory management, I/O systems, and a web-based user interface.

🌐 **Live Demo**: [https://trs80emu.netlify.app/](https://trs80emu.netlify.app/)

## Features

- **Complete Z80 CPU Emulation**: Full instruction set implementation (252+ opcodes including CB, ED, DD, FD prefixes)
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

### Browser Dev Console

To access the browser development console:

1. **Chrome/Edge**: Press `F12` or `Ctrl+Shift+I` (Windows/Linux) / `Cmd+Option+I` (Mac)
2. **Firefox**: Press `F12` or `Ctrl+Shift+K` (Windows/Linux) / `Cmd+Option+K` (Mac)
3. **Safari**: Enable Developer menu: Preferences → Advanced → "Show Develop menu", then `Cmd+Option+C`

The console will show:

- CPU execution logs
- Memory access logs
- I/O port operations
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

### ✅ Phase 0: ROM Analysis and Setup

**Status**: Complete

- ROM file validation
- Base64 encoding scripts
- Project structure setup

### ✅ Phase 1: Z80 CPU Core Implementation

**Status**: Complete ✅

- Complete Z80 instruction set (252+ opcodes)
- All CB prefix instructions (bit operations, rotates, shifts)
- All ED prefix instructions (block operations, extended I/O)
- All DD/FD prefix instructions (IX/IY operations)
- Register operations
- Flag calculations
- Cycle-accurate timing
- Verbose test logging with detailed instruction execution tracking
- **Tests**: All 130 Phase 1 tests passing ✅ (100% success rate)

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

   - **Build command**: `yarn build`
   - **Publish directory**: `dist`
   - **Node version**: 20
   - **Yarn version**: 1.22.22
   - **Live URL**: [https://trs80emu.netlify.app/](https://trs80emu.netlify.app/)

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
│   ├── core/           # CPU core implementation
│   │   └── z80cpu.js   # Z80 CPU emulator
│   ├── data/           # ROM and data files
│   ├── ui/             # User interface components
│   └── main.js         # Application entry point
├── tests/
│   └── unit/           # Unit tests
├── scripts/            # Build and utility scripts
├── docs/               # Documentation
├── dist/               # Build output (gitignored)
└── node_modules/       # Dependencies (gitignored)
```

## Scripts

- `yarn dev` - Start development server
- `yarn build` - Build for production
- `yarn test` - Run tests in watch mode
- `yarn test:run` - Run tests once
- `yarn test:coverage` - Run tests with coverage
- `yarn phase:1` - Run Phase 1 test gate workflow
- `yarn lint` - Run linter

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

## References

- [Z80 Instruction Set Reference](https://en.wikipedia.org/wiki/Z80_instruction_set)
- [TRS-80 Model III Technical Reference](https://en.wikipedia.org/wiki/TRS-80_Model_III)
- [Vite Documentation](https://vitejs.dev/)
- [Vitest Documentation](https://vitest.dev/)

## Acknowledgments

- Z80 assembler reference from cschweda-z80-assembler project
- TRS-80 Model III ROM provided for emulation
