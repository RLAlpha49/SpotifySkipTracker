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
    const mockPut = vi.fn();
    const mockDelete = vi.fn();

    return {
      __esModule: true,
      default: {
        get: mockGet,
        put: mockPut,
        delete: mockDelete,
      },
    };
  },
  { virtual: true },
);

// Import module under test after mocks are set up
import {
  isTrackInLibrary,
  likeTrack,
  unlikeTrack,
} from "@/services/spotify/library";

// Get access to the mocked functions
const mockAxios = vi.mocked(
  await import("@/services/spotify/interceptors"),
).default;
const mockGet = mockAxios.get;
const mockPut = mockAxios.put;
const mockDelete = mockAxios.delete;

describe("Spotify Library Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isTrackInLibrary", () => {
    it("should return true when track is in library", async () => {
      mockGet.mockResolvedValueOnce({
        data: [true],
        status: 200,
      });

      const result = await isTrackInLibrary("track123");

      expect(mockGet).toHaveBeenCalledWith(
        `${API_BASE_URL}/me/tracks/contains?ids=track123`,
        {
          headers: {
            Authorization: "Bearer mock-access-token",
          },
        },
      );
      expect(result).toBe(true);
    });

    it("should return false when track is not in library", async () => {
      mockGet.mockResolvedValueOnce({
        data: [false],
        status: 200,
      });

      const result = await isTrackInLibrary("track123");

      expect(mockGet).toHaveBeenCalledWith(
        `${API_BASE_URL}/me/tracks/contains?ids=track123`,
        {
          headers: {
            Authorization: "Bearer mock-access-token",
          },
        },
      );
      expect(result).toBe(false);
    });

    it("should return false when API call fails", async () => {
      mockGet.mockRejectedValueOnce(new Error("API error"));

      const result = await isTrackInLibrary("track123");

      expect(result).toBe(false);
    });
  });

  describe("likeTrack", () => {
    it("should add a track to the library", async () => {
      mockPut.mockResolvedValueOnce({
        status: 200,
      });

      await likeTrack("track123");

      expect(mockPut).toHaveBeenCalledWith(
        `${API_BASE_URL}/me/tracks?ids=track123`,
        {},
        {
          headers: {
            Authorization: "Bearer mock-access-token",
          },
        },
      );
    });

    it("should handle errors when adding a track", async () => {
      mockPut.mockRejectedValueOnce(new Error("API error"));

      await likeTrack("track123");
      // The function should not throw, just log the error
      expect(mockPut).toHaveBeenCalledWith(
        `${API_BASE_URL}/me/tracks?ids=track123`,
        {},
        {
          headers: {
            Authorization: "Bearer mock-access-token",
          },
        },
      );
    });
  });

  describe("unlikeTrack", () => {
    it("should remove a track from the library", async () => {
      mockDelete.mockResolvedValueOnce({
        status: 200,
      });

      await unlikeTrack("track123");

      expect(mockDelete).toHaveBeenCalledWith(
        `${API_BASE_URL}/me/tracks?ids=track123`,
        {
          headers: {
            Authorization: "Bearer mock-access-token",
          },
        },
      );
    });

    it("should handle errors when removing a track", async () => {
      mockDelete.mockRejectedValueOnce(new Error("API error"));

      await unlikeTrack("track123");
      // The function should not throw, just log the error
      expect(mockDelete).toHaveBeenCalledWith(
        `${API_BASE_URL}/me/tracks?ids=track123`,
        {
          headers: {
            Authorization: "Bearer mock-access-token",
          },
        },
      );
    });
  });
});
