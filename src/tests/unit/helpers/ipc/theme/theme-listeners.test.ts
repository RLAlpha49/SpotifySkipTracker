import { ipcMain, nativeTheme } from "electron";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  THEME_MODE_CURRENT_CHANNEL,
  THEME_MODE_DARK_CHANNEL,
  THEME_MODE_LIGHT_CHANNEL,
  THEME_MODE_SYSTEM_CHANNEL,
  THEME_MODE_TOGGLE_CHANNEL,
} from "../../../../../helpers/ipc/theme/theme-channels";
import { addThemeEventListeners } from "../../../../../helpers/ipc/theme/theme-listeners";

// Mock Electron modules
vi.mock("electron", () => ({
  nativeTheme: {
    themeSource: "system",
    shouldUseDarkColors: false,
  },
  ipcMain: {
    handle: vi.fn(),
  },
}));

describe("Theme Listeners", () => {
  // Store handlers for testing
  const handlers: Record<string, (event?: any, ...args: any[]) => any> = {};

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset nativeTheme for each test
    vi.mocked(nativeTheme).themeSource = "system";
    vi.mocked(nativeTheme).shouldUseDarkColors = false;

    // Mock ipcMain.handle to capture handlers
    vi.mocked(ipcMain.handle).mockImplementation((channel, handler) => {
      handlers[channel] = handler;
      return ipcMain;
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("addThemeEventListeners", () => {
    it("should register handlers for all theme channels", () => {
      // Act
      addThemeEventListeners();

      // Assert
      expect(ipcMain.handle).toHaveBeenCalledTimes(5);
      expect(ipcMain.handle).toHaveBeenCalledWith(
        THEME_MODE_CURRENT_CHANNEL,
        expect.any(Function),
      );
      expect(ipcMain.handle).toHaveBeenCalledWith(
        THEME_MODE_TOGGLE_CHANNEL,
        expect.any(Function),
      );
      expect(ipcMain.handle).toHaveBeenCalledWith(
        THEME_MODE_DARK_CHANNEL,
        expect.any(Function),
      );
      expect(ipcMain.handle).toHaveBeenCalledWith(
        THEME_MODE_LIGHT_CHANNEL,
        expect.any(Function),
      );
      expect(ipcMain.handle).toHaveBeenCalledWith(
        THEME_MODE_SYSTEM_CHANNEL,
        expect.any(Function),
      );
    });

    it("should return current theme source when current handler is called", () => {
      // Arrange
      addThemeEventListeners();
      const currentHandler = handlers[THEME_MODE_CURRENT_CHANNEL];
      vi.mocked(nativeTheme).themeSource = "dark";

      // Act
      const result = currentHandler();

      // Assert
      expect(result).toBe("dark");
    });

    it("should toggle from light to dark when toggle handler is called and theme is light", () => {
      // Arrange
      addThemeEventListeners();
      const toggleHandler = handlers[THEME_MODE_TOGGLE_CHANNEL];
      vi.mocked(nativeTheme).shouldUseDarkColors = false;

      // Act
      toggleHandler();

      // Assert
      expect(nativeTheme.themeSource).toBe("dark");
    });

    it("should toggle from dark to light when toggle handler is called and theme is dark", () => {
      // Arrange
      addThemeEventListeners();
      const toggleHandler = handlers[THEME_MODE_TOGGLE_CHANNEL];
      vi.mocked(nativeTheme).shouldUseDarkColors = true;

      // Act
      toggleHandler();

      // Assert
      expect(nativeTheme.themeSource).toBe("light");
    });

    it("should set theme to dark when dark handler is called", () => {
      // Arrange
      addThemeEventListeners();
      const darkHandler = handlers[THEME_MODE_DARK_CHANNEL];

      // Act
      const result = darkHandler();

      // Assert
      expect(nativeTheme.themeSource).toBe("dark");
      expect(result).toBe("dark");
    });

    it("should set theme to light when light handler is called", () => {
      // Arrange
      addThemeEventListeners();
      const lightHandler = handlers[THEME_MODE_LIGHT_CHANNEL];

      // Act
      const result = lightHandler();

      // Assert
      expect(nativeTheme.themeSource).toBe("light");
      expect(result).toBe("light");
    });

    it("should set theme to system when system handler is called", () => {
      // Arrange
      addThemeEventListeners();
      const systemHandler = handlers[THEME_MODE_SYSTEM_CHANNEL];

      // Act
      systemHandler();

      // Assert
      expect(nativeTheme.themeSource).toBe("system");
    });
  });
});
