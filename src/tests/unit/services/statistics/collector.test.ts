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
    vi.restoreAllTimers();
  });

  it("should start metrics collection with default interval", async () => {
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

  it("should run aggregation on the specified interval", async () => {
    // Start with a 10-minute interval
    await startSkipMetricsCollection(10);

    // Reset the mocks after the initial aggregation
    vi.resetAllMocks();

    // Advance timer by 10 minutes (600,000 ms)
    vi.advanceTimersByTime(600000);

    // Verify aggregation functions were called again
    expect(aggregateDailySkipMetrics).toHaveBeenCalledTimes(1);
    expect(aggregateWeeklySkipMetrics).toHaveBeenCalledTimes(1);
    expect(aggregateArtistSkipMetrics).toHaveBeenCalledTimes(1);
    expect(calculateLibrarySkipStatistics).toHaveBeenCalledTimes(1);
    expect(analyzeTimeBasedPatterns).toHaveBeenCalledTimes(1);
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
    // Mock an error in one of the aggregation functions
    vi.mocked(aggregateDailySkipMetrics).mockRejectedValueOnce(
      new Error("Test error"),
    );

    // Start collection
    await startSkipMetricsCollection();

    // Reset mocks after initial aggregation
    vi.resetAllMocks();

    // Mock error for next run
    vi.mocked(aggregateDailySkipMetrics).mockRejectedValueOnce(
      new Error("Scheduled error"),
    );

    // Advance timer to trigger scheduled aggregation
    vi.advanceTimersByTime(3600000); // Default 1 hour

    // Verify error was logged
    expect(saveLog).toHaveBeenCalledWith(
      expect.stringContaining(
        "Error during scheduled skip metrics aggregation",
      ),
      "ERROR",
    );
  });

  it("should allow manual aggregation trigger", async () => {
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
