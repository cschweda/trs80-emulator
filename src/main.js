/**
 * TRS-80 Model III Emulator - Main Entry Point
 * Development version with console output
 */

import { Z80CPU } from "./core/z80cpu.js";

// Console output helper
const consoleDiv = document.getElementById("console");

function log(message, type = "info") {
  const logEntry = document.createElement("div");
  logEntry.className = `log ${type}`;
  logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  consoleDiv.appendChild(logEntry);
  consoleDiv.scrollTop = consoleDiv.scrollHeight;

  // Also log to browser console
  if (type === "error") {
    console.error(message);
  } else if (type === "success") {
    console.log(`✅ ${message}`);
  } else {
    console.log(message);
  }
}

// Make log function available globally for button clicks
window.log = log;

// Clear console function
window.clearConsole = function () {
  consoleDiv.innerHTML = "";
  console.clear();
};

// CPU Test function - Runs all Phase 1 tests via dynamic import
window.runCPUTest = async function () {
  log("═══════════════════════════════════════════════════════════", "info");
  log("Z80 CPU Comprehensive Test Suite - Phase 1", "info");
  log("═══════════════════════════════════════════════════════════", "info");
  log("");
  log("🚀 Starting Phase 1 Test Suite...", "info");
  log("📥 Loading test runner...", "info");
  log("");

  try {
    // Import the browser test runner
    const { runAllPhase1Tests } = await import("./browser-test-runner.js");
    const results = await runAllPhase1Tests(log);

    log("═══════════════════════════════════════════════════════════", "info");
    log("📊 Test Results Summary:", "info");
    log(`  Total Tests: ${results.total}`, "info");
    log(
      `  ✅ Passed: ${results.passed}`,
      results.passed === results.total ? "success" : "info"
    );
    log(
      `  ❌ Failed: ${results.failed}`,
      results.failed > 0 ? "error" : "success"
    );
    log("");

    if (results.errors.length > 0) {
      log(
        "═══════════════════════════════════════════════════════════",
        "error"
      );
      log("❌ Test Failures:", "error");
      log(
        "═══════════════════════════════════════════════════════════",
        "error"
      );
      log("");
      results.errors.forEach((err, idx) => {
        const testName = err.test || "Unknown test";
        const suiteName = err.suite || "Unknown suite";
        log(
          `  ┌─ Failure #${
            idx + 1
          } ────────────────────────────────────────────┐`,
          "error"
        );
        log(`  │ Suite: ${suiteName.padEnd(50)} │`, "error");
        log(`  │ Test:  ${testName.padEnd(50)} │`, "error");
        const errorMsg = (err.error || "Unknown error").substring(0, 50);
        log(`  │ Error: ${errorMsg.padEnd(50)} │`, "error");
        if (err.name) {
          log(`  │ Type:  ${err.name.padEnd(50)} │`, "error");
        }
        if (err.stack) {
          log(`  │ Stack Trace:`, "error");
          const stackLines = err.stack.split("\n").slice(0, 8);
          stackLines.forEach((line, lineIdx) => {
            if (lineIdx > 0) {
              // Skip first line (error message)
              const trimmed = line.trim().substring(0, 55);
              log(`  │   ${trimmed.padEnd(55)} │`, "error");
            }
          });
        }
        log(
          `  └───────────────────────────────────────────────────────────────┘`,
          "error"
        );
        log("");
      });
      log(
        "═══════════════════════════════════════════════════════════",
        "error"
      );
      log("");
    }

    if (results.failed === 0 && results.total > 0) {
      log("✅ All tests passed!", "success");
    } else if (results.total === 0) {
      log("⚠️  No tests were executed", "error");
    } else {
      log(`⚠️  ${results.failed} test(s) failed. See errors above.`, "error");
    }

    log("═══════════════════════════════════════════════════════════", "info");
    log(
      "💡 Note: For complete 130-test coverage, run: yarn test:run tests/unit/cpu-tests.js",
      "info"
    );
    log("═══════════════════════════════════════════════════════════", "info");

    return results;
  } catch (error) {
    log(`❌ Fatal Error: ${error.message}`, "error");
    log(error.stack, "error");
    return {
      total: 0,
      passed: 0,
      failed: 1,
      errors: [{ suite: "Setup", error: error.message }],
    };
  }
};

// Auto-run test on page load (optional)
log("TRS-80 Model III Emulator - Development Console Ready", "success");
log('Click "Run CPU Test" to execute CPU tests', "info");
log("Or use window.runCPUTest() in browser console", "info");
