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

  // Check if message contains HTML (like our BASIC source links)
  const timePrefix = `[${new Date().toLocaleTimeString()}] `;
  if (
    message.includes("<span") ||
    message.includes("<a") ||
    message.includes("onclick")
  ) {
    // Message contains HTML - use innerHTML
    logEntry.innerHTML = timePrefix + message;
  } else {
    // Plain text - use textContent for safety
    logEntry.textContent = timePrefix + message;
  }

  consoleDiv.appendChild(logEntry);
  // Don't auto-scroll - keep scroll position at top so user can scroll down to view content

  // Also log to browser console (strip HTML for console)
  const plainMessage = message.replace(/<[^>]*>/g, "");
  if (type === "error") {
    console.error(plainMessage);
  } else if (type === "success") {
    console.log(`✅ ${plainMessage}`);
  } else {
    console.log(plainMessage);
  }
}

// Make log function available globally for button clicks
window.log = log;

// BASIC Program Modal Functions
window.showBasicModal = function (title, source, results = null) {
  const modal = document.getElementById("basic-modal");
  const modalHeader = document.getElementById("basic-modal-header");
  const titleDiv = document.getElementById("basic-modal-title");
  const sourcePre = document.getElementById("basic-modal-source");
  const resultsContainer = document.getElementById(
    "basic-modal-results-container"
  );
  const resultsPre = document.getElementById("basic-modal-results");

  if (
    !modal ||
    !modalHeader ||
    !titleDiv ||
    !sourcePre ||
    !resultsContainer ||
    !resultsPre
  ) {
    console.error("Modal elements not found");
    return;
  }

  // Update header based on whether results are present
  if (results) {
    modalHeader.textContent = "BASIC Program Source Code & Results";
  } else {
    modalHeader.textContent = "BASIC Program Source Code";
  }

  titleDiv.innerHTML = `<h3 style="color: #0ff; margin-bottom: 10px;">${title}</h3>`;
  // Source is already unescaped from data attribute
  sourcePre.textContent = source;

  // Show results if provided
  if (results) {
    resultsPre.textContent = results;
    resultsContainer.style.display = "block";
  } else {
    resultsContainer.style.display = "none";
  }

  modal.style.display = "block";
};

window.closeBasicModal = function () {
  const modal = document.getElementById("basic-modal");
  if (modal) modal.style.display = "none";
};

// Event delegation for BASIC source links
// Use capture phase to ensure we catch the event
document.addEventListener(
  "click",
  function (event) {
    // Check if clicked element or its parent is a basic-link
    let target = event.target;
    while (target && target !== document.body) {
      if (target.classList && target.classList.contains("basic-link")) {
        event.preventDefault();
        event.stopPropagation();
        const title =
          target.getAttribute("data-basic-title") || "BASIC Program";
        let source = target.getAttribute("data-basic-source") || "";
        const results = target.getAttribute("data-basic-results") || null;
        // Decode HTML entities
        source = source
          .replace(/&#10;/g, "\n")
          .replace(/&#13;/g, "\r")
          .replace(/&quot;/g, '"');
        let decodedResults = null;
        if (results) {
          decodedResults = results
            .replace(/&#10;/g, "\n")
            .replace(/&#13;/g, "\r")
            .replace(/&quot;/g, '"');
        }
        showBasicModal(title, source, decodedResults);
        return;
      }
      target = target.parentElement;
    }

    // Close modal when clicking outside of it
    const modal = document.getElementById("basic-modal");
    if (event.target === modal) {
      closeBasicModal();
      return;
    }

    // Close modal when clicking close button
    if (event.target.classList && event.target.classList.contains("close")) {
      closeBasicModal();
      return;
    }
  },
  true
); // Use capture phase

// Tab management - ensure only one tab is visible at a time
function showTab(tabName) {
  const console = document.getElementById("console");
  const designDocContainer = document.getElementById("design-doc-container");

  // Hide all tabs first
  if (console) console.style.display = "none";
  if (designDocContainer) designDocContainer.style.display = "none";

  // Show the requested tab
  if (tabName === "console") {
    if (console) {
      console.style.display = "block";
      // Focus the console so scroll/keyboard navigation works
      console.focus();
      // Reset scroll position to top when showing console
      console.scrollTop = 0;
    }
  } else if (tabName === "design-doc") {
    if (designDocContainer) designDocContainer.style.display = "block";
  }
}

// Show design document function
window.showDesignDoc = async function () {
  showTab("design-doc");
  const contentDiv = document.getElementById("design-doc-content");
  if (contentDiv && !contentDiv.dataset.loaded) {
    try {
      const response = await fetch("/TRS80-COMPLETE-BUILD-PROMPT.html");
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      contentDiv.innerHTML = doc.body.innerHTML;
      contentDiv.dataset.loaded = "true";
    } catch (error) {
      contentDiv.innerHTML = `<p style="color: #f00;">Error loading design document: ${error.message}</p>`;
    }
  }
};

// Z80 CPU Test function - Runs all Phase 1 tests via dynamic import
window.runCPUTest = async function () {
  // Always show console first when running tests
  showTab("console");

  // Clear any previous test output
  consoleDiv.innerHTML = "";
  // Reset scroll position to top
  consoleDiv.scrollTop = 0;

  log("═══════════════════════════════════════════════════════════", "info");
  log("Z80 CPU Comprehensive Test Suite - Phase 1", "info");
  log("═══════════════════════════════════════════════════════════", "info");
  log("");
  log("🚀 Starting Phase 1: Z80 CPU Test Suite...", "info");
  log("📥 Loading Z80 CPU test runner...", "info");
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

    // Ensure scroll position stays at top after all content is loaded
    // Use multiple strategies to ensure scroll stays at top
    requestAnimationFrame(() => {
      consoleDiv.scrollTop = 0;
      // Also set after a small delay to catch any late DOM updates
      setTimeout(() => {
        consoleDiv.scrollTop = 0;
      }, 100);
    });

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

// Memory System Test function - Runs all Phase 2 tests via dynamic import
window.runMemoryTest = async function () {
  // Always show console first when running tests
  showTab("console");

  // Clear any previous test output
  consoleDiv.innerHTML = "";
  // Reset scroll position to top
  consoleDiv.scrollTop = 0;

  log("═══════════════════════════════════════════════════════════", "info");
  log("Memory System Comprehensive Test Suite - Phase 2", "info");
  log("═══════════════════════════════════════════════════════════", "info");
  log("");
  log("🚀 Starting Phase 2: Memory System Test Suite...", "info");
  log("📥 Loading Memory System test runner...", "info");
  log("");

  try {
    // Import the browser test runner
    const { runAllPhase2Tests } = await import(
      "./browser-test-runner-phase2.js"
    );
    const results = await runAllPhase2Tests(log);

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
      "💡 Note: For complete 28-test coverage, run: yarn test:run tests/unit/memory-tests.js",
      "info"
    );
    log("═══════════════════════════════════════════════════════════", "info");

    // Ensure scroll position stays at top after all content is loaded
    // Use multiple strategies to ensure scroll stays at top
    requestAnimationFrame(() => {
      consoleDiv.scrollTop = 0;
      // Also set after a small delay to catch any late DOM updates
      setTimeout(() => {
        consoleDiv.scrollTop = 0;
      }, 100);
    });

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

// Cassette & I/O System Test function - Runs all Phase 3 tests via dynamic import
window.runPhase3Test = async function () {
  // Always show console first when running tests
  showTab("console");

  // Clear any previous test output
  consoleDiv.innerHTML = "";
  // Reset scroll position to top
  consoleDiv.scrollTop = 0;

  log("═══════════════════════════════════════════════════════════", "info");
  log("Cassette & I/O System Comprehensive Test Suite - Phase 3", "info");
  log("═══════════════════════════════════════════════════════════", "info");
  log("");
  log("🚀 Starting Phase 3: Cassette & I/O System Test Suite...", "info");
  log("📥 Loading Phase 3 test runner...", "info");
  log("");

  try {
    // Import the browser test runner
    const { runAllPhase3Tests } = await import(
      "./browser-test-runner-phase3.js"
    );
    const results = await runAllPhase3Tests(log);

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
      "💡 Note: For complete 37-test coverage, run: yarn test:run tests/unit/cassette-tests.js tests/unit/io-tests.js",
      "info"
    );
    log("═══════════════════════════════════════════════════════════", "info");

    // Ensure scroll position stays at top after all content is loaded
    // Use multiple strategies to ensure scroll stays at top
    requestAnimationFrame(() => {
      consoleDiv.scrollTop = 0;
      // Also set after a small delay to catch any late DOM updates
      setTimeout(() => {
        consoleDiv.scrollTop = 0;
      }, 100);
    });

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

// BASIC Program Execution Test function - Runs all Phase 4 tests via dynamic import
window.runPhase4Test = async function () {
  // Always show console first when running tests
  showTab("console");

  // Clear any previous test output
  consoleDiv.innerHTML = "";
  // Reset scroll position to top
  consoleDiv.scrollTop = 0;

  log("═══════════════════════════════════════════════════════════", "info");
  log("BASIC Program Execution Comprehensive Test Suite - Phase 4", "info");
  log("═══════════════════════════════════════════════════════════", "info");
  log("");
  log("🚀 Starting Phase 4: BASIC Program Execution Test Suite...", "info");
  log("📥 Loading Phase 4 test runner...", "info");
  log("");

  try {
    // Import the browser test runner
    const { runAllPhase4Tests } = await import(
      "./browser-test-runner-phase4.js"
    );
    const results = await runAllPhase4Tests(log);

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
      "💡 Note: For complete 45-test coverage, run: yarn test:run tests/unit/basic-program-tests.js",
      "info"
    );
    log("═══════════════════════════════════════════════════════════", "info");

    // Ensure scroll position stays at top after all content is loaded
    // Use multiple strategies to ensure scroll stays at top
    requestAnimationFrame(() => {
      consoleDiv.scrollTop = 0;
      // Also set after a small delay to catch any late DOM updates
      setTimeout(() => {
        consoleDiv.scrollTop = 0;
      }, 100);
    });

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

// Initial message
log("TRS-80 Model III Emulator - Development Console Ready", "success");
log(
  'Click "Phase 0: Design Doc", "Phase 1: Z80 CPU", "Phase 2: Memory System", "Phase 3: Cassette & I/O", or "Phase 4: BASIC Programs" to get started',
  "info"
);
