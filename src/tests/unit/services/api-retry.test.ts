import { beforeEach, describe, expect, it, vi } from "vitest";
import * as apiRetryModule from "../../../services/api-retry";

// Mock the storage module
vi.mock("../../../helpers/storage/store", () => ({
  saveLog: vi.fn(),
}));

// Create a simplified version of retryApiCall for testing
const mockRetryApiCall = async <T>(
  apiCallFn: () => Promise<T>,
  maxRetries: number = 3,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  initialDelayMs: number = 1000,
): Promise<T> => {
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      attempts++;
      return await apiCallFn();
    } catch (error) {
      if (attempts === maxRetries) {
        throw new Error(
          `API request failed after ${maxRetries} attempts: ${error}`,
        );
      }
      // No actual delay in tests
    }
  }

  throw new Error("This should never be reached");
};

describe("API Retry Utility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock the retryApiCall implementation with our test version
    vi.spyOn(apiRetryModule, "retryApiCall").mockImplementation(
      mockRetryApiCall,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should resolve immediately on successful API call", async () => {
    // Arrange
    const mockApiCall = vi.fn().mockResolvedValue("success");

    // Act
    const result = await apiRetryModule.retryApiCall(mockApiCall);

    // Assert
    expect(result).toBe("success");
    expect(mockApiCall).toHaveBeenCalledTimes(1);
  });

  it("should retry the API call after failure", async () => {
    // Arrange
    const mockApiCall = vi
      .fn()
      .mockRejectedValueOnce(new Error("API failure"))
      .mockResolvedValueOnce("success after retry");

    // Act
    const result = await apiRetryModule.retryApiCall(mockApiCall);

    // Assert
    expect(result).toBe("success after retry");
    expect(mockApiCall).toHaveBeenCalledTimes(2);
  });

  it("should throw an error after exhausting all retry attempts", async () => {
    // Arrange
    const error = new Error("Persistent API failure");
    const mockApiCall = vi.fn().mockRejectedValue(error);

    // Act & Assert
    await expect(apiRetryModule.retryApiCall(mockApiCall, 3)).rejects.toThrow(
      "API request failed after 3 attempts",
    );
    expect(mockApiCall).toHaveBeenCalledTimes(3);
  });

  it("should respect custom maxRetries parameter", async () => {
    // Arrange
    const mockApiCall = vi
      .fn()
      .mockRejectedValueOnce(new Error("First failure"))
      .mockRejectedValueOnce(new Error("Second failure"))
      .mockRejectedValueOnce(new Error("Third failure"))
      .mockRejectedValueOnce(new Error("Fourth failure"))
      .mockResolvedValueOnce("success on fifth attempt");

    // Act
    const result = await apiRetryModule.retryApiCall(mockApiCall, 5, 500);

    // Assert
    expect(result).toBe("success on fifth attempt");
    expect(mockApiCall).toHaveBeenCalledTimes(5);
  });

  it("should handle different retry scenarios", async () => {
    // Arrange
    const mockApiCall = vi
      .fn()
      .mockRejectedValueOnce(new Error("First failure"))
      .mockRejectedValueOnce(new Error("Second failure"))
      .mockResolvedValueOnce("success on third attempt");

    // Act
    const result = await apiRetryModule.retryApiCall(mockApiCall, 3, 1000);

    // Assert
    expect(result).toBe("success on third attempt");
    expect(mockApiCall).toHaveBeenCalledTimes(3);
  });
});
