/**
 * Screen layout for the skinless view.
 *
 * The Size select stores one token in localStorage["trs80-scale"]:
 *   "fill"   stretch to the whole stage (default)
 *   "ratio"  largest 4:3 rectangle that fits — the real Model III CRT
 *            showed the 512×192 raster with double-height pixels, so
 *            4:3 is the authentic proportion
 *   "1".."4" fixed 4:3 sizes, 512×384 CSS px per unit
 * Older builds stored "fit"; it means what "fill" means now.
 */

export const SCALE_VALUES = ["fill", "ratio", "1", "1.5", "2", "3", "4"];

export function normalizeScale(value) {
  if (value === "fit") return "fill"; // legacy saved preference
  return SCALE_VALUES.includes(value) ? value : "fill";
}

/**
 * What the DOM layer applies to #crt-well: a data-scale mode for the
 * stylesheet, plus fixed CSS dimensions when a numeric size is chosen.
 */
export function wellLayout(value) {
  const scale = normalizeScale(value);
  if (scale === "fill" || scale === "ratio") {
    return { mode: scale, width: null, height: null };
  }
  const n = parseFloat(scale);
  return {
    mode: "fixed",
    width: `${Math.round(512 * n)}px`,
    height: `${Math.round(384 * n)}px`,
  };
}
