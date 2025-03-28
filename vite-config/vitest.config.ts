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
  },
});
