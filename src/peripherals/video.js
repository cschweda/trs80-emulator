/**
 * TRS-80 Model III Video System
 * 64×16 character display with 128×48 pixel graphics mode
 *
 * The TRS-80 Model III uses a character-based display where:
 * - Text mode: 64 columns × 16 rows = 1024 characters
 * - Graphics mode: 128×48 pixels using graphics characters (128-191)
 * - Each graphics character represents a 2×3 pixel block
 * - Video RAM is located at 0x3C00-0x3FFF (1KB)
 */

export class VideoSystem {
  constructor(canvasElement = null) {
    this.canvas = canvasElement;
    this.ctx = canvasElement ? canvasElement.getContext("2d") : null;

    // Display specs
    this.columns = 64;
    this.rows = 16;
    this.charWidth = 8;
    this.charHeight = 12;

    // Graphics mode specs
    this.graphicsWidth = 128;
    this.graphicsHeight = 48;

    this.textMode = true;
    this.charRom = this.loadCharacterROM();

    // Canvas size (if canvas provided)
    if (this.canvas) {
      this.canvas.width = this.columns * this.charWidth;
      this.canvas.height = this.rows * this.charHeight;
    }

    // Video memory location
    this.videoMemoryStart = 0x3c00;
    this.videoMemoryEnd = 0x3fff;

    // Colors (TRS-80 green on black)
    this.fgColor = "#00FF00"; // Green
    this.bgColor = "#000000"; // Black
  }

  /**
   * Load character ROM with ASCII and graphics characters
   */
  loadCharacterROM() {
    const charRom = new Array(256);

    // Initialize all characters
    for (let i = 0; i < 256; i++) {
      charRom[i] = new Array(12).fill(0x00);
    }

    // Basic ASCII characters (0-127)
    // Space (0x20)
    charRom[0x20] = new Array(12).fill(0x00);

    // 'A' (0x41)
    charRom[0x41] = [
      0b00011000, 0b00111100, 0b01100110, 0b01100110, 0b01111110, 0b01100110,
      0b01100110, 0b01100110, 0b00000000, 0b00000000, 0b00000000, 0b00000000,
    ];

    // '0' (0x30)
    charRom[0x30] = [
      0b00111100, 0b01100110, 0b01100110, 0b01100110, 0b01100110, 0b01100110,
      0b01100110, 0b00111100, 0b00000000, 0b00000000, 0b00000000, 0b00000000,
    ];

    // Generate basic ASCII set (simplified - just key characters)
    // In a full implementation, all 128 ASCII chars would be defined
    for (let i = 0x20; i <= 0x7e; i++) {
      if (!charRom[i] || charRom[i].every((b) => b === 0)) {
        // Generate a simple pattern for undefined chars
        charRom[i] = this.generateSimpleChar(i);
      }
    }

    // Graphics characters (128-191)
    // Each represents a 2×3 pixel block with 64 possible patterns
    for (let i = 128; i < 192; i++) {
      const pattern = i - 128;
      charRom[i] = this.generateGraphicsChar(pattern);
    }

    return charRom;
  }

  /**
   * Generate a simple character pattern for undefined ASCII chars
   */
  generateSimpleChar(code) {
    const charData = new Array(12).fill(0x00);
    // Create a simple pattern based on character code
    const pattern = code & 0x7f;
    for (let row = 0; row < 8; row++) {
      charData[row] = (pattern << row % 3) & 0xff;
    }
    return charData;
  }

  /**
   * Generate graphics character bitmap for a 2×3 pixel block
   *
   * TRS-80 Model III graphics use characters 128-191 to represent all 64
   * possible combinations of on/off pixels in a 2×3 block.
   *
   * Pattern encoding (6 bits, bits 0-5):
   *
   *   Bit 5  Bit 4    ┌─┬─┐
   *   Bit 3  Bit 2    │5│4│  Top row
   *   Bit 1  Bit 0    ├─┼─┤
   *                   │3│2│  Middle row
   *                   ├─┼─┤
   *                   │1│0│  Bottom row
   *                   └─┴─┘
   *
   * Example patterns:
   * - pattern 0  (000000) = all pixels off   → char 128
   * - pattern 1  (000001) = bottom-right on  → char 129
   * - pattern 63 (111111) = all pixels on    → char 191
   *
   * @param {number} pattern - 6-bit pattern (0-63)
   * @returns {Array<number>} 12-byte character bitmap
   */
  generateGraphicsChar(pattern) {
    const charData = new Array(12).fill(0x00);

    // Top row (bits 5,4) - rows 0-3
    if (pattern & 0x20) charData[0] |= 0xf0; // Top-left pixel (bit 5)
    if (pattern & 0x10) charData[0] |= 0x0f; // Top-right pixel (bit 4)
    charData[1] = charData[0];
    charData[2] = charData[0];
    charData[3] = charData[0];

    // Middle row (bits 3,2) - rows 4-7
    if (pattern & 0x08) charData[4] |= 0xf0; // Middle-left pixel (bit 3)
    if (pattern & 0x04) charData[4] |= 0x0f; // Middle-right pixel (bit 2)
    charData[5] = charData[4];
    charData[6] = charData[4];
    charData[7] = charData[4];

    // Bottom row (bits 1,0) - rows 8-11
    if (pattern & 0x02) charData[8] |= 0xf0; // Bottom-left pixel (bit 1)
    if (pattern & 0x01) charData[8] |= 0x0f; // Bottom-right pixel (bit 0)
    charData[9] = charData[8];
    charData[10] = charData[8];
    charData[11] = charData[8];

    return charData;
  }

  /**
   * Render the screen from video memory
   * @param {MemorySystem} memorySystem - Memory system to read from
   */
  renderScreen(memorySystem) {
    if (!this.canvas || !this.ctx) return;

    // Clear screen
    this.ctx.fillStyle = this.bgColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.textMode) {
      this.renderTextMode(memorySystem);
    }
  }

  /**
   * Render text mode (64×16 characters)
   */
  renderTextMode(memorySystem) {
    this.ctx.fillStyle = this.fgColor;

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.columns; col++) {
        const addr = this.videoMemoryStart + row * this.columns + col;
        const charCode = memorySystem.readByte(addr);
        this.drawCharacter(charCode, col, row);
      }
    }
  }

  /**
   * Draw a single character at position (x, y) in character coordinates
   */
  drawCharacter(code, x, y) {
    const charData = this.charRom[code] || this.charRom[0x20];

    for (let row = 0; row < this.charHeight; row++) {
      const rowData = charData[row] || 0;
      for (let col = 0; col < this.charWidth; col++) {
        if (rowData & (1 << (7 - col))) {
          this.ctx.fillRect(
            x * this.charWidth + col,
            y * this.charHeight + row,
            1,
            1
          );
        }
      }
    }
  }

  /**
   * Turn on a pixel at coordinates (x, y) - implements BASIC SET command
   *
   * The TRS-80 Model III uses character-based graphics where each character
   * position displays a 2×3 block of pixels. Graphics characters (128-191)
   * represent all 64 possible combinations of on/off pixels in a 2×3 block.
   *
   * To set a pixel:
   * 1. Calculate which character position contains this pixel
   * 2. Determine which pixel within the 2×3 block (0-5)
   * 3. Read current graphics character at that position
   * 4. Set the appropriate bit (turn pixel on)
   * 5. Write the updated graphics character back
   *
   * @param {number} x - X coordinate (0-127)
   * @param {number} y - Y coordinate (0-47)
   * @param {MemorySystem} memorySystem - Memory system for reading/writing
   */
  setPixel(x, y, memorySystem) {
    if (x < 0 || x > 127 || y < 0 || y > 47) return false;

    // Calculate character position (each char = 2×3 pixels)
    const charX = Math.floor(x / 2);
    const charY = Math.floor(y / 3);

    // Calculate pixel within character block
    const pixelX = x % 2; // 0 or 1 (left or right)
    const pixelY = y % 3; // 0, 1, or 2 (top, middle, bottom)

    // Get current character at this position
    const videoAddr = this.videoMemoryStart + charY * this.columns + charX;
    let currentChar = memorySystem.readByte(videoAddr);

    // If not a graphics char (128-191), start with blank graphics char (128)
    if (currentChar < 128 || currentChar > 191) {
      currentChar = 128;
    }

    // Calculate bit position within the 6-bit pattern (0-5)
    // Bit layout: 543210 → pixels: TL TR ML MR BL BR
    // pixelY: 0=top, 1=middle, 2=bottom
    // pixelX: 0=left, 1=right
    // Top row: bit 5 (left), bit 4 (right)
    // Middle row: bit 3 (left), bit 2 (right)
    // Bottom row: bit 1 (left), bit 0 (right)
    const bitPos = 5 - (pixelY * 2 + pixelX);

    // Set the bit (turn pixel on)
    const pattern = currentChar - 128;
    const newPattern = pattern | (1 << bitPos);
    const newChar = 128 + newPattern;

    // Write updated graphics character back to video memory
    memorySystem.writeByte(videoAddr, newChar);
    return true;
  }

  /**
   * Turn off a pixel at coordinates (x, y) - implements BASIC RESET command
   *
   * Same as setPixel but clears the bit instead of setting it.
   *
   * @param {number} x - X coordinate (0-127)
   * @param {number} y - Y coordinate (0-47)
   * @param {MemorySystem} memorySystem - Memory system for reading/writing
   */
  resetPixel(x, y, memorySystem) {
    if (x < 0 || x > 127 || y < 0 || y > 47) return false;

    const charX = Math.floor(x / 2);
    const charY = Math.floor(y / 3);
    const pixelX = x % 2;
    const pixelY = y % 3;

    const videoAddr = this.videoMemoryStart + charY * this.columns + charX;
    let currentChar = memorySystem.readByte(videoAddr);

    // Only modify if it's already a graphics character
    if (currentChar < 128 || currentChar > 191) return false;

    const bitPos = 5 - (pixelY * 2 + pixelX);

    // Clear the bit (turn pixel off)
    const pattern = currentChar - 128;
    const newPattern = pattern & ~(1 << bitPos);
    const newChar = 128 + newPattern;

    memorySystem.writeByte(videoAddr, newChar);
    return true;
  }

  /**
   * Test if a pixel is on or off - implements BASIC POINT command
   *
   * Returns -1 if pixel is on, 0 if off (standard BASIC convention).
   *
   * @param {number} x - X coordinate (0-127)
   * @param {number} y - Y coordinate (0-47)
   * @param {MemorySystem} memorySystem - Memory system for reading
   * @returns {number} -1 if pixel is on, 0 if off
   */
  pointPixel(x, y, memorySystem) {
    if (x < 0 || x > 127 || y < 0 || y > 47) return 0;

    const charX = Math.floor(x / 2);
    const charY = Math.floor(y / 3);
    const pixelX = x % 2;
    const pixelY = y % 3;

    const videoAddr = this.videoMemoryStart + charY * this.columns + charX;
    const currentChar = memorySystem.readByte(videoAddr);

    // Not a graphics character = pixel is off
    if (currentChar < 128 || currentChar > 191) return 0;

    const bitPos = 5 - (pixelY * 2 + pixelX);
    const pattern = currentChar - 128;

    // Test the bit and return -1 (on) or 0 (off)
    return pattern & (1 << bitPos) ? -1 : 0;
  }

  /**
   * Clear the screen (fill with spaces)
   */
  clearScreen(memorySystem) {
    for (let i = 0; i < this.columns * this.rows; i++) {
      memorySystem.writeByte(this.videoMemoryStart + i, 0x20);
    }
    if (this.canvas) {
      this.renderScreen(memorySystem);
    }
  }

  /**
   * Write a string to video memory at a specific position
   */
  writeString(memorySystem, str, row, col = 0) {
    const startAddr = this.videoMemoryStart + row * this.columns + col;
    for (let i = 0; i < str.length && col + i < this.columns; i++) {
      memorySystem.writeByte(startAddr + i, str.charCodeAt(i));
    }
    if (this.canvas) {
      this.renderScreen(memorySystem);
    }
  }

  /**
   * Get a snapshot of the current screen as a 2D array
   * Useful for testing and displaying in modals
   */
  getScreenSnapshot(memorySystem) {
    const screen = [];
    for (let row = 0; row < this.rows; row++) {
      const line = [];
      for (let col = 0; col < this.columns; col++) {
        const addr = this.videoMemoryStart + row * this.columns + col;
        line.push(memorySystem.readByte(addr));
      }
      screen.push(line);
    }
    return screen;
  }

  /**
   * Get graphics data as a 2D pixel array (128×48)
   * Useful for rendering in modals
   */
  getGraphicsSnapshot(memorySystem) {
    const pixels = [];
    for (let y = 0; y < this.graphicsHeight; y++) {
      const row = [];
      for (let x = 0; x < this.graphicsWidth; x++) {
        row.push(this.pointPixel(x, y, memorySystem) === -1 ? 1 : 0);
      }
      pixels.push(row);
    }
    return pixels;
  }

  /**
   * Set canvas element (for rendering)
   */
  setCanvas(canvasElement) {
    this.canvas = canvasElement;
    if (canvasElement) {
      this.ctx = canvasElement.getContext("2d");
      this.canvas.width = this.columns * this.charWidth;
      this.canvas.height = this.rows * this.charHeight;
    } else {
      this.ctx = null;
    }
  }
}
