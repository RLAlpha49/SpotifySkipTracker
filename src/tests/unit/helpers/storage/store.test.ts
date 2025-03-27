import { describe, expect, it, vi } from "vitest";
import * as storeModule from "../../../../helpers/storage/store";

// Add necessary mocks
vi.mock("electron", () => ({
  app: {
    getPath: vi.fn().mockReturnValue("/mock/userData"),
  },
}));

vi.mock("path", () => ({
  join: (...args) => args.join("/"),
  default: {
    join: (...args) => args.join("/"),
  },
}));

vi.mock("fs", () => {
  const mockFs = {
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    unlinkSync: vi.fn(),
    statSync: vi.fn(),
    readdirSync: vi.fn(),
    renameSync: vi.fn(),
    appendFileSync: vi.fn(),
  };

  return {
    ...mockFs,
    default: mockFs,
  };
});

describe("Storage Store Module", () => {
  describe("exports", () => {
    it("should re-export utility functions", () => {
      // Check for utility exports
      expect(storeModule).toHaveProperty("initializeStorage");
      expect(storeModule).toHaveProperty("appDataPath");
      expect(storeModule).toHaveProperty("logsPath");
      expect(storeModule).toHaveProperty("skipsPath");
      expect(storeModule).toHaveProperty("settingsFilePath");
    });

    it("should re-export settings storage functions", () => {
      expect(storeModule).toHaveProperty("getSettings");
      expect(storeModule).toHaveProperty("saveSettings");
      expect(storeModule).toHaveProperty("resetSettings");
    });

    it("should re-export logging functions", () => {
      expect(storeModule).toHaveProperty("saveLog");
      expect(storeModule).toHaveProperty("getLogs");
      expect(storeModule).toHaveProperty("getLogsFromFile");
      expect(storeModule).toHaveProperty("clearLogs");
      expect(storeModule).toHaveProperty("getAvailableLogFiles");
    });

    it("should re-export tracks storage functions", () => {
      expect(storeModule).toHaveProperty("getSkippedTracks");
      expect(storeModule).toHaveProperty("saveSkippedTracks");
      expect(storeModule).toHaveProperty("updateSkippedTrack");
      expect(storeModule).toHaveProperty("updateNotSkippedTrack");
      expect(storeModule).toHaveProperty("removeSkippedTrack");
    });

    it("should re-export statistics storage functions", () => {
      expect(storeModule).toHaveProperty("getStatistics");
      expect(storeModule).toHaveProperty("saveStatistics");
      expect(storeModule).toHaveProperty("clearStatistics");
      expect(storeModule).toHaveProperty("calculateUniqueArtistCount");
    });
  });
});
