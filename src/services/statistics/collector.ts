/**
 * @packageDocumentation
 * @module statistics/collector
 * @description Skip Data Collection Service
 *
 * This module provides automated background collection and scheduling of
 * statistics aggregation operations at configurable intervals. It manages
 * the lifecycle of the statistics collection process, ensuring data is
 * regularly processed without requiring user intervention.
 *
 * Features:
 * - Automated background metrics processing with configurable intervals
 * - Intelligent scheduling with efficient resource usage
 * - Manual trigger capability for immediate processing
 * - Comprehensive logging of aggregation activities
 * - Graceful error handling with operation continuity
 * - Coordination of multiple aggregation processes in the correct sequence
 * - Application state-aware processing that respects system resources
 *
 * The collection service orchestrates the entire statistics pipeline by:
 * 1. Scheduling regular aggregation runs at defined intervals
 * 2. Managing the initial aggregation on startup
 * 3. Providing status reporting for the UI
 * 4. Handling manual refresh requests
 * 5. Ensuring proper cleanup on shutdown
 *
 * @module StatisticsCollection
 */

import { saveLog } from "../../helpers/storage/store";
import {
  aggregateArtistSkipMetrics,
  aggregateDailySkipMetrics,
  aggregateWeeklySkipMetrics,
  analyzeTimeBasedPatterns,
  calculateLibrarySkipStatistics,
} from "./aggregator";

let aggregationInterval: NodeJS.Timeout | null = null;
let isCollecting = false;

/**
 * Starts the background skip metrics collection service
 *
 * Initializes and schedules regular background processing of listening data
 * into statistical aggregations. Runs an immediate aggregation upon startup,
 * then schedules recurring aggregations at the specified interval.
 *
 * The service consolidates all aggregation operations, including:
 * - Daily metrics processing
 * - Weekly metrics aggregation
 * - Artist-specific analytics
 * - Library-wide statistics
 * - Time-based pattern analysis
 *
 * @param intervalMinutes - How often to run aggregation (in minutes, default: 60)
 * @returns Promise that resolves when service is started and initial aggregation completes
 *
 * @example
 * // Start collection with 30-minute intervals
 * await startSkipMetricsCollection(30);
 * @source
 */
export async function startSkipMetricsCollection(intervalMinutes = 60) {
  if (isCollecting) {
    return;
  }

  isCollecting = true;
  saveLog("Started skip metrics collection service", "INFO");

  // Run an initial aggregation immediately
  try {
    await runAggregation();
  } catch (error) {
    saveLog(`Error during initial skip metrics aggregation: ${error}`, "ERROR");
  }

  // Set up the interval for regular aggregation
  const intervalMs = intervalMinutes * 60 * 1000;
  aggregationInterval = setInterval(async () => {
    try {
      await runAggregation();
    } catch (error) {
      saveLog(
        `Error during scheduled skip metrics aggregation: ${error}`,
        "ERROR",
      );
    }
  }, intervalMs);
}

/**
 * Stops the background skip metrics collection service
 *
 * Terminates the scheduled background aggregation process and
 * cleans up resources. This function should be called when the
 * application is shutting down or when aggregation needs to be
 * temporarily suspended.
 *
 * @example
 * // Stop collection during application shutdown
 * stopSkipMetricsCollection();
 * @source
 */
export function stopSkipMetricsCollection() {
  if (aggregationInterval) {
    clearInterval(aggregationInterval);
    aggregationInterval = null;
  }

  isCollecting = false;
  saveLog("Stopped skip metrics collection service", "INFO");
}

/**
 * Checks if the collection service is currently running
 *
 * Determines whether the background metrics collection service
 * is actively running and scheduled. Useful for UI indicators
 * or to prevent duplicate service initialization.
 *
 * @returns True if collection service is active, false otherwise
 *
 * @example
 * // Check collection status before attempting to start
 * if (!isSkipMetricsCollectionActive()) {
 *   await startSkipMetricsCollection();
 * }
 * @source
 */
export function isSkipMetricsCollectionActive(): boolean {
  return isCollecting;
}

/**
 * Manually triggers a metrics aggregation
 *
 * Forces an immediate execution of the complete aggregation process
 * outside of the scheduled interval. Useful for:
 * - Immediate updates after significant listening activity
 * - Testing or debugging the aggregation process
 * - User-requested refresh of statistics
 *
 * The function runs the same comprehensive aggregation process as the
 * scheduled background task but executes immediately and provides
 * detailed error information if aggregation fails.
 *
 * @returns Promise that resolves when aggregation completes
 * @throws Error if aggregation process fails
 *
 * @example
 * // Trigger manual update with error handling
 * try {
 *   await triggerManualAggregation();
 *   showSuccessMessage();
 * } catch (error) {
 *   showErrorMessage(error);
 * }
 * @source
 */
export async function triggerManualAggregation(): Promise<void> {
  try {
    saveLog("Manually triggering skip metrics aggregation", "INFO");
    await runAggregation();
    saveLog("Manual aggregation completed successfully", "INFO");
  } catch (error) {
    saveLog(`Error during manual skip metrics aggregation: ${error}`, "ERROR");
    throw error;
  }
}

/**
 * Runs the complete metrics aggregation process
 *
 * Executes the full sequence of aggregation operations in the correct order:
 * 1. Daily metrics processing - transforms raw events into daily summaries
 * 2. Weekly metrics aggregation - combines daily data into weekly insights
 * 3. Artist metrics calculation - analyzes artist-specific listening patterns
 * 4. Library statistics - computes overall collection metrics
 * 5. Time pattern analysis - identifies temporal listening behavior
 *
 * Each step is logged for monitoring and debugging purposes, with
 * comprehensive reporting of the data volume processed in each phase.
 *
 * @returns Promise that resolves when the full aggregation is complete
 * @private Internal function not exported from the module
 * @source
 */
async function runAggregation(): Promise<void> {
  saveLog("Running skip metrics aggregation", "DEBUG");

  // First aggregate daily metrics (which also updates the statistics store)
  const dailyMetrics = await aggregateDailySkipMetrics();
  saveLog(
    `Aggregated daily metrics for ${Object.keys(dailyMetrics).length} days`,
    "INFO",
  );

  // Then aggregate weekly metrics based on the daily metrics
  const weeklyMetrics = await aggregateWeeklySkipMetrics();
  saveLog(
    `Aggregated weekly metrics for ${Object.keys(weeklyMetrics).length} weeks`,
    "INFO",
  );

  // Aggregate artist metrics
  const artistMetrics = await aggregateArtistSkipMetrics();
  saveLog(
    `Aggregated metrics for ${Object.keys(artistMetrics).length} artists`,
    "INFO",
  );

  // Calculate library-wide statistics
  await calculateLibrarySkipStatistics();
  saveLog("Calculated library-wide skip statistics", "INFO");

  // Analyze time-based patterns
  await analyzeTimeBasedPatterns();
  saveLog("Analyzed time-based skip patterns", "INFO");

  saveLog("Skip metrics aggregation completed", "INFO");
}
