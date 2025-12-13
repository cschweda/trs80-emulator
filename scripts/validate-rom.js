#!/usr/bin/env node
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const romPath = join(__dirname, "../public/assets/model3.rom");

try {
  const romBuffer = readFileSync(romPath);
  const size = romBuffer.length;

  console.log(`ROM File: ${romPath}`);
  console.log(`ROM Size: ${size} bytes (${(size / 1024).toFixed(1)}KB)`);

  if (size === 14336) {
    console.log("✓ Valid 14KB ROM");
  } else if (size === 16384) {
    console.log("✓ Valid 16KB ROM");
  } else {
    console.warn(`⚠ Unexpected ROM size (expected 14336 or 16384)`);
    process.exit(1);
  }

  // Check for non-zero content
  let nonZeroCount = 0;
  for (let i = 0; i < Math.min(1000, size); i++) {
    if (romBuffer[i] !== 0) nonZeroCount++;
  }

  if (nonZeroCount < 100) {
    console.warn("⚠ ROM appears to be mostly zeros - may be corrupted");
    process.exit(1);
  } else {
    console.log(
      `✓ ROM appears valid (${nonZeroCount} non-zero bytes in first 1KB)`
    );
  }

  console.log("\n✓ ROM validation complete");
} catch (error) {
  console.error(`Error validating ROM: ${error.message}`);
  process.exit(1);
}




