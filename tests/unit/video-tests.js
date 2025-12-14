/**
 * Phase 5: Video Display System Tests
 * Comprehensive test suite for TRS-80 Model III video display
 * including text mode, graphics mode, SET/RESET/POINT commands, and CHR$() usage
 */

import { describe, it, expect, beforeEach } from "vitest";
import { VideoSystem } from "../../src/peripherals/video.js";
import { MemorySystem } from "../../src/core/memory.js";

describe("VideoSystem - Initialization", () => {
  let video;
  let memory;

  beforeEach(() => {
    video = new VideoSystem();
    memory = new MemorySystem();
  });

  it("should initialize with correct display dimensions", () => {
    expect(video.columns).toBe(64);
    expect(video.rows).toBe(16);
    expect(video.charWidth).toBe(8);
    expect(video.charHeight).toBe(12);
  });

  it("should initialize with correct graphics dimensions", () => {
    expect(video.graphicsWidth).toBe(128);
    expect(video.graphicsHeight).toBe(48);
  });

  it("should initialize with correct video memory address", () => {
    expect(video.videoMemoryStart).toBe(0x3c00);
    expect(video.videoMemoryEnd).toBe(0x3fff);
  });

  it("should initialize in text mode", () => {
    expect(video.textMode).toBe(true);
  });

  it("should load character ROM with 256 characters", () => {
    expect(video.charRom).toBeDefined();
    expect(video.charRom.length).toBe(256);
    expect(video.charRom[0x20]).toBeDefined(); // Space
    expect(video.charRom[0x41]).toBeDefined(); // 'A'
    expect(video.charRom[128]).toBeDefined(); // First graphics char
    expect(video.charRom[191]).toBeDefined(); // Last graphics char
  });

  it("should initialize with correct colors", () => {
    expect(video.fgColor).toBe("#00FF00"); // Green
    expect(video.bgColor).toBe("#000000"); // Black
  });
});

describe("VideoSystem - Character ROM", () => {
  let video;

  beforeEach(() => {
    video = new VideoSystem();
  });

  it("should have graphics characters 128-191", () => {
    for (let i = 128; i < 192; i++) {
      expect(video.charRom[i]).toBeDefined();
      expect(video.charRom[i].length).toBe(12);
    }
  });

  it("should generate correct graphics pattern for char 128 (all off)", () => {
    const char128 = video.charRom[128];
    // All pixels should be off
    expect(char128.every((byte) => byte === 0x00)).toBe(true);
  });

  it("should generate correct graphics pattern for char 129 (bottom-right on)", () => {
    const char129 = video.charRom[129];
    // Bottom-right pixel should be on (bit 0)
    // This affects the bottom row (rows 8-11)
    expect(char129[8] & 0x0f).toBe(0x0f); // Bottom-right pixel
  });

  it("should generate correct graphics pattern for char 191 (all on)", () => {
    const char191 = video.charRom[191];
    // All pixels should be on
    // Top row should have both pixels
    expect(char191[0] & 0xf0).toBe(0xf0); // Top-left
    expect(char191[0] & 0x0f).toBe(0x0f); // Top-right
    // Middle row should have both pixels
    expect(char191[4] & 0xf0).toBe(0xf0); // Middle-left
    expect(char191[4] & 0x0f).toBe(0x0f); // Middle-right
    // Bottom row should have both pixels
    expect(char191[8] & 0xf0).toBe(0xf0); // Bottom-left
    expect(char191[8] & 0x0f).toBe(0x0f); // Bottom-right
  });
});

describe("VideoSystem - SET Command (setPixel)", () => {
  let video;
  let memory;

  beforeEach(() => {
    video = new VideoSystem();
    memory = new MemorySystem();
    memory.clearRAM();
  });

  it("should set pixel at (0, 0)", () => {
    expect(video.setPixel(0, 0, memory)).toBe(true);
    const char = memory.readByte(0x3c00);
    expect(char).toBeGreaterThanOrEqual(128);
    expect(char).toBeLessThanOrEqual(191);
    // Pixel (0,0) is top-left of first character block
    // This should set bit 5 (top-left pixel)
    const pattern = char - 128;
    expect(pattern & 0x20).toBe(0x20);
  });

  it("should set pixel at (1, 0)", () => {
    expect(video.setPixel(1, 0, memory)).toBe(true);
    const char = memory.readByte(0x3c00);
    const pattern = char - 128;
    // Pixel (1,0) is top-right of first character block (bit 4)
    expect(pattern & 0x10).toBe(0x10);
  });

  it("should set pixel at (0, 1)", () => {
    expect(video.setPixel(0, 1, memory)).toBe(true);
    const char = memory.readByte(0x3c00);
    const pattern = char - 128;
    // Pixel (0,1) is middle-left (bit 3)
    expect(pattern & 0x08).toBe(0x08);
  });

  it("should set pixel at (127, 47)", () => {
    expect(video.setPixel(127, 47, memory)).toBe(true);
    // (127, 47) is in the last character block
    const charX = Math.floor(127 / 2); // 63
    const charY = Math.floor(47 / 3); // 15
    const addr = 0x3c00 + charY * 64 + charX;
    const char = memory.readByte(addr);
    expect(char).toBeGreaterThanOrEqual(128);
  });

  it("should not set pixel outside bounds (x < 0)", () => {
    expect(video.setPixel(-1, 0, memory)).toBe(false);
  });

  it("should not set pixel outside bounds (x > 127)", () => {
    expect(video.setPixel(128, 0, memory)).toBe(false);
  });

  it("should not set pixel outside bounds (y < 0)", () => {
    expect(video.setPixel(0, -1, memory)).toBe(false);
  });

  it("should not set pixel outside bounds (y > 47)", () => {
    expect(video.setPixel(0, 48, memory)).toBe(false);
  });

  it("should set multiple pixels in same character block", () => {
    video.setPixel(0, 0, memory); // Top-left
    video.setPixel(1, 0, memory); // Top-right
    const char = memory.readByte(0x3c00);
    const pattern = char - 128;
    expect(pattern & 0x30).toBe(0x30); // Both top pixels
  });

  it("should set pixels across different character blocks", () => {
    video.setPixel(0, 0, memory); // Block (0,0)
    video.setPixel(2, 0, memory); // Block (1,0)
    video.setPixel(0, 3, memory); // Block (0,1)

    const char1 = memory.readByte(0x3c00);
    const char2 = memory.readByte(0x3c01);
    const char3 = memory.readByte(0x3c40); // Row 1

    expect(char1).toBeGreaterThanOrEqual(128);
    expect(char2).toBeGreaterThanOrEqual(128);
    expect(char3).toBeGreaterThanOrEqual(128);
  });

  it("should convert text character to graphics character when setting pixel", () => {
    // Write a text character first
    memory.writeByte(0x3c00, 0x41); // 'A'
    // Then set a pixel - should convert to graphics
    video.setPixel(0, 0, memory);
    const char = memory.readByte(0x3c00);
    expect(char).toBeGreaterThanOrEqual(128);
    expect(char).toBeLessThanOrEqual(191);
  });
});

describe("VideoSystem - RESET Command (resetPixel)", () => {
  let video;
  let memory;

  beforeEach(() => {
    video = new VideoSystem();
    memory = new MemorySystem();
    memory.clearRAM();
  });

  it("should reset pixel at (0, 0)", () => {
    // First set the pixel
    video.setPixel(0, 0, memory);
    let char = memory.readByte(0x3c00);
    let pattern = char - 128;
    expect(pattern & 0x20).toBe(0x20); // Pixel is on

    // Then reset it
    expect(video.resetPixel(0, 0, memory)).toBe(true);
    char = memory.readByte(0x3c00);
    pattern = char - 128;
    expect(pattern & 0x20).toBe(0); // Pixel is off
  });

  it("should not reset pixel if character is not graphics char", () => {
    // Write a text character
    memory.writeByte(0x3c00, 0x41); // 'A'
    expect(video.resetPixel(0, 0, memory)).toBe(false);
    // Character should remain unchanged
    expect(memory.readByte(0x3c00)).toBe(0x41);
  });

  it("should reset multiple pixels independently", () => {
    // Set all pixels in a block
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 2; x++) {
        video.setPixel(x, y, memory);
      }
    }

    // Reset only top-left
    video.resetPixel(0, 0, memory);
    const char = memory.readByte(0x3c00);
    const pattern = char - 128;
    expect(pattern & 0x20).toBe(0); // Top-left off
    expect(pattern & 0x10).toBe(0x10); // Top-right still on
  });

  it("should not reset pixel outside bounds", () => {
    expect(video.resetPixel(-1, 0, memory)).toBe(false);
    expect(video.resetPixel(128, 0, memory)).toBe(false);
    expect(video.resetPixel(0, -1, memory)).toBe(false);
    expect(video.resetPixel(0, 48, memory)).toBe(false);
  });
});

describe("VideoSystem - POINT Command (pointPixel)", () => {
  let video;
  let memory;

  beforeEach(() => {
    video = new VideoSystem();
    memory = new MemorySystem();
    memory.clearRAM();
  });

  it("should return 0 for pixel that is off", () => {
    expect(video.pointPixel(0, 0, memory)).toBe(0);
  });

  it("should return -1 for pixel that is on", () => {
    video.setPixel(0, 0, memory);
    expect(video.pointPixel(0, 0, memory)).toBe(-1);
  });

  it("should return 0 for text character position", () => {
    memory.writeByte(0x3c00, 0x41); // 'A'
    expect(video.pointPixel(0, 0, memory)).toBe(0);
  });

  it("should correctly detect pixel state after set and reset", () => {
    expect(video.pointPixel(0, 0, memory)).toBe(0);
    video.setPixel(0, 0, memory);
    expect(video.pointPixel(0, 0, memory)).toBe(-1);
    video.resetPixel(0, 0, memory);
    expect(video.pointPixel(0, 0, memory)).toBe(0);
  });

  it("should return 0 for pixels outside bounds", () => {
    expect(video.pointPixel(-1, 0, memory)).toBe(0);
    expect(video.pointPixel(128, 0, memory)).toBe(0);
    expect(video.pointPixel(0, -1, memory)).toBe(0);
    expect(video.pointPixel(0, 48, memory)).toBe(0);
  });

  it("should correctly detect different pixels in same block", () => {
    video.setPixel(0, 0, memory); // Top-left
    video.setPixel(1, 0, memory); // Top-right

    expect(video.pointPixel(0, 0, memory)).toBe(-1);
    expect(video.pointPixel(1, 0, memory)).toBe(-1);
    expect(video.pointPixel(0, 1, memory)).toBe(0); // Middle-left not set
  });
});

describe("VideoSystem - CHR$() Graphics Characters", () => {
  let video;
  let memory;

  beforeEach(() => {
    video = new VideoSystem();
    memory = new MemorySystem();
    memory.clearRAM();
  });

  it("should write CHR$(128) to video memory (all pixels off)", () => {
    memory.writeByte(0x3c00, 128);
    const char = memory.readByte(0x3c00);
    expect(char).toBe(128);
    // All pixels should be off
    expect(video.pointPixel(0, 0, memory)).toBe(0);
    expect(video.pointPixel(1, 0, memory)).toBe(0);
  });

  it("should write CHR$(191) to video memory (all pixels on)", () => {
    memory.writeByte(0x3c00, 191);
    const char = memory.readByte(0x3c00);
    expect(char).toBe(191);
    // All pixels in block should be on
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 2; x++) {
        expect(video.pointPixel(x, y, memory)).toBe(-1);
      }
    }
  });

  it("should use CHR$(129) to set bottom-right pixel", () => {
    memory.writeByte(0x3c00, 129);
    expect(video.pointPixel(1, 2, memory)).toBe(-1); // Bottom-right
    expect(video.pointPixel(0, 0, memory)).toBe(0); // Others off
  });

  it("should combine CHR$() with SET to modify graphics", () => {
    // Start with CHR$(128) - all off
    memory.writeByte(0x3c00, 128);
    // Use SET to turn on top-left
    video.setPixel(0, 0, memory);
    const char = memory.readByte(0x3c00);
    expect(char).toBe(128 + 0x20); // Pattern should have bit 5 set
  });
});

describe("VideoSystem - Graphics Patterns", () => {
  let video;
  let memory;

  beforeEach(() => {
    video = new VideoSystem();
    memory = new MemorySystem();
    memory.clearRAM();
  });

  it("should create horizontal line using SET", () => {
    // Draw line from (0, 0) to (10, 0)
    for (let x = 0; x <= 10; x++) {
      video.setPixel(x, 0, memory);
    }
    // Check all pixels are set
    for (let x = 0; x <= 10; x++) {
      expect(video.pointPixel(x, 0, memory)).toBe(-1);
    }
  });

  it("should create vertical line using SET", () => {
    // Draw line from (0, 0) to (0, 10)
    for (let y = 0; y <= 10; y++) {
      video.setPixel(0, y, memory);
    }
    // Check all pixels are set
    for (let y = 0; y <= 10; y++) {
      expect(video.pointPixel(0, y, memory)).toBe(-1);
    }
  });

  it("should create diagonal line using SET", () => {
    // Draw diagonal from (0, 0) to (10, 10)
    for (let i = 0; i <= 10; i++) {
      video.setPixel(i, i, memory);
    }
    // Check diagonal pixels
    for (let i = 0; i <= 10; i++) {
      expect(video.pointPixel(i, i, memory)).toBe(-1);
    }
  });

  it("should create filled rectangle using SET", () => {
    // Fill rectangle from (5, 5) to (15, 10)
    for (let y = 5; y <= 10; y++) {
      for (let x = 5; x <= 15; x++) {
        video.setPixel(x, y, memory);
      }
    }
    // Check all pixels in rectangle are set
    for (let y = 5; y <= 10; y++) {
      for (let x = 5; x <= 15; x++) {
        expect(video.pointPixel(x, y, memory)).toBe(-1);
      }
    }
  });

  it("should create border rectangle using SET and RESET", () => {
    // Draw filled rectangle
    for (let y = 5; y <= 10; y++) {
      for (let x = 5; x <= 15; x++) {
        video.setPixel(x, y, memory);
      }
    }
    // Remove interior to create border
    for (let y = 6; y <= 9; y++) {
      for (let x = 6; x <= 14; x++) {
        video.resetPixel(x, y, memory);
      }
    }
    // Check border pixels are set, interior is not
    for (let y = 5; y <= 10; y++) {
      for (let x = 5; x <= 15; x++) {
        const isBorder = x === 5 || x === 15 || y === 5 || y === 10;
        expect(video.pointPixel(x, y, memory)).toBe(isBorder ? -1 : 0);
      }
    }
  });
});

describe("VideoSystem - Screen Operations", () => {
  let video;
  let memory;

  beforeEach(() => {
    video = new VideoSystem();
    memory = new MemorySystem();
    memory.clearRAM();
  });

  it("should clear screen (fill with spaces)", () => {
    // Write some characters
    memory.writeByte(0x3c00, 0x41); // 'A'
    memory.writeByte(0x3c01, 0x42); // 'B'

    video.clearScreen(memory);

    // All should be spaces (0x20)
    for (let i = 0; i < 64 * 16; i++) {
      expect(memory.readByte(0x3c00 + i)).toBe(0x20);
    }
  });

  it("should write string to video memory", () => {
    video.writeString(memory, "HELLO", 0, 0);

    expect(memory.readByte(0x3c00)).toBe(0x48); // 'H'
    expect(memory.readByte(0x3c01)).toBe(0x45); // 'E'
    expect(memory.readByte(0x3c02)).toBe(0x4c); // 'L'
    expect(memory.readByte(0x3c03)).toBe(0x4c); // 'L'
    expect(memory.readByte(0x3c04)).toBe(0x4f); // 'O'
  });

  it("should write string at specific row and column", () => {
    video.writeString(memory, "TEST", 5, 10);

    const addr = 0x3c00 + 5 * 64 + 10;
    expect(memory.readByte(addr)).toBe(0x54); // 'T'
    expect(memory.readByte(addr + 1)).toBe(0x45); // 'E'
    expect(memory.readByte(addr + 2)).toBe(0x53); // 'S'
    expect(memory.readByte(addr + 3)).toBe(0x54); // 'T'
  });

  it("should get screen snapshot", () => {
    video.writeString(memory, "ABC", 0, 0);
    const snapshot = video.getScreenSnapshot(memory);

    expect(snapshot.length).toBe(16); // 16 rows
    expect(snapshot[0].length).toBe(64); // 64 columns
    expect(snapshot[0][0]).toBe(0x41); // 'A'
    expect(snapshot[0][1]).toBe(0x42); // 'B'
    expect(snapshot[0][2]).toBe(0x43); // 'C'
  });

  it("should get graphics snapshot", () => {
    // Set some pixels
    video.setPixel(10, 20, memory);
    video.setPixel(50, 30, memory);

    const snapshot = video.getGraphicsSnapshot(memory);

    expect(snapshot.length).toBe(48); // 48 rows
    expect(snapshot[0].length).toBe(128); // 128 columns
    expect(snapshot[20][10]).toBe(1); // Pixel is on
    expect(snapshot[30][50]).toBe(1); // Pixel is on
    expect(snapshot[0][0]).toBe(0); // Other pixels off
  });
});

describe("VideoSystem - Edge Cases and Complex Scenarios", () => {
  let video;
  let memory;

  beforeEach(() => {
    video = new VideoSystem();
    memory = new MemorySystem();
    memory.clearRAM();
  });

  it("should handle setting all pixels in display", () => {
    // Set all 128×48 pixels
    for (let y = 0; y < 48; y++) {
      for (let x = 0; x < 128; x++) {
        video.setPixel(x, y, memory);
      }
    }

    // Verify all are set
    for (let y = 0; y < 48; y++) {
      for (let x = 0; x < 128; x++) {
        expect(video.pointPixel(x, y, memory)).toBe(-1);
      }
    }
  });

  it("should handle boundary coordinates correctly", () => {
    // Test all four corners
    expect(video.setPixel(0, 0, memory)).toBe(true);
    expect(video.setPixel(127, 0, memory)).toBe(true);
    expect(video.setPixel(0, 47, memory)).toBe(true);
    expect(video.setPixel(127, 47, memory)).toBe(true);

    expect(video.pointPixel(0, 0, memory)).toBe(-1);
    expect(video.pointPixel(127, 0, memory)).toBe(-1);
    expect(video.pointPixel(0, 47, memory)).toBe(-1);
    expect(video.pointPixel(127, 47, memory)).toBe(-1);
  });

  it("should handle rapid set/reset operations", () => {
    // Rapidly toggle a pixel
    for (let i = 0; i < 10; i++) {
      video.setPixel(10, 10, memory);
      expect(video.pointPixel(10, 10, memory)).toBe(-1);
      video.resetPixel(10, 10, memory);
      expect(video.pointPixel(10, 10, memory)).toBe(0);
    }
  });

  it("should handle overlapping graphics and text", () => {
    // Write text
    video.writeString(memory, "HELLO", 0, 0);
    // Then draw graphics over it
    video.setPixel(0, 0, memory);
    video.setPixel(1, 0, memory);

    // Text should be converted to graphics
    const char = memory.readByte(0x3c00);
    expect(char).toBeGreaterThanOrEqual(128);
  });

  it("should correctly map pixel coordinates to character blocks", () => {
    // Test various pixel positions
    const testCases = [
      { x: 0, y: 0, charX: 0, charY: 0 },
      { x: 1, y: 0, charX: 0, charY: 0 },
      { x: 2, y: 0, charX: 1, charY: 0 },
      { x: 0, y: 3, charX: 0, charY: 1 },
      { x: 63, y: 23, charX: 31, charY: 7 },
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
  });
});

describe("VideoSystem - Integration with Memory System", () => {
  let video;
  let memory;

  beforeEach(() => {
    video = new VideoSystem();
    memory = new MemorySystem();
    memory.clearRAM();
  });

  it("should work with ROM-loaded memory system", () => {
    // Simulate ROM loading
    const romData = new Uint8Array(0x4000);
    memory.loadROM(romData);

    // Video operations should still work
    expect(video.setPixel(10, 10, memory)).toBe(true);
    expect(video.pointPixel(10, 10, memory)).toBe(-1);
  });

  it("should preserve video memory during RAM operations", () => {
    video.setPixel(10, 10, memory);
    video.setPixel(20, 20, memory);

    // Perform RAM operations
    memory.writeByte(0x4000, 0x42);
    memory.writeByte(0x5000, 0x43);

    // Video memory should be preserved
    expect(video.pointPixel(10, 10, memory)).toBe(-1);
    expect(video.pointPixel(20, 20, memory)).toBe(-1);
  });

  it("should handle video memory at correct address range", () => {
    // Video memory is at 0x3C00-0x3FFF
    video.setPixel(0, 0, memory);
    const char = memory.readByte(0x3c00);
    expect(char).toBeGreaterThanOrEqual(128);

    // Last character position
    video.setPixel(127, 47, memory);
    const lastChar = memory.readByte(0x3fff);
    expect(lastChar).toBeGreaterThanOrEqual(128);
  });
});

describe("VideoSystem - Visual Verification Tests", () => {
  let video;
  let memory;

  beforeEach(() => {
    video = new VideoSystem();
    memory = new MemorySystem();
    memory.clearRAM();
  });

  it("should create checkerboard pattern with alternating pixels", () => {
    // Create a clear checkerboard pattern that's easy to see
    for (let y = 0; y < 48; y++) {
      for (let x = 0; x < 128; x++) {
        if ((x + y) % 2 === 0) {
          video.setPixel(x, y, memory);
        }
      }
    }

    // Verify pattern - check several positions
    expect(video.pointPixel(0, 0, memory)).toBe(-1); // Should be on
    expect(video.pointPixel(1, 0, memory)).toBe(0); // Should be off
    expect(video.pointPixel(0, 1, memory)).toBe(0); // Should be off
    expect(video.pointPixel(1, 1, memory)).toBe(-1); // Should be on
    expect(video.pointPixel(10, 10, memory)).toBe(-1); // Should be on (10+10=20, even)
    expect(video.pointPixel(11, 10, memory)).toBe(0); // Should be off (11+10=21, odd)
  });

  it("should draw frame around screen edges using SET", () => {
    // Draw top edge
    for (let x = 0; x < 128; x++) {
      video.setPixel(x, 0, memory);
    }
    // Draw bottom edge
    for (let x = 0; x < 128; x++) {
      video.setPixel(x, 47, memory);
    }
    // Draw left edge
    for (let y = 0; y < 48; y++) {
      video.setPixel(0, y, memory);
    }
    // Draw right edge
    for (let y = 0; y < 48; y++) {
      video.setPixel(127, y, memory);
    }

    // Verify frame is drawn
    // Top edge
    for (let x = 0; x < 128; x++) {
      expect(video.pointPixel(x, 0, memory)).toBe(-1);
    }
    // Bottom edge
    for (let x = 0; x < 128; x++) {
      expect(video.pointPixel(x, 47, memory)).toBe(-1);
    }
    // Left edge
    for (let y = 0; y < 48; y++) {
      expect(video.pointPixel(0, y, memory)).toBe(-1);
    }
    // Right edge
    for (let y = 0; y < 48; y++) {
      expect(video.pointPixel(127, y, memory)).toBe(-1);
    }
    // Verify interior is empty (check a few points)
    expect(video.pointPixel(64, 24, memory)).toBe(0); // Center should be off
    expect(video.pointPixel(10, 10, memory)).toBe(0); // Interior should be off
  });

  it("should display all CHR$() graphics characters 128-191", () => {
    // Display all 64 graphics characters in a grid
    // 8 characters per row, 8 rows
    for (let charCode = 128; charCode < 192; charCode++) {
      const row = Math.floor((charCode - 128) / 8);
      const col = (charCode - 128) % 8;
      const addr = 0x3c00 + row * 64 + col;
      memory.writeByte(addr, charCode);
    }

    // Verify all characters are written
    for (let charCode = 128; charCode < 192; charCode++) {
      const row = Math.floor((charCode - 128) / 8);
      const col = (charCode - 128) % 8;
      const addr = 0x3c00 + row * 64 + col;
      expect(memory.readByte(addr)).toBe(charCode);
    }

    // Verify specific characters
    expect(memory.readByte(0x3c00)).toBe(128); // First char (all off) - row 0, col 0
    expect(memory.readByte(0x3c07)).toBe(135); // Last of first row - row 0, col 7
    // Last char (191) should be at row 7, col 7
    const lastRow = 7;
    const lastCol = 7;
    const lastAddr = 0x3c00 + lastRow * 64 + lastCol;
    expect(memory.readByte(lastAddr)).toBe(191); // Last char (all on)
  });

  it("should create diagonal stripes pattern", () => {
    // Draw diagonal stripes for clear visibility
    for (let y = 0; y < 48; y++) {
      for (let x = 0; x < 128; x++) {
        if ((x + y) % 4 < 2) {
          video.setPixel(x, y, memory);
        }
      }
    }

    // Verify pattern
    expect(video.pointPixel(0, 0, memory)).toBe(-1); // Should be on
    expect(video.pointPixel(2, 0, memory)).toBe(0); // Should be off
    expect(video.pointPixel(4, 0, memory)).toBe(-1); // Should be on
  });

  it("should create crosshair pattern in center", () => {
    // Draw horizontal line through center
    for (let x = 0; x < 128; x++) {
      video.setPixel(x, 24, memory);
    }
    // Draw vertical line through center
    for (let y = 0; y < 48; y++) {
      video.setPixel(64, y, memory);
    }

    // Verify crosshair
    expect(video.pointPixel(64, 24, memory)).toBe(-1); // Center intersection
    expect(video.pointPixel(0, 24, memory)).toBe(-1); // Left end of horizontal
    expect(video.pointPixel(127, 24, memory)).toBe(-1); // Right end of horizontal
    expect(video.pointPixel(64, 0, memory)).toBe(-1); // Top end of vertical
    expect(video.pointPixel(64, 47, memory)).toBe(-1); // Bottom end of vertical
    // Verify areas outside crosshair are empty
    expect(video.pointPixel(0, 0, memory)).toBe(0); // Corner should be off
    expect(video.pointPixel(127, 47, memory)).toBe(0); // Opposite corner should be off
  });

  it("should create filled square in center using SET", () => {
    // Draw a 20x20 filled square centered at (64, 24)
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

    // Verify square is filled
    expect(video.pointPixel(centerX, centerY, memory)).toBe(-1); // Center
    expect(video.pointPixel(startX, startY, memory)).toBe(-1); // Top-left corner
    expect(video.pointPixel(startX + size - 1, startY, memory)).toBe(-1); // Top-right corner
    expect(video.pointPixel(startX, startY + size - 1, memory)).toBe(-1); // Bottom-left corner
    // Verify area outside square is empty
    expect(video.pointPixel(0, 0, memory)).toBe(0); // Far corner should be off
    expect(video.pointPixel(127, 47, memory)).toBe(0); // Opposite corner should be off
  });

  it("should demonstrate CHR$(191) creates all-on pattern", () => {
    // Write CHR$(191) to several positions
    memory.writeByte(0x3c00, 191); // All pixels on
    memory.writeByte(0x3c01, 191);
    memory.writeByte(0x3c40, 191); // Next row

    // Verify all pixels in these blocks are on
    // First block (0x3c00) - all 6 pixels should be on
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 2; x++) {
        expect(video.pointPixel(x, y, memory)).toBe(-1);
      }
    }
    // Second block (0x3c01) - all 6 pixels should be on
    for (let y = 0; y < 3; y++) {
      for (let x = 2; x < 4; x++) {
        expect(video.pointPixel(x, y, memory)).toBe(-1);
      }
    }
  });

  it("should demonstrate CHR$(128) creates all-off pattern", () => {
    // First set some pixels, then write CHR$(128) to clear them
    video.setPixel(0, 0, memory);
    video.setPixel(1, 0, memory);
    expect(video.pointPixel(0, 0, memory)).toBe(-1); // Should be on

    // Write CHR$(128) to clear
    memory.writeByte(0x3c00, 128);

    // Verify all pixels in block are now off
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 2; x++) {
        expect(video.pointPixel(x, y, memory)).toBe(0);
      }
    }
  });
});
