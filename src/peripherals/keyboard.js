/**
 * TRS-80 Model III Keyboard Matrix
 *
 * The keyboard is an 8x8 switch matrix memory-mapped at 0x3800-0x3BFF.
 * Address bits 0-7 select rows; reading returns the OR of every selected
 * row's key bits (bit set = key down). The ROM scans by reading
 * 0x3801, 0x3802, 0x3804 ... 0x3880.
 *
 * Row layout:
 *   row 0: @ A B C D E F G          row 4: 0 1 2 3 4 5 6 7
 *   row 1: H I J K L M N O          row 5: 8 9 : ; , - . /
 *   row 2: P Q R S T U V W          row 6: ENT CLR BRK ↑ ↓ ← → SPC
 *   row 3: X Y Z                    row 7: SHIFT (bit 0), right SHIFT (bit 1)
 *
 * Browser keys are mapped by the character they produce (e.key), with a
 * synthetic SHIFT for characters that live on a shifted TRS-80 key (e.g.
 * `"` is SHIFT+2). Each press is remembered by its physical key (e.code)
 * so keyUp releases exactly the combo keyDown pressed.
 */

const SHIFT = { row: 7, bit: 0 };

function key(row, bit) {
  return [{ row, bit }];
}

function shifted(row, bit) {
  return [{ row, bit }, SHIFT];
}

function buildKeyMap() {
  const map = new Map();

  // Letters: rows 0-3, @ at row 0 bit 0, then A-Z in order.
  // Model III convention: unshifted letter keys type UPPERCASE, and
  // SHIFT+letter types lowercase. Browser lowercase input maps to the
  // bare key; browser uppercase (physically shifted) maps to SHIFT+key,
  // matching the real machine exactly.
  map.set("@", key(0, 0));
  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(0x41 + i); // 'A'...
    const pos = i + 1; // A is row 0 bit 1
    const row = Math.floor(pos / 8);
    const bit = pos % 8;
    map.set(letter.toLowerCase(), key(row, bit));
    map.set(letter, shifted(row, bit));
  }

  // Digits: 0-7 on row 4, 8-9 on row 5 bits 0-1
  for (let d = 0; d <= 7; d++) {
    map.set(String(d), key(4, d));
  }
  map.set("8", key(5, 0));
  map.set("9", key(5, 1));

  // Unshifted punctuation on row 5
  map.set(":", key(5, 2));
  map.set(";", key(5, 3));
  map.set(",", key(5, 4));
  map.set("-", key(5, 5));
  map.set(".", key(5, 6));
  map.set("/", key(5, 7));

  // Shifted symbols per the Level II keyboard legends
  map.set("!", shifted(4, 1));
  map.set('"', shifted(4, 2));
  map.set("#", shifted(4, 3));
  map.set("$", shifted(4, 4));
  map.set("%", shifted(4, 5));
  map.set("&", shifted(4, 6));
  map.set("'", shifted(4, 7));
  map.set("(", shifted(5, 0));
  map.set(")", shifted(5, 1));
  map.set("*", shifted(5, 2));
  map.set("+", shifted(5, 3));
  map.set("<", shifted(5, 4));
  map.set("=", shifted(5, 5));
  map.set(">", shifted(5, 6));
  map.set("?", shifted(5, 7));

  // Control and navigation keys (row 6) and shift (row 7)
  map.set("Enter", key(6, 0));
  map.set("Clear", key(6, 1)); // dedicated CLEAR if the browser reports one
  map.set("Home", key(6, 1)); // common stand-in for CLEAR
  map.set("Escape", key(6, 2)); // BREAK
  map.set("Pause", key(6, 2)); // BREAK on keyboards that have it
  map.set("ArrowUp", key(6, 3));
  map.set("ArrowDown", key(6, 4));
  map.set("ArrowLeft", key(6, 5));
  map.set("Backspace", key(6, 5)); // ← doubles as delete in Level II
  map.set("ArrowRight", key(6, 6));
  map.set(" ", key(6, 7));
  map.set("Shift", [SHIFT]);

  return map;
}

const KEY_MAP = buildKeyMap();

export class KeyboardMatrix {
  constructor() {
    this.rows = new Uint8Array(8);
    // physical key id (e.code) -> combo currently held for it
    this.pressed = new Map();
    this._boundKeyDown = null;
    this._boundKeyUp = null;
    this._element = null;
  }

  /** Row-select read: OR of every row whose select bit is set. */
  read(select) {
    let value = 0;
    let sel = select & 0xff;
    for (let row = 0; row < 8; row++) {
      if (sel & (1 << row)) {
        value |= this.rows[row];
      }
    }
    return value;
  }

  /**
   * Press the combo for a browser key. Returns true if the key maps to
   * the TRS-80 matrix (caller should preventDefault), false otherwise.
   */
  keyDown(browserKey, physicalCode) {
    const combo = KEY_MAP.get(browserKey);
    if (!combo) {
      return false;
    }
    this.pressed.set(physicalCode || browserKey, combo);
    this._rebuild();
    return true;
  }

  /** Release whatever combo the physical key pressed. */
  keyUp(physicalCode) {
    if (!this.pressed.delete(physicalCode)) {
      return false;
    }
    this._rebuild();
    return true;
  }

  /** Directly press a matrix position (used by tests and the system). */
  pressKey(row, bit) {
    this.pressed.set(`matrix:${row}:${bit}`, key(row, bit));
    this._rebuild();
  }

  releaseKey(row, bit) {
    this.pressed.delete(`matrix:${row}:${bit}`);
    this._rebuild();
  }

  reset() {
    this.pressed.clear();
    this.rows.fill(0);
  }

  /** Attach DOM listeners; handled keys are swallowed (preventDefault). */
  attach(element) {
    this.detach();
    this._element = element;
    this._boundKeyDown = (e) => {
      if (this.keyDown(e.key, e.code)) {
        e.preventDefault();
      }
    };
    this._boundKeyUp = (e) => {
      if (this.keyUp(e.code)) {
        e.preventDefault();
      }
    };
    element.addEventListener("keydown", this._boundKeyDown);
    element.addEventListener("keyup", this._boundKeyUp);
  }

  detach() {
    if (this._element) {
      this._element.removeEventListener("keydown", this._boundKeyDown);
      this._element.removeEventListener("keyup", this._boundKeyUp);
      this._element = null;
    }
    this.reset();
  }

  // The matrix is always derived from the full set of held combos, so
  // overlapping synthetic shifts can't get out of sync on release.
  _rebuild() {
    this.rows.fill(0);
    for (const combo of this.pressed.values()) {
      for (const { row, bit } of combo) {
        this.rows[row] |= 1 << bit;
      }
    }
  }
}
