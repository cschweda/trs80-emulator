#!/usr/bin/env node
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read ROM file
const romPath = join(__dirname, "../public/assets/model3.rom");
let romBuffer;

try {
  romBuffer = readFileSync(romPath);
} catch (error) {
  console.error(`Error reading ROM file: ${error.message}`);
  process.exit(1);
}

// Validate ROM size (supports both 14KB and 16KB)
const romSize = romBuffer.length;
if (romSize !== 14336 && romSize !== 16384) {
  console.warn(
    `Warning: ROM size is ${romSize} bytes (expected 14336 or 16384)`
  );
}

// Convert to base64
const base64ROM = romBuffer.toString("base64");

// Generate JavaScript module
const output = `/**
 * TRS-80 Model III ROM (${romSize} bytes)
 * Auto-generated from model3.rom
 * DO NOT EDIT MANUALLY
 */

const ROM_BASE64 = '${base64ROM}';

/**
 * Decode ROM from base64
 * @returns {Uint8Array} ROM data
 */
export function getROMData() {
  const binaryString = atob(ROM_BASE64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export const ROM_SIZE = ${romSize};
export const ROM_START = 0x0000;
export const ROM_END = ${romSize === 16384 ? "0x3FFF" : "0x37FF"};
`;

// Write to src/data
const outputPath = join(__dirname, "../src/data/model3-rom.js");
writeFileSync(outputPath, output);

console.log(`✓ ROM converted to base64 (${romSize} bytes)`);
console.log(`✓ Written to: ${outputPath}`);







