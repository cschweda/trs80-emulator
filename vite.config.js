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
    port: 5150,
    open: true,
  },

  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@core": resolve(__dirname, "./src/core"),
      "@peripherals": resolve(__dirname, "./src/peripherals"),
      "@system": resolve(__dirname, "./src/system"),
      "@ui": resolve(__dirname, "./src/ui"),
      "@data": resolve(__dirname, "./src/data"),
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
