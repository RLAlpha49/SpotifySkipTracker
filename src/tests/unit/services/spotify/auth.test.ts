import axios from "axios";
import querystring from "querystring";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  exchangeCodeForTokens,
  getAuthorizationUrl,
} from "../../../../services/spotify/auth";
import * as credentialsModule from "../../../../services/spotify/credentials";
import * as tokenModule from "../../../../services/spotify/token";

// Mock dependencies
vi.mock("axios");
vi.mock("../../../../helpers/storage/logs-store", () => ({
  saveLog: vi.fn(),
}));

// Mock modules with spies instead of completely replacing them
vi.spyOn(credentialsModule, "getCredentials").mockReturnValue({
  clientId: "mock-client-id",
  clientSecret: "mock-client-secret",
});
vi.spyOn(credentialsModule, "ensureCredentialsSet").mockImplementation(
  () => {},
);
vi.spyOn(tokenModule, "setTokens").mockImplementation(() => {});

describe("Spotify Auth Service", () => {
  const mockRedirectUri = "http://localhost/callback";
  const mockScopes = ["user-read-private", "user-read-email"];
  const mockCode = "mock-authorization-code";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAuthorizationUrl", () => {
    it("should generate a proper authorization URL with array scopes", () => {
      const authUrl = getAuthorizationUrl(mockRedirectUri, mockScopes);

      // Check that the URL contains all required params
      expect(authUrl).toContain("https://accounts.spotify.com/authorize");
      expect(authUrl).toContain(`client_id=mock-client-id`);
      expect(authUrl).toContain(`response_type=code`);
      expect(authUrl).toContain(
        `redirect_uri=${encodeURIComponent(mockRedirectUri)}`,
      );
      expect(authUrl).toContain(
        `scope=${encodeURIComponent(mockScopes.join(" "))}`,
      );
    });

    it("should generate a proper authorization URL with string scopes", () => {
      const scopesString = "user-read-private user-read-email";
      const authUrl = getAuthorizationUrl(mockRedirectUri, scopesString);

      expect(authUrl).toContain(`scope=${encodeURIComponent(scopesString)}`);
    });

    it("should include state parameter when provided", () => {
      const mockState = "random-state-123";
      const authUrl = getAuthorizationUrl(
        mockRedirectUri,
        mockScopes,
        mockState,
      );

      expect(authUrl).toContain(`state=${mockState}`);
    });

    it("should include empty state parameter when not provided", () => {
      const authUrl = getAuthorizationUrl(mockRedirectUri, mockScopes);

      expect(authUrl).toContain(`state=`);
    });
  });

  describe("exchangeCodeForTokens", () => {
    it("should exchange code for tokens successfully", async () => {
      const mockTokenResponse = {
        access_token: "mock-access-token",
        refresh_token: "mock-refresh-token",
        expires_in: 3600,
      };

      // Setup mock axios response
      vi.mocked(axios.post).mockResolvedValue({
        data: mockTokenResponse,
      });

      const result = await exchangeCodeForTokens(mockCode, mockRedirectUri);

      // Check that axios was called with correct params
      expect(axios.post).toHaveBeenCalledWith(
        "https://accounts.spotify.com/api/token",
        querystring.stringify({
          grant_type: "authorization_code",
          code: mockCode,
          redirect_uri: mockRedirectUri,
          client_id: "mock-client-id",
          client_secret: "mock-client-secret",
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );

      // Check that tokens were stored and result returned
      expect(result).toEqual(mockTokenResponse);
    });

    it("should throw an error when token exchange fails", async () => {
      // Setup mock axios error
      vi.mocked(axios.post).mockRejectedValueOnce(
        new Error("Invalid authorization code"),
      );

      await expect(
        exchangeCodeForTokens(mockCode, mockRedirectUri),
      ).rejects.toThrow(
        "Failed to exchange code for tokens: Invalid authorization code",
      );
    });
  });
});
