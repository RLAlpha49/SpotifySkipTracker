import axios from "axios";
import querystring from "querystring";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearTokens,
  ensureValidToken,
  getAccessToken,
  getRefreshToken,
  getTokenInfo,
  isTokenValid,
  refreshAccessToken,
  setTokens,
} from "../../../../services/spotify/token";

// Mock dependencies
vi.mock("axios");
vi.mock("../../../../helpers/storage/logs-store", () => ({
  saveLog: vi.fn(),
}));
vi.mock("../../../../services/spotify/credentials", () => ({
  ensureCredentialsSet: vi.fn(),
  getCredentials: vi.fn().mockReturnValue({
    clientId: "mock-client-id",
    clientSecret: "mock-client-secret",
  }),
}));
vi.mock("../../../../services/api-retry", () => ({
  retryApiCall: vi.fn().mockImplementation(async (fn) => await fn()),
}));

describe("Spotify Token Service", () => {
  const mockAccessToken = "mock-access-token";
  const mockRefreshToken = "mock-refresh-token";
  const mockExpiresIn = 3600; // 1 hour

  beforeEach(() => {
    vi.resetAllMocks();
    // Clear token state before each test
    clearTokens();
  });

  describe("getTokenInfo", () => {
    it("should return initial state with no tokens", () => {
      const info = getTokenInfo();

      expect(info).toEqual({
        hasAccessToken: false,
        hasRefreshToken: false,
        isValid: false,
        expiresIn: 0,
      });
    });

    it("should return correct info with tokens", () => {
      // Set tokens
      setTokens(mockAccessToken, mockRefreshToken, mockExpiresIn);

      const info = getTokenInfo();

      expect(info).toEqual({
        hasAccessToken: true,
        hasRefreshToken: true,
        isValid: true,
        expiresIn: expect.any(Number),
      });

      // expiresIn should be close to mockExpiresIn, but can be slightly less since time passes
      expect(info.expiresIn).toBeLessThanOrEqual(mockExpiresIn);
      expect(info.expiresIn).toBeGreaterThan(mockExpiresIn - 5); // Within 5 seconds
    });
  });

  describe("setTokens", () => {
    it("should set tokens and calculate expiry time", () => {
      setTokens(mockAccessToken, mockRefreshToken, mockExpiresIn);

      expect(getAccessToken()).toBe(mockAccessToken);
      expect(getRefreshToken()).toBe(mockRefreshToken);

      // Token should be valid
      expect(isTokenValid()).toBe(true);
    });
  });

  describe("clearTokens", () => {
    it("should clear all tokens", () => {
      // Set tokens first
      setTokens(mockAccessToken, mockRefreshToken, mockExpiresIn);

      // Then clear them
      clearTokens();

      expect(getAccessToken()).toBeNull();
      expect(getRefreshToken()).toBeNull();
      expect(isTokenValid()).toBe(false);
    });
  });

  describe("isTokenValid", () => {
    it("should return false with no token", () => {
      expect(isTokenValid()).toBe(false);
    });

    it("should return true with valid token", () => {
      setTokens(mockAccessToken, mockRefreshToken, mockExpiresIn);
      expect(isTokenValid()).toBe(true);
    });

    it("should return false with expired token", () => {
      // Set token with 0 expiry time
      setTokens(mockAccessToken, mockRefreshToken, 0);
      expect(isTokenValid()).toBe(false);
    });
  });

  describe("getAccessToken and getRefreshToken", () => {
    it("should return null with no tokens", () => {
      expect(getAccessToken()).toBeNull();
      expect(getRefreshToken()).toBeNull();
    });

    it("should return set tokens", () => {
      setTokens(mockAccessToken, mockRefreshToken, mockExpiresIn);

      expect(getAccessToken()).toBe(mockAccessToken);
      expect(getRefreshToken()).toBe(mockRefreshToken);
    });
  });

  describe("refreshAccessToken", () => {
    it("should throw error with no refresh token", async () => {
      await expect(refreshAccessToken()).rejects.toThrow(
        "No refresh token available",
      );
    });

    it("should refresh the access token successfully", async () => {
      // Set initial tokens
      setTokens(mockAccessToken, mockRefreshToken, 0); // Set as expired

      // Setup mock response
      const mockTokenResponse = {
        access_token: "new-access-token",
        refresh_token: "new-refresh-token",
        expires_in: 3600,
      };

      vi.mocked(axios.post).mockResolvedValueOnce({ data: mockTokenResponse });

      // Call refresh
      const result = await refreshAccessToken();

      // Verify axios call
      expect(axios.post).toHaveBeenCalledWith(
        "https://accounts.spotify.com/api/token",
        querystring.stringify({
          grant_type: "refresh_token",
          refresh_token: mockRefreshToken,
          client_id: "mock-client-id",
          client_secret: "mock-client-secret",
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );

      // Verify tokens updated
      expect(getAccessToken()).toBe(mockTokenResponse.access_token);
      expect(getRefreshToken()).toBe(mockTokenResponse.refresh_token);
      expect(isTokenValid()).toBe(true);

      // Verify result
      expect(result).toEqual(mockTokenResponse);
    });

    it("should use existing refresh token if new one not provided", async () => {
      // Set initial tokens
      setTokens(mockAccessToken, mockRefreshToken, 0); // Set as expired

      // Setup mock response with no refresh token
      const mockTokenResponse = {
        access_token: "new-access-token",
        expires_in: 3600,
        // No refresh_token here
      };

      vi.mocked(axios.post).mockResolvedValueOnce({ data: mockTokenResponse });

      // Call refresh
      await refreshAccessToken();

      // Verify refresh token didn't change
      expect(getAccessToken()).toBe(mockTokenResponse.access_token);
      expect(getRefreshToken()).toBe(mockRefreshToken);
    });

    it("should throw an error when refresh fails", async () => {
      // Set initial tokens
      setTokens(mockAccessToken, mockRefreshToken, 0);

      // Setup mock error
      vi.mocked(axios.post).mockRejectedValueOnce(
        new Error("Invalid refresh token"),
      );

      await expect(refreshAccessToken()).rejects.toThrow(
        "Failed to refresh access token: Invalid refresh token",
      );
    });
  });

  describe("ensureValidToken", () => {
    it("should not refresh when token is valid", async () => {
      // Set valid token
      setTokens(mockAccessToken, mockRefreshToken, mockExpiresIn);

      // Mock refresh function to check if it's called
      const refreshSpy = vi.spyOn({ refresh: refreshAccessToken }, "refresh");

      await ensureValidToken();

      // Verify refresh not called
      expect(refreshSpy).not.toHaveBeenCalled();
    });

    it("should refresh when token is expired", async () => {
      // Set expired token
      setTokens(mockAccessToken, mockRefreshToken, 0);

      // Setup mock for refresh
      const mockTokenResponse = {
        access_token: "new-access-token",
        refresh_token: "new-refresh-token",
        expires_in: 3600,
      };

      vi.mocked(axios.post).mockResolvedValueOnce({ data: mockTokenResponse });

      await ensureValidToken();

      // Verify refresh was called
      expect(axios.post).toHaveBeenCalled();
      expect(getAccessToken()).toBe(mockTokenResponse.access_token);
    });

    it("should throw error when refresh fails and no valid token", async () => {
      // Set expired token
      setTokens(mockAccessToken, mockRefreshToken, 0);

      // Setup mock error
      vi.mocked(axios.post).mockRejectedValueOnce(
        new Error("Invalid refresh token"),
      );

      await expect(ensureValidToken()).rejects.toThrow(
        "Access token expired and refresh failed. Re-authorization required.",
      );
    });

    it("should throw error when no token or refresh token available", async () => {
      // No tokens set (clearTokens from beforeEach)

      await expect(ensureValidToken()).rejects.toThrow(
        "No valid access token. Authorization required.",
      );
    });
  });
});
