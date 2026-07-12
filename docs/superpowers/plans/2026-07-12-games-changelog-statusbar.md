# Games Expansion, Changelog + Status Bar, 2× Default — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship v1.3.0: 14 new library games (9 archive binaries, 5 BASIC type-ins, Super Star Trek as a ROM-tokenized .cas), a backfilled CHANGELOG.md rendered in-app from a new bottom status bar (with GitHub link), and a 2× default screen size.

**Architecture:** Games are static files in `public/programs/` described by `src/data/library.js` and verified by real-ROM headless acceptance tests. The changelog is one markdown file imported via Vite `?raw` and rendered by a dependency-free mini-renderer into a modal. The status bar is a static footer wired to that modal. All new binaries are vetted through a new probe script before promotion.

**Tech Stack:** Vanilla JS (ES modules), Vite 5, Vitest (jsdom env), yarn. No new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-07-12-games-changelog-statusbar-design.md`

## Global Constraints

- Commit messages: conventional prefixes (`feat:`, `fix:`, `chore:`, `docs:`, `test:`), **no AI co-author trailers of any kind** (user's global rule).
- Package manager is **yarn** (`yarn test:run`, never npm).
- Run a single test file with: `yarn test:run tests/path/file.js`.
- New BASIC programs follow house style (see `src/data/library.js` header): uppercase only, `RND(n)` integer form (`RND(0)` only where a float is required), no `ELSE`, Level II-safe.
- Library `text` entries MUST have an `expect` string that the program PRINTs on its first screen (the acceptance test asserts it).
- Every new binary in `public/programs/` MUST have a row in `tests/integration/games-library-tests.js` and an entry in `src/data/library.js`.
- Game downloads happen in the scratch dir `/private/tmp/claude-501/-Volumes-satechi-webdev-trs80-emulator/ab302f0d-3648-4282-a5c5-06e4c7104b02/scratchpad` (referred to as `$SCRATCH` below), never in the repo.
- The dev server/build must keep working: `yarn build` runs `scripts/render-docs.js && vite build && scripts/postbuild.js`.
- GitHub repo URL: `https://github.com/cschweda/trs80-emulator`.

---

### Task 1: Default screen size 2×

**Files:**
- Modify: `tests/unit/screen-layout-tests.js:19-24` (the "defaults null/undefined/junk" test)
- Modify: `src/ui/screen-layout.js:13-18`
- Modify: `index.html:910-917` (Size select options)

**Interfaces:**
- Consumes: `normalizeScale(value)` from `@ui/screen-layout.js`.
- Produces: `normalizeScale(null|undefined|junk) === "2"`. No other signature changes; `"fit"` still maps to `"fill"`.

- [ ] **Step 1: Change the fallback test to expect "2"**

In `tests/unit/screen-layout-tests.js`, replace the existing fallback test:

```js
  it("defaults null/undefined/junk to 2x", () => {
    expect(normalizeScale(null)).toBe("2");
    expect(normalizeScale(undefined)).toBe("2");
    expect(normalizeScale("9")).toBe("2");
    expect(normalizeScale("banana")).toBe("2");
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn test:run tests/unit/screen-layout-tests.js`
Expected: FAIL — `expected 'fill' to be '2'` (three assertions).

- [ ] **Step 3: Change the fallback in screen-layout.js**

In `src/ui/screen-layout.js`, the comment on line 5 and `normalizeScale`:

```js
 *   "fill"   stretch to the whole stage
```
(drop the `(default)` note from the "fill" line, and)

```js
export function normalizeScale(value) {
  if (value === "fit") return "fill"; // legacy saved preference
  return SCALE_VALUES.includes(value) ? value : "2";
}
```

Add above the function a one-line doc note: `Unset/unknown values fall back to "2" — the default for fresh visitors.`

- [ ] **Step 4: Move the `selected` attribute in index.html**

In the Size select (`index.html`), change:

```html
            <option value="fill" selected>Fill window</option>
```
to
```html
            <option value="fill">Fill window</option>
```
and
```html
            <option value="2">2×</option>
```
to
```html
            <option value="2" selected>2×</option>
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `yarn test:run tests/unit/screen-layout-tests.js`
Expected: PASS (all tests).

Sanity-check the select wiring: `src/ui/emulator-ui.js:135` calls `window.setScreenScale(savedScale)` where `savedScale` comes from `localStorage["trs80-scale"]` through `normalizeScale` — fresh visitors (no stored value) now resolve to `"2"`, and the select's `selected` attr matches before JS runs.

- [ ] **Step 6: Commit**

```bash
git add tests/unit/screen-layout-tests.js src/ui/screen-layout.js index.html
git commit -m "feat: default screen size is 2x for fresh visitors"
```

---

### Task 2: Version constant + bottom status bar

**Files:**
- Modify: `vite.config.js` (add `define`)
- Modify: `index.html` (footer markup + CSS, ratio calc)
- Modify: `src/ui/emulator-ui.js` (set version text at init)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: global constant `__APP_VERSION__` (string, e.g. `"1.2.0"`, replaced by Vite/Vitest at build/test time); DOM: `<footer id="status-bar">` containing `#status-bar-version` (span), `#status-bar-changelog` (button — wired in Task 3), and the GitHub `<a>`. Task 3 relies on the button id `status-bar-changelog`.

- [ ] **Step 1: Add the define to vite.config.js**

At the top of `vite.config.js` (after the existing imports):

```js
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync(resolve(__dirname, "package.json"), "utf8"));
```

Inside the `defineConfig({ ... })` object, as a sibling of `base`/`build`:

```js
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
```

(Vitest reads the same config, so `__APP_VERSION__` also exists in tests.)

- [ ] **Step 2: Add the footer markup to index.html**

Immediately before `</body>` (after the `#graphics-modal` div, before the `<script type="module">` tag):

```html
    <footer id="status-bar">
      <span id="status-bar-version" aria-label="Emulator version"></span>
      <nav id="status-bar-links" aria-label="Project links">
        <button type="button" id="status-bar-changelog">Changelog</button>
        <span aria-hidden="true">·</span>
        <a
          href="https://github.com/cschweda/trs80-emulator"
          target="_blank"
          rel="noopener"
          >GitHub ↗</a
        >
      </nav>
    </footer>
```

- [ ] **Step 3: Add the status bar CSS**

In the `<style>` block of `index.html`, after the `#dev-bar label` rule (around line 74), add:

```css
      /* Slim status bar pinned under everything: version + project links */
      #status-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
        padding: 4px 14px;
        background: #0c0a09;
        border-top: 1px solid #2a2521;
        font-size: 12px;
        color: #8f887e;
      }
      #status-bar-links {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      #status-bar a,
      #status-bar button {
        background: none;
        border: none;
        margin: 0;
        padding: 2px 4px;
        font-family: monospace;
        font-size: 12px;
        font-weight: normal;
        color: #d8d2c4;
        text-decoration: none;
        cursor: pointer;
      }
      #status-bar a:hover,
      #status-bar button:hover {
        color: #fff;
        text-decoration: underline;
      }
      #status-bar a:focus-visible,
      #status-bar button:focus-visible {
        outline: 2px solid var(--reset-orange);
        outline-offset: 1px;
      }
```

The generic `button { background: #0f0; ... }` rule appears LATER in the stylesheet (around line 586) and would win on equal specificity — the `#status-bar button` selectors above beat it on specificity, so order is safe. Verify visually in Step 6.

- [ ] **Step 4: Account for the bar in the ratio-scale calc**

In `index.html`, change the ratio rule:

```css
      #crt-well[data-scale="ratio"] {
        /* Largest 4:3 rectangle under the ~42px dev bar */
        aspect-ratio: 4 / 3;
        width: min(100%, calc((100vh - 42px) * 1.3333));
      }
```
to
```css
      #crt-well[data-scale="ratio"] {
        /* Largest 4:3 rectangle between the ~42px dev bar and ~25px status bar */
        aspect-ratio: 4 / 3;
        width: min(100%, calc((100vh - 67px) * 1.3333));
      }
```

- [ ] **Step 5: Set the version text at init**

In `src/ui/emulator-ui.js`, find the init code that reads `document.getElementById("dev-bar-status")` (line ~183). Immediately before that line, add:

```js
  const versionEl = document.getElementById("status-bar-version");
  if (versionEl) versionEl.textContent = `v${__APP_VERSION__}`;
```

- [ ] **Step 6: Verify in the dev server**

Run: `yarn dev` (leave it running only long enough to check), open http://localhost:3000.
Expected: slim bottom bar; left `v1.2.0`; right `Changelog · GitHub ↗` in putty-gray monospace (NOT green-on-black buttons); GitHub opens the repo in a new tab; the Changelog button does nothing yet. Kill the server.

- [ ] **Step 7: Run the full suite to catch regressions**

Run: `yarn test:run`
Expected: PASS — same count as before this task (423).

- [ ] **Step 8: Commit**

```bash
git add vite.config.js index.html src/ui/emulator-ui.js
git commit -m "feat: bottom status bar with version and project links"
```

---

### Task 3: CHANGELOG.md + in-app changelog modal

**Files:**
- Create: `CHANGELOG.md`
- Create: `src/ui/changelog.js`
- Create: `tests/unit/changelog-tests.js`
- Modify: `index.html` (modal div)
- Modify: `src/main.js` (import)

**Interfaces:**
- Consumes: `#status-bar-changelog` button (Task 2); existing `.modal`/`.modal-content` CSS classes in `index.html`.
- Produces: `renderChangelogHtml(markdownText: string) -> string` (exported, pure); `initChangelog()` (exported; wires button, modal close, ESC); side-effect import in `main.js` calls `initChangelog()` on DOMContentLoaded.

- [ ] **Step 1: Write CHANGELOG.md**

Create `CHANGELOG.md` at the repo root with exactly this content (the v1.3.0 section describes what this plan ships; Task 10 re-verifies it against reality before release):

```markdown
# Changelog

All notable changes to the TRS-80 Model III emulator are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and versions follow [semver](https://semver.org/).

## [1.3.0] - 2026-07-12

### Added

- Games library grows from 12 to 26 titles: arcade classics (Scarfman,
  Robot Attack, Meteor Mission 2, Defense Command, Penetrator), text
  adventures (Adventureland, Pirate Adventure, Bedlam), Super Star Trek,
  and five more BASIC type-ins (Hunt the Wumpus, Acey Ducey, Bagels,
  Camel, Hangman)
- Library menu groups titles into Arcade, Adventures, BASIC type-ins,
  and Extras
- Super Star Trek ships as a pre-tokenized cassette built by the real
  ROM (`scripts/build-cas.js`)
- `scripts/probe-program.js`: headless loader probe for vetting game
  images before they join the library
- Bottom status bar: version, this changelog in an in-app modal, GitHub
  link
- This changelog

### Changed

- Default screen size is 2× for fresh visitors (a saved Size preference
  still wins)

## [1.2.0] - 2026-07-12

### Added

- Cassette-port sound through WebAudio, with a MACHINE-menu toggle
  (preference persisted)
- Save states: quick save/load in the browser plus JSON export/import
- 32-column wide-character mode
- Touch input: soft-keyboard bridge and on-screen special keys

### Changed

- Z80 core roughly 7× faster (about 83× realtime headless)

## [1.1.0] - 2026-07-10

### Added

- Games library: eight classics from trsjs.48k.ca (Super Nova, Galaxy
  Invasion, Flying Saucers, Sea Dragon, Time Trek, Invasion Force, City
  Defence, OPUS-1) with a native /CMD parser and fast-loader, cassette
  format dispatch, and headless real-ROM acceptance tests
- Skinless full-window screen as the default view; the machine case is
  opt-in from the MACHINE menu; Size select backed by a pure
  screen-layout mapping
- CI: the vitest suite runs on push and pull request

### Fixed

- CCF takes half-carry from the previous carry, not the new one
- RETN/RETI interrupt flip-flop restore semantics pinned by tests
- RLD/RRD (ED 6F/67) implemented
- JV3 write-protect byte honored
- Held keys release when the window loses focus

## [1.0.0] - 2026-07-05

### Added

- Boots the real 14K Model III ROM into Level II BASIC on an emulated
  Z80 at 2.03 MHz
- Dual WD1793 floppy controller with JV1/JV3 `.dsk` mounting
- Cassette `.cas` loading and a built-in program library with
  public-domain BASIC classics (Hammurabi, Lunar Lander, Hurkle, Number
  Guess), plus paste-BASIC-from-clipboard
- Authentic keyboard matrix and 64-column video; phased test suite
  covering CPU, memory, I/O, cassette, BASIC, and video (work back to
  2025-12-13 folds into this release)
```

- [ ] **Step 2: Write the failing renderer test**

Create `tests/unit/changelog-tests.js`:

```js
/**
 * The in-app changelog: the real CHANGELOG.md must render, and it must
 * mention the version we're shipping — a release without a changelog
 * entry fails here.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { renderChangelogHtml } from "@ui/changelog.js";

const changelogText = fs.readFileSync(
  path.resolve(process.cwd(), "CHANGELOG.md"),
  "utf8"
);
const pkg = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf8")
);

describe("renderChangelogHtml", () => {
  it("renders headings, lists, links, and bold", () => {
    const html = renderChangelogHtml(
      "# T\n\n## [1.0.0] - 2026-01-01\n\n### Added\n\n- one **bold** [link](https://x.example/)\n- two\n"
    );
    expect(html).toContain("<h2>");
    expect(html).toContain("<h3>[1.0.0] - 2026-01-01</h3>");
    expect(html).toContain("<h4>Added</h4>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>one <strong>bold</strong> ");
    expect(html).toContain('<a href="https://x.example/"');
    expect(html).toContain("<li>two</li>");
  });

  it("escapes HTML in the source", () => {
    const html = renderChangelogHtml("- <script>alert(1)</script>\n");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("joins wrapped list-item lines", () => {
    const html = renderChangelogHtml("- first line\n  continues here\n");
    expect(html).toContain("<li>first line continues here</li>");
  });

  it("renders the real CHANGELOG.md and mentions the current version", () => {
    const html = renderChangelogHtml(changelogText);
    expect(html).toContain(pkg.version);
    expect(html).toContain("<h3>");
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `yarn test:run tests/unit/changelog-tests.js`
Expected: FAIL — cannot resolve `@ui/changelog.js`.

- [ ] **Step 4: Write src/ui/changelog.js**

```js
/**
 * The in-app changelog: CHANGELOG.md is the single source (also what
 * GitHub shows). Vite inlines it at build time via ?raw; a deliberately
 * tiny renderer handles just the markdown that file uses — headings,
 * bullet lists (with wrapped lines), links, bold. Anything fancier
 * belongs in the file only if this renderer learns it first.
 */
import changelogText from "../../CHANGELOG.md?raw";

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inline(s) {
  return s
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(
      /\[([^\]]+)\]\(([^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>'
    );
}

export function renderChangelogHtml(md) {
  const out = [];
  let items = null; // open <ul> item list, last entry may absorb wraps

  const closeList = () => {
    if (items) {
      out.push("<ul>" + items.map((i) => `<li>${i}</li>`).join("") + "</ul>");
      items = null;
    }
  };

  for (const raw of md.split("\n")) {
    const line = raw.replace(/\s+$/, "");
    const h = line.match(/^(#{1,3}) (.*)$/);
    const li = line.match(/^- (.*)$/);
    if (h) {
      closeList();
      const level = h[1].length + 1; // # -> h2 ... ### -> h4 (modal owns h1)
      out.push(`<h${level}>${inline(escapeHtml(h[2]))}</h${level}>`);
    } else if (li) {
      if (!items) items = [];
      items.push(inline(escapeHtml(li[1])));
    } else if (items && /^\s+\S/.test(line)) {
      items[items.length - 1] += " " + inline(escapeHtml(line.trim()));
    } else if (line === "") {
      closeList();
    } else {
      closeList();
      out.push(`<p>${inline(escapeHtml(line))}</p>`);
    }
  }
  closeList();
  return out.join("\n");
}

export function initChangelog() {
  const modal = document.getElementById("changelog-modal");
  const body = document.getElementById("changelog-modal-body");
  const openBtn = document.getElementById("status-bar-changelog");
  const closeBtn = document.getElementById("changelog-modal-close");
  if (!modal || !body || !openBtn || !closeBtn) return;

  let rendered = false;
  const open = () => {
    if (!rendered) {
      body.innerHTML = renderChangelogHtml(changelogText);
      rendered = true;
    }
    modal.style.display = "block";
    closeBtn.focus();
  };
  const close = () => {
    modal.style.display = "none";
  };

  openBtn.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.style.display === "block") close();
  });
}
```

- [ ] **Step 5: Run the renderer tests**

Run: `yarn test:run tests/unit/changelog-tests.js`
Expected: PASS (4 tests). If the `?raw` import trips vitest, confirm `vite.config.js` has no `assetsInclude` filtering — stock Vite handles `?raw` natively in both dev and test.

- [ ] **Step 6: Add the modal markup and wire the module**

In `index.html`, after the `#graphics-modal` div and before the `<footer id="status-bar">`:

```html
    <!-- Changelog Modal -->
    <div id="changelog-modal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Changelog</h2>
          <button
            class="close"
            id="changelog-modal-close"
            aria-label="Close changelog"
          >
            &times;
          </button>
        </div>
        <div class="modal-body" id="changelog-modal-body"></div>
      </div>
    </div>
```

In `src/main.js`, next to the existing `import { emulator } from "@ui/emulator-ui.js";` add:

```js
import { initChangelog } from "@ui/changelog.js";
```

and call `initChangelog();` from the same place emulator UI init runs on DOM ready (find where `emulator` is started in `main.js` — add the call right after it; if init is top-level module code guarded by `DOMContentLoaded`, add it inside that handler).

- [ ] **Step 7: Verify in the dev server**

Run: `yarn dev`, open http://localhost:3000.
Expected: clicking **Changelog** opens the modal with headed sections (1.3.0 → 1.0.0); ESC, ×, and click-outside all close it; links open in new tabs. Kill the server.

- [ ] **Step 8: Full suite + commit**

Run: `yarn test:run`
Expected: PASS (427 = 423 + 4 new).

```bash
git add CHANGELOG.md src/ui/changelog.js tests/unit/changelog-tests.js index.html src/main.js
git commit -m "feat: changelog (backfilled to v1.0.0) rendered in-app from the status bar"
```

---

### Task 4: probe-program.js — headless vetting tool

**Files:**
- Create: `scripts/probe-program.js`

**Interfaces:**
- Consumes: `TRS80System`, `parseCas`/`fastLoadBasic`/`fastLoadSystem`, `parseCmd`/`fastLoadCmd` via RELATIVE imports (`../src/...` — the `@` aliases don't resolve under plain node).
- Produces: CLI `node scripts/probe-program.js <file> [seconds]` printing format kind, entry address (hex), checksum errors, whether the screen changed / READY vanished, and the top 8 screen lines. Tasks 5, 6, 8 use it to accept/reject images and to read the `entry` value for test rows.

- [ ] **Step 1: Write the script**

```js
#!/usr/bin/env node
/**
 * Probe a TRS-80 program image headlessly: boot the real ROM, load the
 * file through the same parser/loader the app uses, run a while, and
 * report what happened. Vets candidate games before they join
 * public/programs/, and prints the entry address the acceptance test
 * pins.
 *
 *   node scripts/probe-program.js <file.cmd|file.cas|file.3bn> [seconds]
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, extname } from "path";
import { TRS80System } from "../src/system/trs80-system.js";
import {
  parseCas,
  fastLoadBasic,
  fastLoadSystem,
} from "../src/peripherals/cas-format.js";
import { parseCmd, fastLoadCmd } from "../src/peripherals/cmd-format.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const file = process.argv[2];
const seconds = parseFloat(process.argv[3] || "2");
if (!file) {
  console.error("usage: node scripts/probe-program.js <file> [seconds]");
  process.exit(2);
}

const romData = new Uint8Array(
  readFileSync(join(__dirname, "../public/assets/model3.rom"))
);
const bytes = new Uint8Array(readFileSync(file));

const system = new TRS80System({ romData });
system.cpu.strictMode = true;
system.reset();

// Boot to READY (same dance as the acceptance tests)
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
  console.error("FAIL: machine did not reach READY");
  process.exit(1);
}

const before = system.screenText().join("\n");
const ext = extname(file).toLowerCase();
try {
  if (ext === ".cmd") {
    const parsed = parseCmd(bytes);
    console.log(`format: cmd   entry: 0x${parsed.entry.toString(16)}`);
    fastLoadCmd(system, parsed);
  } else {
    const parsed = parseCas(bytes);
    if (parsed.kind === "system") {
      console.log(
        `format: cas/system  name: "${parsed.name}"  entry: 0x${parsed.entry.toString(16)}  checksumErrors: ${parsed.checksumErrors}`
      );
      fastLoadSystem(system, parsed);
    } else {
      console.log(
        `format: cas/basic  name: "${parsed.name}"  lines: ${parsed.lines.length}`
      );
      fastLoadBasic(system, parsed);
      system.typeText("RUN\n");
    }
  }
} catch (err) {
  console.error(`FAIL: ${err.message}`);
  process.exit(1);
}

system.runSeconds(seconds);

const after = system.screenText().join("\n");
console.log(`cpu halted: ${system.cpu.halted}`);
console.log(`screen changed: ${after !== before}`);
console.log(`READY gone: ${!after.includes("READY")}`);
console.log("--- screen (top 8 lines) ---");
for (const line of system.screenText().slice(0, 8)) console.log(`|${line}|`);
```

- [ ] **Step 2: Verify against a known-good bundled game**

Run: `node scripts/probe-program.js public/programs/galaxy.cmd 1`
Expected output includes: `format: cmd   entry: 0xa500`, `cpu halted: false`, `screen changed: true`, `READY gone: true`.

Run: `node scripts/probe-program.js public/programs/seadrag.3bn 1`
Expected: `format: cas/system` with `entry: 0x497f`, `checksumErrors: 0`.

If either import fails under plain node, the offending module has an unguarded DOM reference — fix it with the same `typeof window !== "undefined"` guard `sound.js:70` uses, and mention it in the commit.

- [ ] **Step 3: Commit**

```bash
git add scripts/probe-program.js
git commit -m "feat: headless probe script for vetting program images"
```

---

### Task 5: Acquire and wire the five arcade classics

**Files:**
- Create: `public/programs/scarfman.cmd` (or `.cas` — whatever vets clean; keep extension truthful)
- Create: `public/programs/robotatk.cas`, `public/programs/meteor2.cas`, `public/programs/defense.cas`, `public/programs/penetr.cas` (same caveat)
- Modify: `src/data/library.js` (5 entries)
- Modify: `tests/integration/games-library-tests.js` (5 rows)

**Interfaces:**
- Consumes: probe script (Task 4); mame-sl archive.
- Produces: five library entries with ids `scarfman`, `robot-attack`, `meteor-mission-2`, `defense-command`, `penetrator`, `group: "Arcade"`; five ML_GAMES rows.

**Acquisition procedure (used for every title in Tasks 5 and 6):**

- [ ] **Step 1: Download the MAME TRS-80 cassette software list once**

```bash
cd "$SCRATCH"
curl -L -o trs80_cass.zip "https://archive.org/download/mame-sl/trs80_cass.zip"
unzip -o trs80_cass.zip -d trs80_cass
ls trs80_cass | head -50
```

Expected: a directory of per-title zips (MAME software-list layout). Each inner zip holds one or more `.cas` files. Browse for candidates:

```bash
ls trs80_cass | grep -iE "scarf|robot|meteor|defen[cs]e|penetr"
```

If a title is missing from the list, fall back in order: (1) search archive.org (`curl "https://archive.org/advancedsearch.php?q=<title>+trs-80&fl[]=identifier&output=json"` then `https://archive.org/metadata/<identifier>` for files); (2) trs-80.com downloads section; (3) promote an alternate from the spec (Cosmic Fighter, Armored Patrol, Rear Guard) via the same procedure. Record the final source URL of every accepted file — Task 9's LICENSE text needs it.

- [ ] **Step 2: Per title — extract, probe, decide**

For each candidate (example shown for Robot Attack; repeat for all five):

```bash
cd "$SCRATCH"
unzip -o trs80_cass/robotatk.zip -d robotatk
ls robotatk
node /Volumes/satechi/webdev/trs80-emulator/scripts/probe-program.js "robotatk/<the .cas file>" 2
```

Accept when: parse succeeds, `checksumErrors: 0`, `cpu halted: false`, `screen changed: true`, `READY gone: true`, and the screen dump looks like the game (title screen / play field). Model I-only dumps typically fail one of these on the Model III ROM — reject and try another dump in the same zip, another zip variant, or an alternate title. Note the printed `entry` value.

- [ ] **Step 3: Promote accepted files into the repo**

```bash
cp "$SCRATCH/robotatk/<file>.cas" /Volumes/satechi/webdev/trs80-emulator/public/programs/robotatk.cas
```

Name targets: `scarfman.cmd`/`scarfman.cas`, `robotatk.cas`, `meteor2.cas`, `defense.cas`, `penetr.cas` — short, lowercase, extension matching actual format.

- [ ] **Step 4: Add the failing acceptance rows**

In `tests/integration/games-library-tests.js`, extend `ML_GAMES` with one row per accepted file, using the probe's entry value (example values shown as `0x0000` MUST be replaced with the probe output):

```js
    // v1.3.0 arcade classics (entries pinned from scripts/probe-program.js)
    ["scarfman.cmd", "cmd", 0x0000],
    ["robotatk.cas", "cas", 0x0000],
    ["meteor2.cas", "cas", 0x0000],
    ["defense.cas", "cas", 0x0000],
    ["penetr.cas", "cas", 0x0000],
```

Run: `yarn test:run tests/integration/games-library-tests.js`
Expected: the 5 new rows PASS (they were pre-vetted by the same logic; a failure here means the row's entry value doesn't match the probe output — fix the row). The suite must end green before continuing.

- [ ] **Step 5: Add the library entries**

In `src/data/library.js`, after the existing trsjs game entries, add (adjust `file`/`format` to what shipped; add a `note` only where the probe showed the game waits for a specific key):

```js
  // ---- v1.3.0 arcade classics (see LICENSE exception) ----
  {
    id: "scarfman",
    title: "Scarfman (Cornsoft, 1981)",
    group: "Arcade",
    kind: "file",
    file: "/programs/scarfman.cmd",
    format: "cmd",
  },
  {
    id: "robot-attack",
    title: "Robot Attack (Big Five, 1981)",
    group: "Arcade",
    kind: "file",
    file: "/programs/robotatk.cas",
    format: "cas",
  },
  {
    id: "meteor-mission-2",
    title: "Meteor Mission 2 (Big Five, 1981)",
    group: "Arcade",
    kind: "file",
    file: "/programs/meteor2.cas",
    format: "cas",
  },
  {
    id: "defense-command",
    title: "Defense Command (Big Five, 1982)",
    group: "Arcade",
    kind: "file",
    file: "/programs/defense.cas",
    format: "cas",
  },
  {
    id: "penetrator",
    title: "Penetrator (Melbourne House, 1982)",
    group: "Arcade",
    kind: "file",
    file: "/programs/penetr.cas",
    format: "cas",
  },
```

- [ ] **Step 6: Spot-check one title in the browser**

Run: `yarn dev`, MACHINE ▾ → Library → pick Robot Attack → Load & run.
Expected: game takes the screen and responds to keys. Kill the server.

- [ ] **Step 7: Full suite + commit**

Run: `yarn test:run`
Expected: PASS (427 + 5 = 432).

```bash
git add public/programs/ src/data/library.js tests/integration/games-library-tests.js
git commit -m "feat: five arcade classics join the library (Scarfman, Robot Attack, Meteor Mission 2, Defense Command, Penetrator)"
```

If any title shipped as an alternate, name it truthfully in the commit body and carry the change through Tasks 9 and 10 (LICENSE, README, CHANGELOG).

---

### Task 6: Acquire and wire the three text adventures

**Files:**
- Create: `public/programs/advland.cas`, `public/programs/pirate.cas`, `public/programs/bedlam.cmd` (extensions truthful to what vets)
- Modify: `src/data/library.js` (3 entries)
- Modify: `tests/integration/games-library-tests.js` (rows/variant)

**Interfaces:**
- Consumes: probe script; `$SCRATCH/trs80_cass` from Task 5 (re-download with the Task 5 Step 1 command if absent).
- Produces: library ids `adventureland`, `pirate-adventure`, `bedlam`, `group: "Adventures"`.

- [ ] **Step 1: Locate candidates in the software list**

```bash
ls "$SCRATCH/trs80_cass" | grep -iE "advent|pirate|bedlam|haunt|raaka"
```

Follow the exact acquisition procedure from Task 5 Steps 1–3 (extract → probe → accept/reject → promote). Alternates per spec: Haunted House, Raaka-Tu. Record source URLs.

- [ ] **Step 2: Probe with adventure-appropriate patience**

Text adventures print a prompt rather than an action screen:

```bash
node scripts/probe-program.js "$SCRATCH/advland/<file>.cas" 4
```

Accept when the screen dump shows the game's opening room/prompt text. If the probe reports `format: cas/basic`, that's fine — the loader auto-RUNs BASIC tapes (see `loadLibraryFile` in `src/ui/emulator-ui.js`); note it for Step 3.

- [ ] **Step 3: Add acceptance tests**

SYSTEM/CMD images: plain ML_GAMES rows as in Task 5 Step 4.

For any `cas/basic` image, add a dedicated test after the `m2.bas` test in `tests/integration/games-library-tests.js` (shown for Adventureland; duplicate per BASIC-tape title with its own banner text taken from the probe's screen dump):

```js
  it("advland.cas fast-loads as BASIC and takes the screen", () => {
    const bytes = programBytes("advland.cas");
    const parsed = parseCas(bytes);
    expect(parsed.kind).toBe("basic");
    fastLoadBasic(system, parsed);
    system.typeText("RUN\n");
    system.runSeconds(4);

    const screen = system.screenText().join("\n");
    expect(system.cpu.halted).toBe(false);
    expect(screen).not.toContain("?SN");
    expect(screen).not.toContain("READY");
  });
```

Run: `yarn test:run tests/integration/games-library-tests.js` → PASS.

- [ ] **Step 4: Library entries**

```js
  // ---- v1.3.0 text adventures (see LICENSE exception) ----
  {
    id: "adventureland",
    title: "Adventureland (Scott Adams, 1978)",
    group: "Adventures",
    kind: "file",
    file: "/programs/advland.cas",
    format: "cas",
  },
  {
    id: "pirate-adventure",
    title: "Pirate Adventure (Scott Adams, 1979)",
    group: "Adventures",
    kind: "file",
    file: "/programs/pirate.cas",
    format: "cas",
  },
  {
    id: "bedlam",
    title: "Bedlam (Tandy, 1982)",
    group: "Adventures",
    kind: "file",
    file: "/programs/bedlam.cmd",
    format: "cmd",
  },
```

(Adjust `file`/`format` per what actually vetted.)

- [ ] **Step 5: Browser spot-check one adventure, full suite, commit**

`yarn dev` → load Adventureland → type `LOOK` → sensible response. Kill server.

Run: `yarn test:run` → PASS (432 + 3 = 435).

```bash
git add public/programs/ src/data/library.js tests/integration/games-library-tests.js
git commit -m "feat: Scott Adams and Tandy text adventures join the library"
```

---

### Task 7: Five BASIC type-in classics

**Files:**
- Modify: `src/data/library.js` (5 text entries appended before the closing `];`)

**Interfaces:**
- Consumes: the existing text-entry acceptance loop in `tests/integration/library-tests.js` (it auto-covers every `kind !== "file"` entry using `expect`).
- Produces: library ids `wumpus`, `acey-ducey`, `bagels`, `camel`, `hangman`, `group: "BASIC type-ins"`, each with `expect`.

House rules (library.js header): uppercase, `RND(n)` int form, no ELSE. TDD here is: the acceptance harness already exists — add one entry, run the file, watch that entry pass; a `?SN` or missing banner fails it.

- [ ] **Step 1: Add Hunt the Wumpus, run the library tests**

```js
  {
    id: "wumpus",
    title: "Hunt the Wumpus (cave hunt)",
    group: "BASIC type-ins",
    expect: "WUMPUS",
    text: `10 PRINT "HUNT THE WUMPUS - 20 CAVES, 5 ARROWS"
20 DIM R(20,3)
30 FOR I=1 TO 20: FOR J=1 TO 3: READ R(I,J): NEXT J: NEXT I
40 DATA 2,5,8,1,3,10,2,4,12,3,5,14,1,4,6
50 DATA 5,7,15,6,8,17,1,7,9,8,10,18,2,9,11
60 DATA 10,12,19,3,11,13,12,14,20,4,13,15,6,14,16
70 DATA 15,17,20,7,16,18,9,17,19,11,18,20,13,16,19
80 P=RND(20)
90 W=RND(20): IF W=P THEN 90
100 A=RND(20): IF A=P THEN 100
110 IF A=W THEN 100
120 B=RND(20): IF B=P THEN 120
130 IF B=W THEN 120
140 IF B=A THEN 120
150 M=5
160 PRINT: PRINT "YOU ARE IN CAVE";P
170 PRINT "TUNNELS LEAD TO";R(P,1);R(P,2);R(P,3)
180 FOR J=1 TO 3
190 IF R(P,J)=W THEN PRINT "I SMELL A WUMPUS!"
200 IF R(P,J)=A THEN PRINT "I FEEL A DRAFT!"
210 IF R(P,J)=B THEN PRINT "BATS NEARBY!"
220 NEXT J
230 INPUT "1=MOVE 2=SHOOT";C
240 IF C=2 THEN 380
250 INPUT "WHERE TO";N
260 F=0: IF N=R(P,1) THEN F=1
270 IF N=R(P,2) THEN F=1
280 IF N=R(P,3) THEN F=1
290 IF F=0 THEN PRINT "NO TUNNEL THERE!": GOTO 250
300 P=N
310 IF P=W THEN PRINT "THE WUMPUS GOT YOU! YOU LOSE.": GOTO 440
320 IF P=A THEN PRINT "YYIIEEE! YOU FELL IN A PIT!": GOTO 440
330 IF P=B THEN PRINT "GIANT BATS CARRY YOU OFF!": P=RND(20): GOTO 310
340 GOTO 160
380 INPUT "SHOOT INTO WHICH CAVE";N
390 M=M-1
400 IF N=W THEN PRINT "AHA! YOU SLEW THE WUMPUS! YOU WIN!": GOTO 440
410 PRINT "YOUR ARROW CLATTERS AWAY..."
415 IF RND(4)>1 THEN W=R(W,RND(3)): IF W=P THEN PRINT "IT FOUND YOU! YOU LOSE.": GOTO 440
420 IF M=0 THEN PRINT "OUT OF ARROWS. THE WUMPUS WINS.": GOTO 440
430 GOTO 160
440 PRINT "GAME OVER"
`,
  },
```

Run: `yarn test:run tests/integration/library-tests.js`
Expected: PASS, including "Hunt the Wumpus (cave hunt) loads and runs".

- [ ] **Step 2: Add Acey Ducey, run**

```js
  {
    id: "acey-ducey",
    title: "Acey Ducey (card bets)",
    group: "BASIC type-ins",
    expect: "ACEY",
    text: `10 PRINT "ACEY DUCEY - BET THE NEXT CARD FALLS BETWEEN"
20 Q=100
30 PRINT: PRINT "YOU HAVE $";Q
40 A=RND(13): B=RND(13)
50 IF A=B THEN 40
60 IF A>B THEN T=A: A=B: B=T
70 PRINT "FIRST CARD:";A;"  SECOND CARD:";B
80 INPUT "YOUR BET (0 TO PASS)";W
90 IF W=0 THEN PRINT "CHICKEN!": GOTO 30
100 IF W>Q THEN PRINT "YOU ONLY HAVE $";Q: GOTO 80
110 IF W<0 THEN 80
120 C=RND(13)
130 PRINT "NEXT CARD:";C
140 IF C>A THEN IF C<B THEN PRINT "YOU WIN!": Q=Q+W: GOTO 170
150 PRINT "YOU LOSE!"
160 Q=Q-W
170 IF Q<1 THEN PRINT "BUSTED. GAME OVER.": GOTO 190
180 GOTO 30
190 PRINT "SO LONG."
`,
  },
```

Run: `yarn test:run tests/integration/library-tests.js` → PASS.

- [ ] **Step 3: Add Bagels, run**

```js
  {
    id: "bagels",
    title: "Bagels (digit deduction)",
    group: "BASIC type-ins",
    expect: "BAGELS",
    text: `10 PRINT "BAGELS - GUESS MY 3-DIGIT NUMBER (ALL DIGITS DIFFER)"
20 PRINT "CLUES: FERMI=RIGHT PLACE  PICO=WRONG PLACE  BAGELS=NONE"
30 A=RND(10)-1
40 B=RND(10)-1: IF B=A THEN 40
50 C=RND(10)-1: IF C=A THEN 50
60 IF C=B THEN 50
70 FOR T=1 TO 20
80 INPUT "GUESS (E.G. 123)";G
90 IF G<0 THEN 80
100 IF G>999 THEN 80
110 X=INT(G/100): Y=INT(G/10)-X*10: Z=G-INT(G/10)*10
120 F=0: P=0
130 IF X=A THEN F=F+1
140 IF Y=B THEN F=F+1
150 IF Z=C THEN F=F+1
160 IF X=B THEN P=P+1
170 IF X=C THEN P=P+1
180 IF Y=A THEN P=P+1
190 IF Y=C THEN P=P+1
200 IF Z=A THEN P=P+1
210 IF Z=B THEN P=P+1
220 IF F=3 THEN PRINT "YOU GOT IT IN";T;"GUESSES!": GOTO 290
230 IF F=0 THEN IF P=0 THEN PRINT "BAGELS": GOTO 270
240 FOR I=1 TO F: PRINT "FERMI ";: NEXT I
250 IF P>0 THEN FOR I=1 TO P: PRINT "PICO ";: NEXT I
260 PRINT
270 NEXT T
280 PRINT "OUT OF GUESSES. IT WAS";A*100+B*10+C
290 PRINT "DONE"
`,
  },
```

Run: `yarn test:run tests/integration/library-tests.js` → PASS. (If line 250's `IF...THEN FOR` trips the ROM — `?SN` on the screen — restructure it to `250 IF P=0 THEN 260` followed by `255 FOR I=1 TO P: PRINT "PICO ";: NEXT I`.)

- [ ] **Step 4: Add Camel, run**

```js
  {
    id: "camel",
    title: "Camel (desert trek)",
    group: "BASIC type-ins",
    expect: "CAMEL",
    text: `10 PRINT "CAMEL - CROSS THE 200-MILE GOBI DESERT"
20 PRINT "THE PYGMIES ARE 25 MILES BEHIND YOU"
30 D=0: E=-25: W=6: C=6
40 PRINT: PRINT "MILES DONE:";D;" PYGMIES";D-E;"BACK  WATER:";W
50 PRINT "1=MODERATE PACE 2=FULL GALLOP 3=DRINK 4=REST"
60 INPUT "COMMAND";A
70 IF A=1 THEN M=RND(10)+4: D=D+M: C=C-1: PRINT "YOU TRAVEL";M;"MILES"
80 IF A=2 THEN M=RND(20)+9: D=D+M: C=C-3: PRINT "GALLOP!";M;"MILES"
90 IF A=3 THEN IF W>0 THEN W=W-1: C=6: PRINT "AAHH. REFRESHING."
100 IF A=3 THEN IF W=0 THEN PRINT "NO WATER LEFT!"
110 IF A=4 THEN C=6: PRINT "THE CAMEL RESTS."
120 IF A<3 THEN IF RND(20)=1 THEN PRINT "SANDSTORM! YOU LOSE 10 MILES": D=D-10
130 E=E+RND(18)+1
140 IF C<1 THEN PRINT "YOUR CAMEL COLLAPSES. THE PYGMIES GET YOU.": GOTO 200
150 IF E>=D THEN PRINT "THE PYGMIES CAUGHT YOU! CAPTURED!": GOTO 200
160 IF D>=200 THEN PRINT "YOU MADE IT ACROSS THE DESERT! HOORAY!": GOTO 200
170 IF RND(25)=1 THEN PRINT "AN OASIS! WATER REFILLED.": W=6
180 GOTO 40
200 PRINT "GAME OVER"
`,
  },
```

Run: `yarn test:run tests/integration/library-tests.js` → PASS.

- [ ] **Step 5: Add Hangman, run**

```js
  {
    id: "hangman",
    title: "Hangman (word guess)",
    group: "BASIC type-ins",
    expect: "HANGMAN",
    text: `10 PRINT "HANGMAN"
20 CLEAR 200
30 W=RND(10)
40 FOR I=1 TO W: READ W$: NEXT I
50 DATA COMPUTER,TANDY,CASSETTE,MONITOR,KEYBOARD
60 DATA PROGRAM,MEMORY,SCREEN,DISKETTE,PHOSPHOR
70 L=LEN(W$): G$="": M=6
80 PRINT "THE WORD HAS";L;"LETTERS.  MISSES LEFT:";M
90 D$=""
100 FOR I=1 TO L
110 C$=MID$(W$,I,1)
120 F=0
130 FOR J=1 TO LEN(G$): IF MID$(G$,J,1)=C$ THEN F=1
140 NEXT J
150 IF F=1 THEN D$=D$+C$
160 IF F=0 THEN D$=D$+"-"
170 NEXT I
180 PRINT "WORD: ";D$
190 IF D$=W$ THEN PRINT "YOU SAVED HIM! IT WAS ";W$: GOTO 290
200 IF M=0 THEN PRINT "HANGED! THE WORD WAS ";W$: GOTO 290
210 INPUT "YOUR LETTER";A$
220 A$=LEFT$(A$,1)
230 G$=G$+A$
240 F=0
250 FOR I=1 TO L: IF MID$(W$,I,1)=A$ THEN F=1
260 NEXT I
270 IF F=0 THEN M=M-1: PRINT "NO ";A$;" IN IT!"
280 GOTO 80
290 PRINT "GAME OVER"
`,
  },
```

Note: `20 CLEAR 200` reserves string space and must precede all string use; `30 W=RND(10)` picks from ten DATA words. If the acceptance run shows `?OS` (out of string space), raise to `CLEAR 400`.

Run: `yarn test:run tests/integration/library-tests.js` → PASS (all text entries, old and new).

- [ ] **Step 6: Full suite + commit**

Run: `yarn test:run`
Expected: PASS (435 + 5 = 440).

```bash
git add src/data/library.js
git commit -m "feat: five public-domain BASIC type-ins (Wumpus, Acey Ducey, Bagels, Camel, Hangman)"
```

---

### Task 8: Super Star Trek — source, builder, cassette, acceptance test

**Files:**
- Create: `src/data/super-star-trek.bas` (adapted public-domain source)
- Create: `scripts/build-cas.js`
- Create: `public/programs/sstrek.cas` (generated, committed)
- Modify: `src/data/library.js` (1 entry)
- Modify: `tests/integration/games-library-tests.js` (1 test)

**Interfaces:**
- Consumes: `TRS80System`, `parseCas`, memory pointers `TXTTAB_PTR = 0x40a4` / `VARTAB_PTR = 0x40f9` (see `src/peripherals/cas-format.js:24-25`), `system.typeText(text, { enterTStates })`, `system.memory.readWord/readByte`.
- Produces: `node scripts/build-cas.js <in.bas> <out.cas> <NAME>` (NAME = 1-char cassette name, e.g. `S`); committed `public/programs/sstrek.cas`; library id `super-star-trek`.

- [ ] **Step 1: Fetch the public-domain source**

```bash
cd "$SCRATCH"
curl -sL -o superstartrek.bas "https://raw.githubusercontent.com/coding-horror/basic-computer-games/main/84_Super_Star_Trek/superstartrek.bas"
wc -l superstartrek.bas && head -20 superstartrek.bas
```

Expected: ~425 numbered lines starting with REM banner lines. If the URL 404s, find the file with `curl -s "https://api.github.com/repos/coding-horror/basic-computer-games/contents/84_Super_Star_Trek"` and use the listed `download_url`. (David Ahl placed the *BASIC Computer Games* listings in the public domain.)

- [ ] **Step 2: Adapt to Model III BASIC → src/data/super-star-trek.bas**

Copy the fetched file to `src/data/super-star-trek.bas`, then apply these transforms (sed + hand-check):

1. Uppercase everything (source should already be uppercase; verify: `grep -c '[a-z]' src/data/super-star-trek.bas` → only lines with lowercase inside PRINT strings are fine to keep, but Model III boots in caps — safest is `tr '[:lower:]' '[:upper:]'` over the whole file).
2. `RND(1)` → `RND(0)` everywhere (Level II float form): `sed -i '' 's/RND(1)/RND(0)/g' src/data/super-star-trek.bas`. Then verify no other literal `RND(<n>)` with n≠0 remains EXCEPT intentional integer uses: `grep -o 'RND([^)]*)' src/data/super-star-trek.bas | sort | uniq -c` — Ahl's listing uses only `RND(1)`; anything else needs a hand decision.
3. Strip lowercase-mode or MAT/graphics oddities: none expected in this listing; flag any line the next step rejects.
4. Line length: `awk 'length > 240 {print NR": "length}' src/data/super-star-trek.bas` — split any hits into two numbered lines (pick an unused adjacent line number; the listing's numbering is sparse).
5. Normalize line endings: `sed -i '' 's/\r$//' src/data/super-star-trek.bas` and ensure a trailing newline.

- [ ] **Step 3: Write scripts/build-cas.js**

```js
#!/usr/bin/env node
/**
 * Build a BASIC .cas cassette image by letting the real ROM do the
 * tokenizing: boot headless, NEW, type the source, then dump the
 * tokenized program (TXTTAB..VARTAB) wrapped in the CSAVE tape layout
 * that parseCas() reads back (leader, 0xA5, D3 D3 D3, 1-char name,
 * program image ending in the 0x0000 link).
 *
 *   node scripts/build-cas.js <in.bas> <out.cas> <NAME-char>
 */
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { TRS80System } from "../src/system/trs80-system.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const [inFile, outFile, name = "S"] = process.argv.slice(2);
if (!inFile || !outFile) {
  console.error("usage: node scripts/build-cas.js <in.bas> <out.cas> <NAME>");
  process.exit(2);
}

const TXTTAB_PTR = 0x40a4;
const VARTAB_PTR = 0x40f9;

const romData = new Uint8Array(
  readFileSync(join(__dirname, "../public/assets/model3.rom"))
);
const source = readFileSync(inFile, "utf8").replace(/\r\n?/g, "\n");

const system = new TRS80System({ romData });
system.cpu.strictMode = true;
system.reset();

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
  console.error("FAIL: machine did not reach READY");
  process.exit(1);
}

system.typeText("NEW\n");
const text = source.endsWith("\n") ? source : source + "\n";
const skipped = system.typeText(text, { enterTStates: 1500000 });
if (skipped !== 0) {
  console.error(`FAIL: ${skipped} characters had no keyboard mapping`);
  process.exit(1);
}
const screen = system.screenText().join("\n");
if (screen.includes("?SN") || screen.includes("?OM") || screen.includes("?OS")) {
  console.error("FAIL: the ROM rejected the listing:\n" + screen);
  process.exit(1);
}

const txttab = system.memory.readWord(TXTTAB_PTR);
const vartab = system.memory.readWord(VARTAB_PTR);
const size = vartab - txttab;
if (size < 16) {
  console.error(`FAIL: program image is ${size} bytes — nothing was typed?`);
  process.exit(1);
}

const program = [];
for (let a = txttab; a < vartab; a++) program.push(system.memory.readByte(a));

const out = [];
for (let i = 0; i < 128; i++) out.push(0x00); // leader
out.push(0xa5); // sync
out.push(0xd3, 0xd3, 0xd3); // BASIC header
out.push(name.toUpperCase().charCodeAt(0) & 0x7f); // 1-char name
out.push(...program); // linked, tokenized image incl. 0x0000 terminator

writeFileSync(outFile, Buffer.from(out));
console.log(
  `OK: ${outFile} — ${size} bytes of tokenized BASIC (TXTTAB 0x${txttab.toString(16)}, VARTAB 0x${vartab.toString(16)})`
);
```

- [ ] **Step 4: Prove the builder round-trips a known program**

```bash
node scripts/build-cas.js public/programs/m2.bas "$SCRATCH/m2-roundtrip.cas" C
node scripts/probe-program.js "$SCRATCH/m2-roundtrip.cas" 2
```

Expected: builder prints `OK`; probe prints `format: cas/basic`, `screen changed: true`, `READY gone: true`, and the screen dump shows "CITY DEFENCE". Do not commit the round-trip file.

- [ ] **Step 5: Build sstrek.cas — expect iteration**

```bash
node scripts/build-cas.js src/data/super-star-trek.bas public/programs/sstrek.cas S
node scripts/probe-program.js public/programs/sstrek.cas 6
```

The probe types RUN and the game spends seconds initializing the galaxy, then prints its splash and the instructions prompt. Accept when the screen dump shows recognizable Star Trek text (splash, "STARDATE", or the instructions question). Iterate on Step 2's transforms for any `?SN` — build-cas names no line, so on failure bisect: feed the first half of the listing, then the failing half, until the offending line is found; fix it in `src/data/super-star-trek.bas` (typical culprits: a line over 240 chars, or a character `typeText` can't type — the skipped counter catches those).

- [ ] **Step 6: Acceptance test**

Append to `tests/integration/games-library-tests.js` (inside the describe, after the m2.bas test):

```js
  it(
    "sstrek.cas (Super Star Trek) fast-loads and reaches its opening",
    () => {
      const bytes = programBytes("sstrek.cas");
      const parsed = parseCas(bytes);
      expect(parsed.kind).toBe("basic");
      expect(parsed.lines.length).toBeGreaterThan(300);
      fastLoadBasic(system, parsed);
      system.typeText("RUN\n");
      system.runSeconds(8);

      const screen = system.screenText().join("\n");
      expect(system.cpu.halted).toBe(false);
      expect(screen).not.toContain("?SN");
      expect(screen).not.toContain("?OM");
      expect(screen).toContain("STAR TREK");
    },
    240000
  );
```

If the probe in Step 5 showed the opening text differs (e.g. only "ENTERPRISE" or a stardate line), pin the assertion to what the probe actually printed — the point is a stable, game-specific string.

Run: `yarn test:run tests/integration/games-library-tests.js` → PASS.

- [ ] **Step 7: Library entry**

```js
  {
    id: "super-star-trek",
    title: "Super Star Trek (Ahl, 1978 — public domain)",
    group: "Extras",
    kind: "file",
    file: "/programs/sstrek.cas",
    format: "cas",
    note: "Takes a few seconds to set up the galaxy",
  },
```

- [ ] **Step 8: Browser spot-check, full suite, commit**

`yarn dev` → Library → Super Star Trek → Load & run → answer the instructions prompt, see the short-range scan. Kill server.

Run: `yarn test:run` → PASS (440 + 1 = 441).

```bash
git add scripts/build-cas.js src/data/super-star-trek.bas public/programs/sstrek.cas src/data/library.js tests/integration/games-library-tests.js
git commit -m "feat: Super Star Trek as a ROM-tokenized cassette, with the build-cas tool"
```

---

### Task 9: Grouping, LICENSE, README

**Files:**
- Modify: `src/data/library.js` (existing entries' `group` fields + header comment)
- Modify: `LICENSE` (games exception)
- Modify: `README.md` (library description)

**Interfaces:**
- Consumes: final shipped title list from Tasks 5–8 (substitute any alternates truthfully).
- Produces: three optgroups in the library select: `Arcade`, `Adventures`, `BASIC type-ins` (the UI already builds optgroups from `entry.group` — `src/ui/emulator-ui.js:157-166`; no JS change).

- [ ] **Step 1: Regroup the twelve existing entries**

In `src/data/library.js`, set `group` on every existing entry: Super Nova, Galaxy Invasion, Flying Saucers, Sea Dragon, Time Trek, Invasion Force, City Defence → `"Arcade"`; Hammurabi, Lunar Lander, Hurkle, Number Guess → `"BASIC type-ins"`; OPUS-1 → `"Extras"` (it joins Super Star Trek there — the shelf for big BASIC and curiosities). Update the file's header comment to name the four groups (Arcade, Adventures, BASIC type-ins, Extras).

Reorder entries so groups are contiguous (the optgroup builder appends in encounter order): Arcade block, Adventures block, BASIC type-ins block, Extras last.

- [ ] **Step 2: Verify the select in the browser**

`yarn dev` → MACHINE ▾ → the Library select shows four labeled groups with all 26 entries. Kill server.

- [ ] **Step 3: Rewrite the LICENSE games exception**

Replace the entire `EXCEPTION - Program library game files` section body with (keep the heading line; substitute alternates/sources per what actually shipped — every file must be listed with its source):

```text
The files under public/programs/ are classic TRS-80 software included
solely so the emulator has period software to run. They are NOT covered
by the MIT license above. These titles circulate freely in the TRS-80
preservation community; the emulator contributors claim no rights over
them and cannot grant any — rights remain with their respective holders,
and any rights holder's removal request will be honored.

From George Phillips's trsjs site (https://trsjs.48k.ca/), where they
are hosted for in-browser play: Super Nova and Galaxy Invasion (Big Five
Software), Sea Dragon (Adventure International), Time Trek, Flying
Saucers, City Defence, Invasion Force, and OPUS-1. (Retro-Zap, also on
trsjs, is deliberately not included: its cassette image uses a custom
encoding this emulator's fast-loader does not support.)

From the MAME software list "trs80_cass" as preserved on archive.org
(https://archive.org/download/mame-sl/): Scarfman (The Cornsoft Group),
Robot Attack, Meteor Mission 2, and Defense Command (Big Five Software),
Penetrator (Melbourne House), Adventureland and Pirate Adventure (Scott
Adams / Adventure International), and Bedlam (Tandy).

Generated locally: sstrek.cas is Super Star Trek from David Ahl's "BASIC
Computer Games" (1978), which Ahl released to the public domain; the
cassette image is built from src/data/super-star-trek.bas by
scripts/build-cas.js. It IS covered by the MIT license above, as are the
BASIC type-in adaptations embedded in src/data/library.js.
```

- [ ] **Step 4: Update README.md**

Line 3 (overview): after "a games/program library" add "with 26 built-in titles, an in-app changelog, ".
Line 40 (Program Library bullet): replace with:

```markdown
- **Program Library**: 26 built-in titles — arcade classics (Super Nova, Galaxy Invasion, Flying Saucers, Sea Dragon, Time Trek, Invasion Force, City Defence, Scarfman, Robot Attack, Meteor Mission 2, Defense Command, Penetrator), text adventures (Adventureland, Pirate Adventure, Bedlam), Super Star Trek (Ahl, public domain — pre-tokenized by the real ROM via `scripts/build-cas.js`), OPUS-1, and nine public-domain BASIC type-ins (Hammurabi, Lunar Lander, Hurkle, Number Guess, Hunt the Wumpus, Acey Ducey, Bagels, Camel, Hangman) — see the LICENSE exceptions
```

Add below the features list (near the sound/save-state bullets) one line:

```markdown
- **Status bar & changelog**: slim bottom bar with the version, an in-app CHANGELOG.md viewer, and a GitHub link; default screen size is 2×
```

(Adjust the 26/nine counts if alternates changed the totals; 12 existing + 14 new = 26.)

- [ ] **Step 5: Full suite + commit**

Run: `yarn test:run` → PASS (441).

```bash
git add src/data/library.js LICENSE README.md
git commit -m "docs: regrouped library, LICENSE exception covers the v1.3.0 titles, README refresh"
```

---

### Task 10: Release v1.3.0

**Files:**
- Modify: `package.json` (version)
- Modify: `CHANGELOG.md` (verify the 1.3.0 section against reality)
- Modify: `README.md` (test count on line 23)

- [ ] **Step 1: Full verification**

```bash
yarn test:run
```
Expected: PASS. Note the final test/file counts from the summary line.

```bash
yarn build
```
Expected: builds clean; `dist/` contains `programs/` with all new files (postbuild copies `public/`). Then `node scripts/probe-program.js public/programs/sstrek.cas 6` one last time on the committed artifact.

- [ ] **Step 2: True-up the docs**

- `README.md` line 23: update "423 vitest tests across 27 files" to the actual counts from Step 1.
- `CHANGELOG.md` `[1.3.0]` section: confirm every listed title/feature actually shipped (substitute alternates); confirm the date is today.
- If any numbers changed in Task 9's README edits (26/nine), re-verify them.

- [ ] **Step 3: Bump the version**

In `package.json`: `"version": "1.3.0"`. The status bar and the changelog version test pick this up automatically — run `yarn test:run tests/unit/changelog-tests.js` → PASS proves CHANGELOG.md mentions 1.3.0.

- [ ] **Step 4: Release commit and tag**

```bash
git add package.json CHANGELOG.md README.md
git commit -m "chore: release v1.3.0"
git tag v1.3.0
```

Do NOT push unless the user asks.

---

## Self-Review (completed)

- **Spec coverage:** titles (5+3+SST+5) → Tasks 5–8; grouping → Task 9; LICENSE → Task 9; changelog backfill + renderer + modal → Task 3; status bar + version + ratio math → Task 2; 2× default (+ preserved prefs, legacy "fit") → Task 1; probe tooling & acceptance tests → Tasks 4–8; release/tag practice → Task 10. Retro-Zap/runtime-fetch stay out of scope.
- **Placeholder scan:** the `0x0000` entries in Task 5 Step 4 are explicitly marked MUST-replace with probe output (data discovery, not a plan gap); no TBDs remain.
- **Type consistency:** `renderChangelogHtml`/`initChangelog` names match between Task 3 steps; probe/builder both use `TRS80System({ romData })`, `memory.readWord`/`memory.readByte` (verified at `src/core/memory.js:80,118`), `typeText(text, {enterTStates})` per verified sources; ML_GAMES row shape `[file, format, entry]` matches the existing test; SST and OPUS-1 both carry `group: "Extras"` consistently across Tasks 3, 8, 9.
