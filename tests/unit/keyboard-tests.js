/**
 * Model III Keyboard Matrix Tests
 *
 * The keyboard is memory-mapped at 0x3800-0x3BFF: the low 8 address bits
 * select matrix rows and a read returns the OR of the selected rows' key
 * bits. The ROM scans by reading 0x3801, 0x3802, 0x3804, ... 0x3880.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { KeyboardMatrix } from "@peripherals/keyboard.js";

describe("KeyboardMatrix - matrix reads", () => {
  let kbd;

  beforeEach(() => {
    kbd = new KeyboardMatrix();
  });

  it("reads 0x00 when no keys are down", () => {
    expect(kbd.read(0x01)).toBe(0x00);
    expect(kbd.read(0xff)).toBe(0x00);
  });

  it("letter A appears in row 0 bit 1", () => {
    kbd.keyDown("a", "KeyA");

    expect(kbd.read(0x01)).toBe(0x02);
    expect(kbd.read(0x02)).toBe(0x00); // other rows unaffected
  });

  it("uppercase letters press SHIFT+key (Model III lowercase convention)", () => {
    // On a real Model III, unshifted typing is uppercase and SHIFT+letter
    // produces lowercase — so shifted browser input carries SHIFT through.
    kbd.keyDown("A", "KeyA");

    expect(kbd.read(0x01)).toBe(0x02); // the A key
    expect(kbd.read(0x80)).toBe(0x01); // with SHIFT held
  });

  it("ENTER appears in row 6 bit 0", () => {
    kbd.keyDown("Enter", "Enter");

    expect(kbd.read(0x40)).toBe(0x01);
  });

  it("digit 1 appears in row 4 bit 1", () => {
    kbd.keyDown("1", "Digit1");

    expect(kbd.read(0x10)).toBe(0x02);
  });

  it("multi-row select ORs the selected rows", () => {
    kbd.keyDown("a", "KeyA"); // row 0 bit 1
    kbd.keyDown("h", "KeyH"); // row 1 bit 0

    expect(kbd.read(0x03)).toBe(0x03);
    expect(kbd.read(0xff)).toBe(0x03);
  });

  it("keyUp releases exactly what keyDown pressed", () => {
    kbd.keyDown("a", "KeyA");
    kbd.keyDown("b", "KeyB");
    kbd.keyUp("KeyA");

    expect(kbd.read(0x01)).toBe(0x04); // only B (bit 2) remains
  });

  it("reset clears all pressed keys", () => {
    kbd.keyDown("a", "KeyA");
    kbd.keyDown("Enter", "Enter");

    kbd.reset();

    expect(kbd.read(0xff)).toBe(0x00);
  });
});

describe("KeyboardMatrix - shifted symbols", () => {
  let kbd;

  beforeEach(() => {
    kbd = new KeyboardMatrix();
  });

  it('double-quote presses SHIFT+2 (row 4 bit 2 + row 7 bit 0)', () => {
    kbd.keyDown('"', "Digit2");

    expect(kbd.read(0x10)).toBe(0x04); // the 2 key
    expect(kbd.read(0x80)).toBe(0x01); // synthetic shift
  });

  it("releasing the symbol releases the synthetic shift too", () => {
    kbd.keyDown('"', "Digit2");
    kbd.keyUp("Digit2");

    expect(kbd.read(0xff)).toBe(0x00);
  });

  it("question mark presses SHIFT+/ (row 5 bit 7)", () => {
    kbd.keyDown("?", "Slash");

    expect(kbd.read(0x20)).toBe(0x80);
    expect(kbd.read(0x80)).toBe(0x01);
  });

  it("colon is an unshifted key of its own (row 5 bit 2)", () => {
    kbd.keyDown(":", "Semicolon");

    expect(kbd.read(0x20)).toBe(0x04);
    expect(kbd.read(0x80)).toBe(0x00); // no shift
  });

  it("unhandled keys report false and leave the matrix unchanged", () => {
    const handled = kbd.keyDown("F5", "F5");

    expect(handled).toBe(false);
    expect(kbd.read(0xff)).toBe(0x00);
  });
});

describe("KeyboardMatrix - special keys", () => {
  let kbd;

  beforeEach(() => {
    kbd = new KeyboardMatrix();
  });

  it("Backspace maps to LEFT ARROW (Level II delete), row 6 bit 5", () => {
    kbd.keyDown("Backspace", "Backspace");

    expect(kbd.read(0x40)).toBe(0x20);
  });

  it("Escape maps to BREAK, row 6 bit 2", () => {
    kbd.keyDown("Escape", "Escape");

    expect(kbd.read(0x40)).toBe(0x04);
  });

  it("Space maps to row 6 bit 7", () => {
    kbd.keyDown(" ", "Space");

    expect(kbd.read(0x40)).toBe(0x80);
  });

  it("physical Shift shows in row 7 bit 0", () => {
    kbd.keyDown("Shift", "ShiftLeft");

    expect(kbd.read(0x80)).toBe(0x01);
  });

  it("pressKey/releaseKey manipulate the matrix directly", () => {
    kbd.pressKey(6, 0); // ENTER

    expect(kbd.read(0x40)).toBe(0x01);

    kbd.releaseKey(6, 0);

    expect(kbd.read(0x40)).toBe(0x00);
  });
});
