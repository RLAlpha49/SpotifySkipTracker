import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import {
  getCurrentPlayback,
  getRecentlyPlayedTracks,
  getTrack,
  pause,
  play,
  skipToPrevious,
  skipToNext,
} from "../../../../services/spotify/playback";

// Mock dependencies
vi.mock("axios");
vi.mock("../../../../helpers/storage/logs-store", () => ({
  saveLog: vi.fn(),
}));
vi.mock("../../../../services/spotify/token", () => ({
  ensureValidToken: vi.fn(),
  getAccessToken: vi.fn().mockReturnValue("mock-access-token"),
}));

describe("Spotify Playback Service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("getCurrentPlayback", () => {
    it("should return the current playback state when playing", async () => {
      // Mock playback state response
      const mockPlaybackState = {
        is_playing: true,
        item: {
          id: "track123",
          name: "Test Track",
          artists: [{ name: "Test Artist" }],
          album: { name: "Test Album" },
          duration_ms: 300000,
        },
        progress_ms: 60000,
        device: {
          id: "device123",
          name: "Test Device",
          type: "Computer",
        },
      };

      vi.mocked(axios.get).mockResolvedValueOnce({ data: mockPlaybackState });

      const result = await getCurrentPlayback();

      // Verify axios was called correctly
      expect(axios.get).toHaveBeenCalledWith(
        "https://api.spotify.com/v1/me/player",
        expect.objectContaining({
          headers: { Authorization: "Bearer mock-access-token" },
        }),
      );

      // Verify result
      expect(result).toEqual(mockPlaybackState);
    });

    it("should return null when no active playback", async () => {
      // 204 No Content means no active playback
      vi.mocked(axios.get).mockResolvedValueOnce({ status: 204, data: null });

      const result = await getCurrentPlayback();

      expect(result).toBeNull();
    });

    it("should handle errors gracefully", async () => {
      vi.mocked(axios.get).mockRejectedValueOnce(new Error("API Error"));

      await expect(getCurrentPlayback()).rejects.toThrow(
        "Failed to fetch current playback: API Error",
      );
    });

    it("should transform response when transform is true", async () => {
      // Mock playback state response
      const mockPlaybackState = {
        is_playing: true,
        item: {
          id: "track123",
          name: "Test Track",
          uri: "spotify:track:track123",
          artists: [{ name: "Test Artist", id: "artist123" }],
          album: {
            name: "Test Album",
            images: [{ url: "https://example.com/album.jpg" }],
          },
          duration_ms: 300000,
        },
        progress_ms: 60000,
        device: {
          id: "device123",
          name: "Test Device",
          type: "Computer",
        },
      };

      vi.mocked(axios.get).mockResolvedValueOnce({ data: mockPlaybackState });

      const result = await getCurrentPlayback(true);

      // Verify transformed result
      expect(result).toHaveProperty("isPlaying", true);
      expect(result).toHaveProperty("track");
      expect(result.track).toHaveProperty("id", "track123");
      expect(result.track).toHaveProperty("name", "Test Track");
      expect(result.track).toHaveProperty("artist", "Test Artist");
      expect(result.track).toHaveProperty("album", "Test Album");
      expect(result.track).toHaveProperty("durationMs", 300000);
      expect(result).toHaveProperty("progressMs", 60000);
      expect(result).toHaveProperty("device");
      expect(result.device).toHaveProperty("id", "device123");
      expect(result.device).toHaveProperty("name", "Test Device");
      expect(result.device).toHaveProperty("type", "Computer");
    });
  });

  describe("getRecentlyPlayedTracks", () => {
    it("should return recently played tracks", async () => {
      // Mock API response
      const mockRecentlyPlayedResponse = {
        items: [
          {
            track: {
              id: "track1",
              name: "Track 1",
              artists: [{ name: "Artist 1" }],
            },
            played_at: "2023-01-01T12:00:00Z",
          },
          {
            track: {
              id: "track2",
              name: "Track 2",
              artists: [{ name: "Artist 2" }],
            },
            played_at: "2023-01-01T11:00:00Z",
          },
        ],
      };

      vi.mocked(axios.get).mockResolvedValueOnce({
        data: mockRecentlyPlayedResponse,
      });

      const result = await getRecentlyPlayedTracks();

      // Verify axios was called correctly
      expect(axios.get).toHaveBeenCalledWith(
        "https://api.spotify.com/v1/me/player/recently-played",
        expect.objectContaining({
          params: { limit: 50 },
          headers: { Authorization: "Bearer mock-access-token" },
        }),
      );

      // Verify result
      expect(result).toEqual(mockRecentlyPlayedResponse);
    });

    it("should respect the limit parameter", async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({ data: { items: [] } });

      await getRecentlyPlayedTracks(10);

      // Verify limit parameter was passed
      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: { limit: 10 },
        }),
      );
    });

    it("should handle errors gracefully", async () => {
      vi.mocked(axios.get).mockRejectedValueOnce(new Error("API Error"));

      await expect(getRecentlyPlayedTracks()).rejects.toThrow(
        "Failed to fetch recently played tracks: API Error",
      );
    });
  });

  describe("getTrack", () => {
    it("should fetch a track by ID", async () => {
      const mockTrackId = "track123";
      const mockTrackResponse = {
        id: mockTrackId,
        name: "Test Track",
        artists: [{ name: "Test Artist" }],
        album: { name: "Test Album" },
      };

      vi.mocked(axios.get).mockResolvedValueOnce({ data: mockTrackResponse });

      const result = await getTrack(mockTrackId);

      // Verify axios was called correctly
      expect(axios.get).toHaveBeenCalledWith(
        `https://api.spotify.com/v1/tracks/${mockTrackId}`,
        expect.objectContaining({
          headers: { Authorization: "Bearer mock-access-token" },
        }),
      );

      // Verify result
      expect(result).toEqual(mockTrackResponse);
    });

    it("should handle errors gracefully", async () => {
      const mockTrackId = "track123";
      vi.mocked(axios.get).mockRejectedValueOnce(new Error("API Error"));

      await expect(getTrack(mockTrackId)).rejects.toThrow(
        "Failed to fetch track: API Error",
      );
    });
  });

  describe("playback control functions", () => {
    describe("pause", () => {
      it("should pause playback successfully", async () => {
        vi.mocked(axios.put).mockResolvedValueOnce({ status: 204 });

        const result = await pause();

        // Verify axios was called correctly
        expect(axios.put).toHaveBeenCalledWith(
          "https://api.spotify.com/v1/me/player/pause",
          null,
          expect.objectContaining({
            headers: { Authorization: "Bearer mock-access-token" },
          }),
        );

        // Verify result
        expect(result).toBe(true);
      });

      it("should handle errors gracefully", async () => {
        vi.mocked(axios.put).mockRejectedValueOnce(new Error("API Error"));

        await expect(pause()).rejects.toThrow(
          "Failed to pause playback: API Error",
        );
      });
    });

    describe("play", () => {
      it("should start playback successfully", async () => {
        vi.mocked(axios.put).mockResolvedValueOnce({ status: 204 });

        const result = await play();

        // Verify axios was called correctly
        expect(axios.put).toHaveBeenCalledWith(
          "https://api.spotify.com/v1/me/player/play",
          null,
          expect.objectContaining({
            headers: { Authorization: "Bearer mock-access-token" },
          }),
        );

        // Verify result
        expect(result).toBe(true);
      });

      it("should handle errors gracefully", async () => {
        vi.mocked(axios.put).mockRejectedValueOnce(new Error("API Error"));

        await expect(play()).rejects.toThrow(
          "Failed to start playback: API Error",
        );
      });
    });

    describe("skipToPrevious", () => {
      it("should skip to previous track successfully", async () => {
        vi.mocked(axios.post).mockResolvedValueOnce({ status: 204 });

        const result = await skipToPrevious();

        // Verify axios was called correctly
        expect(axios.post).toHaveBeenCalledWith(
          "https://api.spotify.com/v1/me/player/previous",
          null,
          expect.objectContaining({
            headers: { Authorization: "Bearer mock-access-token" },
          }),
        );

        // Verify result
        expect(result).toBe(true);
      });

      it("should handle errors gracefully", async () => {
        vi.mocked(axios.post).mockRejectedValueOnce(new Error("API Error"));

        await expect(skipToPrevious()).rejects.toThrow(
          "Failed to skip to previous track: API Error",
        );
      });
    });

    describe("skipToNext", () => {
      it("should skip to next track successfully", async () => {
        vi.mocked(axios.post).mockResolvedValueOnce({ status: 204 });

        const result = await skipToNext();

        // Verify axios was called correctly
        expect(axios.post).toHaveBeenCalledWith(
          "https://api.spotify.com/v1/me/player/next",
          null,
          expect.objectContaining({
            headers: { Authorization: "Bearer mock-access-token" },
          }),
        );

        // Verify result
        expect(result).toBe(true);
      });

      it("should handle errors gracefully", async () => {
        vi.mocked(axios.post).mockRejectedValueOnce(new Error("API Error"));

        await expect(skipToNext()).rejects.toThrow(
          "Failed to skip to next track: API Error",
        );
      });
    });
  });
});
