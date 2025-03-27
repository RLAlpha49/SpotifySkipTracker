import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  isTrackInLibrary,
  likeTrack,
  unlikeTrack,
} from "../../../../services/spotify/library";

// Mock dependencies
vi.mock("axios");
vi.mock("../../../../helpers/storage/logs-store", () => ({
  saveLog: vi.fn(),
}));
vi.mock("../../../../services/spotify/token", () => ({
  ensureValidToken: vi.fn(),
  getAccessToken: vi.fn().mockReturnValue("mock-access-token"),
}));

describe("Spotify Library Service", () => {
  const mockTrackId = "1abc23defghij4klmno5pqrs";

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("isTrackInLibrary", () => {
    it("should return true when track is in library", async () => {
      // Mock API response: [true] means the first (and only) track is in library
      vi.mocked(axios.get).mockResolvedValueOnce({ data: [true] });

      const result = await isTrackInLibrary(mockTrackId);

      // Verify axios was called correctly
      expect(axios.get).toHaveBeenCalledWith(
        "https://api.spotify.com/v1/me/tracks/contains",
        expect.objectContaining({
          params: { ids: mockTrackId },
          headers: { Authorization: "Bearer mock-access-token" },
        }),
      );

      // Verify result
      expect(result).toBe(true);
    });

    it("should return false when track is not in library", async () => {
      // Mock API response: [false] means the track is not in library
      vi.mocked(axios.get).mockResolvedValueOnce({ data: [false] });

      const result = await isTrackInLibrary(mockTrackId);

      expect(result).toBe(false);
    });

    it("should handle errors gracefully", async () => {
      // Mock API error
      vi.mocked(axios.get).mockRejectedValueOnce(new Error("API Error"));

      // For stability, the function should return false on errors rather than throwing
      const result = await isTrackInLibrary(mockTrackId);

      expect(result).toBe(false);
    });
  });

  describe("likeTrack", () => {
    it("should add track to library successfully", async () => {
      // Mock successful API response
      vi.mocked(axios.put).mockResolvedValueOnce({ status: 200 });

      const result = await likeTrack(mockTrackId);

      // Verify axios was called correctly
      expect(axios.put).toHaveBeenCalledWith(
        "https://api.spotify.com/v1/me/tracks",
        null, // No body data when using ids parameter
        expect.objectContaining({
          params: { ids: mockTrackId },
          headers: { Authorization: "Bearer mock-access-token" },
        }),
      );

      // Verify result
      expect(result).toBe(true);
    });

    it("should handle errors gracefully", async () => {
      // Mock API error
      vi.mocked(axios.put).mockRejectedValueOnce(new Error("API Error"));

      await expect(likeTrack(mockTrackId)).rejects.toThrow(
        "Failed to add track to library: API Error",
      );
    });
  });

  describe("unlikeTrack", () => {
    it("should remove track from library successfully", async () => {
      // Mock successful API response
      vi.mocked(axios.delete).mockResolvedValueOnce({ status: 200 });

      const result = await unlikeTrack(mockTrackId);

      // Verify axios was called correctly
      expect(axios.delete).toHaveBeenCalledWith(
        "https://api.spotify.com/v1/me/tracks",
        expect.objectContaining({
          params: { ids: mockTrackId },
          headers: { Authorization: "Bearer mock-access-token" },
        }),
      );

      // Verify result
      expect(result).toBe(true);
    });

    it("should handle errors gracefully", async () => {
      // Mock API error
      vi.mocked(axios.delete).mockRejectedValueOnce(new Error("API Error"));

      await expect(unlikeTrack(mockTrackId)).rejects.toThrow(
        "Failed to remove track from library: API Error",
      );
    });
  });
});
