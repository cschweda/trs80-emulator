/**
 * Touch / soft-keyboard input for the TRS-80
 *
 * Phones have no physical keyboard and never fire the key events the
 * desktop path relies on. Instead:
 *
 *  - Tapping the screen focuses a visually-hidden <input>, which makes
 *    the OS open its soft keyboard. Its beforeinput events (insertText /
 *    insertLineBreak / deleteContentBackward) are translated to TRS-80
 *    matrix presses; the input itself stays empty.
 *  - An on-screen strip supplies the keys soft keyboards lack (BREAK,
 *    CLEAR, arrows, ENTER) with press-and-hold semantics.
 *
 * The ROM scans and debounces the matrix, so a key must stay down for a
 * few passes and be released before the next press of the same key.
 * TouchTyper serializes soft-keyboard characters through that timing.
 */

const HOLD_MS = 90; // long enough for the ROM's scan + debounce
const GAP_MS = 40; // matrix fully clear between characters

/**
 * Paces a stream of characters through press/release callbacks so each
 * registers exactly once. press(key, code) must return true when the key
 * maps to the matrix; release(code) releases whatever that press held.
 */
export class TouchTyper {
  constructor({ press, release, holdMs = HOLD_MS, gapMs = GAP_MS }) {
    this.press = press;
    this.release = release;
    this.holdMs = holdMs;
    this.gapMs = gapMs;
    this.queue = [];
    this.busy = false;
    this.seq = 0;
  }

  /** Queue a browser key name ("A", "Enter", "Backspace", ...). */
  enqueue(key) {
    this.queue.push(key);
    this._drain();
  }

  enqueueText(text) {
    for (const ch of text) {
      this.enqueue(ch === "\n" ? "Enter" : ch);
    }
  }

  _drain() {
    if (this.busy || this.queue.length === 0) return;
    const key = this.queue.shift();
    const code = `touch:${this.seq++}`;
    if (!this.press(key, code)) {
      this._drain(); // unmappable characters are skipped
      return;
    }
    this.busy = true;
    setTimeout(() => {
      this.release(code);
      setTimeout(() => {
        this.busy = false;
        this._drain();
      }, this.gapMs);
    }, this.holdMs);
  }
}

/**
 * Wire the hidden input and the on-screen key strip.
 * @param {object} options
 * @param {HTMLElement} options.input - visually-hidden text input
 * @param {HTMLElement} options.tapTarget - tapping this focuses the input
 * @param {HTMLElement} options.keysBar - container of [data-tkey] buttons
 * @param {Function} options.press - matrixPress(key, code) -> boolean
 * @param {Function} options.release - matrixRelease(code)
 * @returns {TouchTyper} the typer (exposed for tests/tooling)
 */
export function setupTouchInput({ input, tapTarget, keysBar, press, release }) {
  const typer = new TouchTyper({ press, release });

  if (input) {
    input.addEventListener("beforeinput", (e) => {
      e.preventDefault();
      if (e.inputType === "insertText" && e.data) {
        typer.enqueueText(e.data);
      } else if (e.inputType === "insertLineBreak") {
        typer.enqueue("Enter");
      } else if (e.inputType === "deleteContentBackward") {
        typer.enqueue("Backspace");
      }
    });
    // Some keyboards (and BT keyboards routed at the input) deliver
    // these only as key events.
    input.addEventListener("keydown", (e) => {
      const direct = [
        "Enter",
        "Backspace",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Escape",
      ];
      if (direct.includes(e.key)) {
        e.preventDefault();
        typer.enqueue(e.key);
      }
    });
    // Belt and braces: whatever slips through stays out of the field
    input.addEventListener("input", () => {
      input.value = "";
    });
  }

  if (tapTarget && input) {
    tapTarget.addEventListener("pointerup", (e) => {
      if (e.pointerType === "touch") {
        input.focus({ preventScroll: true });
      }
    });
  }

  if (keysBar) {
    for (const button of keysBar.querySelectorAll("[data-tkey]")) {
      const key = button.dataset.tkey;
      const code = `touchbar:${key}`;
      const down = (e) => {
        e.preventDefault();
        press(key, code);
      };
      const up = (e) => {
        e.preventDefault();
        release(code);
      };
      button.addEventListener("pointerdown", down);
      button.addEventListener("pointerup", up);
      button.addEventListener("pointercancel", up);
      button.addEventListener("pointerleave", up);
    }
    const summon = keysBar.querySelector("[data-summon-keyboard]");
    if (summon && input) {
      summon.addEventListener("click", (e) => {
        e.preventDefault();
        input.focus({ preventScroll: true });
      });
    }
  }

  return typer;
}
