import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("../../../../helpers/storage/store", () => ({
  saveLog: vi.fn(),
}));

// Mock aggregator functions
vi.mock("../../../../services/statistics/aggregator", () => ({
  aggregateArtistSkipMetrics: vi.fn().mockResolvedValue({}),
  aggregateDailySkipMetrics: vi.fn().mockResolvedValue({}),
  aggregateWeeklySkipMetrics: vi.fn().mockResolvedValue({}),
  analyzeTimeBasedPatterns: vi.fn().mockResolvedValue({}),
  calculateLibrarySkipStatistics: vi.fn().mockResolvedValue({}),
}));

// Import module under test after mocks are defined
import {
  isSkipMetricsCollectionActive,
  startSkipMetricsCollection,
  stopSkipMetricsCollection,
  triggerManualAggregation,
} from "../../../../services/statistics/collector";

// Import mocked dependencies to control them in tests
import { saveLog } from "../../../../helpers/storage/store";
import {
  aggregateArtistSkipMetrics,
  aggregateDailySkipMetrics,
  aggregateWeeklySkipMetrics,
  analyzeTimeBasedPatterns,
  calculateLibrarySkipStatistics,
} from "../../../../services/statistics/aggregator";

describe("Statistics Collector", () => {
  beforeEach(() => {
    // Reset all mocks
    vi.resetAllMocks();

    // Clear any intervals that might be running
    stopSkipMetricsCollection();

    // Mock implementation specific setInterval and clearInterval
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Use restoreAllMocks instead of restoreAllTimers
    vi.restoreAllMocks();
    // Restore timers
    vi.useRealTimers();
  });

  it("should start metrics collection with default interval", async () => {
    // Mock the aggregation functions to return some data
    vi.mocked(aggregateDailySkipMetrics).mockResolvedValueOnce({
      day1: {},
      day2: {},
    });
    vi.mocked(aggregateWeeklySkipMetrics).mockResolvedValueOnce({ week1: {} });
    vi.mocked(aggregateArtistSkipMetrics).mockResolvedValueOnce({
      artist1: {},
    });

    // Start collection
    await startSkipMetricsCollection();

    // Check that the collection is active
    expect(isSkipMetricsCollectionActive()).toBe(true);

    // Verify initial aggregation was called
    expect(aggregateDailySkipMetrics).toHaveBeenCalledTimes(1);
    expect(aggregateWeeklySkipMetrics).toHaveBeenCalledTimes(1);
    expect(aggregateArtistSkipMetrics).toHaveBeenCalledTimes(1);
    expect(calculateLibrarySkipStatistics).toHaveBeenCalledTimes(1);
    expect(analyzeTimeBasedPatterns).toHaveBeenCalledTimes(1);

    // Verify log was saved
    expect(saveLog).toHaveBeenCalledWith(
      "Started skip metrics collection service",
      "INFO",
    );
    expect(saveLog).toHaveBeenCalledWith(
      "Running skip metrics aggregation",
      "DEBUG",
    );
  });

  it("should not start a second collection if already running", async () => {
    // Start collection first time
    await startSkipMetricsCollection();

    // Reset mocks to verify no calls during second start
    vi.resetAllMocks();

    // Try to start again
    await startSkipMetricsCollection();

    // No calls should be made since it's already running
    expect(aggregateDailySkipMetrics).not.toHaveBeenCalled();
    expect(saveLog).not.toHaveBeenCalled();
  });

  // Using a separate implementation for setInterval
  it("should run aggregation on the specified interval", async () => {
    // Create a mock implementation of the setInterval function
    const originalSetInterval = global.setInterval;

    let intervalCallback: (() => Promise<void>) | null = null;
    global.setInterval = vi.fn((callback: () => Promise<void>) => {
      intervalCallback = callback;
      return 123 as unknown as NodeJS.Timeout; // Return a mock timer ID
    });

    try {
      // Mock functions to return data for first call (initial aggregation)
      vi.mocked(aggregateDailySkipMetrics).mockResolvedValueOnce({
        day1: {},
        day2: {},
      });
      vi.mocked(aggregateWeeklySkipMetrics).mockResolvedValueOnce({
        week1: {},
      });
      vi.mocked(aggregateArtistSkipMetrics).mockResolvedValueOnce({
        artist1: {},
      });

      // Start with a 10-minute interval
      await startSkipMetricsCollection(10);

      // Verify setInterval was called with the correct interval
      expect(global.setInterval).toHaveBeenCalledWith(
        expect.any(Function),
        10 * 60 * 1000,
      );

      // Reset the mocks after the initial aggregation
      vi.resetAllMocks();

      // Setup mocks for second run (scheduled aggregation)
      vi.mocked(aggregateDailySkipMetrics).mockResolvedValueOnce({ day3: {} });
      vi.mocked(aggregateWeeklySkipMetrics).mockResolvedValueOnce({
        week2: {},
      });
      vi.mocked(aggregateArtistSkipMetrics).mockResolvedValueOnce({
        artist2: {},
      });

      // Manually trigger the interval callback to simulate timer execution
      if (intervalCallback) {
        await intervalCallback();
      }

      // Verify aggregation functions were called again
      expect(aggregateDailySkipMetrics).toHaveBeenCalledTimes(1);
      expect(aggregateWeeklySkipMetrics).toHaveBeenCalledTimes(1);
      expect(aggregateArtistSkipMetrics).toHaveBeenCalledTimes(1);
      expect(calculateLibrarySkipStatistics).toHaveBeenCalledTimes(1);
      expect(analyzeTimeBasedPatterns).toHaveBeenCalledTimes(1);
    } finally {
      // Restore the original setInterval
      global.setInterval = originalSetInterval;
    }
  });

  it("should stop metrics collection", async () => {
    // Start collection
    await startSkipMetricsCollection();

    // Reset mocks
    vi.resetAllMocks();

    // Stop collection
    stopSkipMetricsCollection();

    // Verify collection is inactive
    expect(isSkipMetricsCollectionActive()).toBe(false);

    // Verify stop was logged
    expect(saveLog).toHaveBeenCalledWith(
      "Stopped skip metrics collection service",
      "INFO",
    );

    // Advance timer to verify no further calls
    vi.advanceTimersByTime(3600000); // 1 hour

    // Verify no aggregation functions were called after stopping
    expect(aggregateDailySkipMetrics).not.toHaveBeenCalled();
  });

  it("should handle errors during scheduled aggregation", async () => {
    // Mock initial aggregation to succeed
    vi.mocked(aggregateDailySkipMetrics).mockResolvedValueOnce({ day1: {} });
    vi.mocked(aggregateWeeklySkipMetrics).mockResolvedValueOnce({ week1: {} });
    vi.mocked(aggregateArtistSkipMetrics).mockResolvedValueOnce({
      artist1: {},
    });

    // Start collection
    await startSkipMetricsCollection();

    // Reset mocks after initial aggregation
    vi.resetAllMocks();

    // Set up the saveLog mock to capture all calls
    const saveLogMock = vi.mocked(saveLog);

    // Mock error for next run
    vi.mocked(aggregateDailySkipMetrics).mockRejectedValueOnce(
      new Error("Scheduled error"),
    );

    // Run the timer and allow the Promise to resolve
    await vi.runOnlyPendingTimersAsync();

    // Verify error was logged - we need to check all calls to saveLog
    const errorLogCall = saveLogMock.mock.calls.find(
      (call) =>
        call[0].includes("Error during scheduled skip metrics aggregation") &&
        call[1] === "ERROR",
    );

    expect(errorLogCall).toBeDefined();
    expect(errorLogCall?.[0]).toContain(
      "Error during scheduled skip metrics aggregation",
    );
    expect(errorLogCall?.[1]).toBe("ERROR");
  });

  it("should allow manual aggregation trigger", async () => {
    // Mock the aggregation functions to return some data
    vi.mocked(aggregateDailySkipMetrics).mockResolvedValueOnce({
      day1: {},
      day2: {},
    });
    vi.mocked(aggregateWeeklySkipMetrics).mockResolvedValueOnce({ week1: {} });
    vi.mocked(aggregateArtistSkipMetrics).mockResolvedValueOnce({
      artist1: {},
    });

    // Trigger manual aggregation
    await triggerManualAggregation();

    // Verify aggregation functions were called
    expect(aggregateDailySkipMetrics).toHaveBeenCalledTimes(1);
    expect(aggregateWeeklySkipMetrics).toHaveBeenCalledTimes(1);
    expect(aggregateArtistSkipMetrics).toHaveBeenCalledTimes(1);
    expect(calculateLibrarySkipStatistics).toHaveBeenCalledTimes(1);
    expect(analyzeTimeBasedPatterns).toHaveBeenCalledTimes(1);

    // Verify logs
    expect(saveLog).toHaveBeenCalledWith(
      "Manually triggering skip metrics aggregation",
      "INFO",
    );
    expect(saveLog).toHaveBeenCalledWith(
      "Manual aggregation completed successfully",
      "INFO",
    );
  });

  it("should handle errors during manual aggregation", async () => {
    // Mock an error in one of the aggregation functions
    vi.mocked(aggregateDailySkipMetrics).mockRejectedValueOnce(
      new Error("Manual error"),
    );

    // Expect the manual trigger to throw
    await expect(triggerManualAggregation()).rejects.toThrow("Manual error");

    // Verify error was logged
    expect(saveLog).toHaveBeenCalledWith(
      expect.stringContaining("Error during manual skip metrics aggregation"),
      "ERROR",
    );
  });
});
