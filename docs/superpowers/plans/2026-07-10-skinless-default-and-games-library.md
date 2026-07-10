# Skinless Default View + trsjs Games Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the emulator screen fill the browser window by default (machine skin becomes an opt-in menu toggle), and add eight trsjs.48k.ca games to the built-in library via a new /CMD loader.

**Architecture:** The existing `body.theater` CSS becomes the default styling and a new `body.case` class opts back into the machine skin — pure CSS on the existing 512×192 canvas (no video.js changes). Screen sizing is one Size select (`fill` / `ratio` / numeric) whose mapping lives in a pure, unit-tested module. Games are static files in `public/programs/` loaded through a new `cmd-format.js` (mirroring `cas-format.js`) plus the existing `parseCas`/`fastLoad*` machinery, dispatched by a `kind: "file"` library-entry variant.

**Tech Stack:** Vanilla JS ES modules, Vite (base `./`, aliases `@system`, `@peripherals`), Vitest (jsdom env, tests in `tests/unit` + `tests/integration`), yarn.

## Global Constraints

- Commit messages: descriptive content only — **no Co-Authored-By or any AI-attribution trailer** (user's global git preference).
- The full suite must stay green: `yarn test:run` (334 existing tests).
- Tests read the ROM via `fs.readFileSync(path.resolve(process.cwd(), "public/assets/model3.rom"))` — never fetch.
- `system.cpu.strictMode = true` in tests (unimplemented opcodes throw instead of silently misbehaving).
- Follow existing code style: JSDoc header comments explaining the domain, no semicolon-free style, plain functions, `window.*` globals for UI handlers wired via inline `onclick`.
- localStorage keys in use: `trs80-font`, `trs80-scale`; this plan adds `trs80-case`.

## Verified facts (probed against the real files — do not re-derive)

- `parseCas` **already parses** `seadrag.3bn` (SYSTEM, entry 0x497f, 55 blocks), `timetrek.3bn` (SYSTEM, entry 0x6ff1, 17 blocks), and `invade.cas` (SYSTEM "INVADE", entry 0x5000, 34 blocks), all with 0 checksum errors. **cas-format.js needs no changes.**
- /CMD record walk verified on all four .cmd files: length byte of a type-0x01 load record counts address+data, with lengths 0/1/2 meaning 256/257/258. Expected parse results: `nova-m3.cmd` 33 blocks, entry 0x6393, name "NOVA-M"; `flysauc1.cmd` 17 blocks, entry 0x6c00; `galaxy.cmd` 38 blocks, entry 0xa500; `opus1msg.cmd` 1 block, entry 0x4a00. Trailing bytes after the 0x02 record (flysauc1: 161, galaxy: 85) are ignored.
- `m2.bas` (City Defence) is CRLF ASCII BASIC, 95 lines; lowercase string literals type as uppercase through the keyboard matrix (cosmetic, period-appropriate); nothing is skipped by `typeText`.
- **Retro-Zap is cut** (spec deviation): its .cas has a 0xAA×256 leader and no recognizable BASIC/SYSTEM structure at *any* of the 8 bit alignments — it uses a custom encoder. Reverse-engineering it is out of scope; noted in LICENSE/README credits as excluded.
- OPUS-1 will run silent (sound output is stubbed in this emulator) — its library title says so.

## File Structure

- `src/ui/screen-layout.js` — **new**: pure scale-value → layout mapping (no DOM).
- `src/peripherals/cmd-format.js` — **new**: `parseCmd` + `fastLoadCmd`.
- `src/data/library.js` — game entries (`kind: "file"`) prepended; text entries untouched.
- `src/main.js` — case toggle, scale application, library dispatch, optgroup population.
- `index.html` — CSS inversion (skinless default, `body.case` opt-in), Size options, menu items.
- `public/programs/` — **new**: 8 game files.
- `LICENSE` — second exception paragraph.
- Tests: `tests/unit/screen-layout-tests.js`, `tests/unit/cmd-format-tests.js`, `tests/integration/games-library-tests.js` (all new); `tests/integration/library-tests.js` (filter fix).

---

### Task 1: screen-layout module

**Files:**
- Create: `src/ui/screen-layout.js`
- Test: `tests/unit/screen-layout-tests.js`

**Interfaces:**
- Produces: `normalizeScale(value: string|null) → "fill"|"ratio"|"1"|"1.5"|"2"|"3"|"4"` and `wellLayout(value) → { mode: "fill"|"ratio"|"fixed", width: string|null, height: string|null }`. Task 2's `setScreenScale` consumes both.

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/screen-layout-tests.js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn vitest run tests/unit/screen-layout-tests.js`
Expected: FAIL — cannot resolve `@ui/screen-layout.js`.

- [ ] **Step 3: Write the implementation**

```js
// src/ui/screen-layout.js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn vitest run tests/unit/screen-layout-tests.js`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/ui/screen-layout.js tests/unit/screen-layout-tests.js
git commit -m "feat: pure screen-layout mapping for the Size select"
```

---

### Task 2: skinless default view

**Files:**
- Modify: `index.html` (theater CSS block, machine CSS block, Size select options, MACHINE menu, hint copy)
- Modify: `src/main.js` (`setScreenScale`, saved-scale block in `initEmulator`, `toggleTheaterMode` → `toggleMachineCase`, boot-time case restore)

**Interfaces:**
- Consumes: `normalizeScale`, `wellLayout` from `@ui/screen-layout.js` (Task 1).
- Produces: `window.toggleMachineCase()` (menu onclick), `#crt-well[data-scale]` attribute contract (`fill`/`ratio`/`fixed` + `--scale-w`/`--scale-h` custom props), localStorage `trs80-case`.

- [ ] **Step 1: Replace the theater-mode CSS block in `index.html`**

Delete the whole `/* Theater mode */` block (the comment starting `/* ------------------------- Theater mode` through the `#crt-well[data-fixed-scale] { margin: 0 auto; }` rule, currently lines ~188–242) and the whole `/* The machine */` block through the `@media (max-width: 720px) { ... }` rule (currently lines ~244–445). Replace both with:

```css
      /* --------------------------- The screen ---------------------------
         Default view: the screen IS the page. The stage is black, the
         dev bar stays pinned on top, and the case wrappers (#machine-case,
         #machine-face, #crt-bezel) are size-transparent flex pass-throughs.
         body.case (MACHINE menu → Show machine case) restores the cabinet. */
      #machine-stage {
        flex: 1 1 0;
        min-height: 0;
        overflow: auto;
        display: flex;
        background: #000;
        box-sizing: border-box;
      }
      #machine-case,
      #machine-face,
      #crt-bezel {
        display: flex;
        flex: 1 1 auto;
        min-width: 0;
        min-height: 0;
      }
      #crt-well {
        position: relative;
        overflow: hidden;
        background: #020402;
        margin: auto; /* centers fixed/ratio sizes; lets oversize scroll */
      }
      /* Size select → data-scale on the well (set by setScreenScale) */
      #crt-well[data-scale="fill"] {
        width: 100%;
        height: 100%;
        margin: 0;
      }
      #crt-well[data-scale="ratio"] {
        /* Largest 4:3 rectangle under the ~42px dev bar */
        aspect-ratio: 4 / 3;
        width: min(100%, calc((100vh - 42px) * 1.3333));
      }
      #crt-well[data-scale="fixed"] {
        width: var(--scale-w);
        height: var(--scale-h);
      }
      #emulator-screen {
        display: block;
        width: 100%;
        height: 100%;
        image-rendering: pixelated;
        image-rendering: crisp-edges;
        background: #020402;
        outline: none;
        filter: drop-shadow(0 0 6px rgba(0, 255, 80, 0.35));
      }
      /* Glass: faint scanlines and a corner sheen; purely decorative */
      #crt-glass {
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          repeating-linear-gradient(
            0deg,
            rgba(0, 0, 0, 0.16) 0px,
            rgba(0, 0, 0, 0.16) 1px,
            transparent 1px,
            transparent 3px
          ),
          radial-gradient(
            ellipse at 18% 8%,
            rgba(255, 255, 255, 0.10) 0%,
            transparent 42%
          );
      }
      #drive-column,
      #badge-row,
      #machine-hint {
        display: none;
      }

      /* ------------------------ The machine case ------------------------
         Everything below only applies when the user opts back into the
         cabinet. It reproduces the pre-skinless look. */
      body.case #machine-stage {
        flex-direction: column;
        align-items: center;
        padding: 22px 12px 12px;
        background: none;
      }
      body.case #machine-case {
        display: block;
        flex: none;
        background: linear-gradient(
          172deg,
          var(--tandy-gray-hi) 0%,
          var(--tandy-gray) 38%,
          var(--tandy-gray-lo) 100%
        );
        border-radius: 18px 18px 10px 10px;
        border: 1px solid #5d574e;
        box-shadow:
          0 30px 60px rgba(0, 0, 0, 0.65),
          inset 0 2px 3px rgba(255, 255, 255, 0.35);
        padding: 26px 28px 20px;
        max-width: 1160px;
        width: 100%;
        box-sizing: border-box;
      }
      body.case #machine-face {
        display: grid;
        grid-template-columns: minmax(0, 2.2fr) minmax(140px, 1fr);
        gap: 22px;
        align-items: stretch;
      }
      body.case #crt-bezel {
        display: block;
        flex: none;
        background: linear-gradient(180deg, #26282b 0%, var(--bezel) 60%);
        border-radius: 14px;
        padding: clamp(14px, 3vw, 30px);
        box-shadow:
          inset 0 0 0 2px #000,
          inset 0 4px 10px rgba(0, 0, 0, 0.8),
          0 1px 0 rgba(255, 255, 255, 0.25);
      }
      body.case #crt-well {
        border-radius: 10px;
        margin: 0;
      }
      body.case #crt-glass {
        border-radius: 10px;
      }
      /* In the cabinet the well spans the bezel and the canvas keeps its
         natural 8:3; a numeric size pins the width as before. */
      body.case #crt-well[data-scale="fill"],
      body.case #crt-well[data-scale="ratio"] {
        width: 100%;
        height: auto;
        aspect-ratio: auto;
      }
      body.case #crt-well[data-scale="fixed"] {
        width: min(var(--scale-w), 100%);
        height: auto;
        margin: 0 auto;
      }
      body.case #emulator-screen {
        height: auto;
      }
      body.case #drive-column {
        display: flex;
        flex-direction: column;
        gap: 14px;
        justify-content: flex-start;
        padding-top: 6px;
      }
      .drive-blank {
        height: 64px;
        border-radius: 8px;
        background:
          repeating-linear-gradient(
            180deg,
            #23211e 0px,
            #23211e 6px,
            #1a1816 6px,
            #1a1816 12px
          );
        border: 2px solid #4c463e;
        box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.7);
      }
      body.case #case-vents {
        margin-top: auto;
        display: flex;
        flex-direction: column;
        gap: 5px;
        padding: 8px 6px 0;
      }
      #case-vents span {
        display: block;
        height: 3px;
        border-radius: 2px;
        background: rgba(0, 0, 0, 0.28);
        box-shadow: 0 1px 0 rgba(255, 255, 255, 0.25);
      }
      body.case #badge-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        margin: 16px 2px 2px;
      }
      #trs80-badge {
        background: #111;
        border-radius: 4px;
        padding: 5px 12px 6px;
        display: inline-flex;
        align-items: baseline;
        gap: 10px;
        box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.9),
          0 1px 0 rgba(255, 255, 255, 0.3);
      }
      .badge-trs {
        font-family: Arial, "Helvetica Neue", sans-serif;
        font-weight: 900;
        font-size: 18px;
        letter-spacing: 1px;
        color: #d6d2c8;
      }
      .badge-model {
        font-family: Arial, "Helvetica Neue", sans-serif;
        font-size: 10px;
        letter-spacing: 3px;
        color: #9a958c;
      }
      #emulator-status {
        color: #4c463e;
        font-size: 12px;
        text-align: right;
      }

      #emulator-reset {
        /* The orange RESET key, isolated at the right of the deck */
        background: linear-gradient(180deg, #f07830 0%, var(--reset-orange) 70%, #b04c12 100%);
        color: #241205;
        border: 1px solid #8a3c0e;
        border-bottom-width: 4px;
        border-radius: 6px;
        margin: 0;
        padding: 0 18px;
        height: 40px;
        align-self: flex-start;
        font-family: Arial, "Helvetica Neue", sans-serif;
        font-size: 12px;
        font-weight: 900;
        letter-spacing: 1px;
        cursor: pointer;
      }
      #emulator-reset:hover {
        background: linear-gradient(180deg, #ff8a42 0%, #ef6f24 70%, #b04c12 100%);
      }
      #emulator-reset:active {
        transform: translateY(2px);
        border-bottom-width: 2px;
      }
      #emulator-reset:focus-visible {
        outline: 3px solid #0ff;
        outline-offset: 2px;
      }
      body.case #machine-hint {
        display: block;
        color: #6d675e;
        font-size: 12px;
        max-width: 960px;
        margin: 12px 4px 0;
      }

      @media (max-width: 720px) {
        body.case #machine-face {
          grid-template-columns: 1fr;
        }
        body.case #drive-column {
          flex-direction: row;
          align-items: center;
        }
        body.case .drive-blank {
          flex: 1 1 0;
          height: 40px;
        }
        body.case #case-vents {
          display: none;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        #emulator-reset:active {
          transform: none;
        }
      }
```

Notes for the implementer:
- The `#crt-glass` rule loses its `border-radius: 10px` in the default (square screen); `body.case #crt-glass` restores it.
- The RESET button (`#emulator-reset`) lives inside `#badge-row`, which is hidden by default — resetting without the case is via MACHINE → Reset, which already exists.
- Keep the RESET click listener in main.js as-is (the element still exists).

- [ ] **Step 2: Update the Size select and MACHINE menu in `index.html`**

Size select — replace the `fit` option:

```html
        <label>
          Size
          <select
            id="scale-select"
            onchange="setScreenScale(this.value)"
            aria-label="Screen size"
          >
            <option value="fill" selected>Fill window</option>
            <option value="ratio">Original ratio</option>
            <option value="1">1×</option>
            <option value="1.5">1.5×</option>
            <option value="2">2×</option>
            <option value="3">3×</option>
            <option value="4">4×</option>
          </select>
        </label>
```

MACHINE menu — replace the theater item:

```html
            <button role="menuitem" onclick="toggleMachineCase()">
              <span id="menu-case-label">Show machine case</span>
            </button>
```

Add a Keyboard note at the bottom of `#machine-menu-panel` (after the "Paste BASIC from clipboard" button):

```html
            <div class="menu-separator" role="separator"></div>
            <div class="menu-heading">Keyboard</div>
            <div class="menu-note">
              ENTER at Cass? and Memory Size? reaches READY. ESC is BREAK,
              Backspace deletes. Boots in caps mode — SHIFT+0 unlocks
              lowercase.
            </div>
```

Give the well its initial mode so CSS applies before main.js runs — change the `#crt-well` div:

```html
            <div id="crt-well" data-scale="fill">
```

Update the (case-mode-only) hint paragraph's last sentence: replace
`Full screen lives in the MACHINE menu.` with
`The machine case can be hidden from the MACHINE menu.`

- [ ] **Step 3: Rewire main.js**

Add the import at the top (after the existing imports):

```js
import { normalizeScale, wellLayout } from "./ui/screen-layout.js";
```

Replace `window.setScreenScale` entirely:

```js
// Screen size: "fill" stretches to the window, "ratio" letterboxes at the
// authentic 4:3 CRT proportion, and a numeric scale pins a fixed 4:3 size
// (1× = 512×384 CSS px). Legacy saved "fit" means "fill".
window.setScreenScale = function (value) {
  const scale = normalizeScale(value);
  try {
    localStorage.setItem("trs80-scale", scale);
  } catch {
    // private browsing — preference just won't persist
  }
  const well = document.getElementById("crt-well");
  if (!well) return;
  const layout = wellLayout(scale);
  well.dataset.scale = layout.mode;
  if (layout.mode === "fixed") {
    well.style.setProperty("--scale-w", layout.width);
    well.style.setProperty("--scale-h", layout.height);
  } else {
    well.style.removeProperty("--scale-w");
    well.style.removeProperty("--scale-h");
  }
  const select = document.getElementById("scale-select");
  if (select && select.value !== scale) {
    select.value = scale;
  }
};
```

Replace the saved-scale block in `initEmulator` (the `let savedScale = null; ... }` block) with:

```js
  // Apply the saved screen size ("fit" from older builds means "fill")
  let savedScale = null;
  try {
    savedScale = localStorage.getItem("trs80-scale");
  } catch {
    savedScale = null;
  }
  window.setScreenScale(savedScale);
```

Replace `window.toggleTheaterMode` with:

```js
window.toggleMachineCase = function () {
  const on = document.body.classList.toggle("case");
  try {
    localStorage.setItem("trs80-case", on ? "1" : "0");
  } catch {
    // preference just won't persist
  }
  const label = document.getElementById("menu-case-label");
  if (label) {
    label.textContent = on ? "Hide machine case" : "Show machine case";
  }
  window.toggleMachineMenu(true);
};
```

At the bottom of main.js, just before `window.showEmulatorTab();`, restore the preference:

```js
// Restore the machine-case preference (default: skinless full-window view)
try {
  if (localStorage.getItem("trs80-case") === "1") {
    window.toggleMachineCase();
    window.toggleMachineMenu(true); // toggleMachineCase leaves the menu closed; keep it that way
  }
} catch {
  // default skinless
}
```

(Note: `toggleMachineCase` writes the same value back to localStorage — harmless — and sets the label correctly. If you prefer, inline the classList/label logic instead; either is acceptable, but the label must read "Hide machine case" after restore.)

- [ ] **Step 4: Verify**

Run: `yarn test:run`
Expected: all tests pass (the suite never touches the removed `toggleTheaterMode`).

Run: `yarn dev` (background), then in a browser check:
1. Default: black page, screen fills the window below the dev bar, "Cass?" top-left.
2. Size → Original ratio: 4:3 letterbox, characters twice as tall.
3. Size → 2×: fixed 1024×768 centered block.
4. MACHINE → Show machine case: cabinet returns; reload keeps it; Hide returns to skinless.
5. Reload with devtools localStorage `trs80-scale = "fit"`: select shows "Fill window".

- [ ] **Step 5: Commit**

```bash
git add index.html src/main.js
git commit -m "feat: skinless full-window screen is the default view

The machine cabinet becomes an opt-in (MACHINE menu, persisted). The
Size select gains Fill window / Original ratio (4:3 CRT proportion);
numeric sizes now use the same 4:3 proportion, 512x384 per unit."
```

---

### Task 3: bundle the game files + licensing note

**Files:**
- Create: `public/programs/` (8 files, fetched from trsjs.48k.ca)
- Modify: `LICENSE` (append a second exception)

**Interfaces:**
- Produces: the exact file paths Tasks 4–6 read: `public/programs/{nova-m3.cmd, flysauc1.cmd, galaxy.cmd, opus1msg.cmd, seadrag.3bn, timetrek.3bn, invade.cas, m2.bas}`.

- [ ] **Step 1: Download the files**

```bash
mkdir -p public/programs && cd public/programs
for f in nova-m3.cmd flysauc1.cmd galaxy.cmd opus1msg.cmd seadrag.3bn timetrek.3bn invade.cas m2.bas; do
  curl -sfO "https://trsjs.48k.ca/bin/$f"
done
ls -la
```

Expected sizes (bytes): nova-m3.cmd 8592, flysauc1.cmd 4352, galaxy.cmd 9728, opus1msg.cmd 247, seadrag.3bn 14238, timetrek.3bn 4206, invade.cas 8885, m2.bas 5702. If any download fails or sizes differ wildly, stop and report.

- [ ] **Step 2: Append the LICENSE exception**

After the existing "EXCEPTION - TRS-80 Model III ROM image" paragraph, append:

```
EXCEPTION - Program library game files

The files under public/programs/ are classic TRS-80 software obtained from
George Phillips's trsjs site (https://trsjs.48k.ca/), where they are hosted
for in-browser play: Super Nova and Galaxy Invasion (Big Five Software),
Sea Dragon (Adventure International), Time Trek, Flying Saucers, City
Defence, Invasion Force, and OPUS-1. They are NOT covered by the MIT
license above. These titles circulate freely in the TRS-80 preservation
community, but the emulator contributors claim no rights over them and
cannot grant any; rights remain with their respective holders. They are
included solely so the emulator has period software to run. (Retro-Zap,
also on trsjs, is deliberately not included: its cassette image uses a
custom encoding this emulator's fast-loader does not support.)
```

- [ ] **Step 3: Commit**

```bash
git add public/programs LICENSE
git commit -m "chore: bundle eight trsjs.48k.ca library games with licensing note"
```

---

### Task 4: /CMD loader

**Files:**
- Create: `src/peripherals/cmd-format.js`
- Test: `tests/unit/cmd-format-tests.js`

**Interfaces:**
- Consumes: `public/programs/*.cmd` (Task 3), `TRS80System` (`system.memory.writeByte`, `system.cpu.halted`, `system.cpu.registers.PC`).
- Produces: `parseCmd(bytes: Uint8Array) → { name: string, blocks: {addr:number, data:Uint8Array}[], entry: number }` and `fastLoadCmd(system, parsed) → number` (the entry). Task 5 consumes both.

- [ ] **Step 1: Write the failing tests**

```js
// tests/unit/cmd-format-tests.js
/**
 * TRS-80 DOS /CMD executable parsing. Synthetic images cover the record
 * grammar (including the 0/1/2 → 256/257/258 length quirk); the real
 * bundled games pin the values a correct parser must produce.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { parseCmd, fastLoadCmd } from "@peripherals/cmd-format.js";

function programPath(name) {
  return path.resolve(process.cwd(), "public/programs", name);
}

function buildCmd({ name = null, blocks = [], entry = 0x8000, junkRecord = false }) {
  const out = [];
  if (name) {
    out.push(0x05, name.length, ...name.split("").map((c) => c.charCodeAt(0)));
  }
  if (junkRecord) {
    out.push(0x1f, 3, 0xde, 0xad, 0xbe); // comment-style record: skipped
  }
  for (const b of blocks) {
    const payloadLen = b.data.length + 2;
    out.push(0x01, payloadLen >= 256 ? payloadLen - 256 : payloadLen);
    out.push(b.addr & 0xff, (b.addr >> 8) & 0xff, ...b.data);
  }
  out.push(0x02, 2, entry & 0xff, (entry >> 8) & 0xff);
  return new Uint8Array(out);
}

describe("parseCmd — synthetic images", () => {
  it("parses name, load blocks, and entry", () => {
    const bytes = buildCmd({
      name: "TEST",
      blocks: [{ addr: 0x6000, data: [0xaa, 0xbb, 0xcc] }],
      entry: 0x1234,
    });
    const parsed = parseCmd(bytes);
    expect(parsed.name).toBe("TEST");
    expect(parsed.entry).toBe(0x1234);
    expect(parsed.blocks).toHaveLength(1);
    expect(parsed.blocks[0].addr).toBe(0x6000);
    expect([...parsed.blocks[0].data]).toEqual([0xaa, 0xbb, 0xcc]);
  });

  it("treats load-record lengths 0/1/2 as 256/257/258", () => {
    // 254 data bytes + 2 addr bytes = 256 → length byte 0x00
    const data254 = Array.from({ length: 254 }, (_, i) => i & 0xff);
    const parsed = parseCmd(buildCmd({ blocks: [{ addr: 0x5200, data: data254 }] }));
    expect(parsed.blocks[0].data).toHaveLength(254);
    // 256 data bytes + 2 addr = 258 → length byte 0x02
    const data256 = Array.from({ length: 256 }, () => 0x42);
    const parsed2 = parseCmd(buildCmd({ blocks: [{ addr: 0x5200, data: data256 }] }));
    expect(parsed2.blocks[0].data).toHaveLength(256);
  });

  it("skips unknown record types", () => {
    const parsed = parseCmd(
      buildCmd({ junkRecord: true, blocks: [{ addr: 0x7000, data: [1] }] })
    );
    expect(parsed.blocks).toHaveLength(1);
  });

  it("rejects images with no entry record", () => {
    const noEntry = new Uint8Array([0x01, 0x03, 0x00, 0x60, 0xaa]);
    expect(() => parseCmd(noEntry)).toThrow(/transfer-address/);
  });

  it("rejects empty/truncated input", () => {
    expect(() => parseCmd(new Uint8Array(0))).toThrow(/too short/);
  });
});

describe("parseCmd — real bundled games", () => {
  const expected = [
    ["nova-m3.cmd", { blocks: 33, entry: 0x6393, name: "NOVA-M" }],
    ["flysauc1.cmd", { blocks: 17, entry: 0x6c00 }],
    ["galaxy.cmd", { blocks: 38, entry: 0xa500 }],
    ["opus1msg.cmd", { blocks: 1, entry: 0x4a00 }],
  ];
  for (const [file, want] of expected) {
    it(`${file}: ${want.blocks} blocks, entry 0x${want.entry.toString(16)}`, () => {
      const bytes = new Uint8Array(fs.readFileSync(programPath(file)));
      const parsed = parseCmd(bytes);
      expect(parsed.blocks).toHaveLength(want.blocks);
      expect(parsed.entry).toBe(want.entry);
      if (want.name) expect(parsed.name).toBe(want.name);
    });
  }
});

describe("fastLoadCmd", () => {
  it("writes blocks into memory and jumps to the entry", () => {
    const fakeMemory = new Map();
    const system = {
      memory: { writeByte: (a, v) => fakeMemory.set(a, v) },
      cpu: { halted: true, registers: { PC: 0 } },
    };
    const parsed = {
      name: "",
      blocks: [{ addr: 0x6000, data: new Uint8Array([0x11, 0x22]) }],
      entry: 0x6000,
    };
    expect(fastLoadCmd(system, parsed)).toBe(0x6000);
    expect(fakeMemory.get(0x6000)).toBe(0x11);
    expect(fakeMemory.get(0x6001)).toBe(0x22);
    expect(system.cpu.registers.PC).toBe(0x6000);
    expect(system.cpu.halted).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn vitest run tests/unit/cmd-format-tests.js`
Expected: FAIL — cannot resolve `@peripherals/cmd-format.js`.

- [ ] **Step 3: Write the implementation**

```js
// src/peripherals/cmd-format.js
/**
 * TRS-80 DOS /CMD executable handling
 *
 * A /CMD file is a stream of records: [type][length][payload…]. The
 * types honored here:
 *
 *   0x01  object-code block   payload: addr.lo addr.hi data…
 *                             For this type the length byte counts the
 *                             address AND data bytes, with the quirk
 *                             that 0, 1 and 2 mean 256, 257 and 258
 *                             (a block always carries the 2 address
 *                             bytes plus at least one data byte).
 *   0x02  transfer address    payload: entry.lo entry.hi — ends the load
 *   0x05  module name         payload: ASCII name
 *   other                     skipped by their length byte (comments,
 *                             patch and directory records)
 *
 * Fast-loading writes the blocks straight into RAM and jumps to the
 * entry point — the same hand-off TRSDOS performs — so tape/disk-era
 * machine-language games run with no DOS resident.
 */

/**
 * Parse a /CMD byte stream.
 * @returns {{name:string, blocks:{addr:number,data:Uint8Array}[], entry:number}}
 */
export function parseCmd(bytes) {
  if (!bytes || bytes.length < 4) {
    throw new Error("Not a /CMD image: too short");
  }
  const blocks = [];
  let entry = null;
  let name = "";
  let i = 0;

  while (i + 1 < bytes.length) {
    const type = bytes[i++];
    let len = bytes[i++];
    if (type === 0x01) {
      if (len < 3) len += 256; // 0,1,2 mean 256,257,258
      if (i + len > bytes.length) {
        throw new Error("Truncated /CMD load block");
      }
      const addr = bytes[i] | (bytes[i + 1] << 8);
      blocks.push({ addr, data: new Uint8Array(bytes.slice(i + 2, i + len)) });
      i += len;
    } else if (type === 0x02) {
      entry = bytes[i] | (bytes[i + 1] << 8);
      break; // transfer address ends the load; trailing bytes are ignored
    } else if (type === 0x05) {
      name = String.fromCharCode(...bytes.slice(i, i + len)).trimEnd();
      i += len;
    } else {
      i += len; // unknown record: skip its payload
    }
  }

  if (entry === null) {
    throw new Error("/CMD image has no transfer-address (0x02) record");
  }
  if (blocks.length === 0) {
    throw new Error("/CMD image has no load blocks");
  }
  return { name, blocks, entry };
}

/**
 * Fast-load a parsed /CMD: write every block and jump to the entry point.
 */
export function fastLoadCmd(system, parsed) {
  for (const block of parsed.blocks) {
    for (let i = 0; i < block.data.length; i++) {
      system.memory.writeByte((block.addr + i) & 0xffff, block.data[i]);
    }
  }
  system.cpu.halted = false;
  system.cpu.registers.PC = parsed.entry;
  return parsed.entry;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `yarn vitest run tests/unit/cmd-format-tests.js`
Expected: PASS (10 tests, including the four real-file cases).

- [ ] **Step 5: Commit**

```bash
git add src/peripherals/cmd-format.js tests/unit/cmd-format-tests.js
git commit -m "feat: /CMD executable parser and fast-loader"
```

---

### Task 5: library entries + menu dispatch

**Files:**
- Modify: `src/data/library.js` (game entries at the top)
- Modify: `src/main.js` (imports, library population with optgroups, `menuLoadLibrary` dispatch)
- Modify: `tests/integration/library-tests.js` (skip file entries)

**Interfaces:**
- Consumes: `parseCmd`/`fastLoadCmd` (Task 4), `parseCas`/`fastLoadBasic`/`fastLoadSystem` (existing), files from Task 3.
- Produces: LIBRARY entry shape `{ id, title, group?: "Games", kind?: "file", file?: string, format?: "cmd"|"cas"|"bas", expect?, text? }`. Existing text entries stay untouched (no `kind` = text). Task 6 consumes the same files directly.

- [ ] **Step 1: Add game entries to `src/data/library.js`**

Update the file's header comment first paragraph to:

```js
/**
 * Built-in program library.
 *
 * Two entry kinds:
 *   kind "file" — a binary/text program under public/programs/ fetched on
 *   demand: format "cmd" (DOS executable), "cas" (cassette image, BASIC
 *   or SYSTEM — .3bn SYSTEM-block images parse the same way), or "bas"
 *   (ASCII source that gets turbo-typed). These are the trsjs.48k.ca
 *   games; see the LICENSE exception about their copyright status.
 *
 *   kind absent (text) — public-domain classics in Level II-safe BASIC
 *   (no ELSE, uppercase, RND(n) integer form), compact adaptations in
 *   the spirit of David Ahl's "BASIC Computer Games" (Ahl released his
 *   books to the public domain). Each entry is plain text that gets
 *   turbo-typed into the real ROM — the machine tokenizes it itself.
 *
 * `expect` is a string the program prints early, used by the headless
 * library test to prove the program loads and runs.
 */
```

Then insert at the top of the LIBRARY array, before the hammurabi entry:

```js
  // ---- Games from trsjs.48k.ca (see LICENSE exception) ----
  {
    id: "supernova",
    title: "Super Nova (Big Five, 1980)",
    group: "Games",
    kind: "file",
    file: "/programs/nova-m3.cmd",
    format: "cmd",
    note: "Press CLEAR (Home key) to start",
  },
  {
    id: "galaxy-invasion",
    title: "Galaxy Invasion (Big Five, 1980)",
    group: "Games",
    kind: "file",
    file: "/programs/galaxy.cmd",
    format: "cmd",
  },
  {
    id: "flying-saucers",
    title: "Flying Saucers (1980)",
    group: "Games",
    kind: "file",
    file: "/programs/flysauc1.cmd",
    format: "cmd",
  },
  {
    id: "sea-dragon",
    title: "Sea Dragon (Adventure Intl, 1982)",
    group: "Games",
    kind: "file",
    file: "/programs/seadrag.3bn",
    format: "cas",
  },
  {
    id: "time-trek",
    title: "Time Trek (1980)",
    group: "Games",
    kind: "file",
    file: "/programs/timetrek.3bn",
    format: "cas",
  },
  {
    id: "invasion-force",
    title: "Invasion Force (1979)",
    group: "Games",
    kind: "file",
    file: "/programs/invade.cas",
    format: "cas",
  },
  {
    id: "city-defence",
    title: "City Defence (BASIC, ~20 s to type in)",
    group: "Games",
    kind: "file",
    file: "/programs/m2.bas",
    format: "bas",
  },
  {
    id: "opus1",
    title: "OPUS-1 (cassette music — silent: no sound yet)",
    group: "Games",
    kind: "file",
    file: "/programs/opus1msg.cmd",
    format: "cmd",
  },
```

- [ ] **Step 2: Populate the select with optgroups (main.js)**

In `initEmulator`, replace the library-picker population block:

```js
  // Populate the library picker: games first, then the BASIC classics
  const librarySelect = document.getElementById("library-select");
  if (librarySelect && librarySelect.childElementCount === 0) {
    const groups = new Map(); // label -> <optgroup>
    for (const entry of LIBRARY) {
      const label = entry.group || "BASIC classics";
      if (!groups.has(label)) {
        const optgroup = document.createElement("optgroup");
        optgroup.label = label;
        librarySelect.appendChild(optgroup);
        groups.set(label, optgroup);
      }
      const option = document.createElement("option");
      option.value = entry.id;
      option.textContent = entry.title;
      groups.get(label).appendChild(option);
    }
  }
```

- [ ] **Step 3: Dispatch on entry kind (main.js)**

Add to the imports: `parseCmd, fastLoadCmd` from `"./peripherals/cmd-format.js"` (the cas-format functions are already imported — verify; if not, extend that import too).

Replace `window.menuLoadLibrary` with:

```js
window.menuLoadLibrary = async function () {
  window.toggleMachineMenu(true);
  if (!emulator.system) return;
  const select = document.getElementById("library-select");
  const entry = LIBRARY.find((e) => e.id === select?.value);
  if (!entry) return;
  if (entry.kind === "file") {
    await loadLibraryFile(entry);
    return;
  }
  setEmulatorStatus(`Typing "${entry.title}" into BASIC…`);
  await new Promise((r) => setTimeout(r, 30)); // let the status paint
  emulator.system.typeText("NEW\n");
  emulator.system.typeText(entry.text);
  emulator.system.typeText("RUN\n");
  setEmulatorStatus(`${entry.title} — running`);
};

// Fetch a public/programs file and load it by format. ML programs jump
// straight to their entry; BASIC ones get an auto-RUN.
async function loadLibraryFile(entry) {
  setEmulatorStatus(`Fetching ${entry.title}…`);
  let bytes;
  try {
    const response = await fetch(entry.file);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    bytes = new Uint8Array(await response.arrayBuffer());
  } catch (err) {
    setEmulatorStatus(`Could not fetch ${entry.title}: ${err.message}`);
    return;
  }
  try {
    if (entry.format === "cmd") {
      fastLoadCmd(emulator.system, parseCmd(bytes));
      setEmulatorStatus(
        `${entry.title} — running${entry.note ? ` (${entry.note})` : ""}`
      );
    } else if (entry.format === "cas") {
      const parsed = parseCas(bytes);
      if (parsed.kind === "basic") {
        fastLoadBasic(emulator.system, parsed);
        emulator.system.typeText("RUN\n");
      } else {
        fastLoadSystem(emulator.system, parsed);
      }
      const warn = parsed.checksumErrors
        ? ` (${parsed.checksumErrors} checksum errors)`
        : "";
      setEmulatorStatus(`${entry.title} — running${warn}`);
    } else if (entry.format === "bas") {
      const text = new TextDecoder()
        .decode(bytes)
        .replace(/\r\n?/g, "\n");
      setEmulatorStatus(`Typing ${entry.title}… (the tab freezes while it types)`);
      await new Promise((r) => setTimeout(r, 30)); // let the status paint
      emulator.system.typeText("NEW\n");
      emulator.system.typeText(text.endsWith("\n") ? text : text + "\n");
      emulator.system.typeText("RUN\n");
      setEmulatorStatus(`${entry.title} — running`);
    } else {
      setEmulatorStatus(`Unknown library format "${entry.format}"`);
    }
  } catch (err) {
    setEmulatorStatus(`Could not load ${entry.title}: ${err.message}`);
  }
}
```

- [ ] **Step 4: Keep the existing library test honest**

In `tests/integration/library-tests.js`, change the loop header:

```js
  for (const entry of LIBRARY.filter((e) => e.kind !== "file")) {
```

(File entries are covered by Task 6's integration tests; this suite is specifically "text entries survive the ROM tokenizer".)

- [ ] **Step 5: Run the suite**

Run: `yarn test:run`
Expected: PASS — same green as before plus Task 1/4 tests; library-tests still runs every text entry.

- [ ] **Step 6: Commit**

```bash
git add src/data/library.js src/main.js tests/integration/library-tests.js
git commit -m "feat: trsjs games in the library menu with format dispatch"
```

---

### Task 6: games integration tests

**Files:**
- Test: `tests/integration/games-library-tests.js`

**Interfaces:**
- Consumes: files from Task 3, `parseCmd`/`fastLoadCmd` (Task 4), `parseCas`/`fastLoadBasic`/`fastLoadSystem` (existing), `TRS80System`.

- [ ] **Step 1: Write the tests**

```js
// tests/integration/games-library-tests.js
/**
 * Bundled Games Acceptance Tests
 *
 * Every game shipped in public/programs/ must load through its real
 * loader path and visibly take over the machine: fast-load, run a
 * stretch of emulated time, and require that the CPU is alive and the
 * screen no longer shows the BASIC READY banner. strictMode makes any
 * unimplemented opcode a hard failure rather than silent corruption.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, beforeEach } from "vitest";
import { TRS80System } from "@system/trs80-system.js";
import {
  parseCas,
  fastLoadBasic,
  fastLoadSystem,
} from "@peripherals/cas-format.js";
import { parseCmd, fastLoadCmd } from "@peripherals/cmd-format.js";

const romData = new Uint8Array(
  fs.readFileSync(path.resolve(process.cwd(), "public/assets/model3.rom"))
);

function programBytes(name) {
  return new Uint8Array(
    fs.readFileSync(path.resolve(process.cwd(), "public/programs", name))
  );
}

function bootToReady(system) {
  const pressEnter = () => {
    system.keyboard.keyDown("Enter", "boot");
    system.runTStates(200000);
    system.keyboard.keyUp("boot");
    system.runTStates(100000);
  };
  system.runSeconds(1);
  pressEnter();
  system.runSeconds(0.5);
  pressEnter();
  system.runSeconds(2);
  if (!system.screenText().join("\n").includes("READY")) {
    throw new Error("Machine did not reach READY");
  }
}

describe("Bundled games load and run on the real ROM", () => {
  let system;

  beforeEach(() => {
    system = new TRS80System({ romData });
    system.cpu.strictMode = true;
    system.reset();
    bootToReady(system);
  });

  const ML_GAMES = [
    ["nova-m3.cmd", "cmd", 0x6393],
    ["flysauc1.cmd", "cmd", 0x6c00],
    ["galaxy.cmd", "cmd", 0xa500],
    ["opus1msg.cmd", "cmd", 0x4a00],
    ["seadrag.3bn", "cas", 0x497f],
    ["timetrek.3bn", "cas", 0x6ff1],
    ["invade.cas", "cas", 0x5000],
  ];

  for (const [file, format, entry] of ML_GAMES) {
    it(`${file} fast-loads and takes over the machine`, () => {
      const before = system.screenText().join("\n");
      const bytes = programBytes(file);
      if (format === "cmd") {
        const parsed = parseCmd(bytes);
        expect(parsed.entry).toBe(entry);
        fastLoadCmd(system, parsed);
      } else {
        const parsed = parseCas(bytes);
        expect(parsed.kind).toBe("system");
        expect(parsed.entry).toBe(entry);
        expect(parsed.checksumErrors).toBe(0);
        fastLoadSystem(system, parsed);
      }
      system.runSeconds(1);

      expect(system.cpu.halted).toBe(false);
      const after = system.screenText().join("\n");
      expect(after).not.toBe(before); // the game drew something
      expect(after).not.toContain("READY"); // BASIC is gone
    });
  }

  it(
    "m2.bas (City Defence) turbo-types and RUNs",
    () => {
      const text = new TextDecoder()
        .decode(programBytes("m2.bas"))
        .replace(/\r\n?/g, "\n");
      system.typeText("NEW\n");
      const skipped = system.typeText(text);
      system.typeText("RUN\n");
      system.runSeconds(0.5);

      const screen = system.screenText().join("\n");
      expect(skipped).toBe(0);
      expect(screen).not.toContain("?SN");
      expect(screen).toContain("CITY DEFENCE");
    },
    240000
  );
});
```

- [ ] **Step 2: Run the tests**

Run: `yarn vitest run tests/integration/games-library-tests.js`
Expected: PASS (8 tests). Contingencies, in order of likelihood:
- **Unimplemented-opcode throw from strictMode** (the July audit notes RLD/RRD are missing): the error names the opcode. Implement it in `src/core/z80cpu.js` following the neighboring opcode implementations, add a CPU unit test for it in the matching `tests/unit/cpu-*.js` file, and re-run. Do not weaken the game test.
- **City Defence screen timing**: if "CITY DEFENCE" is absent because the program already reached its `CLS` at line 146, lower `runSeconds(0.5)` to `runSeconds(0.2)`; if it's absent because typing didn't finish, the `?SN`/skipped assertions will say so instead. The 240 s vitest timeout covers the ~5.7 KB turbo-type.
- **A game idles at a title screen waiting for a key**: that still satisfies the assertions (screen changed, no READY) — no action needed.

- [ ] **Step 3: Run the whole suite**

Run: `yarn test:run`
Expected: PASS, all files.

- [ ] **Step 4: Commit**

```bash
git add tests/integration/games-library-tests.js
git commit -m "test: bundled games boot headlessly on the real ROM"
```

---

### Task 7: end-to-end verification, README, spec deviations

**Files:**
- Modify: `README.md` (default-view description + games list/credit)
- Modify: `docs/superpowers/specs/2026-07-10-skinless-default-and-games-library-design.md` (deviations note)

- [ ] **Step 1: Full suite + production build**

```bash
yarn test:run && yarn build
```
Expected: tests green; build completes; `dist/programs/` contains the 8 game files (Vite copies `public/` verbatim).

- [ ] **Step 2: Live verification with screenshots**

Start `yarn dev` in the background. Using the viewcap MCP server (user's standard for screenshots), capture at `http://localhost:3000`:
1. Default view (skinless, screen filling the window, "Cass?" visible).
2. Size → Original ratio (4:3 letterbox).
3. MACHINE → Show machine case (cabinet restored).
4. Library → Super Nova, Load & run (title screen).
5. Library → Galaxy Invasion, Load & run (title screen).
Boot prompts: press ENTER twice (Cass?, Memory Size?) before loading games. Confirm no console errors. Stop the dev server.

- [ ] **Step 3: README**

Update the interface/features section: default view is a full-window screen (Fill window / Original ratio / fixed sizes in the dev bar; machine case available from the MACHINE menu), and the library includes eight classic games from trsjs.48k.ca (credit George Phillips's site; see LICENSE exceptions).

- [ ] **Step 4: Record spec deviations**

Append to the spec document:

```markdown
## Deviations discovered during implementation (2026-07-10)

- Retro-Zap is not bundled: its .cas uses a custom encoding (0xAA leader,
  no BASIC/SYSTEM structure at any bit alignment). Eight titles ship.
- cas-format.js needed no changes: seadrag.3bn, timetrek.3bn and
  invade.cas all parse with the existing leader handling (verified
  against the real files).
- City Defence loads as a fetched "bas"-format file entry rather than an
  inline text entry — same turbo-type mechanism, single source of truth
  in public/programs/m2.bas.
```

- [ ] **Step 5: Commit**

```bash
git add README.md docs/superpowers/specs/2026-07-10-skinless-default-and-games-library-design.md
git commit -m "docs: README covers the full-window view and games library"
```
