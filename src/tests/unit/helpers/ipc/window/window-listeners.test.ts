import { BrowserWindow, ipcMain, IpcMainInvokeEvent } from "electron";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  WINDOW_CLOSE_CHANNEL,
  WINDOW_MAXIMIZE_CHANNEL,
  WINDOW_MINIMIZE_CHANNEL,
} from "../../../../../helpers/ipc/window/window-channels";
import { addWindowEventListeners } from "../../../../../helpers/ipc/window/window-listeners";

// Mock Electron modules
vi.mock("electron", () => ({
  ipcMain: {
    handle: vi.fn(),
  },
  BrowserWindow: vi.fn(),
}));

describe("Window Listeners", () => {
  // Mock BrowserWindow instance
  const mockMainWindow = {
    minimize: vi.fn(),
    maximize: vi.fn(),
    unmaximize: vi.fn(),
    isMaximized: vi.fn(),
    close: vi.fn(),
  } as unknown as BrowserWindow;

  // Store handlers for testing
  type WindowHandler = (
    event?: IpcMainInvokeEvent,
    ...args: unknown[]
  ) => unknown;
  const handlers: Record<string, WindowHandler> = {};

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock ipcMain.handle to capture handlers
    vi.mocked(ipcMain.handle).mockImplementation((channel, handler) => {
      handlers[channel] = handler;
      return ipcMain;
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("addWindowEventListeners", () => {
    it("should register handlers for all window control channels", () => {
      // Act
      addWindowEventListeners(mockMainWindow);

      // Assert
      expect(ipcMain.handle).toHaveBeenCalledTimes(3);
      expect(ipcMain.handle).toHaveBeenCalledWith(
        WINDOW_MINIMIZE_CHANNEL,
        expect.any(Function),
      );
      expect(ipcMain.handle).toHaveBeenCalledWith(
        WINDOW_MAXIMIZE_CHANNEL,
        expect.any(Function),
      );
      expect(ipcMain.handle).toHaveBeenCalledWith(
        WINDOW_CLOSE_CHANNEL,
        expect.any(Function),
      );
    });

    it("should call minimize on the window when minimize handler is triggered", () => {
      // Arrange
      addWindowEventListeners(mockMainWindow);
      const minimizeHandler = handlers[WINDOW_MINIMIZE_CHANNEL];

      // Act
      minimizeHandler();

      // Assert
      expect(mockMainWindow.minimize).toHaveBeenCalledTimes(1);
    });

    it("should call maximize when window is not maximized", () => {
      // Arrange
      addWindowEventListeners(mockMainWindow);
      const maximizeHandler = handlers[WINDOW_MAXIMIZE_CHANNEL];

      // Set window to not maximized
      vi.mocked(mockMainWindow.isMaximized).mockReturnValue(false);

      // Act
      maximizeHandler();

      // Assert
      expect(mockMainWindow.isMaximized).toHaveBeenCalledTimes(1);
      expect(mockMainWindow.maximize).toHaveBeenCalledTimes(1);
      expect(mockMainWindow.unmaximize).not.toHaveBeenCalled();
    });

    it("should call unmaximize when window is maximized", () => {
      // Arrange
      addWindowEventListeners(mockMainWindow);
      const maximizeHandler = handlers[WINDOW_MAXIMIZE_CHANNEL];

      // Set window to maximized
      vi.mocked(mockMainWindow.isMaximized).mockReturnValue(true);

      // Act
      maximizeHandler();

      // Assert
      expect(mockMainWindow.isMaximized).toHaveBeenCalledTimes(1);
      expect(mockMainWindow.unmaximize).toHaveBeenCalledTimes(1);
      expect(mockMainWindow.maximize).not.toHaveBeenCalled();
    });

    it("should call close on the window when close handler is triggered", () => {
      // Arrange
      addWindowEventListeners(mockMainWindow);
      const closeHandler = handlers[WINDOW_CLOSE_CHANNEL];

      // Act
      closeHandler();

      // Assert
      expect(mockMainWindow.close).toHaveBeenCalledTimes(1);
    });
  });
});
