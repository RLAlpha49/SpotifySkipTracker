/**
 * Skip data collection service
 *
 * Handles background collection and aggregation of skip metrics
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
 * @param intervalMinutes How often to run aggregation (in minutes)
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
 */
export function isSkipMetricsCollectionActive(): boolean {
  return isCollecting;
}

/**
 * Manually triggers a metrics aggregation
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
 * Runs the full aggregation process
 * This is the core function that aggregates all metrics
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
