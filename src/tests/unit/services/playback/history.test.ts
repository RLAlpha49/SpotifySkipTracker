import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as store from "../../../../helpers/storage/store";
import * as historyModule from "../../../../services/playback/history";

// Mock dependencies
vi.mock("../../../../helpers/storage/store", () => ({
  saveLog: vi.fn(),
  getSkippedTracks: vi.fn().mockResolvedValue([]),
  saveSkippedTracks: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../../services/spotify", () => ({}));
vi.mock("../../../../services/playback/state", () => ({
  setRecentTracks: vi.fn(),
}));

describe("Playback History Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("getSkippedTracks", () => {
    it("should return skipped tracks from storage", async () => {
      // Arrange
      const mockSkippedTracks = [
        { id: "track1", name: "Track 1", artist: "Artist 1", skipCount: 2 },
        { id: "track2", name: "Track 2", artist: "Artist 2", skipCount: 1 },
      ];
      vi.mocked(store.getSkippedTracks).mockResolvedValueOnce(
        mockSkippedTracks,
      );

      // Act
      const result = await historyModule.getSkippedTracks();

      // Assert
      expect(result).toEqual(mockSkippedTracks);
      expect(store.getSkippedTracks).toHaveBeenCalledTimes(1);
    });

    it("should handle errors and return empty array", async () => {
      // Arrange
      vi.mocked(store.getSkippedTracks).mockRejectedValueOnce(
        new Error("Storage error"),
      );

      // Act
      const result = await historyModule.getSkippedTracks();

      // Assert
      expect(result).toEqual([]);
      expect(store.getSkippedTracks).toHaveBeenCalledTimes(1);
      expect(store.saveLog).toHaveBeenCalledWith(
        expect.stringContaining("Failed to get skipped tracks"),
        "ERROR",
      );
    });
  });

  describe("recordSkippedTrack", () => {
    it("should add a new skipped track when it doesn't exist", async () => {
      // Arrange
      const mockEmptyTracks: any[] = [];
      vi.mocked(store.getSkippedTracks).mockResolvedValueOnce(mockEmptyTracks);

      const newTrackId = "new-track-id";
      const newTrackName = "New Track";
      const newArtistName = "New Artist";
      const mockTimestamp = 1672531200000; // 2023-01-01

      // Use a fixed timestamp for testing
      const dateSpy = vi.spyOn(Date, "now").mockReturnValue(mockTimestamp);

      // Act
      await historyModule.recordSkippedTrack(
        newTrackId,
        newTrackName,
        newArtistName,
      );

      // Assert
      expect(store.saveSkippedTracks).toHaveBeenCalledTimes(1);

      // Get the argument passed to saveSkippedTracks
      const savedTracks = vi.mocked(store.saveSkippedTracks).mock.calls[0][0];

      // Check that a new track was added
      expect(savedTracks.length).toBe(1);
      expect(savedTracks[0].id).toBe(newTrackId);
      expect(savedTracks[0].name).toBe(newTrackName);
      expect(savedTracks[0].artist).toBe(newArtistName);
      expect(savedTracks[0].skipCount).toBe(1);
      expect(savedTracks[0].lastSkipped).toBe(mockTimestamp.toString());

      // Clean up
      dateSpy.mockRestore();
    });

    it("should update an existing track when it already exists", async () => {
      // Arrange
      const existingTrackId = "existing-track-id";
      const existingTrackName = "Existing Track";
      const existingArtistName = "Existing Artist";

      const mockExistingTracks = [
        {
          id: existingTrackId,
          name: existingTrackName,
          artist: existingArtistName,
          skipCount: 1,
          lastSkipped: "1672444800000", // 2022-12-31
          skipTimestamps: ["1672444800000"],
        },
      ];

      vi.mocked(store.getSkippedTracks).mockResolvedValueOnce(
        mockExistingTracks,
      );

      const mockTimestamp = 1672531200000; // 2023-01-01
      const dateSpy = vi.spyOn(Date, "now").mockReturnValue(mockTimestamp);

      // Act
      await historyModule.recordSkippedTrack(
        existingTrackId,
        existingTrackName,
        existingArtistName,
      );

      // Assert
      expect(store.saveSkippedTracks).toHaveBeenCalledTimes(1);

      // Get the argument passed to saveSkippedTracks
      const savedTracks = vi.mocked(store.saveSkippedTracks).mock.calls[0][0];

      // Check that the existing track was updated
      expect(savedTracks.length).toBe(1);
      expect(savedTracks[0].id).toBe(existingTrackId);
      expect(savedTracks[0].skipCount).toBe(2); // Incremented
      expect(savedTracks[0].lastSkipped).toBe(mockTimestamp.toString());
      expect(savedTracks[0].skipTimestamps).toContain(mockTimestamp.toString());

      // Clean up
      dateSpy.mockRestore();
    });

    it("should record enhanced skip info when provided", async () => {
      // Arrange
      const mockEmptyTracks: any[] = [];
      vi.mocked(store.getSkippedTracks).mockResolvedValueOnce(mockEmptyTracks);

      const skipInfo: historyModule.SkipInfo = {
        id: "detailed-track-id",
        name: "Detailed Track",
        artist: "Detailed Artist",
        album: "Detailed Album",
        skippedAt: 1672531200000, // 2023-01-01
        playDuration: 30000, // 30 seconds
        trackDuration: 180000, // 3 minutes
        playPercentage: 16, // 16%
        deviceId: "test-device",
        deviceName: "Test Device",
        skipType: "standard",
        isManualSkip: true,
        confidence: 0.9,
        reason: "User pressed skip button",
        context: {
          type: "playlist",
          uri: "spotify:playlist:123",
          name: "My Playlist",
          id: "123",
        },
      };

      // Act
      await historyModule.recordSkippedTrack(skipInfo);

      // Assert
      expect(store.saveSkippedTracks).toHaveBeenCalledTimes(1);

      // Get the argument passed to saveSkippedTracks
      const savedTracks = vi.mocked(store.saveSkippedTracks).mock.calls[0][0];

      // Check that a new track was added with detailed info
      expect(savedTracks.length).toBe(1);
      expect(savedTracks[0].id).toBe(skipInfo.id);
      expect(savedTracks[0].name).toBe(skipInfo.name);
      expect(savedTracks[0].artist).toBe(skipInfo.artist);
      expect(savedTracks[0].album).toBe(skipInfo.album);
      expect(savedTracks[0].skipCount).toBe(1);
      expect(savedTracks[0].manualSkipCount).toBe(1); // Manual skip
      expect(savedTracks[0].autoSkipCount).toBe(0);

      // Check that skip events were recorded
      expect(savedTracks[0].skipEvents.length).toBe(1);
      expect(savedTracks[0].skipEvents[0].skipType).toBe("standard");
      expect(savedTracks[0].skipEvents[0].isManual).toBe(true);
      expect(savedTracks[0].skipEvents[0].progress).toBe(16);

      // Check context data
      expect(savedTracks[0].lastContext).toEqual(skipInfo.context);
      expect(savedTracks[0].contextStats.total).toBe(1);
      expect(Object.keys(savedTracks[0].contextStats.contexts).length).toBe(1);
    });

    it("should handle errors when recording skipped tracks", async () => {
      // Arrange
      vi.mocked(store.getSkippedTracks).mockRejectedValueOnce(
        new Error("Storage error"),
      );

      // Act
      await historyModule.recordSkippedTrack(
        "track-id",
        "Track Name",
        "Artist Name",
      );

      // Assert
      expect(store.saveLog).toHaveBeenCalledWith(
        expect.stringContaining("Failed to record skipped track"),
        "ERROR",
      );
      expect(store.saveSkippedTracks).not.toHaveBeenCalled();
    });
  });
});
