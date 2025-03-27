import { describe, expect, it } from "vitest";
import * as storeModule from "../../../../helpers/storage/store";

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
      expect(storeModule).toHaveProperty("updateSettings");
      expect(storeModule).toHaveProperty("saveSettings");
    });

    it("should re-export logging functions", () => {
      expect(storeModule).toHaveProperty("saveLog");
      expect(storeModule).toHaveProperty("getLogs");
      expect(storeModule).toHaveProperty("getLogsFromFile");
      expect(storeModule).toHaveProperty("clearLogs");
      expect(storeModule).toHaveProperty("getAvailableLogFiles");
    });

    it("should re-export tracks storage functions", () => {
      expect(storeModule).toHaveProperty("saveSkippedTrack");
      expect(storeModule).toHaveProperty("getSkippedTracks");
      expect(storeModule).toHaveProperty("clearSkippedTracks");
    });

    it("should re-export statistics storage functions", () => {
      expect(storeModule).toHaveProperty("getSkipStatistics");
      expect(storeModule).toHaveProperty("getListeningHistory");
      expect(storeModule).toHaveProperty("getTopSkippedArtists");
      expect(storeModule).toHaveProperty("getTopSkippedTracks");
    });
  });
});
