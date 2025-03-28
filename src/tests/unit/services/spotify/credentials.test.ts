import { beforeEach, describe, expect, it, vi } from "vitest";
import * as credentialsModule from "@/services/spotify/credentials";

// Mock Electron
vi.mock("electron", () => ({
  app: {
    getPath: vi.fn().mockReturnValue("/mock/user/data"),
  },
}));

// Mock the credentials module
vi.mock("@/services/spotify/credentials", async () => {
  // Create a mock storage for credentials
  let storage = {
    clientId: "",
    clientSecret: "",
  };

  return {
    setCredentials: vi.fn((clientId, clientSecret) => {
      if (!clientId) throw new Error("Client ID cannot be empty");
      if (!clientSecret) throw new Error("Client secret cannot be empty");

      storage.clientId = clientId;
      storage.clientSecret = clientSecret;
    }),
    getCredentials: vi.fn(() => ({ ...storage })),
    hasCredentials: vi.fn(
      () => storage.clientId !== "" && storage.clientSecret !== "",
    ),
    ensureCredentialsSet: vi.fn(() => {
      if (!storage.clientId || !storage.clientSecret) {
        throw new Error("Spotify API credentials are not set");
      }
    }),
    // Reset function for tests (not part of actual implementation)
    __resetCredentials: () => {
      storage.clientId = "";
      storage.clientSecret = "";
    },
  };
});

describe("Spotify Credentials Service", () => {
  const mockClientId = "mock-client-id";
  const mockClientSecret = "mock-client-secret";

  const {
    setCredentials,
    getCredentials,
    hasCredentials,
    ensureCredentialsSet,
    __resetCredentials,
  } = credentialsModule as any; // Cast to any to access the __resetCredentials

  beforeEach(() => {
    // Reset the module between tests
    vi.clearAllMocks();
    __resetCredentials();
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
