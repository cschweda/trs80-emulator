/**
 * Legacy Phase 0-6 development consoles
 *
 * The in-browser build-verification consoles from the project's phased
 * build-out: test runners for each phase, the BASIC/graphics source
 * modals, and the design-document viewer. Kept for reference (the
 * authoritative suite is the vitest one); loaded behind a dynamic
 * import from the View dropdown so none of this ships in the main
 * emulator chunk's execution path.
 */

import { showTab } from "@ui/emulator-ui.js";

// Console output target (the phase consoles render into this div)
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

// Graphics Modal Functions
window.showGraphicsModal = function (title, source, graphicsData = null) {
  const modal = document.getElementById("graphics-modal");
  const modalHeader = document.getElementById("graphics-modal-header");
  const titleDiv = document.getElementById("graphics-modal-title");
  const sourcePre = document.getElementById("graphics-modal-source");
  const canvas = document.getElementById("graphics-modal-canvas");

  if (!modal || !modalHeader || !titleDiv || !sourcePre || !canvas) {
    console.error("Graphics modal elements not found");
    return;
  }

  modalHeader.textContent = "Graphics Display & Source Code";
  titleDiv.innerHTML = `<h3 style="color: #0ff; margin-bottom: 10px;">${title}</h3>`;
  sourcePre.textContent = source;

  // Render graphics if provided
  if (graphicsData) {
    const ctx = canvas.getContext("2d");
    const scale = 4;
    canvas.width = 128 * scale;
    canvas.height = 48 * scale;

    // Fill background
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw pixels
    ctx.fillStyle = "#00FF00"; // TRS-80 green
    for (let y = 0; y < 48; y++) {
      for (let x = 0; x < 128; x++) {
        if (graphicsData[y] && graphicsData[y][x] === 1) {
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }
  } else {
    // Clear canvas
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  modal.style.display = "block";
};

window.closeGraphicsModal = function () {
  const modal = document.getElementById("graphics-modal");
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
      closeGraphicsModal();
      return;
    }

    // Handle graphics links
    let graphicsTarget = event.target;
    while (graphicsTarget && graphicsTarget !== document.body) {
      if (
        graphicsTarget.classList &&
        graphicsTarget.classList.contains("graphics-link")
      ) {
        event.preventDefault();
        event.stopPropagation();
        const title =
          graphicsTarget.getAttribute("data-graphics-title") ||
          "Graphics Display";
        let source = graphicsTarget.getAttribute("data-graphics-source") || "";
        const graphicsDataStr =
          graphicsTarget.getAttribute("data-graphics-data");

        // Decode HTML entities
        source = source
          .replace(/&#10;/g, "\n")
          .replace(/&#13;/g, "\r")
          .replace(/&quot;/g, '"');

        // Parse graphics data if provided (JSON string)
        let graphicsData = null;
        if (graphicsDataStr) {
          try {
            graphicsData = JSON.parse(graphicsDataStr);
          } catch (e) {
            console.error("Failed to parse graphics data:", e);
          }
        }

        showGraphicsModal(title, source, graphicsData);
        return;
      }
      graphicsTarget = graphicsTarget.parentElement;
    }

    // Close graphics modal when clicking outside
    const graphicsModal = document.getElementById("graphics-modal");
    if (event.target === graphicsModal) {
      closeGraphicsModal();
      return;
    }
  },
  true
); // Use capture phase

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
    const { runAllPhase1Tests } = await import("@/browser-test-runner.js");
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
      "@/browser-test-runner-phase2.js"
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
      "@/browser-test-runner-phase3.js"
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
      "@/browser-test-runner-phase4.js"
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

// Phase 5 Video Display Test function
window.runPhase5Test = async function () {
  showTab("console");
  consoleDiv.innerHTML = "";
  consoleDiv.scrollTop = 0;

  log("═══════════════════════════════════════════════════════════", "info");
  log("Video Display System Comprehensive Test Suite - Phase 5", "info");
  log("═══════════════════════════════════════════════════════════", "info");
  log("");
  log("🚀 Starting Phase 5: Video Display System Test Suite...", "info");
  log("📥 Loading Phase 5 test runner...", "info");
  log("");

  try {
    const { runAllPhase5Tests } = await import(
      "@/browser-test-runner-phase5.js"
    );
    const results = await runAllPhase5Tests(log);

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
        log(
          `  └───────────────────────────────────────────────────────────────┘`,
          "error"
        );
        log("");
      });
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
      "💡 Note: Click 'View Graphics & Source' links to see graphics and BASIC code",
      "info"
    );
    log("═══════════════════════════════════════════════════════════", "info");

    requestAnimationFrame(() => {
      consoleDiv.scrollTop = 0;
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

// Phase 6 Command-Line Interface Test function
window.runPhase6Test = async function () {
  // Show Phase 6 container
  showTab("phase6");

  const phase6Container = document.getElementById("phase6-container");
  const phase6Terminal = document.getElementById("phase6-terminal");
  const phase6Input = document.getElementById("phase6-input");
  const phase6Prompt = document.getElementById("phase6-prompt");

  // Clear terminal - RESET everything
  phase6Terminal.innerHTML = "";

  // Reset prompt
  if (phase6Prompt) {
    phase6Prompt.textContent = "";
  }

  // Ensure input is enabled and visible - CRITICAL for input to work
  if (phase6Input) {
    phase6Input.disabled = false;
    phase6Input.readOnly = false;
    phase6Input.style.display = "block";
    phase6Input.style.visibility = "visible";
    phase6Input.style.opacity = "1";
    phase6Input.value = "";
    phase6Input.placeholder = "";
    phase6Input.removeAttribute("readonly");
    // Force focus immediately
    phase6Input.focus();
  }

  // Clear any existing command line instance - we'll create a fresh one
  window.trs80CmdLine = null;

  // Create log function for Phase 6 terminal
  function terminalLog(message, type = "info") {
    const line = document.createElement("div");
    line.className = `terminal-line ${type}`;

    // Handle HTML content (for links, etc.)
    if (
      message.includes("<span") ||
      message.includes("<a") ||
      message.includes("onclick")
    ) {
      line.innerHTML = message;
    } else {
      line.textContent = message;
    }

    phase6Terminal.appendChild(line);
    // Auto-scroll to bottom
    phase6Terminal.scrollTop = phase6Terminal.scrollHeight;
  }

  // Set up input handler immediately (before cmdLine is created)
  let cmdLine = null;

  const handleInput = async (e) => {
    // Check if we're in edit mode
    if (cmdLine && cmdLine.editMode) {
      // Get the character to insert
      let char = null;
      if (e.key.length === 1) {
        char = e.shiftKey ? e.key.toUpperCase() : e.key.toLowerCase();
      } else if (e.key === " ") {
        char = " ";
      }

      const handled = await cmdLine.handleEditInput(e.key, char);
      if (handled) {
        e.preventDefault();
        // Update the input field value to reflect the edit buffer
        if (cmdLine.editBuffer !== undefined) {
          phase6Input.value = cmdLine.editBuffer;
          setTimeout(() => {
            phase6Input.setSelectionRange(
              cmdLine.editCursor,
              cmdLine.editCursor
            );
          }, 10);
        }
        return;
      }
    }

    // Handle BREAK/Escape key to stop running program
    if (
      (e.key === "Escape" || e.key === "Break") &&
      cmdLine &&
      cmdLine.programRunning
    ) {
      e.preventDefault();
      await cmdLine.handleBREAK();
      setTimeout(() => phase6Input.focus(), 10);
      return;
    }

    if (e.key === "Enter") {
      const command = phase6Input.value.trim();
      phase6Input.value = "";

      if (command && cmdLine) {
        // Check if it's a BREAK command
        if (command.toUpperCase() === "BREAK" && cmdLine.programRunning) {
          await cmdLine.handleBREAK();
        } else {
          // Don't update prompt here - let the command handler do it
          await cmdLine.processCommand(command);
        }
        // Refocus input after command
        setTimeout(() => phase6Input.focus(), 10);
      } else if (command && !cmdLine) {
        terminalLog(
          `Command not available yet. Please wait for initialization.`,
          "error"
        );
        setTimeout(() => phase6Input.focus(), 10);
      } else {
        // Empty command - just refocus
        setTimeout(() => phase6Input.focus(), 10);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (cmdLine) {
        const prevCmd = cmdLine.getPreviousCommand();
        if (prevCmd) {
          phase6Input.value = prevCmd;
        }
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (cmdLine) {
        const nextCmd = cmdLine.getNextCommand();
        if (nextCmd) {
          phase6Input.value = nextCmd;
        } else {
          phase6Input.value = "";
          cmdLine.historyIndex = cmdLine.commandHistory.length;
        }
      }
    }
  };

  // Attach event listener immediately - remove old listeners first
  phase6Input.removeEventListener("keydown", handleInput);
  phase6Input.addEventListener("keydown", handleInput);

  // Also handle keypress for better compatibility
  phase6Input.addEventListener("keypress", (e) => {
    // Allow all keypresses through
    if (e.key === "Enter") {
      e.preventDefault();
      handleInput(e);
    }
  });

  // Make sure input can receive focus and clicks
  phase6Input.setAttribute("tabindex", "0");

  // Add click handler to ensure focus works
  phase6Input.addEventListener("click", () => {
    phase6Input.focus();
  });

  // Add focus handler to ensure it stays focused
  phase6Input.addEventListener("blur", () => {
    // Re-focus if we lose focus (unless user clicked elsewhere intentionally)
    setTimeout(() => {
      if (phase6Container && phase6Container.style.display !== "none") {
        phase6Input.focus();
      }
    }, 100);
  });

  // Initialize command-line interface
  try {
    const { runAllPhase6Tests, TRS80CommandLine } = await import(
      "@/browser-test-runner-phase6.js"
    );

    // Don't run tests automatically - just boot into BASIC
    // The tests can be run separately if needed

    // Always create a fresh command-line interface (reset on each Phase 6 activation)
    // This simulates pressing the reset button on the TRS-80
    const consoleDiv = document.getElementById("console");
    cmdLine = new TRS80CommandLine(terminalLog, phase6Terminal);
    window.trs80CmdLine = cmdLine;

    // Update command-line interface to use Phase 6 terminal
    cmdLine.logFn = terminalLog;
    cmdLine.container = phase6Terminal;
    cmdLine.onPromptUpdate = (prompt) => {
      phase6Prompt.textContent = prompt;
    };
    cmdLine.onBootComplete = () => {
      phase6Prompt.textContent = "READY";
      // Focus input after a short delay to ensure it's ready
      setTimeout(() => {
        phase6Input.disabled = false;
        phase6Input.readOnly = false;
        phase6Input.focus();
        // Force focus with click as well
        phase6Input.click();
      }, 200);
    };

    // Override requestInput to handle INPUT statements
    if (cmdLine.interpreter) {
      cmdLine.requestInput = async (prompt) => {
        return new Promise((resolve) => {
          // Show prompt
          terminalLog(prompt, "info");

          // Create a temporary input handler
          const inputHandler = async (e) => {
            if (e.key === "Enter") {
              const value = phase6Input.value.trim();
              phase6Input.value = "";
              phase6Input.removeEventListener("keydown", inputHandler);
              resolve(value);
            }
          };

          phase6Input.addEventListener("keydown", inputHandler);
          phase6Input.focus();
        });
      };
    }

    // Set up edit mode change handler
    cmdLine.onEditModeChange = (inEditMode, lineNumber, lineContent) => {
      if (inEditMode) {
        phase6Prompt.textContent = `${lineNumber}`;
        phase6Input.value = lineContent || "";
        phase6Input.placeholder = `Editing line ${lineNumber} - Use arrow keys, spacebar, or type to edit. Press Enter to save, Esc to cancel.`;
        // Set cursor to end
        setTimeout(() => {
          phase6Input.setSelectionRange(
            phase6Input.value.length,
            phase6Input.value.length
          );
        }, 10);
      } else {
        phase6Prompt.textContent = "READY";
        phase6Input.placeholder = "";
        phase6Input.value = "";
        phase6Input.focus();
      }
    };

    // Set up edit display update handler
    cmdLine.onEditDisplayUpdate = (displayText) => {
      // Update the input field to show the edit state
      const lineMatch = displayText.match(/^(\d+)\s+(.+)$/);
      if (lineMatch) {
        const lineContent = lineMatch[2];
        // Replace underscore with actual cursor position
        const cursorPos = lineContent.indexOf("_");
        if (cursorPos !== -1) {
          const beforeCursor = lineContent.substring(0, cursorPos);
          const afterCursor = lineContent.substring(cursorPos + 1);
          phase6Input.value = beforeCursor + afterCursor;
          // Set cursor position
          setTimeout(() => {
            phase6Input.setSelectionRange(cursorPos, cursorPos);
          }, 10);
        }
      }
    };

    // Wait for boot to complete before showing help
    // Help will be shown after boot sequence completes
  } catch (error) {
    terminalLog(`❌ Fatal Error: ${error.message}`, "error");
    terminalLog(error.stack, "error");
    // Still enable input even if there's an error
    setTimeout(() => {
      phase6Input.disabled = false;
      phase6Input.focus();
    }, 100);
  }
};


// Route a View-dropdown selection to the right console. The emulator
// case never reaches here (main.js handles it without loading this
// module).
export function selectLegacyView(value) {
  switch (value) {
    case "design":
      window.showDesignDoc();
      break;
    case "phase1":
      window.runCPUTest();
      break;
    case "phase2":
      window.runMemoryTest();
      break;
    case "phase3":
      window.runPhase3Test();
      break;
    case "phase4":
      window.runPhase4Test();
      break;
    case "phase5":
      window.runPhase5Test();
      break;
    case "phase6":
      window.runPhase6Test();
      break;
  }
}

// Greeting shown the first time a phase view opens the console
log("TRS-80 Model III Emulator - Development Console", "success");
log(
  "Use the View dropdown (top right) to run the Phase 0-6 build-verification consoles; pick Emulator to return to the machine.",
  "info"
);
