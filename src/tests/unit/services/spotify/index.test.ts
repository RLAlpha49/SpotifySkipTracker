import * as spotifyService from "@/services/spotify";
import { describe, expect, it, vi } from "vitest";

// Mock Electron
vi.mock("electron", () => ({
  app: {
    getPath: vi.fn().mockReturnValue("/mock/user/data"),
  },
}));

// Mock fs-extra to prevent file system permission errors
vi.mock("fs-extra", () => ({
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn().mockReturnValue(Buffer.from("{}")),
  unlinkSync: vi.fn(),
  ensureDirSync: vi.fn(),
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    readFileSync: vi.fn().mockReturnValue(Buffer.from("{}")),
    unlinkSync: vi.fn(),
    ensureDirSync: vi.fn(),
  },
}));

// Mock built-in fs module as well
vi.mock("fs", () => ({
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn().mockReturnValue(Buffer.from("{}")),
  unlinkSync: vi.fn(),
  promises: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue(Buffer.from("{}")),
  },
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    readFileSync: vi.fn().mockReturnValue(Buffer.from("{}")),
    unlinkSync: vi.fn(),
  },
}));

describe("Spotify Service Tests", () => {
  describe("Spotify Service Index", () => {
    describe("exports", () => {
      it("should export the correct functions", () => {
        expect(spotifyService).toHaveProperty("setCredentials");
        expect(spotifyService).toHaveProperty("hasCredentials");
        expect(spotifyService).toHaveProperty("setTokens");
        expect(spotifyService).toHaveProperty("getCurrentPlayback");
        expect(spotifyService).toHaveProperty("play");
        expect(spotifyService).toHaveProperty("pause");
        expect(spotifyService).toHaveProperty("isTrackInLibrary");
      });

      it("should export token management functions", () => {
        expect(spotifyService).toHaveProperty("getCredentials");
        expect(spotifyService).toHaveProperty("ensureCredentialsSet");
        expect(spotifyService).toHaveProperty("isTokenValid");
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
        expect(spotifyService).toHaveProperty("getRecentlyPlayedTracks");
        expect(spotifyService).toHaveProperty("getTrack");
        expect(spotifyService).toHaveProperty("skipToPrevious");
        expect(spotifyService).toHaveProperty("skipToNext");
      });

      it("should export library management functions", () => {
        expect(spotifyService).toHaveProperty("likeTrack");
        expect(spotifyService).toHaveProperty("unlikeTrack");
      });

      it("should export constants", () => {
        expect(spotifyService).toHaveProperty("API_BASE_URL");
        expect(spotifyService).toHaveProperty("AUTH_URL");
        expect(spotifyService).toHaveProperty("TOKEN_URL");
        expect(spotifyService).toHaveProperty("SPOTIFY_SCOPES");
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
});
