import fs from "fs";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getSettings,
  resetSettings,
  saveSettings,
} from "../../../../helpers/storage/settings-store";
import { SettingsSchema } from "../../../../types/settings";

// Mock the actual implementation of settingsFilePath
const mockSettingsFilePath = "/mock/userData/data/settings.json";

// Place mocks at the top with proper default exports
vi.mock("fs", () => {
  const mockFs = {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
  };
  return {
    default: mockFs,
    ...mockFs,
  };
});

vi.mock("path", () => ({
  dirname: vi.fn().mockReturnValue("/mock/userData/data"),
  join: (...args) => args.join("/"),
  default: {
    dirname: vi.fn().mockReturnValue("/mock/userData/data"),
    join: (...args) => args.join("/"),
  },
}));

// Mock the utils module with our mock paths
vi.mock("../../../../helpers/storage/utils", () => ({
  settingsFilePath: "/mock/userData/data/settings.json",
  appDataPath: "/mock/userData/data",
}));

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const mockConsoleLog = vi.fn();
const mockConsoleError = vi.fn();

describe("Settings Storage", () => {
  // Sample settings for testing
  const testSettings: SettingsSchema = {
    clientId: "test-client-id",
    clientSecret: "test-client-secret",
    redirectUri: "http://localhost:8888/callback",
    logLevel: "DEBUG",
    logLineCount: 200,
    skipThreshold: 5,
    timeframeInDays: 60,
    skipProgress: 50,
    autoStartMonitoring: false,
    pollingInterval: 2000,
  };

  // Default settings to test against
  const defaultSettings: SettingsSchema = {
    clientId: "",
    clientSecret: "",
    redirectUri: "http://localhost:8888/callback",
    logLevel: "INFO",
    logLineCount: 100,
    skipThreshold: 3,
    timeframeInDays: 30,
    skipProgress: 70,
    autoStartMonitoring: true,
    pollingInterval: 1000,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock console methods
    console.log = mockConsoleLog;
    console.error = mockConsoleError;

    // Set up default mock implementations
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);
    vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
    vi.mocked(path.dirname).mockReturnValue("/mock/userData/data");
  });

  afterEach(() => {
    vi.resetAllMocks();

    // Restore console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  describe("saveSettings", () => {
    it("should save settings to file successfully", () => {
      // Arrange
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Act
      const result = saveSettings(testSettings);

      // Assert
      expect(result).toBe(true);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        mockSettingsFilePath,
        expect.any(String),
        "utf-8",
      );

      // Verify the settings JSON was formatted correctly
      const savedJson = vi.mocked(fs.writeFileSync).mock.calls[0][1] as string;
      expect(JSON.parse(savedJson)).toEqual(testSettings);
    });

    it("should create directory if it doesn't exist", () => {
      // Arrange
      vi.mocked(fs.existsSync).mockReturnValue(false);

      // Act
      saveSettings(testSettings);

      // Assert
      expect(fs.mkdirSync).toHaveBeenCalledWith("/mock/userData/data", {
        recursive: true,
      });
    });

    it("should handle errors when saving fails", () => {
      // Arrange
      vi.mocked(fs.writeFileSync).mockImplementationOnce(() => {
        throw new Error("Mock write error");
      });

      // Act
      const result = saveSettings(testSettings);

      // Assert
      expect(result).toBe(false);
      expect(mockConsoleError).toHaveBeenCalledWith(
        "Failed to save settings:",
        expect.any(Error),
      );
    });
  });

  describe("getSettings", () => {
    it("should return settings from file when it exists", () => {
      // Arrange
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(testSettings));

      // Act
      const settings = getSettings();

      // Assert
      expect(settings).toEqual(testSettings);
      expect(fs.readFileSync).toHaveBeenCalledWith(
        mockSettingsFilePath,
        "utf-8",
      );
    });

    it("should merge with default settings if file is partial", () => {
      // Arrange - a partial settings file
      const partialSettings = {
        clientId: "test-client-id",
        logLevel: "DEBUG",
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify(partialSettings),
      );

      // Act
      const settings = getSettings();

      // Assert
      expect(settings).toEqual({
        ...defaultSettings,
        ...partialSettings,
      });
    });

    it("should return default settings if file doesn't exist", () => {
      // Arrange
      vi.mocked(fs.existsSync).mockReturnValue(false);

      // Act
      const settings = getSettings();

      // Assert
      expect(settings).toEqual(defaultSettings);
    });

    it("should return default settings if there's an error reading the file", () => {
      // Arrange
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementationOnce(() => {
        throw new Error("Mock read error");
      });

      // Act
      const settings = getSettings();

      // Assert
      expect(settings).toEqual(defaultSettings);
      expect(mockConsoleError).toHaveBeenCalledWith(
        "Error reading settings file:",
        expect.any(Error),
      );
    });
  });

  describe("resetSettings", () => {
    it("should reset settings to defaults if file exists", () => {
      // Arrange
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);

      // Act
      const result = resetSettings();

      // Assert
      expect(result).toBe(true);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        mockSettingsFilePath,
        expect.any(String),
        "utf-8",
      );

      // Verify default settings were written
      const savedJson = vi.mocked(fs.writeFileSync).mock.calls[0][1] as string;
      expect(JSON.parse(savedJson)).toEqual(defaultSettings);
    });

    it("should return true if settings file doesn't exist", () => {
      // Arrange
      vi.mocked(fs.existsSync).mockReturnValue(false);

      // Act
      const result = resetSettings();

      // Assert
      expect(result).toBe(true);
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it("should handle errors during reset", () => {
      // Arrange
      vi.mocked(fs.existsSync).mockImplementationOnce(() => {
        throw new Error("Mock error");
      });

      // Act
      const result = resetSettings();

      // Assert
      expect(result).toBe(false);
      expect(mockConsoleError).toHaveBeenCalledWith(
        "Failed to reset settings:",
        expect.any(Error),
      );
    });
  });
});
