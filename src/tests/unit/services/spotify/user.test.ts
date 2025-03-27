import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "../../../../services/spotify/user";

// Mock dependencies
vi.mock("axios");
vi.mock("../../../../helpers/storage/logs-store", () => ({
  saveLog: vi.fn(),
}));
vi.mock("../../../../services/spotify/token", () => ({
  ensureValidToken: vi.fn(),
  getAccessToken: vi.fn().mockReturnValue("mock-access-token"),
}));

describe("Spotify User Service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("getCurrentUser", () => {
    it("should fetch the current user profile successfully", async () => {
      // Mock user profile response
      const mockUserProfile = {
        id: "user123",
        display_name: "Test User",
        email: "test@example.com",
        images: [{ url: "https://example.com/avatar.jpg" }],
        country: "US",
        product: "premium",
        uri: "spotify:user:user123",
        external_urls: {
          spotify: "https://open.spotify.com/user/user123",
        },
      };

      // Setup mock response
      vi.mocked(axios.get).mockResolvedValueOnce({ data: mockUserProfile });

      // Call the function
      const result = await getCurrentUser();

      // Verify axios was called correctly
      expect(axios.get).toHaveBeenCalledWith(
        "https://api.spotify.com/v1/me",
        expect.objectContaining({
          headers: {
            Authorization: "Bearer mock-access-token",
          },
        }),
      );

      // Verify result
      expect(result).toEqual(mockUserProfile);
    });

    it("should handle API errors gracefully", async () => {
      // Setup mock error
      vi.mocked(axios.get).mockRejectedValueOnce(new Error("API Error"));

      // Call should throw
      await expect(getCurrentUser()).rejects.toThrow(
        "Failed to fetch user profile: API Error",
      );
    });

    it("should transform response when transform is true", async () => {
      // Mock user profile response
      const mockUserProfile = {
        id: "user123",
        display_name: "Test User",
        email: "test@example.com",
        images: [{ url: "https://example.com/avatar.jpg" }],
        country: "US",
        product: "premium",
        uri: "spotify:user:user123",
        external_urls: {
          spotify: "https://open.spotify.com/user/user123",
        },
      };

      // Setup mock response
      vi.mocked(axios.get).mockResolvedValueOnce({ data: mockUserProfile });

      // Call the function with transform=true
      const result = await getCurrentUser(true);

      // Verify transformed result
      expect(result).toHaveProperty("id", mockUserProfile.id);
      expect(result).toHaveProperty("name", mockUserProfile.display_name);
      expect(result).toHaveProperty("email", mockUserProfile.email);
      expect(result).toHaveProperty("avatarUrl", mockUserProfile.images[0].url);
      expect(result).toHaveProperty("uri", mockUserProfile.uri);
      expect(result).toHaveProperty("isPremium", true);
    });

    it("should handle missing properties in transform", async () => {
      // Mock user profile with missing data
      const mockUserProfile = {
        id: "user123",
        display_name: "Test User",
        // No email
        // No images
        product: "free",
        uri: "spotify:user:user123",
      };

      // Setup mock response
      vi.mocked(axios.get).mockResolvedValueOnce({ data: mockUserProfile });

      // Call the function with transform=true
      const result = await getCurrentUser(true);

      // Verify transformed result with fallbacks
      expect(result).toHaveProperty("id", mockUserProfile.id);
      expect(result).toHaveProperty("name", mockUserProfile.display_name);
      expect(result).toHaveProperty("email", ""); // Default empty string
      expect(result).toHaveProperty("avatarUrl", ""); // Default empty string
      expect(result).toHaveProperty("uri", mockUserProfile.uri);
      expect(result).toHaveProperty("isPremium", false); // Free account
    });
  });
});
