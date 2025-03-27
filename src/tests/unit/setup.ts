import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Automatically clean up after each test
afterEach(() => {
  cleanup();
});

// Define type for window.electron
declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        send: (channel: string, ...args: unknown[]) => void;
        invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
        on: (channel: string, listener: (...args: unknown[]) => void) => void;
        removeListener: (
          channel: string,
          listener: (...args: unknown[]) => void,
        ) => void;
      };
    };
  }
}

// Global mocks for Electron features
global.window.electron = {
  // Mock IPC handler for Electron APIs
  ipcRenderer: {
    send: vi.fn(),
    invoke: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
  },
};
