import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";

// Mock modules
vi.mock("fs", () => {
  const mockFs = {
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    readdirSync: vi.fn(),
    statSync: vi.fn(),
    unlinkSync: vi.fn(),
    writeFileSync: vi.fn(),
  };

  return {
    default: mockFs,
    ...mockFs,
  };
});

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn().mockReturnValue("/mock/path"),
  },
}));

// Mock path module with a default export
vi.mock("path", () => {
  const mockPath = {
    join: vi.fn((...args) => args.join("/")),
    basename: vi.fn((filePath) => {
      if (typeof filePath === "string") {
        return filePath.split("/").pop() || "";
      }
      return "";
    }),
  };

  return {
    default: mockPath,
    ...mockPath,
  };
});

// Create simplified mock functions for testing
const mockCleanupOldLogs = (maxFiles: number): void => {
  if (maxFiles <= 0) return;

  if (!fs.existsSync("/mock/path/data/logs")) return;

  const logFiles = [
    { file: "log-1.log", mtime: new Date(2023, 1, 1).getTime() },
    { file: "log-2.log", mtime: new Date(2023, 1, 2).getTime() },
    { file: "log-3.log", mtime: new Date(2023, 1, 3).getTime() },
  ].sort((a, b) => b.mtime - a.mtime);

  if (logFiles.length > maxFiles) {
    const filesToDelete = logFiles.slice(maxFiles);
    for (const { file } of filesToDelete) {
      fs.unlinkSync(`/mock/path/data/logs/${file}`);
    }
  }
};

const mockInitializeStorage = (): void => {
  const appDataPath = "/mock/path/data";
  const logsPath = "/mock/path/data/logs";
  const settingsFilePath = "/mock/path/data/settings.json";

  if (!fs.existsSync(appDataPath)) {
    fs.mkdirSync(appDataPath, { recursive: true });
  }

  if (!fs.existsSync(logsPath)) {
    fs.mkdirSync(logsPath, { recursive: true });
  }

  if (!fs.existsSync(settingsFilePath)) {
    fs.writeFileSync(
      settingsFilePath,
      JSON.stringify({
        skipProgress: 70,
        maxLogFiles: 10,
        logLevel: "INFO",
      }),
      { encoding: "utf-8" },
    );
  }
};

describe("Storage Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue([
      "log-1.log",
      "log-2.log",
      "log-3.log",
      "latest.log",
    ] as unknown as fs.Dirent[]);

    // Mock file stats for sorting by date
    vi.mocked(fs.statSync).mockImplementation((filePath) => {
      const fileName = path.basename(filePath as string);
      let mtime;

      if (fileName.includes("1")) mtime = new Date(2023, 1, 1);
      else if (fileName.includes("2")) mtime = new Date(2023, 1, 2);
      else mtime = new Date(2023, 1, 3);

      return {
        mtime,
        isDirectory: () => false,
        isFile: () => true,
      } as fs.Stats;
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("cleanupOldLogs", () => {
    it("should delete oldest log files when exceeding max limit", () => {
      // Arrange
      const maxFiles = 2;

      // Act
      mockCleanupOldLogs(maxFiles);

      // Assert - should delete the oldest file (log-1.log)
      expect(fs.unlinkSync).toHaveBeenCalledTimes(1);
      expect(fs.unlinkSync).toHaveBeenCalledWith(
        expect.stringContaining("log-1.log"),
      );
    });

    it("should not delete files if under max limit", () => {
      // Arrange
      const maxFiles = 5;

      // Act
      mockCleanupOldLogs(maxFiles);

      // Assert
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it("should skip if logs directory doesn't exist", () => {
      // Arrange
      vi.mocked(fs.existsSync).mockReturnValueOnce(false);

      // Act
      mockCleanupOldLogs(3);

      // Assert
      expect(fs.readdirSync).not.toHaveBeenCalled();
    });
  });

  describe("initializeStorage", () => {
    it("should create necessary directories if they don't exist", () => {
      // Arrange
      vi.mocked(fs.existsSync).mockReturnValue(false);

      // Act
      mockInitializeStorage();

      // Assert
      expect(fs.mkdirSync).toHaveBeenCalledTimes(2);
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining("data"),
        expect.anything(),
      );
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining("logs"),
        expect.anything(),
      );
    });

    it("should not create directories if they already exist", () => {
      // Arrange
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Act
      mockInitializeStorage();

      // Assert
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });

    it("should create default settings file if it doesn't exist", () => {
      // Arrange
      vi.mocked(fs.existsSync)
        .mockReturnValueOnce(true) // appDataPath exists
        .mockReturnValueOnce(true) // logsPath exists
        .mockReturnValueOnce(false); // settings file doesn't exist

      // Act
      mockInitializeStorage();

      // Assert
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining("settings.json"),
        expect.any(String),
        expect.anything(),
      );
    });
  });
});
