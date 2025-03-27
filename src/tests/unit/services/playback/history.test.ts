import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as store from "../../../../helpers/storage/store";
import * as historyModule from "../../../../services/playback/history";

// Mock dependencies
vi.mock("../../../../helpers/storage/store", () => ({
  saveLog: vi.fn(),
  getSkippedTracks: vi.fn(),
  saveSkippedTracks: vi.fn(),
}));

vi.mock("../../../../services/spotify", () => ({}));
vi.mock("../../../../services/playback/state", () => ({
  setRecentTracks: vi.fn(),
}));

// Mock Electron app for userData path
vi.mock("electron", () => ({
  app: {
    getPath: vi.fn().mockReturnValue("/mock/user/data"),
  },
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
      // Use type assertion to avoid TypeScript errors with extended types
      expect((savedTracks[0] as any).album).toBe(skipInfo.album);
      expect(savedTracks[0].skipCount).toBe(1);
      expect((savedTracks[0] as any).manualSkipCount).toBe(1); // Manual skip
      expect((savedTracks[0] as any).autoSkipCount).toBe(0);

      // Check that skip events were recorded with type assertion
      const events = (savedTracks[0] as any).skipEvents;
      expect(events.length).toBe(1);
      expect(events[0].skipType).toBe("standard");
      expect(events[0].isManual).toBe(true);
      expect(events[0].progress).toBe(16);

      // Check context data with type assertion
      expect((savedTracks[0] as any).lastContext).toEqual(skipInfo.context);
      expect((savedTracks[0] as any).contextStats.total).toBe(1);
      expect(
        Object.keys((savedTracks[0] as any).contextStats.contexts).length,
      ).toBe(1);
    });

    it("should handle errors when recording skipped tracks", async () => {
      // Mock Date.now to provide consistent behavior
      const mockTimestamp = 1672531200000; // 2023-01-01
      const dateSpy = vi.spyOn(Date, "now").mockReturnValue(mockTimestamp);

      // Reset any previous calls and mocks to make test more deterministic
      vi.mocked(store.saveLog).mockClear();
      vi.mocked(store.saveSkippedTracks).mockClear();

      // IMPORTANT: Reset the default implementation first
      vi.mocked(store.getSkippedTracks).mockReset();

      // Then mock getSkippedTracks to throw an error
      const storageError = new Error("Storage error");
      vi.mocked(store.getSkippedTracks).mockRejectedValue(storageError);

      // Act
      await historyModule.recordSkippedTrack(
        "track-id",
        "Track Name",
        "Artist Name",
      );

      // Debug information
      console.log("saveLog calls:", vi.mocked(store.saveLog).mock.calls);
      console.log(
        "saveSkippedTracks calls:",
        vi.mocked(store.saveSkippedTracks).mock.calls,
      );
      console.log(
        "getSkippedTracks calls:",
        vi.mocked(store.getSkippedTracks).mock.calls,
      );

      // Assert - Verify that the error is correctly logged
      expect(store.saveLog).toHaveBeenCalledWith(
        "Failed to get skipped tracks: Error: Storage error",
        "ERROR",
      );

      // In the current implementation, the function continues after an error
      // and creates a new skipped track. This is the actual behavior we observe.
      expect(store.saveSkippedTracks).toHaveBeenCalledTimes(1);
      const savedTrack = vi.mocked(store.saveSkippedTracks).mock.calls[0][0][0];
      expect(savedTrack.id).toBe("track-id");
      expect(savedTrack.name).toBe("Track Name");
      expect(savedTrack.artist).toBe("Artist Name");

      // Clean up
      dateSpy.mockRestore();
    });
  });
});
