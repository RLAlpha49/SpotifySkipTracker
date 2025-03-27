import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getCurrentTheme,
  setTheme,
  syncThemeWithLocal,
  toggleTheme,
} from "../../../helpers/theme_helpers";

// Mock the window.themeMode object
const mockCurrent = vi.fn();
const mockDark = vi.fn();
const mockLight = vi.fn();
const mockSystem = vi.fn();
const mockToggle = vi.fn();

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

// Mock document.documentElement for classList methods
const mockClassList = {
  add: vi.fn(),
  remove: vi.fn(),
};

describe("Theme Helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Set up the global window object with our mocks
    global.window = {
      ...global.window,
      themeMode: {
        current: mockCurrent,
        dark: mockDark,
        light: mockLight,
        system: mockSystem,
        toggle: mockToggle,
      },
    } as any;

    // Mock localStorage - Fix: Use Object.defineProperty on the global object
    Object.defineProperty(global, "localStorage", {
      value: mockLocalStorage,
      writable: true,
    });

    // Mock document
    global.document = {
      ...global.document,
      documentElement: {
        classList: mockClassList,
      },
    } as any;

    // Default mock implementations
    mockCurrent.mockResolvedValue("system");
    mockLocalStorage.getItem.mockReturnValue(null);
    mockSystem.mockResolvedValue(false);
    mockToggle.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("getCurrentTheme", () => {
    it("should return system theme and local theme preference", async () => {
      // Arrange
      mockCurrent.mockResolvedValue("dark");
      mockLocalStorage.getItem.mockReturnValue("light");

      // Act
      const result = await getCurrentTheme();

      // Assert
      expect(result).toEqual({
        system: "dark",
        local: "light",
      });
      expect(mockCurrent).toHaveBeenCalledTimes(1);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith("theme");
    });

    it("should return null for local theme if not set", async () => {
      // Arrange
      mockCurrent.mockResolvedValue("light");
      mockLocalStorage.getItem.mockReturnValue(null);

      // Act
      const result = await getCurrentTheme();

      // Assert
      expect(result).toEqual({
        system: "light",
        local: null,
      });
    });
  });

  describe("setTheme", () => {
    it("should set dark theme correctly", async () => {
      // Act
      await setTheme("dark");

      // Assert
      expect(mockDark).toHaveBeenCalledTimes(1);
      expect(mockClassList.add).toHaveBeenCalledWith("dark");
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith("theme", "dark");
    });

    it("should set light theme correctly", async () => {
      // Act
      await setTheme("light");

      // Assert
      expect(mockLight).toHaveBeenCalledTimes(1);
      expect(mockClassList.remove).toHaveBeenCalledWith("dark");
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith("theme", "light");
    });

    it("should set system theme correctly with dark mode", async () => {
      // Arrange
      mockSystem.mockResolvedValue(true); // system is in dark mode

      // Act
      await setTheme("system");

      // Assert
      expect(mockSystem).toHaveBeenCalledTimes(1);
      expect(mockClassList.add).toHaveBeenCalledWith("dark");
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith("theme", "system");
    });

    it("should set system theme correctly with light mode", async () => {
      // Arrange
      mockSystem.mockResolvedValue(false); // system is in light mode

      // Act
      await setTheme("system");

      // Assert
      expect(mockSystem).toHaveBeenCalledTimes(1);
      expect(mockClassList.remove).toHaveBeenCalledWith("dark");
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith("theme", "system");
    });
  });

  describe("toggleTheme", () => {
    it("should toggle to dark mode", async () => {
      // Arrange
      mockToggle.mockResolvedValue(true); // toggle returns isDarkMode = true

      // Act
      await toggleTheme();

      // Assert
      expect(mockToggle).toHaveBeenCalledTimes(1);
      expect(mockClassList.add).toHaveBeenCalledWith("dark");
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith("theme", "dark");
    });

    it("should toggle to light mode", async () => {
      // Arrange
      mockToggle.mockResolvedValue(false); // toggle returns isDarkMode = false

      // Act
      await toggleTheme();

      // Assert
      expect(mockToggle).toHaveBeenCalledTimes(1);
      expect(mockClassList.remove).toHaveBeenCalledWith("dark");
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith("theme", "light");
    });
  });

  describe("syncThemeWithLocal", () => {
    it("should set theme based on localStorage preference", async () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue("dark");

      // Act
      await syncThemeWithLocal();

      // Assert
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith("theme");
      expect(mockDark).toHaveBeenCalledTimes(1);
    });

    it("should set system theme if no preference is stored", async () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue(null);

      // Act
      await syncThemeWithLocal();

      // Assert
      expect(mockSystem).toHaveBeenCalledTimes(1);
    });
  });
});
