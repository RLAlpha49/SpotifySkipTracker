import { describe, expect, it } from "vitest";
import * as spotifyService from "../../../../services/spotify";

describe("Spotify Service Index", () => {
  describe("exports", () => {
    it("should export credential management functions", () => {
      expect(spotifyService).toHaveProperty("setCredentials");
      expect(spotifyService).toHaveProperty("hasCredentials");
      expect(spotifyService).toHaveProperty("getCredentials");
      expect(spotifyService).toHaveProperty("ensureCredentialsSet");
    });

    it("should export token management functions", () => {
      expect(spotifyService).toHaveProperty("isTokenValid");
      expect(spotifyService).toHaveProperty("setTokens");
      expect(spotifyService).toHaveProperty("clearTokens");
      expect(spotifyService).toHaveProperty("getTokenInfo");
      expect(spotifyService).toHaveProperty("getAccessToken");
      expect(spotifyService).toHaveProperty("getRefreshToken");
      expect(spotifyService).toHaveProperty("refreshAccessToken");
      expect(spotifyService).toHaveProperty("ensureValidToken");
    });

    it("should export authentication functions", () => {
      expect(spotifyService).toHaveProperty("getAuthorizationUrl");
      expect(spotifyService).toHaveProperty("exchangeCodeForTokens");
    });

    it("should export user profile functions", () => {
      expect(spotifyService).toHaveProperty("getCurrentUser");
    });

    it("should export playback control functions", () => {
      expect(spotifyService).toHaveProperty("getCurrentPlayback");
      expect(spotifyService).toHaveProperty("getRecentlyPlayedTracks");
      expect(spotifyService).toHaveProperty("getTrack");
      expect(spotifyService).toHaveProperty("pause");
      expect(spotifyService).toHaveProperty("play");
      expect(spotifyService).toHaveProperty("skipToPrevious");
      expect(spotifyService).toHaveProperty("skipToNext");
    });

    it("should export library management functions", () => {
      expect(spotifyService).toHaveProperty("isTrackInLibrary");
      expect(spotifyService).toHaveProperty("likeTrack");
      expect(spotifyService).toHaveProperty("unlikeTrack");
    });

    it("should export constants", () => {
      expect(spotifyService).toHaveProperty("BASE_API_URL");
      expect(spotifyService).toHaveProperty("AUTH_URL");
      expect(spotifyService).toHaveProperty("TOKEN_URL");
      expect(spotifyService).toHaveProperty("SCOPES");
    });
  });

  describe("export types", () => {
    it("should have functions of the correct type", () => {
      // Check a few representative functions
      expect(typeof spotifyService.setCredentials).toBe("function");
      expect(typeof spotifyService.getAuthorizationUrl).toBe("function");
      expect(typeof spotifyService.getCurrentUser).toBe("function");
      expect(typeof spotifyService.pause).toBe("function");
      expect(typeof spotifyService.isTrackInLibrary).toBe("function");
    });
  });
});
