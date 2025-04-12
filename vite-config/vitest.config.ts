import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "../src"),
    },
  },
  test: {
    dir: "./src/tests/unit",
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/tests/unit/setup.ts",
    css: true,
    reporters: [
      "default",
      "verbose",
      "dot",
      ["junit", { outputFile: "reports/junit.xml" }],
      ["json", { outputFile: "reports/test-results.json" }],
      ["html", { outputFile: "reports/index.html" }],
    ],
    outputFile: {
      json: "./reports/json-results.json",
      junit: "./reports/junit-results.xml",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./coverage",
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/tests/**",
        "**/*.d.ts",
        "**/*.config.ts",
        "**/src/tests/**",
        "**/src/types/**",
        "**/src/electron/main/index.ts", // Entry points typically have minimal logic
        "**/src/electron/preload/index.ts",
      ],
      include: ["src/**/*.{ts,tsx}"],
      all: true, // Enables coverage for files that haven't been tested directly
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
  },
});
