import { API_BASE_URL } from "@/services/spotify/constants";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock all dependencies
vi.mock("axios", () => ({
  default: {
    create: vi.fn().mockReturnValue({}),
  },
}));

vi.mock("@/helpers/storage/logs-store", () => ({
  LogsStore: {
    addLog: vi.fn(),
  },
  saveLog: vi.fn(),
}));

vi.mock("electron", () => ({
  ipcRenderer: {
    send: vi.fn(),
  },
}));

vi.mock("@/services/spotify/token", () => ({
  ensureValidToken: vi.fn().mockResolvedValue(undefined),
  getAccessToken: vi.fn().mockReturnValue("mock-access-token"),
}));

vi.mock("@/services/api-retry", () => ({
  retryApiCall: vi.fn().mockImplementation((fn) => fn()),
}));

// Mock the specific interceptors module
vi.mock(
  "@/services/spotify/interceptors",
  () => {
    const mockGet = vi.fn();
    const mockPost = vi.fn();
    const mockPut = vi.fn();

    return {
      __esModule: true,
      default: {
        get: mockGet,
        post: mockPost,
        put: mockPut,
      },
    };
  },
  { virtual: true },
);

// Import module under test after mocks are set up
import {
  getCurrentPlayback,
  getRecentlyPlayedTracks,
  getTrack,
  pause,
  play,
  skipToNext,
  skipToPrevious,
} from "@/services/spotify/playback";

// Get access to the mocked functions
const mockAxios = vi.mocked(
  await import("@/services/spotify/interceptors"),
).default;
const mockGet = mockAxios.get;
const mockPost = mockAxios.post;
const mockPut = mockAxios.put;

describe("Spotify Playback Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCurrentPlayback", () => {
    it("should return current playback state when playing", async () => {
      const mockPlaybackState = {
        is_playing: true,
        item: {
          id: "track123",
          name: "Test Track",
          artists: [{ name: "Test Artist" }],
        },
        device: { name: "Test Device" },
      };

      mockGet.mockResolvedValueOnce({
        data: mockPlaybackState,
        status: 200,
      });

      const result = await getCurrentPlayback();

      expect(mockGet).toHaveBeenCalledWith(`${API_BASE_URL}/me/player`, {
        headers: {
          Authorization: "Bearer mock-access-token",
        },
      });
      expect(result).toEqual(mockPlaybackState);
    });

    it("should return null when no active playback (204 No Content)", async () => {
      mockGet.mockResolvedValueOnce({
        status: 204,
      });

      const result = await getCurrentPlayback();

      expect(mockGet).toHaveBeenCalledWith(`${API_BASE_URL}/me/player`, {
        headers: {
          Authorization: "Bearer mock-access-token",
        },
      });
      expect(result).toBeNull();
    });

    it("should throw an error when API call fails", async () => {
      mockGet.mockRejectedValueOnce(new Error("API error"));

      await expect(getCurrentPlayback()).rejects.toThrow(
        /Failed to get playback state/,
      );
    });

    it("should include additional_types when detailed is true", async () => {
      const mockPlaybackState = {
        is_playing: true,
        item: {
          id: "track123",
          name: "Test Track",
          artists: [{ name: "Test Artist" }],
        },
        device: { name: "Test Device" },
      };

      mockGet.mockResolvedValueOnce({
        data: mockPlaybackState,
        status: 200,
      });

      const result = await getCurrentPlayback(true);

      expect(mockGet).toHaveBeenCalledWith(
        `${API_BASE_URL}/me/player?additional_types=episode`,
        {
          headers: {
            Authorization: "Bearer mock-access-token",
          },
        },
      );
      expect(result).toEqual(mockPlaybackState);
    });
  });

  describe("getRecentlyPlayedTracks", () => {
    it("should return recently played tracks", async () => {
      const mockTracks = {
        items: [
          {
            track: {
              id: "track123",
              name: "Test Track",
            },
            played_at: "2023-01-01T12:00:00Z",
          },
        ],
      };

      mockGet.mockResolvedValueOnce({
        data: mockTracks,
        status: 200,
      });

      const result = await getRecentlyPlayedTracks();

      expect(mockGet).toHaveBeenCalledWith(
        `${API_BASE_URL}/me/player/recently-played?limit=5`,
        {
          headers: {
            Authorization: "Bearer mock-access-token",
          },
        },
      );
      expect(result).toEqual(mockTracks);
    });

    it("should respect the limit parameter", async () => {
      const mockTracks = {
        items: [
          {
            track: {
              id: "track123",
              name: "Test Track",
            },
            played_at: "2023-01-01T12:00:00Z",
          },
        ],
      };

      mockGet.mockResolvedValueOnce({
        data: mockTracks,
        status: 200,
      });

      await getRecentlyPlayedTracks(10);

      expect(mockGet).toHaveBeenCalledWith(
        `${API_BASE_URL}/me/player/recently-played?limit=10`,
        {
          headers: {
            Authorization: "Bearer mock-access-token",
          },
        },
      );
    });

    it("should throw an error when API call fails", async () => {
      mockGet.mockRejectedValueOnce(new Error("API error"));

      await expect(getRecentlyPlayedTracks()).rejects.toThrow(
        /Failed to get recently played tracks/,
      );
    });
  });

  describe("getTrack", () => {
    it("should fetch a track by ID", async () => {
      const mockTrack = {
        id: "track123",
        name: "Test Track",
        artists: [{ name: "Test Artist" }],
      };

      mockGet.mockResolvedValueOnce({
        data: mockTrack,
        status: 200,
      });

      const result = await getTrack("track123");

      expect(mockGet).toHaveBeenCalledWith(`${API_BASE_URL}/tracks/track123`, {
        headers: {
          Authorization: "Bearer mock-access-token",
        },
      });
      expect(result).toEqual(mockTrack);
    });

    it("should throw an error when API call fails", async () => {
      mockGet.mockRejectedValueOnce(new Error("API error"));

      await expect(getTrack("track123")).rejects.toThrow(/Failed to get track/);
    });
  });

  describe("playback control functions", () => {
    describe("pause", () => {
      it("should pause playback successfully", async () => {
        mockPut.mockResolvedValueOnce({
          status: 204,
        });

        await pause();

        expect(mockPut).toHaveBeenCalledWith(
          `${API_BASE_URL}/me/player/pause`,
          {},
          {
            headers: {
              Authorization: "Bearer mock-access-token",
            },
          },
        );
      });

      it("should not throw when API returns 403/404 error", async () => {
        mockPut.mockRejectedValueOnce({
          response: { status: 403 },
          message: "API error",
        });

        // Should not throw an error
        await pause();
        expect(mockPut).toHaveBeenCalledWith(
          `${API_BASE_URL}/me/player/pause`,
          {},
          {
            headers: {
              Authorization: "Bearer mock-access-token",
            },
          },
        );
      });
    });

    describe("play", () => {
      it("should start playback successfully", async () => {
        mockPut.mockResolvedValueOnce({
          status: 204,
        });

        await play();

        expect(mockPut).toHaveBeenCalledWith(
          `${API_BASE_URL}/me/player/play`,
          {},
          {
            headers: {
              Authorization: "Bearer mock-access-token",
            },
          },
        );
      });

      it("should not throw when API returns 403/404 error", async () => {
        mockPut.mockRejectedValueOnce({
          response: { status: 403 },
          message: "API error",
        });

        // Should not throw an error
        await play();
        expect(mockPut).toHaveBeenCalledWith(
          `${API_BASE_URL}/me/player/play`,
          {},
          {
            headers: {
              Authorization: "Bearer mock-access-token",
            },
          },
        );
      });
    });

    describe("skipToNext", () => {
      it("should skip to next track successfully", async () => {
        mockPost.mockResolvedValueOnce({
          status: 204,
        });

        await skipToNext();

        expect(mockPost).toHaveBeenCalledWith(
          `${API_BASE_URL}/me/player/next`,
          {},
          {
            headers: {
              Authorization: "Bearer mock-access-token",
            },
          },
        );
      });
    });

    describe("skipToPrevious", () => {
      it("should skip to previous track successfully", async () => {
        mockPost.mockResolvedValueOnce({
          status: 204,
        });

        await skipToPrevious();

        expect(mockPost).toHaveBeenCalledWith(
          `${API_BASE_URL}/me/player/previous`,
          {},
          {
            headers: {
              Authorization: "Bearer mock-access-token",
            },
          },
        );
      });
    });
  });
});
