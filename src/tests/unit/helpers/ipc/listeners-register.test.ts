import { BrowserWindow } from "electron";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import registerListeners from "../../../../helpers/ipc/listeners-register";
import { addThemeEventListeners } from "../../../../helpers/ipc/theme/theme-listeners";
import { addWindowEventListeners } from "../../../../helpers/ipc/window/window-listeners";

// Mock dependencies
vi.mock("electron", () => ({
  BrowserWindow: vi.fn(),
}));

vi.mock("../../../../helpers/ipc/window/window-listeners", () => ({
  addWindowEventListeners: vi.fn(),
}));

vi.mock("../../../../helpers/ipc/theme/theme-listeners", () => ({
  addThemeEventListeners: vi.fn(),
}));

describe("IPC Listeners Registration", () => {
  let mainWindow: BrowserWindow;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock BrowserWindow
    mainWindow = new BrowserWindow();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("registerListeners", () => {
    it("should register window event listeners", () => {
      // Act
      registerListeners(mainWindow);

      // Assert
      expect(addWindowEventListeners).toHaveBeenCalledTimes(1);
      expect(addWindowEventListeners).toHaveBeenCalledWith(mainWindow);
    });

    it("should register theme event listeners", () => {
      // Act
      registerListeners(mainWindow);

      // Assert
      expect(addThemeEventListeners).toHaveBeenCalledTimes(1);
    });

    it("should register all listeners when called with mainWindow", () => {
      // Act
      registerListeners(mainWindow);

      // Assert
      expect(addWindowEventListeners).toHaveBeenCalledTimes(1);
      expect(addThemeEventListeners).toHaveBeenCalledTimes(1);
    });
  });
});
