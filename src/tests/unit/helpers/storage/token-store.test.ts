import * as crypto from "crypto";
import * as fs from "fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearTokens,
  loadTokens,
  saveTokens,
} from "../../../../helpers/storage/token-store";

// Mock dependencies
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

vi.mock("crypto", () => ({
  randomBytes: vi.fn(),
  createCipheriv: vi.fn(),
  createDecipheriv: vi.fn(),
}));

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn().mockReturnValue("/mock/user/data"),
  },
}));

vi.mock("../../../../helpers/storage/logs-store", () => ({
  saveLog: vi.fn(),
}));

describe("Token Store", () => {
  // Sample token data for testing
  const testTokenData = {
    accessToken: "test-access-token-123",
    refreshToken: "test-refresh-token-456",
    expiresAt: Date.now() + 3600000, // 1 hour from now
  };

  // Mock encryption objects
  const mockCipher = {
    update: vi.fn().mockReturnValue("encrypted-data"),
    final: vi.fn().mockReturnValue("final-data"),
    getAuthTag: vi.fn().mockReturnValue(Buffer.from("auth-tag")),
  };

  const mockDecipher = {
    update: vi.fn().mockReturnValue("decrypted-data"),
    final: vi.fn().mockReturnValue(""),
    setAuthTag: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock implementations
    vi.mocked(crypto.randomBytes).mockImplementation((size) =>
      Buffer.alloc(size),
    );
    vi.mocked(crypto.createCipheriv).mockReturnValue(mockCipher as any);
    vi.mocked(crypto.createDecipheriv).mockReturnValue(mockDecipher as any);

    // Default file existence check to false
    vi.mocked(fs.existsSync).mockReturnValue(false);

    // Mock readFileSync for encryption key
    vi.mocked(fs.readFileSync)
      .mockImplementationOnce(() => Buffer.from("mock-encryption-key")) // For encryption key
      .mockImplementationOnce(() =>
        JSON.stringify({
          encryptedData: "encrypted-data:auth-tag",
          iv: "mock-iv",
        }),
      ); // For token data
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("saveTokens", () => {
    it("should successfully encrypt and save tokens", () => {
      // Arrange
      vi.mocked(fs.existsSync).mockReturnValueOnce(true); // Encryption key exists

      // Act
      const result = saveTokens(testTokenData);

      // Assert
      expect(result).toBe(true);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining("spotify-tokens.json"),
        expect.stringContaining("encryptedData"),
      );
      expect(crypto.createCipheriv).toHaveBeenCalled();
      expect(mockCipher.update).toHaveBeenCalledWith(
        expect.any(String),
        "utf8",
        "hex",
      );
      expect(mockCipher.final).toHaveBeenCalledWith("hex");
      expect(mockCipher.getAuthTag).toHaveBeenCalled();
    });

    it("should generate a new encryption key if none exists", () => {
      // Arrange
      vi.mocked(fs.existsSync).mockReturnValue(false); // Encryption key doesn't exist

      // Act
      const result = saveTokens(testTokenData);

      // Assert
      expect(result).toBe(true);
      expect(crypto.randomBytes).toHaveBeenCalledWith(32); // Generate 256-bit key
      expect(fs.writeFileSync).toHaveBeenCalledTimes(2); // Once for key, once for data
    });

    it("should return false if an error occurs during token saving", () => {
      // Arrange
      vi.mocked(fs.writeFileSync).mockImplementationOnce(() => {
        throw new Error("Write error");
      });

      // Act
      const result = saveTokens(testTokenData);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("loadTokens", () => {
    it("should successfully decrypt and load tokens", () => {
      // Arrange
      vi.mocked(fs.existsSync).mockReturnValue(true); // Files exist
      vi.mocked(fs.readFileSync)
        .mockReturnValueOnce(Buffer.from("mock-encryption-key")) // For encryption key
        .mockReturnValueOnce(
          JSON.stringify({
            encryptedData: "encrypted-data:auth-tag",
            iv: "mock-iv",
          }),
        ); // For token data

      // Mock the decryption result
      vi.mocked(mockDecipher.update).mockReturnValueOnce(
        JSON.stringify(testTokenData),
      );

      // Act
      const result = loadTokens();

      // Assert
      expect(result).toEqual(testTokenData);
      expect(fs.readFileSync).toHaveBeenCalledWith(
        expect.stringContaining("spotify-tokens.json"),
        "utf8",
      );
      expect(crypto.createDecipheriv).toHaveBeenCalled();
      expect(mockDecipher.setAuthTag).toHaveBeenCalled();
      expect(mockDecipher.update).toHaveBeenCalledWith(
        "encrypted-data",
        "hex",
        "utf8",
      );
    });

    it("should return null if token file doesn't exist", () => {
      // Arrange
      vi.mocked(fs.existsSync)
        .mockReturnValueOnce(true) // Encryption key exists
        .mockReturnValueOnce(false); // Token file doesn't exist

      // Act
      const result = loadTokens();

      // Assert
      expect(result).toBeNull();
    });

    it("should return null if decryption fails", () => {
      // Arrange
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(mockDecipher.update).mockImplementationOnce(() => {
        throw new Error("Decryption error");
      });

      // Act
      const result = loadTokens();

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("clearTokens", () => {
    it("should delete token file if it exists", () => {
      // Arrange
      vi.mocked(fs.existsSync).mockReturnValueOnce(true);

      // Act
      const result = clearTokens();

      // Assert
      expect(result).toBe(true);
      expect(fs.unlinkSync).toHaveBeenCalledWith(
        expect.stringContaining("spotify-tokens.json"),
      );
    });

    it("should return false if token file doesn't exist", () => {
      // Arrange
      vi.mocked(fs.existsSync).mockReturnValueOnce(false);

      // Act
      const result = clearTokens();

      // Assert
      expect(result).toBe(false);
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it("should return false if an error occurs during deletion", () => {
      // Arrange
      vi.mocked(fs.existsSync).mockReturnValueOnce(true);
      vi.mocked(fs.unlinkSync).mockImplementationOnce(() => {
        throw new Error("Delete error");
      });

      // Act
      const result = clearTokens();

      // Assert
      expect(result).toBe(false);
    });
  });
});
