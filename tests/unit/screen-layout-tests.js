/**
 * Screen layout mapping: the Size select's value decides how the
 * phosphor screen sits in the window. Pure logic — the DOM layer in
 * main.js applies the result.
 */
import { describe, it, expect } from "vitest";
import { normalizeScale, wellLayout } from "@ui/screen-layout.js";

describe("normalizeScale", () => {
  it("maps the legacy saved 'fit' to fill", () => {
    expect(normalizeScale("fit")).toBe("fill");
  });
  it("passes known values through", () => {
    for (const v of ["fill", "ratio", "1", "1.5", "2", "3", "4"]) {
      expect(normalizeScale(v)).toBe(v);
    }
  });
  it("defaults null/undefined/junk to fill", () => {
    expect(normalizeScale(null)).toBe("fill");
    expect(normalizeScale(undefined)).toBe("fill");
    expect(normalizeScale("9")).toBe("fill");
    expect(normalizeScale("banana")).toBe("fill");
  });
});

describe("wellLayout", () => {
  it("fill and ratio carry no fixed dimensions", () => {
    expect(wellLayout("fill")).toEqual({ mode: "fill", width: null, height: null });
    expect(wellLayout("ratio")).toEqual({ mode: "ratio", width: null, height: null });
  });
  it("numeric scales pin 4:3 CRT dimensions (512×384 per unit)", () => {
    expect(wellLayout("1")).toEqual({ mode: "fixed", width: "512px", height: "384px" });
    expect(wellLayout("1.5")).toEqual({ mode: "fixed", width: "768px", height: "576px" });
    expect(wellLayout("2")).toEqual({ mode: "fixed", width: "1024px", height: "768px" });
    expect(wellLayout("4")).toEqual({ mode: "fixed", width: "2048px", height: "1536px" });
  });
  it("normalizes before mapping (legacy 'fit' → fill)", () => {
    expect(wellLayout("fit").mode).toBe("fill");
  });
});
