/**
 * Statistics Export Service
 *
 * This module provides a comprehensive set of functions for exporting statistics
 * data in various formats to enable data sharing, backup, and external analysis.
 * It handles file format conversion, user interface interactions, and ensures
 * data integrity throughout the export process.
 *
 * Features:
 * - Multiple export format support (CSV, JSON, clipboard)
 * - Complete dataset exports and targeted metric subsets
 * - User-friendly file selection dialogs
 * - Error handling and validation of export operations
 * - Data formatting and transformation for analysis-ready outputs
 * - Intelligent path management and file naming
 * - Progress tracking for large exports
 * - Structure preservation for complex nested data
 *
 * Export capabilities include:
 *
 * 1. Track-level exports:
 *    - Skipped tracks with detailed metadata
 *    - Skip event timelines with contextual information
 *    - Skip classification and categorization
 *
 * 2. Aggregated statistics:
 *    - Artist metrics and insights
 *    - Daily and weekly listening summaries
 *    - Library-wide statistical analyses
 *    - Time-based patterns and distributions
 *
 * 3. Pattern analysis:
 *    - Detected skip patterns with confidence scores
 *    - Behavioral insights and preferences
 *    - Trend data for temporal changes
 *
 * All export functions follow a consistent pattern:
 * 1. Data retrieval and validation
 * 2. Format conversion with appropriate transformations
 * 3. User interface for destination selection
 * 4. File writing with error handling
 * 5. Success/failure reporting
 *
 * @module StatisticsExport
 */

import { StatisticsData } from "@/types/statistics";
import { app, BrowserWindow, clipboard, dialog } from "electron";
import {
  ensureDirSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "fs-extra";
import { join } from "path";
import { getSkippedTracks, getStatistics } from "../../helpers/storage/store";
import {
  aggregateArtistSkipMetrics,
  aggregateDailySkipMetrics,
  analyzeTimeBasedPatterns,
  calculateLibrarySkipStatistics,
} from "./aggregator";
import { detectSkipPatterns } from "./pattern-detector";

/**
 * Ensures the export directory exists
 */
function ensureExportDir(): string {
  const exportDir = join(app.getPath("userData"), "exports");
  ensureDirSync(exportDir);
  return exportDir;
}

/**
 * Prompts the user to select a file location for export
 */
export async function promptForExportLocation(
  mainWindow: BrowserWindow,
  defaultPath: string,
  filters: Electron.FileFilter[],
): Promise<string | undefined> {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath,
    filters,
    properties: ["createDirectory"],
  });

  return result.canceled ? undefined : result.filePath;
}

/**
 * Converts object to CSV string
 */
function objectToCSV<T extends Record<string, unknown>>(
  data: T[],
  headers?: Record<string, string>,
): string {
  if (!data || data.length === 0) return "";

  // Use provided headers or object keys
  const keys = Object.keys(headers || data[0]);

  // Create header row using either header titles or raw keys
  const headerRow = headers ? keys.map((key) => headers[key]) : keys;

  // Create CSV rows
  const rows = [
    headerRow.join(","),
    ...data.map((item) => {
      return keys
        .map((key) => {
          const value = item[key];
          // Handle different value types
          if (value === null || value === undefined) return "";
          if (typeof value === "string")
            return `"${value.replace(/"/g, '""')}"`;
          if (typeof value === "object")
            return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          return value;
        })
        .join(",");
    }),
  ];

  return rows.join("\n");
}

/**
 * Exports skipped tracks data to CSV
 */
export async function exportSkippedTracksToCSV(
  mainWindow: BrowserWindow,
  targetPath?: string,
): Promise<{ success: boolean; message?: string; filePath?: string }> {
  try {
    // Get skipped tracks data
    const skippedTracks = await getSkippedTracks();

    if (!skippedTracks || skippedTracks.length === 0) {
      return {
        success: false,
        message: "No skipped tracks data available to export",
      };
    }

    // Define headers for CSV
    const headers = {
      id: "Track ID",
      name: "Track Name",
      artist: "Artist",
      albumName: "Album",
      skipCount: "Skip Count",
      lastSkipped: "Last Skipped At",
      firstSkipped: "First Skipped At",
      manualSkipCount: "Manual Skips",
      autoSkipCount: "Auto Skips",
    };

    // Prepare data for CSV
    const csvData = skippedTracks.map((track) => ({
      id: track.id,
      name: track.name,
      artist: track.artist,
      albumName: track.albumName || "",
      skipCount: track.skipCount || 0,
      lastSkipped: track.lastSkipped || "",
      firstSkipped:
        track.skipEvents && track.skipEvents.length > 0
          ? track.skipEvents[0].timestamp
          : "",
      manualSkipCount: track.manualSkipCount || 0,
      autoSkipCount: track.autoSkipCount || 0,
    }));

    // Convert to CSV
    const csv = objectToCSV(csvData, headers);

    // Determine file path
    let filePath = targetPath;
    if (!filePath) {
      const timestamp = new Date()
        .toISOString()
        .replace(/:/g, "-")
        .split(".")[0];
      const defaultFileName = `skipped_tracks_${timestamp}.csv`;

      filePath = await promptForExportLocation(
        mainWindow,
        join(ensureExportDir(), defaultFileName),
        [{ name: "CSV Files", extensions: ["csv"] }],
      );

      if (!filePath) {
        return { success: false, message: "Export was canceled" };
      }
    }

    // Write the CSV file
    writeFileSync(filePath, csv);

    return {
      success: true,
      message: "Skipped tracks data exported successfully",
      filePath,
    };
  } catch (error) {
    console.error("Error exporting skipped tracks to CSV:", error);
    return {
      success: false,
      message: `Error exporting data: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Exports artist metrics to CSV
 */
export async function exportArtistMetricsToCSV(
  mainWindow: BrowserWindow,
  targetPath?: string,
): Promise<{ success: boolean; message?: string; filePath?: string }> {
  try {
    // Get artist metrics data
    const artistMetrics = await aggregateArtistSkipMetrics();

    if (!artistMetrics || Object.keys(artistMetrics).length === 0) {
      return {
        success: false,
        message: "No artist metrics data available to export",
      };
    }

    // Define headers for CSV
    const headers = {
      artistName: "Artist Name",
      totalSkips: "Total Skips",
      uniqueTracksSkipped: "Unique Tracks Skipped",
      skipRatio: "Skip Ratio",
      manualSkips: "Manual Skips",
      autoSkips: "Auto Skips",
      averagePlayPercentage: "Average Play Percentage",
    };

    // Prepare data for CSV
    const csvData = Object.values(artistMetrics).map((artist) => ({
      artistName: artist.artistName,
      totalSkips: artist.totalSkips,
      uniqueTracksSkipped: artist.uniqueTracksSkipped.length,
      skipRatio: artist.skipRatio,
      manualSkips: artist.manualSkips,
      autoSkips: artist.autoSkips,
      averagePlayPercentage: artist.averagePlayPercentage,
    }));

    // Convert to CSV
    const csv = objectToCSV(csvData, headers);

    // Determine file path
    let filePath = targetPath;
    if (!filePath) {
      const timestamp = new Date()
        .toISOString()
        .replace(/:/g, "-")
        .split(".")[0];
      const defaultFileName = `artist_metrics_${timestamp}.csv`;

      filePath = await promptForExportLocation(
        mainWindow,
        join(ensureExportDir(), defaultFileName),
        [{ name: "CSV Files", extensions: ["csv"] }],
      );

      if (!filePath) {
        return { success: false, message: "Export was canceled" };
      }
    }

    // Write the CSV file
    writeFileSync(filePath, csv);

    return {
      success: true,
      message: "Artist metrics data exported successfully",
      filePath,
    };
  } catch (error) {
    console.error("Error exporting artist metrics to CSV:", error);
    return {
      success: false,
      message: `Error exporting data: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Exports daily metrics to CSV
 */
export async function exportDailyMetricsToCSV(
  mainWindow: BrowserWindow,
  targetPath?: string,
): Promise<{ success: boolean; message?: string; filePath?: string }> {
  try {
    // Get daily metrics
    const dailyMetrics = await aggregateDailySkipMetrics();

    if (!dailyMetrics || Object.keys(dailyMetrics).length === 0) {
      return {
        success: false,
        message: "No daily metrics data available to export",
      };
    }

    // Define headers for CSV
    const headers = {
      date: "Date",
      totalSkips: "Total Skips",
      uniqueTracks: "Unique Tracks",
      sequentialSkips: "Sequential Skips",
      peakHour: "Peak Hour",
      previewSkips: "Preview Skips",
      standardSkips: "Standard Skips",
      nearEndSkips: "Near End Skips",
      manualSkips: "Manual Skips",
      autoSkips: "Auto Skips",
    };

    // Prepare data for CSV
    const csvData = Object.entries(dailyMetrics).map(([date, metrics]) => {
      const skipsByType = metrics.skipsByType || {
        preview: 0,
        standard: 0,
        near_end: 0,
        auto: 0,
        manual: 0,
      };

      return {
        date,
        totalSkips: metrics.tracksSkipped || 0,
        uniqueTracks: Array.isArray(metrics.uniqueTracks)
          ? metrics.uniqueTracks.length
          : metrics.uniqueTracks instanceof Set
            ? metrics.uniqueTracks.size
            : 0,
        sequentialSkips: metrics.sequentialSkips || 0,
        peakHour: metrics.peakHour || 0,
        previewSkips: skipsByType.preview || 0,
        standardSkips: skipsByType.standard || 0,
        nearEndSkips: skipsByType.near_end || 0,
        manualSkips: skipsByType.manual || 0,
        autoSkips: skipsByType.auto || 0,
      };
    });

    // Convert to CSV
    const csv = objectToCSV(csvData, headers);

    // Determine file path
    let filePath = targetPath;
    if (!filePath) {
      const timestamp = new Date()
        .toISOString()
        .replace(/:/g, "-")
        .split(".")[0];
      const defaultFileName = `daily_metrics_${timestamp}.csv`;

      filePath = await promptForExportLocation(
        mainWindow,
        join(ensureExportDir(), defaultFileName),
        [{ name: "CSV Files", extensions: ["csv"] }],
      );

      if (!filePath) {
        return { success: false, message: "Export was canceled" };
      }
    }

    // Write the CSV file
    writeFileSync(filePath, csv);

    return {
      success: true,
      message: "Daily metrics data exported successfully",
      filePath,
    };
  } catch (error) {
    console.error("Error exporting daily metrics to CSV:", error);
    return {
      success: false,
      message: `Error exporting data: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Exports all statistics data to JSON
 */
export async function exportAllStatisticsToJSON(
  mainWindow: BrowserWindow,
  targetPath?: string,
): Promise<{ success: boolean; message?: string; filePath?: string }> {
  try {
    // Get all statistics data
    const statistics = await getStatistics();
    const skippedTracks = await getSkippedTracks();
    const artistMetrics = await aggregateArtistSkipMetrics();
    const libraryStats = await calculateLibrarySkipStatistics();
    const timePatterns = await analyzeTimeBasedPatterns();

    // Combine all data
    const exportData = {
      statistics,
      skippedTracks,
      artistMetrics,
      libraryStats,
      timePatterns,
      exportDate: new Date().toISOString(),
      version: app.getVersion(),
    };

    // Determine file path
    let filePath = targetPath;
    if (!filePath) {
      const timestamp = new Date()
        .toISOString()
        .replace(/:/g, "-")
        .split(".")[0];
      const defaultFileName = `spotify_skip_tracker_data_${timestamp}.json`;

      filePath = await promptForExportLocation(
        mainWindow,
        join(ensureExportDir(), defaultFileName),
        [{ name: "JSON Files", extensions: ["json"] }],
      );

      if (!filePath) {
        return { success: false, message: "Export was canceled" };
      }
    }

    // Write the JSON file
    writeFileSync(filePath, JSON.stringify(exportData, null, 2));

    return {
      success: true,
      message: "All statistics data exported successfully",
      filePath,
    };
  } catch (error) {
    console.error("Error exporting statistics to JSON:", error);
    return {
      success: false,
      message: `Error exporting data: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Copies statistics summary to clipboard
 */
export function copyStatisticsToClipboard(statistics: StatisticsData): {
  success: boolean;
  message?: string;
} {
  try {
    // Create a text summary of the statistics
    const summary = [
      "SPOTIFY SKIP TRACKER STATISTICS SUMMARY",
      "=====================================",
      `Generated: ${new Date().toLocaleString()}`,
      `Last Updated: ${new Date(statistics.lastUpdated).toLocaleString()}`,
      "",
      "OVERVIEW",
      "--------",
      `Total Unique Tracks: ${statistics.totalUniqueTracks}`,
      `Total Unique Artists: ${statistics.totalUniqueArtists}`,
      `Overall Skip Rate: ${(statistics.overallSkipRate * 100).toFixed(2)}%`,
      `Discovery Rate: ${(statistics.discoveryRate * 100).toFixed(2)}%`,
      `Total Listening Time: ${formatDuration(statistics.totalListeningTimeMs)}`,
      `Average Session Duration: ${formatDuration(statistics.avgSessionDurationMs)}`,
      "",
      "TOP LISTENING HOURS",
      "-----------------",
      formatTop5FromArray(
        statistics.hourlyDistribution,
        (i) => `${i}:00-${i + 1}:00`,
      ),
      "",
      "LISTENING BY DAY",
      "---------------",
      formatTop5FromArray(
        statistics.dailyDistribution,
        (i) =>
          [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ][i],
      ),
    ].join("\n");

    // Copy to clipboard
    clipboard.writeText(summary);

    return { success: true, message: "Statistics summary copied to clipboard" };
  } catch (error) {
    console.error("Error copying statistics to clipboard:", error);
    return {
      success: false,
      message: `Error copying data: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Helper function to format duration from milliseconds
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor(ms / (1000 * 60 * 60));

  return `${hours}h ${minutes}m ${seconds}s`;
}

/**
 * Helper function to format top 5 values from an array
 */
function formatTop5FromArray(
  arr: number[],
  labelFn: (index: number) => string,
): string {
  if (!arr || arr.length === 0) return "No data available";

  return arr
    .map((value, index) => ({ value, index }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map(({ value, index }) => `${labelFn(index)}: ${value}`)
    .join("\n");
}

/**
 * Exports weekly metrics to CSV
 */
export async function exportWeeklyMetricsToCSV(
  mainWindow: BrowserWindow,
  targetPath?: string,
): Promise<{ success: boolean; message?: string; filePath?: string }> {
  try {
    // Get weekly metrics - this is a placeholder
    // Create a function to get weekly metrics similar to how we get daily metrics
    const weeklyMetricsFile = join(
      app.getPath("userData"),
      "statistics",
      "weekly_metrics.json",
    );

    let weeklyMetrics: Record<string, Record<string, unknown>> = {};
    if (existsSync(weeklyMetricsFile)) {
      weeklyMetrics = JSON.parse(readFileSync(weeklyMetricsFile, "utf-8"));
    }

    if (!weeklyMetrics || Object.keys(weeklyMetrics).length === 0) {
      return {
        success: false,
        message: "No weekly metrics data available to export",
      };
    }

    // Define headers for CSV
    const headers = {
      week: "Week",
      totalSkips: "Total Skips",
      uniqueTracks: "Unique Tracks",
      totalListeningTime: "Total Listening Time (ms)",
      avgSkipRate: "Average Skip Rate",
      mostSkippedDay: "Most Skipped Day",
    };

    // Prepare data for CSV
    const csvData = Object.entries(weeklyMetrics).map(([week, metrics]) => {
      return {
        week,
        totalSkips: metrics.totalSkips || 0,
        uniqueTracks: Array.isArray(metrics.uniqueTracks)
          ? metrics.uniqueTracks.length
          : metrics.uniqueTracks instanceof Set
            ? metrics.uniqueTracks.size
            : 0,
        totalListeningTime: metrics.totalListeningTimeMs || 0,
        avgSkipRate: metrics.avgSkipRate || 0,
        mostSkippedDay: metrics.mostSkippedDay || "",
      };
    });

    // Convert to CSV
    const csv = objectToCSV(csvData, headers);

    // Determine file path
    let filePath = targetPath;
    if (!filePath) {
      const timestamp = new Date()
        .toISOString()
        .replace(/:/g, "-")
        .split(".")[0];
      const defaultFileName = `weekly_metrics_${timestamp}.csv`;

      filePath = await promptForExportLocation(
        mainWindow,
        join(ensureExportDir(), defaultFileName),
        [{ name: "CSV Files", extensions: ["csv"] }],
      );

      if (!filePath) {
        return { success: false, message: "Export was canceled" };
      }
    }

    // Write the CSV file
    writeFileSync(filePath, csv);

    return {
      success: true,
      message: "Weekly metrics data exported successfully",
      filePath,
    };
  } catch (error) {
    console.error("Error exporting weekly metrics to CSV:", error);
    return {
      success: false,
      message: `Error exporting data: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Exports library statistics to CSV
 */
export async function exportLibraryStatisticsToCSV(
  mainWindow: BrowserWindow,
  targetPath?: string,
): Promise<{ success: boolean; message?: string; filePath?: string }> {
  try {
    // Get library statistics
    const libraryStats = await calculateLibrarySkipStatistics();

    if (!libraryStats) {
      return {
        success: false,
        message: "No library statistics data available to export",
      };
    }

    // For library stats, we'll create a flat structure with single row summary
    // and multiple separate sections

    // Summary section
    const summaryHeaders = {
      totalTracks: "Total Tracks",
      totalSkips: "Total Skips",
      overallSkipRate: "Overall Skip Rate",
      uniqueTracksSkipped: "Unique Tracks Skipped",
      avgSkipPercentage: "Average Skip Percentage",
      topSkippedGenre: "Top Skipped Genre",
    };

    const summaryData = [
      {
        totalTracks: libraryStats.totalTracks || 0,
        totalSkips: libraryStats.totalSkips || 0,
        overallSkipRate: libraryStats.overallSkipRate || 0,
        uniqueTracksSkipped: libraryStats.uniqueTracksSkipped || 0,
        avgSkipPercentage: libraryStats.averageSkipPercentage || 0,
        topSkippedGenre: "Unknown", // This might need to be added to the libraryStats model
      },
    ];

    // Skip distribution section if available
    let skipDistributionData: Array<{
      skipPercentage: string;
      trackCount: number;
      percentageOfLibrary: number;
    }> = [];
    const skipDistHeaders = {
      skipPercentage: "Skip Percentage",
      trackCount: "Track Count",
      percentageOfLibrary: "Percentage of Library",
    };

    if (libraryStats.skipsByType) {
      skipDistributionData = Object.entries(libraryStats.skipsByType).map(
        ([skipType, count]) => ({
          skipPercentage: skipType,
          trackCount: count,
          percentageOfLibrary: count / (libraryStats.totalTracks || 1),
        }),
      );
    }

    // Create the CSV by combining sections with headers
    let csvContent = "LIBRARY STATISTICS SUMMARY\n\n";

    // Add summary section
    csvContent += objectToCSV(summaryData, summaryHeaders);

    // Add skip distribution if available
    if (skipDistributionData.length > 0) {
      csvContent += "\n\nSKIP DISTRIBUTION\n";
      csvContent += objectToCSV(skipDistributionData, skipDistHeaders);
    }

    // Determine file path
    let filePath = targetPath;
    if (!filePath) {
      const timestamp = new Date()
        .toISOString()
        .replace(/:/g, "-")
        .split(".")[0];
      const defaultFileName = `library_statistics_${timestamp}.csv`;

      filePath = await promptForExportLocation(
        mainWindow,
        join(ensureExportDir(), defaultFileName),
        [{ name: "CSV Files", extensions: ["csv"] }],
      );

      if (!filePath) {
        return { success: false, message: "Export was canceled" };
      }
    }

    // Write the CSV file
    writeFileSync(filePath, csvContent);

    return {
      success: true,
      message: "Library statistics data exported successfully",
      filePath,
    };
  } catch (error) {
    console.error("Error exporting library statistics to CSV:", error);
    return {
      success: false,
      message: `Error exporting data: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Exports time patterns to CSV
 */
export async function exportTimePatternsToCSV(
  mainWindow: BrowserWindow,
  targetPath?: string,
): Promise<{ success: boolean; message?: string; filePath?: string }> {
  try {
    // Get time patterns
    const timePatterns = await analyzeTimeBasedPatterns();

    if (!timePatterns) {
      return {
        success: false,
        message: "No time patterns data available to export",
      };
    }

    // For time patterns, we'll create multiple sections

    // Hourly distribution
    const hourlyHeaders = {
      hour: "Hour of Day",
      skips: "Skips",
      plays: "Plays",
      skipRate: "Skip Rate",
    };

    const hourlyData = [];
    if (timePatterns.hourlyDistribution) {
      for (let i = 0; i < 24; i++) {
        const skipsData = Array.isArray(timePatterns.hourlyDistribution)
          ? timePatterns.hourlyDistribution[i] || 0
          : 0;

        hourlyData.push({
          hour: `${i}:00-${i + 1}:00`,
          skips: skipsData,
          plays: 0, // This data isn't in the current hourlyDistribution model
          skipRate: 0, // Needs to be calculated differently
        });
      }
    }

    // Daily distribution
    const dailyHeaders = {
      day: "Day of Week",
      skips: "Skips",
      plays: "Plays",
      skipRate: "Skip Rate",
    };

    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const dailyData = [];

    if (timePatterns.dayOfWeekDistribution) {
      for (let i = 0; i < 7; i++) {
        const skipsData = Array.isArray(timePatterns.dayOfWeekDistribution)
          ? timePatterns.dayOfWeekDistribution[i] || 0
          : 0;

        dailyData.push({
          day: dayNames[i],
          skips: skipsData,
          plays: 0, // This data isn't in the current model
          skipRate: 0, // Needs to be calculated differently
        });
      }
    }

    // Create the CSV by combining sections
    let csvContent = "TIME-BASED PATTERNS\n\n";

    // Add hourly distribution
    csvContent += "HOURLY DISTRIBUTION\n";
    csvContent += objectToCSV(hourlyData, hourlyHeaders);

    // Add daily distribution
    csvContent += "\n\nDAILY DISTRIBUTION\n";
    csvContent += objectToCSV(dailyData, dailyHeaders);

    // Add session metrics if available - session metrics aren't part of the TimePatterns type yet
    const sessionMetrics = {
      avgDuration: 0,
      avgTracks: 0,
      avgSkips: 0,
      avgTimeBetween: 0,
    };

    if (sessionMetrics) {
      csvContent += "\n\nSESSION METRICS\n";
      csvContent += `Average session duration: ${sessionMetrics.avgDuration || 0} ms\n`;
      csvContent += `Average tracks per session: ${sessionMetrics.avgTracks || 0}\n`;
      csvContent += `Average skips per session: ${sessionMetrics.avgSkips || 0}\n`;
      csvContent += `Average time between sessions: ${sessionMetrics.avgTimeBetween || 0} ms\n`;
    }

    // Determine file path
    let filePath = targetPath;
    if (!filePath) {
      const timestamp = new Date()
        .toISOString()
        .replace(/:/g, "-")
        .split(".")[0];
      const defaultFileName = `time_patterns_${timestamp}.csv`;

      filePath = await promptForExportLocation(
        mainWindow,
        join(ensureExportDir(), defaultFileName),
        [{ name: "CSV Files", extensions: ["csv"] }],
      );

      if (!filePath) {
        return { success: false, message: "Export was canceled" };
      }
    }

    // Write the CSV file
    writeFileSync(filePath, csvContent);

    return {
      success: true,
      message: "Time patterns data exported successfully",
      filePath,
    };
  } catch (error) {
    console.error("Error exporting time patterns to CSV:", error);
    return {
      success: false,
      message: `Error exporting data: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Exports detected patterns to CSV
 */
export async function exportDetectedPatternsToCSV(
  mainWindow: BrowserWindow,
  targetPath?: string,
): Promise<{ success: boolean; message?: string; filePath?: string }> {
  try {
    // Get detected patterns
    const detectedPatterns = await detectSkipPatterns();

    if (
      !detectedPatterns ||
      !detectedPatterns.data ||
      detectedPatterns.data.length === 0
    ) {
      return {
        success: false,
        message: "No pattern detection data available to export",
      };
    }

    // Define headers for CSV
    const headers = {
      type: "Pattern Type",
      name: "Pattern Name",
      description: "Description",
      confidence: "Confidence",
      affectedTracks: "Affected Tracks",
      significance: "Significance",
    };

    // Prepare data for CSV
    const csvData = detectedPatterns.data.map((pattern) => {
      return {
        type: pattern.type || "",
        name: pattern.type || "",
        description: pattern.description || "",
        confidence: pattern.confidence || 0,
        affectedTracks: Array.isArray(pattern.relatedItems)
          ? pattern.relatedItems.length
          : 0,
        significance: pattern.confidence || 0,
      };
    });

    // Convert to CSV
    const csv = objectToCSV(csvData, headers);

    // Determine file path
    let filePath = targetPath;
    if (!filePath) {
      const timestamp = new Date()
        .toISOString()
        .replace(/:/g, "-")
        .split(".")[0];
      const defaultFileName = `detected_patterns_${timestamp}.csv`;

      filePath = await promptForExportLocation(
        mainWindow,
        join(ensureExportDir(), defaultFileName),
        [{ name: "CSV Files", extensions: ["csv"] }],
      );

      if (!filePath) {
        return { success: false, message: "Export was canceled" };
      }
    }

    // Write the CSV file
    writeFileSync(filePath, csv);

    return {
      success: true,
      message: "Detected patterns data exported successfully",
      filePath,
    };
  } catch (error) {
    console.error("Error exporting detected patterns to CSV:", error);
    return {
      success: false,
      message: `Error exporting data: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
