import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  SpotifyCredentials,
  SpotifyPlaybackInfo,
  spotifyService,
  SpotifySettings,
} from "../../../services/spotify.service";
import { SkippedTrack } from "../../../types/spotify";

// Mock electron's ipcRenderer
vi.mock("electron", () => ({
  ipcRenderer: {
    invoke: vi.fn(),
  },
}));

// Import after mocking
import { ipcRenderer } from "electron";

describe("Spotify Service", () => {
  // Sample test data
  const testCredentials: SpotifyCredentials = {
    clientId: "test-client-id",
    clientSecret: "test-client-secret",
    redirectUri: "test-redirect-uri",
  };

  const testPlaybackInfo: SpotifyPlaybackInfo = {
    isPlaying: true,
    trackId: "track-123",
    trackName: "Test Track",
    artistName: "Test Artist",
    albumName: "Test Album",
    albumArt: "https://example.com/album-art.jpg",
    progress: 30000,
    duration: 180000,
  };

  const testSettings: SpotifySettings = {
    skipThreshold: 3,
    timeframeInDays: 30,
    skipProgress: 70,
  };

  const testSkippedTracks: SkippedTrack[] = [
    {
      id: "track-123",
      name: "Test Track",
      artist: "Test Artist",
      album: "Test Album",
      skippedAt: new Date().toISOString(),
      skippedCount: 1,
      isManual: true,
      progress: 45,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation for console.error to avoid cluttering test output
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("Authentication Methods", () => {
    it("should authenticate with Spotify API", async () => {
      // Arrange
      vi.mocked(ipcRenderer.invoke).mockResolvedValueOnce(true);

      // Act
      const result = await spotifyService.authenticate(testCredentials);

      // Assert
      expect(result).toBe(true);
      expect(ipcRenderer.invoke).toHaveBeenCalledWith(
        "spotify:authenticate",
        testCredentials,
      );
    });

    it("should handle authentication errors", async () => {
      // Arrange
      vi.mocked(ipcRenderer.invoke).mockRejectedValueOnce(
        new Error("Auth failed"),
      );

      // Act
      const result = await spotifyService.authenticate(testCredentials);

      // Assert
      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalled();
    });

    it("should logout from Spotify", async () => {
      // Arrange
      vi.mocked(ipcRenderer.invoke).mockResolvedValueOnce(true);

      // Act
      const result = await spotifyService.logout();

      // Assert
      expect(result).toBe(true);
      expect(ipcRenderer.invoke).toHaveBeenCalledWith("spotify:logout");
    });

    it("should check authentication status", async () => {
      // Arrange
      vi.mocked(ipcRenderer.invoke).mockResolvedValueOnce(true);

      // Act
      const result = await spotifyService.isAuthenticated();

      // Assert
      expect(result).toBe(true);
      expect(ipcRenderer.invoke).toHaveBeenCalledWith(
        "spotify:isAuthenticated",
      );
    });
  });

  describe("Playback Methods", () => {
    it("should retrieve current playback state", async () => {
      // Arrange
      vi.mocked(ipcRenderer.invoke).mockResolvedValueOnce(testPlaybackInfo);

      // Act
      const result = await spotifyService.getCurrentPlayback();

      // Assert
      expect(result).toEqual(testPlaybackInfo);
      expect(ipcRenderer.invoke).toHaveBeenCalledWith(
        "spotify:getCurrentPlayback",
      );
    });

    it("should start playback monitoring", async () => {
      // Arrange
      vi.mocked(ipcRenderer.invoke).mockResolvedValueOnce(true);

      // Act
      const result = await spotifyService.startMonitoring();

      // Assert
      expect(result).toBe(true);
      expect(ipcRenderer.invoke).toHaveBeenCalledWith(
        "spotify:startMonitoring",
      );
    });

    it("should stop playback monitoring", async () => {
      // Arrange
      vi.mocked(ipcRenderer.invoke).mockResolvedValueOnce(true);

      // Act
      const result = await spotifyService.stopMonitoring();

      // Assert
      expect(result).toBe(true);
      expect(ipcRenderer.invoke).toHaveBeenCalledWith("spotify:stopMonitoring");
    });

    it("should check monitoring status", async () => {
      // Arrange
      vi.mocked(ipcRenderer.invoke).mockResolvedValueOnce(true);

      // Act
      const result = await spotifyService.isMonitoringActive();

      // Assert
      expect(result).toBe(true);
      expect(ipcRenderer.invoke).toHaveBeenCalledWith(
        "spotify:isMonitoringActive",
      );
    });

    it("should handle playback control methods", async () => {
      // Arrange
      vi.mocked(ipcRenderer.invoke)
        .mockResolvedValueOnce(true) // For pausePlayback
        .mockResolvedValueOnce(true) // For resumePlayback
        .mockResolvedValueOnce(true) // For skipToPreviousTrack
        .mockResolvedValueOnce(true); // For skipToNextTrack

      // Act & Assert - Pause
      const pauseResult = await spotifyService.pausePlayback();
      expect(pauseResult).toBe(true);
      expect(ipcRenderer.invoke).toHaveBeenCalledWith("spotify:pausePlayback");

      // Act & Assert - Resume
      const resumeResult = await spotifyService.resumePlayback();
      expect(resumeResult).toBe(true);
      expect(ipcRenderer.invoke).toHaveBeenCalledWith("spotify:resumePlayback");

      // Act & Assert - Previous
      const previousResult = await spotifyService.skipToPreviousTrack();
      expect(previousResult).toBe(true);
      expect(ipcRenderer.invoke).toHaveBeenCalledWith(
        "spotify:skipToPreviousTrack",
      );

      // Act & Assert - Next
      const nextResult = await spotifyService.skipToNextTrack();
      expect(nextResult).toBe(true);
      expect(ipcRenderer.invoke).toHaveBeenCalledWith(
        "spotify:skipToNextTrack",
      );
    });
  });

  describe("Skipped Tracks Methods", () => {
    it("should retrieve skipped tracks", async () => {
      // Arrange
      vi.mocked(ipcRenderer.invoke).mockResolvedValueOnce(testSkippedTracks);

      // Act
      const result = await spotifyService.getSkippedTracks();

      // Assert
      expect(result).toEqual(testSkippedTracks);
      expect(ipcRenderer.invoke).toHaveBeenCalledWith(
        "spotify:getSkippedTracks",
      );
    });

    it("should refresh skipped tracks", async () => {
      // Arrange
      vi.mocked(ipcRenderer.invoke).mockResolvedValueOnce(testSkippedTracks);

      // Act
      const result = await spotifyService.refreshSkippedTracks();

      // Assert
      expect(result).toEqual(testSkippedTracks);
      expect(ipcRenderer.invoke).toHaveBeenCalledWith(
        "spotify:refreshSkippedTracks",
      );
    });

    it("should handle errors when retrieving skipped tracks", async () => {
      // Arrange
      vi.mocked(ipcRenderer.invoke).mockRejectedValueOnce(
        new Error("Failed to get tracks"),
      );

      // Act
      const result = await spotifyService.getSkippedTracks();

      // Assert
      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("Settings Methods", () => {
    it("should save settings", async () => {
      // Arrange
      vi.mocked(ipcRenderer.invoke).mockResolvedValueOnce(true);

      // Act
      const result = await spotifyService.saveSettings(testSettings);

      // Assert
      expect(result).toBe(true);
      expect(ipcRenderer.invoke).toHaveBeenCalledWith(
        "spotify:saveSettings",
        testSettings,
      );
    });

    it("should retrieve settings", async () => {
      // Arrange
      vi.mocked(ipcRenderer.invoke).mockResolvedValueOnce(testSettings);

      // Act
      const result = await spotifyService.getSettings();

      // Assert
      expect(result).toEqual(testSettings);
      expect(ipcRenderer.invoke).toHaveBeenCalledWith("spotify:getSettings");
    });

    it("should return default settings on error", async () => {
      // Arrange
      vi.mocked(ipcRenderer.invoke).mockRejectedValueOnce(
        new Error("Failed to get settings"),
      );

      // Act
      const result = await spotifyService.getSettings();

      // Assert
      expect(result).toEqual({
        skipThreshold: 3,
        timeframeInDays: 30,
        skipProgress: 70,
      });
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should handle IPC errors properly across all methods", async () => {
      // Test a representative method from each category
      vi.mocked(ipcRenderer.invoke)
        .mockRejectedValueOnce(new Error("Auth error"))
        .mockRejectedValueOnce(new Error("Playback error"))
        .mockRejectedValueOnce(new Error("Settings error"));

      // Authentication method
      const authResult = await spotifyService.isAuthenticated();
      expect(authResult).toBe(false);

      // Playback method
      const playbackResult = await spotifyService.getCurrentPlayback();
      expect(playbackResult).toBeNull();

      // Settings method
      const settingsResult = await spotifyService.getSettings();
      expect(settingsResult).toEqual(
        expect.objectContaining({
          skipThreshold: expect.any(Number),
        }),
      );

      // Verify error logging
      expect(console.error).toHaveBeenCalledTimes(3);
    });
  });
});
