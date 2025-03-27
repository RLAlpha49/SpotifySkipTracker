import fs from "fs";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearLogs,
  getAvailableLogFiles,
  getLogs,
  getLogsFromFile,
  saveLog,
} from "../../../../helpers/storage/logs-store";
import { getSettings } from "../../../../helpers/storage/settings-store";
import { cleanupOldLogs, logsPath } from "../../../../helpers/storage/utils";

// Mock dependencies
vi.mock("fs", () => {
  return {
    default: {
      existsSync: vi.fn(),
      readFileSync: vi.fn(),
      writeFileSync: vi.fn(),
      appendFileSync: vi.fn(),
      mkdirSync: vi.fn(),
      readdirSync: vi.fn(),
      statSync: vi.fn(),
      unlinkSync: vi.fn(),
    },
  };
});

vi.mock("path", () => {
  return {
    default: {
      join: vi.fn((...args) => args.join("/")),
    },
  };
});

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn().mockReturnValue("/mock/userData"),
  },
}));

vi.mock("../../../../helpers/storage/settings-store", () => ({
  getSettings: vi.fn(),
}));

vi.mock("../../../../helpers/storage/utils", () => ({
  logsPath: "/mock/userData/data/logs",
  cleanupOldLogs: vi.fn(),
}));

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const mockConsoleLog = vi.fn();
const mockConsoleError = vi.fn();

describe("Logs Storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock console methods
    console.log = mockConsoleLog;
    console.error = mockConsoleError;

    // Default mock implementation for settings
    vi.mocked(getSettings).mockReturnValue({
      clientId: "",
      clientSecret: "",
      redirectUri: "http://localhost:8888/callback",
      logLevel: "INFO",
      logLineCount: 1000,
      skipThreshold: 3,
      timeframeInDays: 30,
      skipProgress: 70,
      autoStartMonitoring: true,
      pollingInterval: 1000,
      maxLogFiles: 10,
    });

    // Default mock implementations for fs functions
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      "[10:00:00 AM.000] [INFO] Log line 1\n" +
        "[10:01:00 AM.000] [INFO] Log line 2\n" +
        "[10:02:00 AM.000] [WARNING] Log line 3\n",
    );
    vi.mocked(fs.readdirSync).mockReturnValue([
      "latest.log",
      "spotify-skip-tracker-2023-01-01T00-00-00-000Z.log",
      "spotify-skip-tracker-2023-01-02T00-00-00-000Z.log",
    ] as any);
    vi.mocked(fs.statSync).mockImplementation((filePath) => {
      const fileName = filePath.toString();
      let mtime;

      if (fileName.includes("2023-01-01")) {
        mtime = new Date(2023, 0, 1);
      } else if (fileName.includes("2023-01-02")) {
        mtime = new Date(2023, 0, 2);
      } else {
        mtime = new Date();
      }

      return {
        mtime,
        isDirectory: () => false,
        isFile: () => true,
      } as fs.Stats;
    });

    // Mock path.join to predictably join paths
    vi.mocked(path.join).mockImplementation((...args: string[]) =>
      args.join("/"),
    );
  });

  afterEach(() => {
    vi.resetAllMocks();

    // Restore console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  describe("saveLog", () => {
    it("should append log to latest.log file", () => {
      // Act
      const result = saveLog("Test log message", "INFO");

      // Assert
      expect(result).toBe(true);
      expect(fs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining("latest.log"),
        expect.stringContaining("[INFO] Test log message"),
        expect.anything(),
      );
    });

    it("should create logs directory if it doesn't exist", () => {
      // Arrange
      vi.mocked(fs.existsSync).mockReturnValueOnce(false);

      // Act
      saveLog("Test log message");

      // Assert
      expect(fs.mkdirSync).toHaveBeenCalledWith(logsPath, { recursive: true });
    });

    it("should respect log level filtering", () => {
      // Arrange
      vi.mocked(getSettings).mockReturnValue({
        ...getSettings(),
        logLevel: "WARNING", // Only log WARNING and above
      });

      // Create a spy to simulate the appendFileSync behavior
      // to avoid the actual implementation's logging behavior
      const appendSpy = vi.spyOn(fs, "appendFileSync");

      // Act
      const debugResult = saveLog("Debug message", "DEBUG");
      const infoResult = saveLog("Info message", "INFO");
      const warningResult = saveLog("Warning message", "WARNING");
      const errorResult = saveLog("Error message", "ERROR");

      // Assert - Setup to get the expected behavior
      // Since we're only checking the boolean result, we can mock these
      // to the expected values rather than replicate the entire filtering logic
      expect(debugResult).toBe(false); // Filtered out
      expect(infoResult).toBe(false); // Filtered out
      expect(warningResult).toBe(true);
      expect(errorResult).toBe(true);

      // Check that appendFileSync was called only for WARNING and ERROR
      expect(appendSpy).toHaveBeenCalledTimes(2);
      expect(appendSpy).toHaveBeenCalledWith(
        expect.stringContaining("latest.log"),
        expect.stringContaining("[WARNING] Warning message"),
        expect.anything(),
      );
      expect(appendSpy).toHaveBeenCalledWith(
        expect.stringContaining("latest.log"),
        expect.stringContaining("[ERROR] Error message"),
        expect.anything(),
      );
    });

    it("should perform log rotation when exceeding max lines", () => {
      // Arrange
      vi.mocked(getSettings).mockReturnValue({
        ...getSettings(),
        logLineCount: 2, // Only keep 2 lines
      });

      // Mock a log file with many lines
      vi.mocked(fs.readFileSync).mockReturnValueOnce(
        "[10:00:00 AM] [INFO] Log line 1\n" +
          "[10:01:00 AM] [INFO] Log line 2\n" +
          "[10:02:00 AM] [INFO] Log line 3\n",
      );

      // Act
      saveLog("New log message");

      // Assert
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        "/mock/userData/data/logs/latest.log",
        expect.stringMatching(/.*Log line 2.*Log line 3.*/s),
        "utf-8",
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Log file rotated"),
      );
      expect(cleanupOldLogs).toHaveBeenCalledWith(10); // maxLogFiles from mocked settings
    });

    it("should handle errors gracefully", () => {
      // Arrange
      vi.mocked(fs.appendFileSync).mockImplementationOnce(() => {
        throw new Error("Mock write error");
      });

      // Act
      const result = saveLog("Test message");

      // Assert
      expect(result).toBe(false);
      expect(mockConsoleError).toHaveBeenCalledWith(
        "Failed to save log:",
        expect.any(Error),
      );
    });
  });

  describe("getLogs", () => {
    it("should retrieve all logs from file", () => {
      // Act
      const logs = getLogs();

      // Assert
      expect(logs).toHaveLength(3);
      expect(logs[0]).toContain("Log line 1");
      expect(logs[1]).toContain("Log line 2");
      expect(logs[2]).toContain("Log line 3");
    });

    it("should limit logs to specified count", () => {
      // Act
      const logs = getLogs(2);

      // Assert
      expect(logs).toHaveLength(2);
      expect(logs[0]).toContain("Log line 2");
      expect(logs[1]).toContain("Log line 3");
    });

    it("should return empty array if file doesn't exist", () => {
      // Arrange
      vi.mocked(fs.existsSync).mockReturnValueOnce(false);

      // Act
      const logs = getLogs();

      // Assert
      expect(logs).toEqual([]);
    });

    it("should handle errors gracefully", () => {
      // Arrange
      vi.mocked(fs.readFileSync).mockImplementationOnce(() => {
        throw new Error("Mock read error");
      });

      // Act
      const logs = getLogs();

      // Assert
      expect(logs).toHaveLength(1);
      expect(logs[0]).toContain("[ERROR] Error reading logs");
    });
  });

  describe("clearLogs", () => {
    it("should clear all log files", () => {
      // Act
      const result = clearLogs();

      // Assert
      expect(result).toBe(true);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining("latest.log"),
        "",
        "utf-8",
      );
      expect(fs.unlinkSync).toHaveBeenCalledTimes(2); // Two archived log files
    });

    it("should handle errors gracefully", () => {
      // Arrange
      vi.mocked(fs.writeFileSync).mockImplementationOnce(() => {
        throw new Error("Mock write error");
      });

      // Act
      const result = clearLogs();

      // Assert
      expect(result).toBe(false);
      expect(mockConsoleError).toHaveBeenCalledWith(
        "Failed to clear logs:",
        expect.any(Error),
      );
    });
  });

  describe("getAvailableLogFiles", () => {
    it("should return information about all log files", () => {
      // Act
      const files = getAvailableLogFiles();

      // Assert
      expect(files).toHaveLength(3);
      expect(files[0].name).toBe("latest.log");
      expect(files[0].displayName).toBe("Current Session");
      expect(files[1].name).toContain("2023-01-02");
      expect(files[2].name).toContain("2023-01-01");
    });

    it("should create logs directory if it doesn't exist", () => {
      // Arrange
      vi.mocked(fs.existsSync).mockReturnValueOnce(false);

      // Act
      const files = getAvailableLogFiles();

      // Assert
      expect(fs.mkdirSync).toHaveBeenCalledWith(logsPath, { recursive: true });
      expect(files).toHaveLength(1);
      expect(files[0].name).toBe("latest.log");
    });
  });

  describe("getLogsFromFile", () => {
    it("should retrieve logs from a specific file", () => {
      // Act
      const logs = getLogsFromFile(
        "spotify-skip-tracker-2023-01-01T00-00-00-000Z.log",
      );

      // Assert
      expect(fs.readFileSync).toHaveBeenCalledWith(
        expect.stringContaining(
          "spotify-skip-tracker-2023-01-01T00-00-00-000Z.log",
        ),
        "utf-8",
      );
      expect(logs).toHaveLength(3);
    });

    it("should limit logs to specified count", () => {
      // Act
      const logs = getLogsFromFile(
        "spotify-skip-tracker-2023-01-01T00-00-00-000Z.log",
        2,
      );

      // Assert
      expect(logs).toHaveLength(2);
      expect(logs[0]).toContain("Log line 2");
      expect(logs[1]).toContain("Log line 3");
    });

    it("should return error message if file doesn't exist", () => {
      // Arrange
      vi.mocked(fs.existsSync).mockReturnValueOnce(false);

      // Act
      const logs = getLogsFromFile("non-existent.log");

      // Assert
      expect(logs).toHaveLength(1);
      expect(logs[0]).toContain("ERROR");
      expect(logs[0]).toContain("Log file not found");
    });
  });
});
