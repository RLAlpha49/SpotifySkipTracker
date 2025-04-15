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
    reporters: ["default"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/tests/**",
        "**/*.d.ts",
        "**/*.config.ts",
        "**/src/tests/**",
        "**/src/types/**",
      ],
      include: ["src/**/*.{ts,tsx}"],
      all: true,
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
  },
});
