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

    return {
      __esModule: true,
      default: {
        get: mockGet,
      },
    };
  },
  { virtual: true },
);

// Import module under test after mocks are set up
import { getCurrentUser } from "@/services/spotify/user";

// Get access to the mocked functions
const mockAxios = vi.mocked(
  await import("@/services/spotify/interceptors"),
).default;
const mockGet = mockAxios.get;

describe("Spotify User Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCurrentUser", () => {
    it("should fetch current user profile successfully", async () => {
      const mockUserProfile = {
        id: "user123",
        display_name: "Test User",
        email: "test@example.com",
        country: "US",
      };

      mockGet.mockResolvedValueOnce({
        data: mockUserProfile,
        status: 200,
      });

      const result = await getCurrentUser();

      expect(mockGet).toHaveBeenCalledWith(`${API_BASE_URL}/me`, {
        headers: {
          Authorization: "Bearer mock-access-token",
        },
      });
      expect(result).toEqual(mockUserProfile);
    });

    it("should throw an error when API call fails", async () => {
      mockGet.mockRejectedValueOnce(new Error("API error"));

      await expect(getCurrentUser()).rejects.toThrow(
        /Failed to get user profile/,
      );
    });
  });
});
