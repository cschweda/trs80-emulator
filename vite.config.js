import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  base: "./",

  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: true,
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
      },
      output: {
        manualChunks: {
          core: [
            "./src/core/z80cpu.js",
            "./src/core/memory.js",
            "./src/core/io.js",
          ],
          peripherals: [
            "./src/peripherals/video.js",
            "./src/peripherals/cassette.js",
            "./src/peripherals/keyboard.js",
          ],
          assembler: [
            "./src/assembler/assembler.js",
            "./src/assembler/lexer.js",
            "./src/assembler/parser.js",
            "./src/assembler/codegen.js",
            "./src/assembler/evaluator.js",
            "./src/assembler/opcodes.js",
          ],
        },
      },
    },
    target: "es2020",
    chunkSizeWarningLimit: 1000,
  },

  server: {
    port: 3000,
    open: true,
    cors: true,
    hmr: {
      overlay: true,
    },
  },

  preview: {
    port: 4173,
    open: true,
  },

  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@core": resolve(__dirname, "./src/core"),
      "@peripherals": resolve(__dirname, "./src/peripherals"),
      "@system": resolve(__dirname, "./src/system"),
      "@ui": resolve(__dirname, "./src/ui"),
      "@utils": resolve(__dirname, "./src/utils"),
      "@data": resolve(__dirname, "./src/data"),
      "@assembler": resolve(__dirname, "./src/assembler"),
    },
  },

  test: {
    globals: true,
    environment: "jsdom",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "tests/", "scripts/", "dist/"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
    include: ["tests/**/*.{js,ts}"],
    exclude: ["node_modules", "dist"],
  },
});


