import { app } from "electron";
import fs from "fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  appDataPath,
  archiveCurrentLog,
  cleanupOldLogs,
  initializeStorage,
  logsPath,
  settingsFilePath,
  skipsPath,
} from "../../../../helpers/storage/utils";

// Mock modules
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  readdirSync: vi.fn(),
  statSync: vi.fn(),
  unlinkSync: vi.fn(),
  renameSync: vi.fn(),
}));

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn().mockReturnValue("/mock/userData"),
  },
}));

vi.mock("path", () => ({
  join: vi.fn((...args) => args.join("/")),
}));

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const mockConsoleLog = vi.fn();
const mockConsoleError = vi.fn();

describe("Storage Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock console methods
    console.log = mockConsoleLog;
    console.error = mockConsoleError;

    // Default mock implementations
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue([
      "latest.log",
      "spotify-skip-tracker-2023-01-01.log",
      "spotify-skip-tracker-2023-01-02.log",
      "spotify-skip-tracker-2023-01-03.log",
    ] as any);

    vi.mocked(fs.statSync).mockImplementation((filePath) => {
      const fileName = filePath.toString();
      let mtime;

      if (fileName.includes("2023-01-01")) {
        mtime = new Date(2023, 0, 1);
      } else if (fileName.includes("2023-01-02")) {
        mtime = new Date(2023, 0, 2);
      } else if (fileName.includes("2023-01-03")) {
        mtime = new Date(2023, 0, 3);
      } else {
        mtime = new Date(); // latest.log or default
      }

      return {
        mtime,
        isDirectory: () => false,
        isFile: () => true,
      } as fs.Stats;
    });
  });

  afterEach(() => {
    vi.resetAllMocks();

    // Restore console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  describe("path constants", () => {
    it("should correctly define application paths", () => {
      expect(app.getPath).toHaveBeenCalledWith("userData");
      expect(appDataPath).toBe("/mock/userData/data");
      expect(logsPath).toBe("/mock/userData/data/logs");
      expect(skipsPath).toBe("/mock/userData/data/skipped-tracks.json");
      expect(settingsFilePath).toBe("/mock/userData/data/settings.json");
    });
  });

  describe("initializeStorage", () => {
    it("should create app data directory if it doesn't exist", () => {
      // Arrange
      vi.mocked(fs.existsSync).mockReturnValueOnce(false);

      // Act
      initializeStorage();

      // Assert
      expect(fs.existsSync).toHaveBeenCalledWith(appDataPath);
      expect(fs.mkdirSync).toHaveBeenCalledWith(appDataPath, {
        recursive: true,
      });
    });

    it("should create logs directory if it doesn't exist", () => {
      // Arrange
      vi.mocked(fs.existsSync)
        .mockReturnValueOnce(true) // appDataPath exists
        .mockReturnValueOnce(false); // logsPath doesn't exist

      // Act
      initializeStorage();

      // Assert
      expect(fs.existsSync).toHaveBeenCalledWith(logsPath);
      expect(fs.mkdirSync).toHaveBeenCalledWith(logsPath, { recursive: true });
    });

    it("should not create directories if they already exist", () => {
      // Arrange
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Act
      initializeStorage();

      // Assert
      expect(fs.existsSync).toHaveBeenCalledTimes(2);
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe("cleanupOldLogs", () => {
    it("should delete oldest log files when exceeding max limit", () => {
      // Arrange
      const maxFiles = 2;

      // Act
      cleanupOldLogs(maxFiles);

      // Assert - should delete the oldest file
      expect(fs.unlinkSync).toHaveBeenCalledTimes(1);
      expect(fs.unlinkSync).toHaveBeenCalledWith(
        expect.stringContaining("spotify-skip-tracker-2023-01-01.log"),
      );
    });

    it("should not delete files if under max limit", () => {
      // Arrange
      const maxFiles = 5;

      // Act
      cleanupOldLogs(maxFiles);

      // Assert
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it("should skip if logs directory doesn't exist", () => {
      // Arrange
      vi.mocked(fs.existsSync).mockReturnValueOnce(false);

      // Act
      cleanupOldLogs(3);

      // Assert
      expect(fs.readdirSync).not.toHaveBeenCalled();
    });

    it("should handle invalid maxFiles value", () => {
      // Act
      cleanupOldLogs(0);

      // Assert
      expect(fs.readdirSync).not.toHaveBeenCalled();
    });
  });

  describe("archiveCurrentLog", () => {
    it("should archive latest.log with timestamp", () => {
      // Arrange
      const mockDate = new Date(2023, 0, 15);
      vi.mocked(fs.statSync).mockReturnValueOnce({
        mtime: mockDate,
      } as fs.Stats);

      // Act
      archiveCurrentLog();

      // Assert
      expect(fs.renameSync).toHaveBeenCalledWith(
        `${logsPath}/latest.log`,
        expect.stringContaining("spotify-skip-tracker-2023-01-15"),
      );
    });

    it("should call cleanupOldLogs after archiving", () => {
      // Act
      archiveCurrentLog(5);

      // Assert
      expect(fs.readdirSync).toHaveBeenCalled();
    });

    it("should do nothing if latest.log doesn't exist", () => {
      // Arrange
      vi.mocked(fs.existsSync).mockReturnValueOnce(false);

      // Act
      archiveCurrentLog();

      // Assert
      expect(fs.renameSync).not.toHaveBeenCalled();
    });

    it("should handle errors during archiving", () => {
      // Arrange
      vi.mocked(fs.renameSync).mockImplementationOnce(() => {
        throw new Error("Mock rename error");
      });

      // Act
      archiveCurrentLog();

      // Assert
      expect(mockConsoleError).toHaveBeenCalledWith(
        "Failed to archive previous log:",
        expect.any(Error),
      );
    });
  });
});
