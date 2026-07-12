/**
 * TRS-80 Model III Emulator - entry point
 *
 * The emulator UI (emulator-ui.js) loads eagerly — it is the product.
 * The Phase 0-6 build-verification consoles (legacy-console.js) load
 * behind a dynamic import the first time one is picked from the View
 * dropdown.
 */

import { emulator } from "@ui/emulator-ui.js";
import { initChangelog } from "@ui/changelog.js";

// The View dropdown: the emulator is the product; the phase consoles are
// kept around to verify each build phase still passes.
window.selectDevView = async function (value) {
  if (value === "emulator") {
    window.showEmulatorTab();
    return;
  }
  try {
    const legacy = await import("@ui/legacy-console.js");
    legacy.selectLegacyView(value);
  } catch (err) {
    console.error("Could not load the phase console:", err);
  }
};

// Dev/debug hook: lets the console (and automated checks) inspect the
// live machine — e.g. __trs80.system.screenText().
window.__trs80 = emulator;

// Restore the machine-case preference (default: skinless full-window view)
try {
  if (localStorage.getItem("trs80-case") === "1") {
    document.body.classList.add("case");
    const caseLabel = document.getElementById("menu-case-label");
    if (caseLabel) caseLabel.textContent = "Hide machine case";
  }
} catch {
  // default skinless
}

// Launch straight into the machine: a 48K cassette Model III, powered on.
window.showEmulatorTab();
initChangelog();
