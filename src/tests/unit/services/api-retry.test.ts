import { beforeEach, describe, expect, it, vi } from "vitest";
import { retryApiCall } from "../../../services/api-retry";

// Mock the storage module
vi.mock("../../../helpers/storage/store", () => ({
  saveLog: vi.fn(),
}));

describe("API Retry Utility", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock setTimeout to execute immediately
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should resolve immediately on successful API call", async () => {
    // Arrange
    const mockApiCall = vi.fn().mockResolvedValue("success");

    // Act
    const result = await retryApiCall(mockApiCall);

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
    const resultPromise = retryApiCall(mockApiCall);

    // Advance timers to trigger retry
    vi.advanceTimersByTime(1000);

    const result = await resultPromise;

    // Assert
    expect(result).toBe("success after retry");
    expect(mockApiCall).toHaveBeenCalledTimes(2);
  });

  it("should throw an error after exhausting all retry attempts", async () => {
    // Arrange
    const error = new Error("Persistent API failure");
    const mockApiCall = vi.fn().mockRejectedValue(error);

    // Act & Assert
    const resultPromise = retryApiCall(mockApiCall, 3);

    // Advance timers to trigger retries
    vi.advanceTimersByTime(1000); // First retry
    vi.advanceTimersByTime(1500); // Second retry (with backoff)

    // Use try/catch to verify the error is thrown
    await expect(resultPromise).rejects.toThrow(
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
    const resultPromise = retryApiCall(mockApiCall, 5, 500);

    // Advance timers for each retry
    for (let i = 0; i < 4; i++) {
      vi.advanceTimersByTime(2000); // More than enough time for each retry
    }

    const result = await resultPromise;

    // Assert
    expect(result).toBe("success on fifth attempt");
    expect(mockApiCall).toHaveBeenCalledTimes(5);
  });

  it("should use exponential backoff with jitter for retry delays", async () => {
    // Arrange
    // Spy on setTimeout to verify the delay values
    const setTimeoutSpy = vi.spyOn(global, "setTimeout");

    const mockApiCall = vi
      .fn()
      .mockRejectedValueOnce(new Error("First failure"))
      .mockRejectedValueOnce(new Error("Second failure"))
      .mockResolvedValueOnce("success on third attempt");

    // Act
    const resultPromise = retryApiCall(mockApiCall, 3, 1000);

    // Advance timers for each retry
    vi.advanceTimersByTime(1500); // More than enough for first retry
    vi.advanceTimersByTime(2000); // More than enough for second retry

    const result = await resultPromise;

    // Assert
    expect(result).toBe("success on third attempt");
    expect(mockApiCall).toHaveBeenCalledTimes(3);

    // The first delay should be around 1000ms (initial delay)
    // The second delay should be higher due to exponential backoff
    expect(setTimeoutSpy).toHaveBeenCalledTimes(2);

    // Extract delay values (first parameter to setTimeout)
    const firstDelay = setTimeoutSpy.mock.calls[0][1];
    const secondDelay = setTimeoutSpy.mock.calls[1][1];

    // Verify exponential increase (second > first)
    expect(secondDelay).toBeGreaterThan(firstDelay);
  });
});
