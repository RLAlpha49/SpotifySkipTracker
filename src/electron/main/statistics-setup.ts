/**
 * @packageDocumentation
 * @module statistics-setup
 * @description Statistics Services Setup Module
 *
 * Initializes and manages statistics collection and aggregation services
 * for tracking user behavior and music listening patterns.
 *
 * Responsibilities:
 * - Initializes statistics collection services
 * - Manages IPC communication for statistics data
 * - Configures data aggregation intervals
 * - Handles data export and analysis functions
 * - Provides cleanup and shutdown functionality
 *
 * This module serves as the coordination point for all statistics-related
 * operations, connecting the renderer process to the statistics services.
 */

import { app, BrowserWindow, ipcMain } from "electron";
import { existsSync, readFileSync, readJsonSync } from "fs-extra";
import { join } from "path";
import {
  calculateUniqueArtistCount,
  getStatistics,
} from "../../helpers/storage/statistics-store";
import { getSkippedTracks, saveLog } from "../../helpers/storage/store";
import {
  aggregateArtistSkipMetrics,
  aggregateDailySkipMetrics,
  aggregateWeeklySkipMetrics,
  analyzeTimeBasedPatterns,
  calculateArtistInsights,
  calculateLibrarySkipStatistics,
} from "../../services/statistics/aggregator";
import {
  isSkipMetricsCollectionActive,
  startSkipMetricsCollection,
  stopSkipMetricsCollection,
  triggerManualAggregation,
} from "../../services/statistics/collector";
import {
  copyStatisticsToClipboard,
  exportAllStatisticsToJSON,
  exportArtistMetricsToCSV,
  exportDailyMetricsToCSV,
  exportDetectedPatternsToCSV,
  exportLibraryStatisticsToCSV,
  exportSkippedTracksToCSV,
  exportTimePatternsToCSV,
  exportWeeklyMetricsToCSV,
} from "../../services/statistics/export";
import { detectSkipPatterns } from "../../services/statistics/pattern-detector";

// Collection interval in minutes (default: every hour)
const DEFAULT_COLLECTION_INTERVAL = 60;

// Statistics directory path
const statisticsDir = join(app.getPath("userData"), "statistics");

// Statistics file paths
const DAILY_METRICS_FILE = join(statisticsDir, "daily_metrics.json");
const WEEKLY_METRICS_FILE = join(statisticsDir, "weekly_metrics.json");
const ARTIST_METRICS_FILE = join(statisticsDir, "artist_metrics.json");
const LIBRARY_STATS_FILE = join(statisticsDir, "library_stats.json");
const TIME_PATTERNS_FILE = join(statisticsDir, "time_patterns.json");
const SKIP_PATTERNS_FILE = join(statisticsDir, "skip_patterns.json");
const ARTIST_INSIGHTS_FILE = join(statisticsDir, "artist_insights.json");

/**
 * Initialize the statistics services
 *
 * Sets up collection services and IPC handlers to enable statistics
 * collection, aggregation, and retrieval.
 *
 * @param mainWindow - The main application window instance for IPC communication
 * @returns {Promise<void>} Resolves when initialization is complete
 * @source
 */
export async function initializeStatisticsServices(
  mainWindow: BrowserWindow,
): Promise<void> {
  try {
    saveLog("Initializing statistics services", "INFO");

    // Start the metrics collection service
    await startSkipMetricsCollection(DEFAULT_COLLECTION_INTERVAL);

    // Set up all IPC handlers for renderer process
    setupStatisticsIPC(mainWindow);

    saveLog("Statistics services initialized successfully", "INFO");
  } catch (error) {
    saveLog(`Error initializing statistics services: ${error}`, "ERROR");
  }
}

/**
 * Clean up statistics services
 *
 * Stops collection processes and ensures proper shutdown of statistics services
 * to prevent memory leaks and background processes.
 *
 * @returns {void}
 * @source
 */
export function shutdownStatisticsServices(): void {
  try {
    saveLog("Shutting down statistics services", "INFO");
    stopSkipMetricsCollection();
  } catch (error) {
    saveLog(`Error shutting down statistics services: ${error}`, "ERROR");
  }
}

/**
 * Set up IPC handlers for statistics functionality
 *
 * Establishes all IPC channels needed for statistics collection, retrieval,
 * and management between the renderer process and main process.
 *
 * @param mainWindow - The main application window instance for IPC communication
 * @returns {void}
 * @source
 */
export function setupStatisticsIPC(mainWindow: BrowserWindow) {
  // Collection service controls
  // Handler to check if metrics collection is active
  ipcMain.handle("statistics:isCollectionActive", () => {
    return isSkipMetricsCollectionActive();
  });

  // Handler to start metrics collection
  ipcMain.handle(
    "statistics:startCollection",
    async (_event, intervalMinutes = DEFAULT_COLLECTION_INTERVAL) => {
      try {
        await startSkipMetricsCollection(intervalMinutes);
        return { success: true };
      } catch (error: unknown) {
        saveLog(`Error starting metrics collection: ${String(error)}`, "ERROR");
        return { success: false, error: String(error) };
      }
    },
  );

  // Handler to stop metrics collection
  ipcMain.handle("statistics:stopCollection", () => {
    try {
      stopSkipMetricsCollection();
      return { success: true };
    } catch (error: unknown) {
      saveLog(`Error stopping metrics collection: ${String(error)}`, "ERROR");
      return { success: false, error: String(error) };
    }
  });

  // Handler to manually trigger aggregation
  ipcMain.handle("statistics:triggerAggregation", async () => {
    try {
      await triggerManualAggregation();
      return { success: true };
    } catch (error: unknown) {
      saveLog(`Error during manual aggregation: ${String(error)}`, "ERROR");
      return { success: false, error: String(error) };
    }
  });

  // Handler for daily skip metrics
  ipcMain.handle("statistics:getDailySkipMetrics", async () => {
    try {
      const dailyMetricsFilePath = join(
        app.getPath("userData"),
        "data",
        "daily_skip_metrics.json",
      );

      if (!existsSync(dailyMetricsFilePath)) {
        return { success: false, error: "Daily metrics file not found" };
      }

      const dailyMetrics =
        readJsonSync(dailyMetricsFilePath, { throws: false }) || {};
      return { success: true, data: dailyMetrics };
    } catch (error: unknown) {
      saveLog(`Error retrieving daily skip metrics: ${String(error)}`, "ERROR");
      return { success: false, error: String(error) };
    }
  });

  // Handler for weekly skip metrics
  ipcMain.handle("statistics:getWeeklySkipMetrics", async () => {
    try {
      const weeklyMetricsFilePath = join(
        app.getPath("userData"),
        "data",
        "weekly_skip_metrics.json",
      );

      if (!existsSync(weeklyMetricsFilePath)) {
        return { success: false, error: "Weekly metrics file not found" };
      }

      const weeklyMetrics =
        readJsonSync(weeklyMetricsFilePath, { throws: false }) || {};
      return { success: true, data: weeklyMetrics };
    } catch (error: unknown) {
      saveLog(
        `Error retrieving weekly skip metrics: ${String(error)}`,
        "ERROR",
      );
      return { success: false, error: String(error) };
    }
  });

  // Handler for aggregating artist metrics
  ipcMain.handle("statistics:getArtistSkipMetrics", async () => {
    try {
      const artistMetrics = await aggregateArtistSkipMetrics();
      return { success: true, data: artistMetrics };
    } catch (error: unknown) {
      console.error("Error aggregating artist metrics:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // Get all statistics data
  ipcMain.handle("statistics:getAll", async () => {
    return await getStatistics();
  });

  // Get unique artist count
  ipcMain.handle("statistics:getUniqueArtistCount", async () => {
    const statistics = await getStatistics();
    return calculateUniqueArtistCount(statistics);
  });

  // Get skipped tracks
  ipcMain.handle("statistics:getSkippedTracks", async () => {
    return await getSkippedTracks();
  });

  // Aggregate daily metrics
  ipcMain.handle("statistics:getDailyMetrics", async () => {
    if (existsSync(DAILY_METRICS_FILE)) {
      return JSON.parse(readFileSync(DAILY_METRICS_FILE, "utf-8"));
    }
    return await aggregateDailySkipMetrics();
  });

  // Aggregate weekly metrics
  ipcMain.handle("statistics:getWeeklyMetrics", async () => {
    if (existsSync(WEEKLY_METRICS_FILE)) {
      return JSON.parse(readFileSync(WEEKLY_METRICS_FILE, "utf-8"));
    }
    return await aggregateWeeklySkipMetrics();
  });

  // Aggregate artist metrics
  ipcMain.handle("statistics:getArtistMetrics", async () => {
    if (existsSync(ARTIST_METRICS_FILE)) {
      return JSON.parse(readFileSync(ARTIST_METRICS_FILE, "utf-8"));
    }
    return await aggregateArtistSkipMetrics();
  });

  // Calculate library statistics
  ipcMain.handle("statistics:getLibraryStats", async () => {
    if (existsSync(LIBRARY_STATS_FILE)) {
      return JSON.parse(readFileSync(LIBRARY_STATS_FILE, "utf-8"));
    }
    return await calculateLibrarySkipStatistics();
  });

  // Analyze time-based patterns
  ipcMain.handle("statistics:getTimePatterns", async () => {
    if (existsSync(TIME_PATTERNS_FILE)) {
      return JSON.parse(readFileSync(TIME_PATTERNS_FILE, "utf-8"));
    }
    return await analyzeTimeBasedPatterns();
  });

  // Detect skip patterns
  ipcMain.handle("statistics:getSkipPatterns", async () => {
    if (existsSync(SKIP_PATTERNS_FILE)) {
      return JSON.parse(readFileSync(SKIP_PATTERNS_FILE, "utf-8"));
    }
    return await detectSkipPatterns();
  });

  // Get artist insights
  ipcMain.handle("statistics:getArtistInsights", async () => {
    if (existsSync(ARTIST_INSIGHTS_FILE)) {
      return JSON.parse(readFileSync(ARTIST_INSIGHTS_FILE, "utf-8"));
    }
    return await calculateArtistInsights();
  });

  // Export skipped tracks to CSV
  ipcMain.handle("statistics:exportSkippedTracksToCSV", async () => {
    return await exportSkippedTracksToCSV(mainWindow);
  });

  // Export artist metrics to CSV
  ipcMain.handle("statistics:exportArtistMetricsToCSV", async () => {
    return await exportArtistMetricsToCSV(mainWindow);
  });

  // Export daily metrics to CSV
  ipcMain.handle("statistics:exportDailyMetricsToCSV", async () => {
    return await exportDailyMetricsToCSV(mainWindow);
  });

  // Export weekly metrics to CSV
  ipcMain.handle("statistics:exportWeeklyMetricsToCSV", async () => {
    return await exportWeeklyMetricsToCSV(mainWindow);
  });

  // Export library statistics to CSV
  ipcMain.handle("statistics:exportLibraryStatisticsToCSV", async () => {
    return await exportLibraryStatisticsToCSV(mainWindow);
  });

  // Export time patterns to CSV
  ipcMain.handle("statistics:exportTimePatternsToCSV", async () => {
    return await exportTimePatternsToCSV(mainWindow);
  });

  // Export detected patterns to CSV
  ipcMain.handle("statistics:exportDetectedPatternsToCSV", async () => {
    return await exportDetectedPatternsToCSV(mainWindow);
  });

  // Export all statistics to JSON
  ipcMain.handle("statistics:exportAllToJSON", async () => {
    return await exportAllStatisticsToJSON(mainWindow);
  });

  // Copy statistics summary to clipboard
  ipcMain.handle("statistics:copyToClipboard", async () => {
    const statistics = await getStatistics();
    return copyStatisticsToClipboard(statistics);
  });
}
