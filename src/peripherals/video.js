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

/**
 * 5x7 pixel font for ASCII 0x20-0x7F, one glyph per entry, seven 5-bit
 * rows each, MSB = leftmost pixel. Rendered into the 8x12 character cell.
 */
// prettier-ignore
const FONT_5X7 = [
  /* space */ [0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000],
  /* !     */ [0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00000, 0b00100],
  /* "     */ [0b01010, 0b01010, 0b01010, 0b00000, 0b00000, 0b00000, 0b00000],
  /* #     */ [0b01010, 0b01010, 0b11111, 0b01010, 0b11111, 0b01010, 0b01010],
  /* $     */ [0b00100, 0b01111, 0b10100, 0b01110, 0b00101, 0b11110, 0b00100],
  /* %     */ [0b11000, 0b11001, 0b00010, 0b00100, 0b01000, 0b10011, 0b00011],
  /* &     */ [0b01100, 0b10010, 0b10100, 0b01000, 0b10101, 0b10010, 0b01101],
  /* '     */ [0b00110, 0b00100, 0b01000, 0b00000, 0b00000, 0b00000, 0b00000],
  /* (     */ [0b00010, 0b00100, 0b01000, 0b01000, 0b01000, 0b00100, 0b00010],
  /* )     */ [0b01000, 0b00100, 0b00010, 0b00010, 0b00010, 0b00100, 0b01000],
  /* *     */ [0b00000, 0b00100, 0b10101, 0b01110, 0b10101, 0b00100, 0b00000],
  /* +     */ [0b00000, 0b00100, 0b00100, 0b11111, 0b00100, 0b00100, 0b00000],
  /* ,     */ [0b00000, 0b00000, 0b00000, 0b00000, 0b00110, 0b00100, 0b01000],
  /* -     */ [0b00000, 0b00000, 0b00000, 0b11111, 0b00000, 0b00000, 0b00000],
  /* .     */ [0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b01100, 0b01100],
  /* /     */ [0b00000, 0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b00000],
  /* 0     */ [0b01110, 0b10001, 0b10011, 0b10101, 0b11001, 0b10001, 0b01110],
  /* 1     */ [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  /* 2     */ [0b01110, 0b10001, 0b00001, 0b00110, 0b01000, 0b10000, 0b11111],
  /* 3     */ [0b11111, 0b00010, 0b00100, 0b00010, 0b00001, 0b10001, 0b01110],
  /* 4     */ [0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010],
  /* 5     */ [0b11111, 0b10000, 0b11110, 0b00001, 0b00001, 0b10001, 0b01110],
  /* 6     */ [0b00110, 0b01000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110],
  /* 7     */ [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000],
  /* 8     */ [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110],
  /* 9     */ [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00010, 0b01100],
  /* :     */ [0b00000, 0b01100, 0b01100, 0b00000, 0b01100, 0b01100, 0b00000],
  /* ;     */ [0b00000, 0b01100, 0b01100, 0b00000, 0b01100, 0b00100, 0b01000],
  /* <     */ [0b00010, 0b00100, 0b01000, 0b10000, 0b01000, 0b00100, 0b00010],
  /* =     */ [0b00000, 0b00000, 0b11111, 0b00000, 0b11111, 0b00000, 0b00000],
  /* >     */ [0b01000, 0b00100, 0b00010, 0b00001, 0b00010, 0b00100, 0b01000],
  /* ?     */ [0b01110, 0b10001, 0b00001, 0b00010, 0b00100, 0b00000, 0b00100],
  /* @     */ [0b01110, 0b10001, 0b00001, 0b01101, 0b10101, 0b10101, 0b01110],
  /* A     */ [0b00100, 0b01010, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001],
  /* B     */ [0b11110, 0b10001, 0b10001, 0b11110, 0b10001, 0b10001, 0b11110],
  /* C     */ [0b01110, 0b10001, 0b10000, 0b10000, 0b10000, 0b10001, 0b01110],
  /* D     */ [0b11100, 0b10010, 0b10001, 0b10001, 0b10001, 0b10010, 0b11100],
  /* E     */ [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111],
  /* F     */ [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000],
  /* G     */ [0b01110, 0b10001, 0b10000, 0b10111, 0b10001, 0b10001, 0b01111],
  /* H     */ [0b10001, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  /* I     */ [0b01110, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  /* J     */ [0b00111, 0b00010, 0b00010, 0b00010, 0b00010, 0b10010, 0b01100],
  /* K     */ [0b10001, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010, 0b10001],
  /* L     */ [0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111],
  /* M     */ [0b10001, 0b11011, 0b10101, 0b10101, 0b10001, 0b10001, 0b10001],
  /* N     */ [0b10001, 0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001],
  /* O     */ [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  /* P     */ [0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000, 0b10000],
  /* Q     */ [0b01110, 0b10001, 0b10001, 0b10001, 0b10101, 0b10010, 0b01101],
  /* R     */ [0b11110, 0b10001, 0b10001, 0b11110, 0b10100, 0b10010, 0b10001],
  /* S     */ [0b01111, 0b10000, 0b10000, 0b01110, 0b00001, 0b00001, 0b11110],
  /* T     */ [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
  /* U     */ [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  /* V     */ [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
  /* W     */ [0b10001, 0b10001, 0b10001, 0b10101, 0b10101, 0b10101, 0b01010],
  /* X     */ [0b10001, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001, 0b10001],
  /* Y     */ [0b10001, 0b10001, 0b01010, 0b00100, 0b00100, 0b00100, 0b00100],
  /* Z     */ [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b11111],
  /* [     */ [0b01110, 0b01000, 0b01000, 0b01000, 0b01000, 0b01000, 0b01110],
  /* \     */ [0b00000, 0b10000, 0b01000, 0b00100, 0b00010, 0b00001, 0b00000],
  /* ]     */ [0b01110, 0b00010, 0b00010, 0b00010, 0b00010, 0b00010, 0b01110],
  /* ^     */ [0b00100, 0b01010, 0b10001, 0b00000, 0b00000, 0b00000, 0b00000],
  /* _     */ [0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b11111],
  /* `     */ [0b01000, 0b00100, 0b00010, 0b00000, 0b00000, 0b00000, 0b00000],
  /* a     */ [0b00000, 0b00000, 0b01110, 0b00001, 0b01111, 0b10001, 0b01111],
  /* b     */ [0b10000, 0b10000, 0b11110, 0b10001, 0b10001, 0b10001, 0b11110],
  /* c     */ [0b00000, 0b00000, 0b01110, 0b10000, 0b10000, 0b10001, 0b01110],
  /* d     */ [0b00001, 0b00001, 0b01111, 0b10001, 0b10001, 0b10001, 0b01111],
  /* e     */ [0b00000, 0b00000, 0b01110, 0b10001, 0b11111, 0b10000, 0b01110],
  /* f     */ [0b00110, 0b01001, 0b01000, 0b11100, 0b01000, 0b01000, 0b01000],
  /* g     */ [0b00000, 0b01111, 0b10001, 0b10001, 0b01111, 0b00001, 0b01110],
  /* h     */ [0b10000, 0b10000, 0b11110, 0b10001, 0b10001, 0b10001, 0b10001],
  /* i     */ [0b00100, 0b00000, 0b01100, 0b00100, 0b00100, 0b00100, 0b01110],
  /* j     */ [0b00010, 0b00000, 0b00110, 0b00010, 0b00010, 0b10010, 0b01100],
  /* k     */ [0b10000, 0b10000, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010],
  /* l     */ [0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  /* m     */ [0b00000, 0b00000, 0b11010, 0b10101, 0b10101, 0b10101, 0b10101],
  /* n     */ [0b00000, 0b00000, 0b11110, 0b10001, 0b10001, 0b10001, 0b10001],
  /* o     */ [0b00000, 0b00000, 0b01110, 0b10001, 0b10001, 0b10001, 0b01110],
  /* p     */ [0b00000, 0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000],
  /* q     */ [0b00000, 0b01111, 0b10001, 0b10001, 0b01111, 0b00001, 0b00001],
  /* r     */ [0b00000, 0b00000, 0b10110, 0b11001, 0b10000, 0b10000, 0b10000],
  /* s     */ [0b00000, 0b00000, 0b01111, 0b10000, 0b01110, 0b00001, 0b11110],
  /* t     */ [0b01000, 0b01000, 0b11100, 0b01000, 0b01000, 0b01001, 0b00110],
  /* u     */ [0b00000, 0b00000, 0b10001, 0b10001, 0b10001, 0b10011, 0b01101],
  /* v     */ [0b00000, 0b00000, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
  /* w     */ [0b00000, 0b00000, 0b10001, 0b10101, 0b10101, 0b10101, 0b01010],
  /* x     */ [0b00000, 0b00000, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001],
  /* y     */ [0b00000, 0b10001, 0b10001, 0b10001, 0b01111, 0b00001, 0b01110],
  /* z     */ [0b00000, 0b00000, 0b11111, 0b00010, 0b00100, 0b01000, 0b11111],
  /* {     */ [0b00010, 0b00100, 0b00100, 0b01000, 0b00100, 0b00100, 0b00010],
  /* |     */ [0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
  /* }     */ [0b01000, 0b00100, 0b00100, 0b00010, 0b00100, 0b00100, 0b01000],
  /* ~     */ [0b00000, 0b01000, 0b10101, 0b00010, 0b00000, 0b00000, 0b00000],
  /* DEL   */ [0b11111, 0b11111, 0b11111, 0b11111, 0b11111, 0b11111, 0b11111],
];

/**
 * "TRS-80" styled font: the Model III character generator drew chunkier
 * 5x7 glyphs and gave lowercase true descenders (two rows below the
 * baseline — the cell is 12 rows tall, so there's room). Entries here
 * override the base font; each override is 9 rows (7 + 2 descender).
 */
// prettier-ignore
const FONT_TRS80_OVERRIDES = {
  // Lowercase with true descenders
  g: [0b00000, 0b00000, 0b01111, 0b10001, 0b10001, 0b10001, 0b01111, 0b00001, 0b01110],
  j: [0b00010, 0b00000, 0b00010, 0b00010, 0b00010, 0b00010, 0b00010, 0b10010, 0b01100],
  p: [0b00000, 0b00000, 0b11110, 0b10001, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000],
  q: [0b00000, 0b00000, 0b01111, 0b10001, 0b10001, 0b10001, 0b01111, 0b00001, 0b00001],
  y: [0b00000, 0b00000, 0b10001, 0b10001, 0b10001, 0b10011, 0b01101, 0b00001, 0b01110],
  // Squared, full-height forms the CG ROM used
  M: [0b10001, 0b11011, 0b10101, 0b10101, 0b10101, 0b10001, 0b10001],
  W: [0b10001, 0b10001, 0b10001, 0b10101, 0b10101, 0b11011, 0b10001],
  S: [0b01110, 0b10001, 0b10000, 0b01110, 0b00001, 0b10001, 0b01110],
  J: [0b00001, 0b00001, 0b00001, 0b00001, 0b00001, 0b10001, 0b01110],
  "0": [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  "1": [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  "2": [0b01110, 0b10001, 0b00001, 0b00010, 0b00100, 0b01000, 0b11111],
  "3": [0b11111, 0b00010, 0b00100, 0b00010, 0b00001, 0b10001, 0b01110],
  "5": [0b11111, 0b10000, 0b11110, 0b00001, 0b00001, 0b10001, 0b01110],
  "6": [0b00111, 0b01000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110],
  "7": [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000],
  "9": [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00010, 0b11100],
  "?": [0b01110, 0b10001, 0b00010, 0b00100, 0b00100, 0b00000, 0b00100],
  "$": [0b00100, 0b01111, 0b10100, 0b01110, 0b00101, 0b11110, 0b00100],
  "&": [0b01000, 0b10100, 0b10100, 0b01000, 0b10101, 0b10010, 0b01101],
  ",": [0b00000, 0b00000, 0b00000, 0b00000, 0b00110, 0b00110, 0b01000],
  ";": [0b00000, 0b01100, 0b01100, 0b00000, 0b01100, 0b01100, 0b01000],
};

const FONTS = {
  modern: { base: FONT_5X7, overrides: null },
  trs80: { base: FONT_5X7, overrides: FONT_TRS80_OVERRIDES },
};

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
    this.fontName = "trs80";
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
   * Load character ROM: real 5x7 glyphs for ASCII (drawn into the 8x12
   * cell), the 2x3 block-graphics set for 128-191, hardware-style folds
   * elsewhere (0x00-0x1F show as 0x40-0x5F; 0xC0-0xFF show as spaces on
   * a machine without the alternate character set).
   */
  loadCharacterROM() {
    const font = FONTS[this.fontName] || FONTS.trs80;
    const charRom = new Array(256);

    for (let i = 0; i < 256; i++) {
      charRom[i] = new Array(12).fill(0x00);
    }

    // Printable ASCII: glyph rows land in cell rows 2-8, descender rows
    // (entries longer than 7) continue into rows 9-10. Bits 6-2 center
    // the 5-wide glyph in the 8-wide cell.
    for (let code = 0x20; code <= 0x7f; code++) {
      const ch = String.fromCharCode(code);
      const glyph =
        (font.overrides && font.overrides[ch]) || font.base[code - 0x20];
      if (!glyph) continue;
      const charData = new Array(12).fill(0x00);
      for (let row = 0; row < glyph.length && row < 9; row++) {
        charData[row + 2] = (glyph[row] & 0x1f) << 2;
      }
      charRom[code] = charData;
    }

    // Control codes display as their 0x40-0x5F fold (Model III char gen)
    for (let code = 0x00; code <= 0x1f; code++) {
      charRom[code] = charRom[code + 0x40].slice();
    }

    // Graphics characters (128-191): 2x3 pixel blocks
    for (let i = 128; i < 192; i++) {
      charRom[i] = this.generateGraphicsChar(i - 128);
    }

    return charRom;
  }

  /**
   * Generate graphics character bitmap for a 2×3 pixel block
   *
   * TRS-80 graphics characters 128-191 encode a 2×3 pixel block using the
   * Level II manual's bit values — CHR$(128 + sum of lit pixels):
   *
   *      +1   +2      ┌─┬─┐
   *      +4   +8      │0│1│  Top row
   *     +16  +32      ├─┼─┤
   *                   │2│3│  Middle row
   *                   ├─┼─┤
   *                   │4│5│  Bottom row
   *                   └─┴─┘
   *
   * - CHR$(129) = top-left pixel on
   * - CHR$(176) = 0xB0 = both bottom pixels — the ROM's blinking cursor,
   *   which is why the real Model III cursor is a low underline block
   * - CHR$(191) = all pixels on
   *
   * @param {number} pattern - 6-bit pattern (0-63)
   * @returns {Array<number>} 12-byte character bitmap
   */
  generateGraphicsChar(pattern) {
    const charData = new Array(12).fill(0x00);

    // Top row (bits 0,1) - rows 0-3
    if (pattern & 0x01) charData[0] |= 0xf0; // Top-left pixel
    if (pattern & 0x02) charData[0] |= 0x0f; // Top-right pixel
    charData[1] = charData[0];
    charData[2] = charData[0];
    charData[3] = charData[0];

    // Middle row (bits 2,3) - rows 4-7
    if (pattern & 0x04) charData[4] |= 0xf0; // Middle-left pixel
    if (pattern & 0x08) charData[4] |= 0x0f; // Middle-right pixel
    charData[5] = charData[4];
    charData[6] = charData[4];
    charData[7] = charData[4];

    // Bottom row (bits 4,5) - rows 8-11
    if (pattern & 0x10) charData[8] |= 0xf0; // Bottom-left pixel
    if (pattern & 0x20) charData[8] |= 0x0f; // Bottom-right pixel
    charData[9] = charData[8];
    charData[10] = charData[8];
    charData[11] = charData[8];

    return charData;
  }

  /**
   * Render the screen from video memory.
   *
   * Builds one ImageData for the whole 512x192 frame in a typed loop —
   * far cheaper than per-pixel fillRect at 60 fps.
   * @param {MemorySystem} memorySystem - Memory system to read from
   */
  renderScreen(memorySystem) {
    if (!this.canvas || !this.ctx) return;

    const width = this.columns * this.charWidth;
    const height = this.rows * this.charHeight;

    if (!this._frame || this._frame.width !== width) {
      this._frame = this.ctx.createImageData(width, height);
      // Pre-parse colors once: "#RRGGBB" -> [r,g,b]
      const hex = (c) => [
        parseInt(c.slice(1, 3), 16),
        parseInt(c.slice(3, 5), 16),
        parseInt(c.slice(5, 7), 16),
      ];
      this._fgRGB = hex(this.fgColor);
      this._bgRGB = hex(this.bgColor);
    }

    const data = this._frame.data;
    const [fr, fg, fb] = this._fgRGB;
    const [br, bg, bb] = this._bgRGB;

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.columns; col++) {
        const charCode = memorySystem.readByte(
          this.videoMemoryStart + row * this.columns + col
        );
        const charData = this.charRom[charCode] || this.charRom[0x20];
        for (let y = 0; y < this.charHeight; y++) {
          const rowBits = charData[y] || 0;
          let offset =
            ((row * this.charHeight + y) * width + col * this.charWidth) * 4;
          for (let x = 0; x < this.charWidth; x++) {
            const on = rowBits & (1 << (7 - x));
            data[offset] = on ? fr : br;
            data[offset + 1] = on ? fg : bg;
            data[offset + 2] = on ? fb : bb;
            data[offset + 3] = 255;
            offset += 4;
          }
        }
      }
    }

    this.ctx.putImageData(this._frame, 0, 0);
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
    const bitPos = pixelY * 2 + pixelX; // +1/+2 top, +4/+8 mid, +16/+32 bottom

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

    const bitPos = pixelY * 2 + pixelX; // +1/+2 top, +4/+8 mid, +16/+32 bottom

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

    const bitPos = pixelY * 2 + pixelX; // +1/+2 top, +4/+8 mid, +16/+32 bottom
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
   * Switch the screen glyph set: "trs80" (chunky, true descenders — the
   * default) or "modern" (crisp). Caller repaints via renderScreen.
   */
  setFont(name) {
    if (!FONTS[name] || name === this.fontName) {
      return false;
    }
    this.fontName = name;
    this.charRom = this.loadCharacterROM();
    return true;
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
