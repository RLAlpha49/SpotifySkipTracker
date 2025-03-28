import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  closeWindow,
  maximizeWindow,
  minimizeWindow,
} from "../../../helpers/window_helpers";

// Mock the window.electronWindow object
const mockMinimize = vi.fn();
const mockMaximize = vi.fn();
const mockClose = vi.fn();

// Define interface for our mock window object
interface ElectronWindow extends Window {
  electronWindow: {
    minimize: typeof mockMinimize;
    maximize: typeof mockMaximize;
    close: typeof mockClose;
  };
}

describe("Window Helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Set up the global window object with our mocks
    global.window = {
      ...global.window,
      electronWindow: {
        minimize: mockMinimize,
        maximize: mockMaximize,
        close: mockClose,
      },
    } as unknown as ElectronWindow;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("minimizeWindow", () => {
    it("should call the window.electronWindow.minimize function", async () => {
      // Act
      await minimizeWindow();

      // Assert
      expect(mockMinimize).toHaveBeenCalledTimes(1);
    });
  });

  describe("maximizeWindow", () => {
    it("should call the window.electronWindow.maximize function", async () => {
      // Act
      await maximizeWindow();

      // Assert
      expect(mockMaximize).toHaveBeenCalledTimes(1);
    });
  });

  describe("closeWindow", () => {
    it("should call the window.electronWindow.close function", async () => {
      // Act
      await closeWindow();

      // Assert
      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });
});
