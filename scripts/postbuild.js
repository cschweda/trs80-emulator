#!/usr/bin/env node
/**
 * Post-build script to show serving instructions and clickable link
 */

import { execSync, spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { platform } from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 5150; // Default Vite preview port
const DIST_DIR = resolve(__dirname, "../dist");
const URL = `http://localhost:${PORT}`;

// Check if running in CI environment
const isCI =
  process.env.CI === "true" ||
  process.env.NETLIFY === "true" ||
  process.env.VERCEL === "true";

// Cross-platform browser opener
function openBrowser(url) {
  const plat = platform();
  let command;

  if (plat === "darwin") {
    command = "open";
  } else if (plat === "win32") {
    command = "start";
  } else {
    command = "xdg-open";
  }

  try {
    spawn(command, [url], { detached: true, stdio: "ignore" });
  } catch (error) {
    console.log(
      `⚠️  Could not automatically open browser. Please visit: ${url}`
    );
  }
}

// Only show messages if not in CI
if (!isCI) {
  console.log("\n");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("✅ Build completed successfully!");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("\n");
  console.log("📦 Built files are in: dist/");
  console.log("\n");
  console.log("🌐 To serve the built files, run one of these commands:");
  console.log("\n");
  console.log("   Option 1 (using npx serve):");
  console.log(`   npx serve dist -p ${PORT}`);
  console.log("\n");
  console.log("   Option 2 (using Vercel CLI):");
  console.log(`   npx vercel serve dist --listen ${PORT}`);
  console.log("\n");
  console.log("   Option 3 (using Vite preview):");
  console.log("   yarn preview");
  console.log("\n");
  console.log("   Option 4 (build and serve automatically):");
  console.log("   yarn build:serve");
  console.log("\n");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("🔗 Quick start - click this link to open in browser:");
  console.log(`   ${URL}`);
  console.log("═══════════════════════════════════════════════════════════");
  console.log("\n");
}

// Check if user wants to auto-serve
const args = process.argv.slice(2);
if (args.includes("--serve") || args.includes("-s")) {
  console.log("🚀 Starting preview server...\n");

  // Open browser after a short delay
  setTimeout(() => {
    console.log(`\n🌐 Opening browser at ${URL}...\n`);
    openBrowser(URL);
  }, 2000);

  try {
    // Use vite preview as it's already configured
    // Spawn in background so we can open browser
    const server = spawn("yarn", ["preview"], {
      stdio: "inherit",
      cwd: resolve(__dirname, ".."),
      shell: true,
    });

    server.on("error", (error) => {
      console.log("⚠️  Vite preview not available, trying npx serve...\n");
      // Fallback to npx serve
      const serveProcess = spawn("npx", ["serve", "dist", "-p", String(PORT)], {
        stdio: "inherit",
        cwd: resolve(__dirname, ".."),
        shell: true,
      });

      serveProcess.on("error", (err) => {
        console.error("❌ Failed to start server:", err.message);
        process.exit(1);
      });
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
}
