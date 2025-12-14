/**
 * Browser-Compatible Test Runner for Phase 5
 * Executes 45 Phase 5 video display system tests and reports results
 *
 * This test runner includes all test cases from tests/unit/video-tests.js
 * converted to browser-compatible format with verbose logging and graphics display.
 *
 * Shows graphics in modal windows, BASIC source code for SET/RESET/POINT/CHR$(),
 * and detailed descriptions of what each test does and expects.
 */

import { VideoSystem } from "./peripherals/video.js";
import { MemorySystem } from "./core/memory.js";

// Enhanced expect implementation with verbose logging
let expect = null; // Will be set inside runAllPhase5Tests

export async function runAllPhase5Tests(logFn) {
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

  // Store graphics data for tests that create graphics
  let currentGraphicsData = null;
  let currentVideo = null;
  let currentMemory = null;

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
      toBeGreaterThanOrEqual: (expected) => {
        if (value < expected) {
          throw new Error(
            `Expected ${value} to be >= ${expected}, but got ${value}`
          );
        }
        if (verboseLogging) {
          logFn(`        ✓ Assert: ${value} >= ${expected}`, "info");
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
    currentGraphicsData = null; // Reset graphics data

    // Display test with description and graphics link if available
    let testHeader = `  🧪 Running: ${testName}`;
    if (metadata.description) {
      testHeader += `\n     💡 ${metadata.description}`;
    }
    if (metadata.basicSource) {
      testHeader += `\n     📄 BASIC source available - click link after test to view`;
    }
    logFn(testHeader, "info");

    try {
      const startTime = performance.now();
      testFn();
      const endTime = performance.now();
      const duration = (endTime - startTime).toFixed(2);
      results.passed++;

      // Capture graphics data if test created graphics and metadata requests it
      let graphicsDataStr = "";
      if (metadata.showGraphics && currentVideo && currentMemory) {
        try {
          const graphicsData = currentVideo.getGraphicsSnapshot(currentMemory);
          graphicsDataStr = JSON.stringify(graphicsData);
        } catch (e) {
          console.error("Failed to capture graphics:", e);
        }
      }

      let successMsg = `  ✅ ${testName} (${duration}ms)`;
      if (metadata.description) {
        successMsg += `\n     💡 ${metadata.description}`;
      }
      if (metadata.basicSource) {
        const linkId = `graphics-link-success-${results.total}-${Date.now()}`;
        let linkAttributes = `data-graphics-title="${testName.replace(
          /"/g,
          "&quot;"
        )}" data-graphics-source="${metadata.basicSource
          .replace(/"/g, "&quot;")
          .replace(/\n/g, "&#10;")
          .replace(/\r/g, "&#13;")}"`;
        if (graphicsDataStr) {
          linkAttributes += ` data-graphics-data="${graphicsDataStr.replace(
            /"/g,
            "&quot;"
          )}"`;
        }
        successMsg += `\n     🎨 <span class="graphics-link" id="${linkId}" ${linkAttributes}>View Graphics & Source</span>`;
      }
      logFn(successMsg, "success");
      return true;
    } catch (error) {
      results.failed++;
      const errorMsg = error.message || String(error);
      logFn(`  ❌ ${testName}`, "error");
      logFn(`     Error: ${errorMsg}`, "error");

      if (verboseLogging && error.stack) {
        const stackLines = error.stack.split("\n").slice(0, 3);
        stackLines.forEach((line, idx) => {
          if (idx > 0) {
            logFn(`       ${line.trim()}`, "error");
          }
        });
      }

      results.errors.push({
        suite: currentSuite,
        test: testName,
        error: errorMsg,
        stack: error.stack,
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
    }
    logFn("");
  }

  // Helper to setup video and memory
  function setupVideo() {
    const video = new VideoSystem();
    const memory = new MemorySystem();
    memory.clearRAM();
    // Store for graphics capture
    currentVideo = video;
    currentMemory = memory;
    if (verboseLogging) {
      logFn(
        `        🔧 Video Setup: Initialized VideoSystem and MemorySystem`,
        "info"
      );
    }
    return { video, memory };
  }

  // ============================================
  // INITIALIZATION TESTS (6 tests)
  // ============================================

  runSuite("VideoSystem - Initialization", () => {
    runTest(
      "should initialize with correct display dimensions",
      () => {
        const { video } = setupVideo();
        expect(video.columns).toBe(64);
        expect(video.rows).toBe(16);
        expect(video.charWidth).toBe(8);
        expect(video.charHeight).toBe(12);
      },
      {
        description: "Video system initializes with 64×16 character display",
      }
    );

    runTest(
      "should initialize with correct graphics dimensions",
      () => {
        const { video } = setupVideo();
        expect(video.graphicsWidth).toBe(128);
        expect(video.graphicsHeight).toBe(48);
      },
      {
        description: "Graphics mode supports 128×48 pixel resolution",
      }
    );

    runTest(
      "should initialize with correct video memory address",
      () => {
        const { video } = setupVideo();
        expect(video.videoMemoryStart).toBe(0x3c00);
        expect(video.videoMemoryEnd).toBe(0x3fff);
      },
      {
        description: "Video RAM located at 0x3C00-0x3FFF (1KB)",
      }
    );

    runTest(
      "should initialize in text mode",
      () => {
        const { video } = setupVideo();
        expect(video.textMode).toBe(true);
      },
      {
        description: "Starts in text mode (64×16 characters)",
      }
    );

    runTest(
      "should load character ROM with 256 characters",
      () => {
        const { video } = setupVideo();
        expect(video.charRom).toBeDefined();
        expect(video.charRom.length).toBe(256);
        expect(video.charRom[0x20]).toBeDefined(); // Space
        expect(video.charRom[0x41]).toBeDefined(); // 'A'
        expect(video.charRom[128]).toBeDefined(); // First graphics char
        expect(video.charRom[191]).toBeDefined(); // Last graphics char
      },
      {
        description:
          "Character ROM includes ASCII (0-127) and graphics (128-191)",
      }
    );

    runTest(
      "should initialize with correct colors",
      () => {
        const { video } = setupVideo();
        expect(video.fgColor).toBe("#00FF00"); // Green
        expect(video.bgColor).toBe("#000000"); // Black
      },
      {
        description: "TRS-80 green-on-black color scheme",
      }
    );
  });

  // ============================================
  // CHARACTER ROM TESTS (3 tests)
  // ============================================

  runSuite("VideoSystem - Character ROM", () => {
    runTest(
      "should have graphics characters 128-191",
      () => {
        const { video } = setupVideo();
        for (let i = 128; i < 192; i++) {
          expect(video.charRom[i]).toBeDefined();
          expect(video.charRom[i].length).toBe(12);
        }
      },
      {
        description: "64 graphics characters (128-191) for 2×3 pixel blocks",
      }
    );

    runTest(
      "should generate correct graphics pattern for char 128 (all off)",
      () => {
        const { video } = setupVideo();
        const char128 = video.charRom[128];
        expect(char128.every((byte) => byte === 0x00)).toBe(true);
      },
      {
        description: "CHR$(128) = all pixels off in 2×3 block",
        basicSource: `10 PRINT CHR$(128);\n' CHR$(128) = all pixels off`,
      }
    );

    runTest(
      "should generate correct graphics pattern for char 191 (all on)",
      () => {
        const { video } = setupVideo();
        const char191 = video.charRom[191];
        expect(char191[0] & 0xf0).toBe(0xf0); // Top-left
        expect(char191[0] & 0x0f).toBe(0x0f); // Top-right
        expect(char191[4] & 0xf0).toBe(0xf0); // Middle-left
        expect(char191[4] & 0x0f).toBe(0x0f); // Middle-right
        expect(char191[8] & 0xf0).toBe(0xf0); // Bottom-left
        expect(char191[8] & 0x0f).toBe(0x0f); // Bottom-right
      },
      {
        description: "CHR$(191) = all pixels on in 2×3 block",
        basicSource: `10 PRINT CHR$(191);\n' CHR$(191) = all pixels on`,
      }
    );
  });

  // ============================================
  // SET COMMAND TESTS (10 tests)
  // ============================================

  runSuite("VideoSystem - SET Command (setPixel)", () => {
    runTest(
      "should set pixel at (0, 0)",
      () => {
        const { video, memory } = setupVideo();
        expect(video.setPixel(0, 0, memory)).toBe(true);
        const char = memory.readByte(0x3c00);
        expect(char).toBeGreaterThanOrEqual(128);
        expect(char).toBeLessThanOrEqual(191);
        const pattern = char - 128;
        expect(pattern & 0x20).toBe(0x20);
      },
      {
        description: "SET command turns on pixel at coordinates",
        basicSource: `10 SET(0,0)\n' Turns on pixel at top-left corner`,
        showGraphics: true,
      }
    );

    runTest(
      "should set pixel at (127, 47)",
      () => {
        const { video, memory } = setupVideo();
        expect(video.setPixel(127, 47, memory)).toBe(true);
        const charX = Math.floor(127 / 2); // 63
        const charY = Math.floor(47 / 3); // 15
        const addr = 0x3c00 + charY * 64 + charX;
        const char = memory.readByte(addr);
        expect(char).toBeGreaterThanOrEqual(128);
      },
      {
        description: "SET works at all valid coordinates (0-127, 0-47)",
        basicSource: `10 SET(127,47)\n' Sets pixel at bottom-right corner`,
      }
    );

    runTest(
      "should not set pixel outside bounds",
      () => {
        const { video, memory } = setupVideo();
        expect(video.setPixel(-1, 0, memory)).toBe(false);
        expect(video.setPixel(128, 0, memory)).toBe(false);
        expect(video.setPixel(0, -1, memory)).toBe(false);
        expect(video.setPixel(0, 48, memory)).toBe(false);
      },
      {
        description: "SET rejects coordinates outside 0-127, 0-47 range",
      }
    );

    runTest(
      "should set multiple pixels in same character block",
      () => {
        const { video, memory } = setupVideo();
        video.setPixel(0, 0, memory); // Top-left
        video.setPixel(1, 0, memory); // Top-right
        const char = memory.readByte(0x3c00);
        const pattern = char - 128;
        expect(pattern & 0x30).toBe(0x30); // Both top pixels
      },
      {
        description:
          "Multiple SET commands in same 2×3 block combine correctly",
        basicSource: `10 SET(0,0)\n20 SET(1,0)\n' Sets both top pixels in block`,
      }
    );

    runTest(
      "should set pixels across different character blocks",
      () => {
        const { video, memory } = setupVideo();
        video.setPixel(0, 0, memory); // Block (0,0)
        video.setPixel(2, 0, memory); // Block (1,0)
        video.setPixel(0, 3, memory); // Block (0,1)

        const char1 = memory.readByte(0x3c00);
        const char2 = memory.readByte(0x3c01);
        const char3 = memory.readByte(0x3c40); // Row 1

        expect(char1).toBeGreaterThanOrEqual(128);
        expect(char2).toBeGreaterThanOrEqual(128);
        expect(char3).toBeGreaterThanOrEqual(128);
      },
      {
        description: "SET works across multiple character blocks",
      }
    );

    runTest(
      "should convert text character to graphics character when setting pixel",
      () => {
        const { video, memory } = setupVideo();
        memory.writeByte(0x3c00, 0x41); // 'A'
        video.setPixel(0, 0, memory);
        const char = memory.readByte(0x3c00);
        expect(char).toBeGreaterThanOrEqual(128);
        expect(char).toBeLessThanOrEqual(191);
      },
      {
        description: "SET converts text to graphics when pixel is set",
      }
    );

    runTest(
      "should create horizontal line using SET",
      () => {
        const { video, memory } = setupVideo();
        for (let x = 0; x <= 10; x++) {
          video.setPixel(x, 0, memory);
        }
        for (let x = 0; x <= 10; x++) {
          expect(video.pointPixel(x, 0, memory)).toBe(-1);
        }
      },
      {
        description: "SET can draw horizontal lines",
        basicSource: `10 FOR X=0 TO 10\n20 SET(X,0)\n30 NEXT X\n' Draws horizontal line`,
        showGraphics: true,
      }
    );

    runTest(
      "should create vertical line using SET",
      () => {
        const { video, memory } = setupVideo();
        for (let y = 0; y <= 10; y++) {
          video.setPixel(0, y, memory);
        }
        for (let y = 0; y <= 10; y++) {
          expect(video.pointPixel(0, y, memory)).toBe(-1);
        }
      },
      {
        description: "SET can draw vertical lines",
        basicSource: `10 FOR Y=0 TO 10\n20 SET(0,Y)\n30 NEXT Y\n' Draws vertical line`,
        showGraphics: true,
      }
    );

    runTest(
      "should create diagonal line using SET",
      () => {
        const { video, memory } = setupVideo();
        for (let i = 0; i <= 10; i++) {
          video.setPixel(i, i, memory);
        }
        for (let i = 0; i <= 10; i++) {
          expect(video.pointPixel(i, i, memory)).toBe(-1);
        }
      },
      {
        description: "SET can draw diagonal lines",
        basicSource: `10 FOR I=0 TO 10\n20 SET(I,I)\n30 NEXT I\n' Draws diagonal line`,
        showGraphics: true,
      }
    );

    runTest(
      "should create filled rectangle using SET",
      () => {
        const { video, memory } = setupVideo();
        for (let y = 5; y <= 10; y++) {
          for (let x = 5; x <= 15; x++) {
            video.setPixel(x, y, memory);
          }
        }
        for (let y = 5; y <= 10; y++) {
          for (let x = 5; x <= 15; x++) {
            expect(video.pointPixel(x, y, memory)).toBe(-1);
          }
        }
      },
      {
        description: "SET can fill rectangles",
        basicSource: `10 FOR Y=5 TO 10\n20 FOR X=5 TO 15\n30 SET(X,Y)\n40 NEXT X\n50 NEXT Y\n' Fills rectangle`,
        showGraphics: true,
      }
    );
  });

  // ============================================
  // RESET COMMAND TESTS (4 tests)
  // ============================================

  runSuite("VideoSystem - RESET Command (resetPixel)", () => {
    runTest(
      "should reset pixel at (0, 0)",
      () => {
        const { video, memory } = setupVideo();
        video.setPixel(0, 0, memory);
        let char = memory.readByte(0x3c00);
        let pattern = char - 128;
        expect(pattern & 0x20).toBe(0x20);

        expect(video.resetPixel(0, 0, memory)).toBe(true);
        char = memory.readByte(0x3c00);
        pattern = char - 128;
        expect(pattern & 0x20).toBe(0);
      },
      {
        description: "RESET turns off pixel at coordinates",
        basicSource: `10 SET(0,0)\n20 RESET(0,0)\n' Sets then clears pixel`,
      }
    );

    runTest(
      "should not reset pixel if character is not graphics char",
      () => {
        const { video, memory } = setupVideo();
        memory.writeByte(0x3c00, 0x41); // 'A'
        expect(video.resetPixel(0, 0, memory)).toBe(false);
        expect(memory.readByte(0x3c00)).toBe(0x41);
      },
      {
        description: "RESET only works on graphics characters",
      }
    );

    runTest(
      "should reset multiple pixels independently",
      () => {
        const { video, memory } = setupVideo();
        for (let y = 0; y < 3; y++) {
          for (let x = 0; x < 2; x++) {
            video.setPixel(x, y, memory);
          }
        }
        video.resetPixel(0, 0, memory);
        const char = memory.readByte(0x3c00);
        const pattern = char - 128;
        expect(pattern & 0x20).toBe(0);
        expect(pattern & 0x10).toBe(0x10);
      },
      {
        description: "RESET affects only specified pixel",
      }
    );

    runTest(
      "should create border rectangle using SET and RESET",
      () => {
        const { video, memory } = setupVideo();
        for (let y = 5; y <= 10; y++) {
          for (let x = 5; x <= 15; x++) {
            video.setPixel(x, y, memory);
          }
        }
        for (let y = 6; y <= 9; y++) {
          for (let x = 6; x <= 14; x++) {
            video.resetPixel(x, y, memory);
          }
        }
        for (let y = 5; y <= 10; y++) {
          for (let x = 5; x <= 15; x++) {
            const isBorder = x === 5 || x === 15 || y === 5 || y === 10;
            expect(video.pointPixel(x, y, memory)).toBe(isBorder ? -1 : 0);
          }
        }
      },
      {
        description: "SET and RESET can create hollow rectangles",
        basicSource: `10 FOR Y=5 TO 10\n20 FOR X=5 TO 15\n30 SET(X,Y)\n40 NEXT X\n50 NEXT Y\n60 FOR Y=6 TO 9\n70 FOR X=6 TO 14\n80 RESET(X,Y)\n90 NEXT X\n100 NEXT Y\n' Creates border rectangle`,
        showGraphics: true,
      }
    );
  });

  // ============================================
  // POINT COMMAND TESTS (6 tests)
  // ============================================

  runSuite("VideoSystem - POINT Command (pointPixel)", () => {
    runTest(
      "should return 0 for pixel that is off",
      () => {
        const { video, memory } = setupVideo();
        expect(video.pointPixel(0, 0, memory)).toBe(0);
      },
      {
        description: "POINT returns 0 when pixel is off",
        basicSource: `10 IF POINT(0,0) THEN PRINT "ON" ELSE PRINT "OFF"\n' POINT returns 0 if pixel is off`,
      }
    );

    runTest(
      "should return -1 for pixel that is on",
      () => {
        const { video, memory } = setupVideo();
        video.setPixel(0, 0, memory);
        expect(video.pointPixel(0, 0, memory)).toBe(-1);
      },
      {
        description: "POINT returns -1 when pixel is on (BASIC convention)",
        basicSource: `10 SET(0,0)\n20 IF POINT(0,0) THEN PRINT "ON"\n' POINT returns -1 if pixel is on`,
      }
    );

    runTest(
      "should return 0 for text character position",
      () => {
        const { video, memory } = setupVideo();
        memory.writeByte(0x3c00, 0x41); // 'A'
        expect(video.pointPixel(0, 0, memory)).toBe(0);
      },
      {
        description: "POINT returns 0 for non-graphics characters",
      }
    );

    runTest(
      "should correctly detect pixel state after set and reset",
      () => {
        const { video, memory } = setupVideo();
        expect(video.pointPixel(0, 0, memory)).toBe(0);
        video.setPixel(0, 0, memory);
        expect(video.pointPixel(0, 0, memory)).toBe(-1);
        video.resetPixel(0, 0, memory);
        expect(video.pointPixel(0, 0, memory)).toBe(0);
      },
      {
        description: "POINT correctly tracks pixel state changes",
      }
    );

    runTest(
      "should return 0 for pixels outside bounds",
      () => {
        const { video, memory } = setupVideo();
        expect(video.pointPixel(-1, 0, memory)).toBe(0);
        expect(video.pointPixel(128, 0, memory)).toBe(0);
        expect(video.pointPixel(0, -1, memory)).toBe(0);
        expect(video.pointPixel(0, 48, memory)).toBe(0);
      },
      {
        description: "POINT returns 0 for invalid coordinates",
      }
    );

    runTest(
      "should correctly detect different pixels in same block",
      () => {
        const { video, memory } = setupVideo();
        video.setPixel(0, 0, memory);
        video.setPixel(1, 0, memory);

        expect(video.pointPixel(0, 0, memory)).toBe(-1);
        expect(video.pointPixel(1, 0, memory)).toBe(-1);
        expect(video.pointPixel(0, 1, memory)).toBe(0);
      },
      {
        description: "POINT distinguishes pixels within same character block",
      }
    );
  });

  // ============================================
  // CHR$() GRAPHICS TESTS (4 tests)
  // ============================================

  runSuite("VideoSystem - CHR$() Graphics Characters", () => {
    runTest(
      "should write CHR$(128) to video memory (all pixels off)",
      () => {
        const { video, memory } = setupVideo();
        memory.writeByte(0x3c00, 128);
        const char = memory.readByte(0x3c00);
        expect(char).toBe(128);
        expect(video.pointPixel(0, 0, memory)).toBe(0);
        expect(video.pointPixel(1, 0, memory)).toBe(0);
      },
      {
        description: "CHR$(128) creates empty graphics block",
        basicSource: `10 PRINT CHR$(128);\n' CHR$(128) = all pixels off`,
      }
    );

    runTest(
      "should write CHR$(191) to video memory (all pixels on)",
      () => {
        const { video, memory } = setupVideo();
        memory.writeByte(0x3c00, 191);
        const char = memory.readByte(0x3c00);
        expect(char).toBe(191);
        for (let y = 0; y < 3; y++) {
          for (let x = 0; x < 2; x++) {
            expect(video.pointPixel(x, y, memory)).toBe(-1);
          }
        }
      },
      {
        description: "CHR$(191) creates filled graphics block",
        basicSource: `10 PRINT CHR$(191);\n' CHR$(191) = all pixels on`,
        showGraphics: true,
      }
    );

    runTest(
      "should use CHR$(129) to set bottom-right pixel",
      () => {
        const { video, memory } = setupVideo();
        memory.writeByte(0x3c00, 129);
        expect(video.pointPixel(1, 2, memory)).toBe(-1);
        expect(video.pointPixel(0, 0, memory)).toBe(0);
      },
      {
        description: "CHR$(129) sets only bottom-right pixel",
        basicSource: `10 PRINT CHR$(129);\n' CHR$(129) = bottom-right pixel on`,
      }
    );

    runTest(
      "should combine CHR$() with SET to modify graphics",
      () => {
        const { video, memory } = setupVideo();
        memory.writeByte(0x3c00, 128);
        video.setPixel(0, 0, memory);
        const char = memory.readByte(0x3c00);
        expect(char).toBe(128 + 0x20);
      },
      {
        description: "CHR$() and SET can be combined",
        basicSource: `10 PRINT CHR$(128);\n20 SET(0,0)\n' Starts with empty block, adds pixel`,
      }
    );
  });

  // ============================================
  // SCREEN OPERATIONS TESTS (5 tests)
  // ============================================

  runSuite("VideoSystem - Screen Operations", () => {
    runTest(
      "should clear screen (fill with spaces)",
      () => {
        const { video, memory } = setupVideo();
        memory.writeByte(0x3c00, 0x41);
        memory.writeByte(0x3c01, 0x42);

        video.clearScreen(memory);

        for (let i = 0; i < 64 * 16; i++) {
          expect(memory.readByte(0x3c00 + i)).toBe(0x20);
        }
      },
      {
        description: "CLS clears entire screen to spaces",
        basicSource: `10 PRINT "HELLO"\n20 CLS\n' Clears screen`,
      }
    );

    runTest(
      "should write string to video memory",
      () => {
        const { video, memory } = setupVideo();
        video.writeString(memory, "HELLO", 0, 0);

        expect(memory.readByte(0x3c00)).toBe(0x48); // 'H'
        expect(memory.readByte(0x3c01)).toBe(0x45); // 'E'
        expect(memory.readByte(0x3c02)).toBe(0x4c); // 'L'
        expect(memory.readByte(0x3c03)).toBe(0x4c); // 'L'
        expect(memory.readByte(0x3c04)).toBe(0x4f); // 'O'
      },
      {
        description: "PRINT writes text to screen",
        basicSource: `10 PRINT "HELLO"\n' Displays text on screen`,
      }
    );

    runTest(
      "should get screen snapshot",
      () => {
        const { video, memory } = setupVideo();
        video.writeString(memory, "ABC", 0, 0);
        const snapshot = video.getScreenSnapshot(memory);

        expect(snapshot.length).toBe(16);
        expect(snapshot[0].length).toBe(64);
        expect(snapshot[0][0]).toBe(0x41);
        expect(snapshot[0][1]).toBe(0x42);
        expect(snapshot[0][2]).toBe(0x43);
      },
      {
        description: "Screen snapshot captures current display state",
      }
    );

    runTest(
      "should get graphics snapshot",
      () => {
        const { video, memory } = setupVideo();
        video.setPixel(10, 20, memory);
        video.setPixel(50, 30, memory);

        const snapshot = video.getGraphicsSnapshot(memory);

        expect(snapshot.length).toBe(48);
        expect(snapshot[0].length).toBe(128);
        expect(snapshot[20][10]).toBe(1);
        expect(snapshot[30][50]).toBe(1);
        expect(snapshot[0][0]).toBe(0);
      },
      {
        description: "Graphics snapshot captures pixel state",
      }
    );

    runTest(
      "should write string at specific row and column",
      () => {
        const { video, memory } = setupVideo();
        video.writeString(memory, "TEST", 5, 10);

        const addr = 0x3c00 + 5 * 64 + 10;
        expect(memory.readByte(addr)).toBe(0x54); // 'T'
        expect(memory.readByte(addr + 1)).toBe(0x45); // 'E'
        expect(memory.readByte(addr + 2)).toBe(0x53); // 'S'
        expect(memory.readByte(addr + 3)).toBe(0x54); // 'T'
      },
      {
        description: "PRINT can position text at specific location",
        basicSource: `10 LOCATE 5,10\n20 PRINT "TEST"\n' Positions text at row 5, col 10`,
      }
    );
  });

  // ============================================
  // EDGE CASES AND COMPLEX SCENARIOS (7 tests)
  // ============================================

  runSuite("VideoSystem - Edge Cases and Complex Scenarios", () => {
    runTest(
      "should handle setting all pixels in display",
      () => {
        const { video, memory } = setupVideo();
        for (let y = 0; y < 48; y++) {
          for (let x = 0; x < 128; x++) {
            video.setPixel(x, y, memory);
          }
        }

        for (let y = 0; y < 48; y++) {
          for (let x = 0; x < 128; x++) {
            expect(video.pointPixel(x, y, memory)).toBe(-1);
          }
        }
      },
      {
        description: "Can fill entire 128×48 display with pixels",
        basicSource: `10 FOR Y=0 TO 47\n20 FOR X=0 TO 127\n30 SET(X,Y)\n40 NEXT X\n50 NEXT Y\n' Fills entire screen`,
        showGraphics: true,
      }
    );

    runTest(
      "should handle boundary coordinates correctly",
      () => {
        const { video, memory } = setupVideo();
        expect(video.setPixel(0, 0, memory)).toBe(true);
        expect(video.setPixel(127, 0, memory)).toBe(true);
        expect(video.setPixel(0, 47, memory)).toBe(true);
        expect(video.setPixel(127, 47, memory)).toBe(true);

        expect(video.pointPixel(0, 0, memory)).toBe(-1);
        expect(video.pointPixel(127, 0, memory)).toBe(-1);
        expect(video.pointPixel(0, 47, memory)).toBe(-1);
        expect(video.pointPixel(127, 47, memory)).toBe(-1);
      },
      {
        description: "All four corners work correctly",
      }
    );

    runTest(
      "should handle rapid set/reset operations",
      () => {
        const { video, memory } = setupVideo();
        for (let i = 0; i < 10; i++) {
          video.setPixel(10, 10, memory);
          expect(video.pointPixel(10, 10, memory)).toBe(-1);
          video.resetPixel(10, 10, memory);
          expect(video.pointPixel(10, 10, memory)).toBe(0);
        }
      },
      {
        description: "Rapid pixel toggling works correctly",
      }
    );

    runTest(
      "should handle overlapping graphics and text",
      () => {
        const { video, memory } = setupVideo();
        video.writeString(memory, "HELLO", 0, 0);
        video.setPixel(0, 0, memory);
        video.setPixel(1, 0, memory);

        const char = memory.readByte(0x3c00);
        expect(char).toBeGreaterThanOrEqual(128);
      },
      {
        description: "Graphics can overwrite text characters",
      }
    );

    runTest(
      "should correctly map pixel coordinates to character blocks",
      () => {
        const { video, memory } = setupVideo();
        const testCases = [
          { x: 0, y: 0, charX: 0, charY: 0 },
          { x: 1, y: 0, charX: 0, charY: 0 },
          { x: 2, y: 0, charX: 1, charY: 0 },
          { x: 0, y: 3, charX: 0, charY: 1 },
          { x: 127, y: 47, charX: 63, charY: 15 },
        ];

        for (const test of testCases) {
          video.setPixel(test.x, test.y, memory);
          const charX = Math.floor(test.x / 2);
          const charY = Math.floor(test.y / 3);
          const addr = 0x3c00 + charY * 64 + charX;
          const char = memory.readByte(addr);
          expect(char).toBeGreaterThanOrEqual(128);
          expect(charX).toBe(test.charX);
          expect(charY).toBe(test.charY);
        }
      },
      {
        description: "Pixel-to-character mapping is correct",
      }
    );

    runTest(
      "should work with ROM-loaded memory system",
      () => {
        const { video, memory } = setupVideo();
        const romData = new Uint8Array(0x4000);
        memory.loadROM(romData);

        expect(video.setPixel(10, 10, memory)).toBe(true);
        expect(video.pointPixel(10, 10, memory)).toBe(-1);
      },
      {
        description: "Video works with ROM-loaded system",
      }
    );

    runTest(
      "should preserve video memory during RAM operations",
      () => {
        const { video, memory } = setupVideo();
        video.setPixel(10, 10, memory);
        video.setPixel(20, 20, memory);

        memory.writeByte(0x4000, 0x42);
        memory.writeByte(0x5000, 0x43);

        expect(video.pointPixel(10, 10, memory)).toBe(-1);
        expect(video.pointPixel(20, 20, memory)).toBe(-1);
      },
      {
        description: "Video memory independent from RAM",
      }
    );
  });

  // ============================================
  // VISUAL VERIFICATION TESTS (8 tests)
  // Tests with clear, visible graphics patterns
  // ============================================

  runSuite("VideoSystem - Visual Verification Tests", () => {
    runTest(
      "should create checkerboard pattern with alternating pixels",
      () => {
        const { video, memory } = setupVideo();
        for (let y = 0; y < 48; y++) {
          for (let x = 0; x < 128; x++) {
            if ((x + y) % 2 === 0) {
              video.setPixel(x, y, memory);
            }
          }
        }
        expect(video.pointPixel(0, 0, memory)).toBe(-1);
        expect(video.pointPixel(1, 0, memory)).toBe(0);
        expect(video.pointPixel(0, 1, memory)).toBe(0);
        expect(video.pointPixel(1, 1, memory)).toBe(-1);
      },
      {
        description:
          "Creates clear checkerboard pattern - alternating on/off pixels",
        basicSource: `10 FOR Y=0 TO 47\n20 FOR X=0 TO 127\n30 IF (X+Y) MOD 2=0 THEN SET(X,Y)\n40 NEXT X\n50 NEXT Y\n' Creates checkerboard pattern`,
        showGraphics: true,
      }
    );

    runTest(
      "should draw frame around screen edges using SET",
      () => {
        const { video, memory } = setupVideo();
        // Draw all four edges
        for (let x = 0; x < 128; x++) {
          video.setPixel(x, 0, memory); // Top
          video.setPixel(x, 47, memory); // Bottom
        }
        for (let y = 0; y < 48; y++) {
          video.setPixel(0, y, memory); // Left
          video.setPixel(127, y, memory); // Right
        }
        // Verify frame
        expect(video.pointPixel(0, 0, memory)).toBe(-1);
        expect(video.pointPixel(127, 0, memory)).toBe(-1);
        expect(video.pointPixel(0, 47, memory)).toBe(-1);
        expect(video.pointPixel(127, 47, memory)).toBe(-1);
        expect(video.pointPixel(64, 24, memory)).toBe(0); // Center empty
      },
      {
        description: "Draws complete frame around 128×48 screen edges",
        basicSource: `10 FOR X=0 TO 127\n20 SET(X,0)\n30 SET(X,47)\n40 NEXT X\n50 FOR Y=0 TO 47\n60 SET(0,Y)\n70 SET(127,Y)\n80 NEXT Y\n' Draws frame around screen`,
        showGraphics: true,
      }
    );

    runTest(
      "should display all CHR$() graphics characters 128-191",
      () => {
        const { video, memory } = setupVideo();
        // Display all 64 graphics characters in 8x8 grid
        for (let charCode = 128; charCode < 192; charCode++) {
          const row = Math.floor((charCode - 128) / 8);
          const col = (charCode - 128) % 8;
          const addr = 0x3c00 + row * 64 + col;
          memory.writeByte(addr, charCode);
        }
        expect(memory.readByte(0x3c00)).toBe(128);
        // Last char (191) should be at row 7, col 7
        const lastRow = 7;
        const lastCol = 7;
        const lastAddr = 0x3c00 + lastRow * 64 + lastCol;
        expect(memory.readByte(lastAddr)).toBe(191);
      },
      {
        description:
          "Displays all 64 graphics characters (CHR$(128) to CHR$(191)) in grid",
        basicSource: `10 FOR C=128 TO 191\n20 ROW=INT((C-128)/8)\n30 COL=(C-128) MOD 8\n40 LOCATE ROW,COL\n50 PRINT CHR$(C);\n60 NEXT C\n' Displays all graphics characters`,
        showGraphics: true,
      }
    );

    runTest(
      "should create diagonal stripes pattern",
      () => {
        const { video, memory } = setupVideo();
        for (let y = 0; y < 48; y++) {
          for (let x = 0; x < 128; x++) {
            if ((x + y) % 4 < 2) {
              video.setPixel(x, y, memory);
            }
          }
        }
        expect(video.pointPixel(0, 0, memory)).toBe(-1);
        expect(video.pointPixel(2, 0, memory)).toBe(0);
        expect(video.pointPixel(4, 0, memory)).toBe(-1);
      },
      {
        description: "Creates diagonal stripe pattern for clear visibility",
        basicSource: `10 FOR Y=0 TO 47\n20 FOR X=0 TO 127\n30 IF (X+Y) MOD 4<2 THEN SET(X,Y)\n40 NEXT X\n50 NEXT Y\n' Creates diagonal stripes`,
        showGraphics: true,
      }
    );

    runTest(
      "should create crosshair pattern in center",
      () => {
        const { video, memory } = setupVideo();
        // Horizontal line
        for (let x = 0; x < 128; x++) {
          video.setPixel(x, 24, memory);
        }
        // Vertical line
        for (let y = 0; y < 48; y++) {
          video.setPixel(64, y, memory);
        }
        expect(video.pointPixel(64, 24, memory)).toBe(-1);
        expect(video.pointPixel(0, 24, memory)).toBe(-1);
        expect(video.pointPixel(127, 24, memory)).toBe(-1);
        expect(video.pointPixel(64, 0, memory)).toBe(-1);
        expect(video.pointPixel(64, 47, memory)).toBe(-1);
      },
      {
        description:
          "Draws crosshair (horizontal and vertical lines) through screen center",
        basicSource: `10 FOR X=0 TO 127\n20 SET(X,24)\n30 NEXT X\n40 FOR Y=0 TO 47\n50 SET(64,Y)\n60 NEXT Y\n' Draws crosshair`,
        showGraphics: true,
      }
    );

    runTest(
      "should create filled square in center using SET",
      () => {
        const { video, memory } = setupVideo();
        const centerX = 64;
        const centerY = 24;
        const size = 20;
        const startX = centerX - size / 2;
        const startY = centerY - size / 2;
        for (let y = startY; y < startY + size; y++) {
          for (let x = startX; x < startX + size; x++) {
            if (x >= 0 && x < 128 && y >= 0 && y < 48) {
              video.setPixel(x, y, memory);
            }
          }
        }
        expect(video.pointPixel(centerX, centerY, memory)).toBe(-1);
        expect(video.pointPixel(startX, startY, memory)).toBe(-1);
      },
      {
        description: "Draws filled 20×20 square in screen center",
        basicSource: `10 CX=64: CY=24: SZ=20\n20 FOR Y=CY-SZ/2 TO CY+SZ/2\n30 FOR X=CX-SZ/2 TO CX+SZ/2\n40 SET(X,Y)\n50 NEXT X\n60 NEXT Y\n' Draws filled square`,
        showGraphics: true,
      }
    );

    runTest(
      "should demonstrate CHR$(191) creates all-on pattern",
      () => {
        const { video, memory } = setupVideo();
        memory.writeByte(0x3c00, 191);
        memory.writeByte(0x3c01, 191);
        memory.writeByte(0x3c40, 191);
        // Verify all pixels are on
        for (let y = 0; y < 3; y++) {
          for (let x = 0; x < 2; x++) {
            expect(video.pointPixel(x, y, memory)).toBe(-1);
          }
        }
      },
      {
        description: "CHR$(191) fills 2×3 block with all pixels on",
        basicSource: `10 PRINT CHR$(191);CHR$(191);\n20 PRINT CHR$(191);CHR$(191);\n' CHR$(191) = all pixels on`,
        showGraphics: true,
      }
    );

    runTest(
      "should demonstrate CHR$(128) creates all-off pattern",
      () => {
        const { video, memory } = setupVideo();
        video.setPixel(0, 0, memory);
        video.setPixel(1, 0, memory);
        expect(video.pointPixel(0, 0, memory)).toBe(-1);
        memory.writeByte(0x3c00, 128);
        for (let y = 0; y < 3; y++) {
          for (let x = 0; x < 2; x++) {
            expect(video.pointPixel(x, y, memory)).toBe(0);
          }
        }
      },
      {
        description: "CHR$(128) clears 2×3 block (all pixels off)",
        basicSource: `10 SET(0,0)\n20 SET(1,0)\n30 PRINT CHR$(128);\n' CHR$(128) clears block`,
        showGraphics: true,
      }
    );
  });

  // Return results
  return results;
}
