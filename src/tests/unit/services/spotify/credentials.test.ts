import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ensureCredentialsSet,
  getCredentials,
  hasCredentials,
  setCredentials,
} from "../../../../services/spotify/credentials";

describe("Spotify Credentials Service", () => {
  const mockClientId = "mock-client-id";
  const mockClientSecret = "mock-client-secret";

  beforeEach(() => {
    // Reset the module between tests (since it has module-level state)
    vi.resetModules();

    // Import the module again to reset its state
    const {
      setCredentials,
    } = require("../../../../services/spotify/credentials");

    // Clear credentials
    try {
      setCredentials("", "");
    } catch (e) {
      // Ignore error from clearing credentials
    }
  });

  describe("setCredentials", () => {
    it("should set valid credentials", () => {
      setCredentials(mockClientId, mockClientSecret);

      // Verify credentials are set
      expect(hasCredentials()).toBe(true);
      expect(getCredentials()).toEqual({
        clientId: mockClientId,
        clientSecret: mockClientSecret,
      });
    });

    it("should throw an error with empty client ID", () => {
      expect(() => {
        setCredentials("", mockClientSecret);
      }).toThrow("Client ID cannot be empty");
    });

    it("should throw an error with empty client secret", () => {
      expect(() => {
        setCredentials(mockClientId, "");
      }).toThrow("Client secret cannot be empty");
    });
  });

  describe("hasCredentials", () => {
    it("should return false with no credentials set", () => {
      expect(hasCredentials()).toBe(false);
    });

    it("should return true after credentials are set", () => {
      setCredentials(mockClientId, mockClientSecret);
      expect(hasCredentials()).toBe(true);
    });
  });

  describe("getCredentials", () => {
    it("should return credentials object after they are set", () => {
      setCredentials(mockClientId, mockClientSecret);

      const credentials = getCredentials();

      expect(credentials).toEqual({
        clientId: mockClientId,
        clientSecret: mockClientSecret,
      });
    });

    it("should return empty strings when no credentials are set", () => {
      const credentials = getCredentials();

      expect(credentials).toEqual({
        clientId: "",
        clientSecret: "",
      });
    });
  });

  describe("ensureCredentialsSet", () => {
    it("should not throw an error when credentials are set", () => {
      setCredentials(mockClientId, mockClientSecret);

      expect(() => {
        ensureCredentialsSet();
      }).not.toThrow();
    });

    it("should throw an error when credentials are not set", () => {
      expect(() => {
        ensureCredentialsSet();
      }).toThrow("Spotify API credentials are not set");
    });
  });
});
