import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { vi } from "vitest";

// Initialize the DOM environment
vi.stubGlobal("document", {
  ...document,
  // Add any document stubs needed
});

// Clean up after each test
afterEach(() => {
  cleanup();
});
