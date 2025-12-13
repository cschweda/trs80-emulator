#!/usr/bin/env node
/**
 * Phase-by-Phase Test Workflow Script
 *
 * Enforces test gates between development phases.
 * Runs tests for a phase and waits for user confirmation before proceeding.
 *
 * Usage:
 *   node scripts/phase-workflow.js <phase-number> <test-file-or-files>
 *
 * Examples:
 *   node scripts/phase-workflow.js 1 tests/unit/cpu-tests.js
 *   node scripts/phase-workflow.js 3 "tests/unit/cassette-tests.js tests/unit/io-tests.js"
 */

import { execSync } from "child_process";
import readline from "readline";

const phaseNumber = process.argv[2];
const testFiles = process.argv[3];

if (!phaseNumber || !testFiles) {
  console.error(
    "Usage: node scripts/phase-workflow.js <phase-number> <test-files>"
  );
  console.error(
    "Example: node scripts/phase-workflow.js 1 tests/unit/cpu-tests.js"
  );
  process.exit(1);
}

const phaseNames = {
  0: "ROM Analysis and Setup",
  1: "Z80 CPU Core Implementation",
  2: "Memory Management System",
  3: "Cassette I/O System",
  4: "Video Display System",
  5: "System Integration",
  6: "Sample Programs Library and User Interface",
  7: "Z80 Assembler Integration",
};

const phaseName = phaseNames[phaseNumber] || `Phase ${phaseNumber}`;

console.log("\n" + "=".repeat(70));
console.log(`PHASE ${phaseNumber} TEST GATE: ${phaseName}`);
console.log("=".repeat(70));
console.log(`\nRunning tests for Phase ${phaseNumber}...\n`);

try {
  // Run tests
  const testCommand = `yarn test:run ${testFiles}`;
  console.log(`Command: ${testCommand}\n`);

  execSync(testCommand, {
    stdio: "inherit",
    cwd: process.cwd(),
  });

  // If we get here, tests passed (execSync throws on non-zero exit)
  console.log("\n" + "=".repeat(70));
  console.log(`✅ PHASE ${phaseNumber} TESTS PASSED`);
  console.log("=".repeat(70));
  console.log(`\nAll tests for ${phaseName} have passed successfully.`);
  console.log("\nPhase Completion Checklist:");
  console.log("  ✅ All unit tests pass (100% success rate)");
  console.log("  ✅ No console errors");
  console.log("  ✅ Phase completion criteria met");
  console.log("  ✅ Code follows specifications");

  // Wait for user confirmation
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question("\n⚠️  Ready to proceed to next phase? (yes/no): ", (answer) => {
    rl.close();

    if (answer.toLowerCase() === "yes" || answer.toLowerCase() === "y") {
      console.log("\n✅ User confirmed. Proceeding to next phase...\n");
      process.exit(0);
    } else {
      console.log(
        "\n⏸️  Phase advancement paused. Fix any issues or review code before proceeding.\n"
      );
      console.log("When ready, run the workflow script for the next phase.");
      process.exit(0);
    }
  });
} catch (error) {
  // Tests failed
  console.log("\n" + "=".repeat(70));
  console.log(`❌ PHASE ${phaseNumber} TESTS FAILED`);
  console.log("=".repeat(70));
  console.log(`\nTests for ${phaseName} have failed.`);
  console.log(
    "\n⚠️  BLOCKING: Cannot proceed to next phase until all tests pass."
  );
  console.log("\nNext Steps:");
  console.log("  1. Review test failures above");
  console.log("  2. Fix implementation issues");
  console.log("  3. Re-run tests: yarn test:run " + testFiles);
  console.log("  4. Once all tests pass, run this workflow script again");
  console.log("\nDo not proceed to the next phase until all tests pass.\n");
  process.exit(1);
}



