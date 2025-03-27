import { describe, expect, it } from "vitest";
import {
  API_BASE_URL,
  AUTH_URL,
  SPOTIFY_SCOPES,
  TOKEN_URL,
} from "../../../../services/spotify/constants";

describe("Spotify Constants", () => {
  describe("API URLs", () => {
    it("should have correct API_BASE_URL", () => {
      expect(API_BASE_URL).toBe("https://api.spotify.com/v1");
    });

    it("should have correct AUTH_URL", () => {
      expect(AUTH_URL).toBe("https://accounts.spotify.com/authorize");
    });

    it("should have correct TOKEN_URL", () => {
      expect(TOKEN_URL).toBe("https://accounts.spotify.com/api/token");
    });
  });

  describe("SPOTIFY_SCOPES", () => {
    it("should include necessary scopes", () => {
      // These are the minimum scopes expected
      const minimumExpectedScopes = [
        "user-read-playback-state",
        "user-modify-playback-state",
        "user-library-read",
        "user-library-modify",
        "user-read-recently-played",
      ];

      // Check that all minimum scopes are included
      minimumExpectedScopes.forEach((scope) => {
        expect(SPOTIFY_SCOPES).toContain(scope);
      });

      // SPOTIFY_SCOPES should be an array
      expect(Array.isArray(SPOTIFY_SCOPES)).toBe(true);

      // All scopes should be strings
      SPOTIFY_SCOPES.forEach((scope) => {
        expect(typeof scope).toBe("string");
      });
    });
  });
});
