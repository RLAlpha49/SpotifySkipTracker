/**
 * @packageDocumentation
 * @module statistics/export
 * @description Statistics Export Service
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
 * Ensures the export directory exists in the user data folder
 *
 * Creates the dedicated exports directory inside the application's user data folder
 * if it doesn't already exist. This centralizes the responsibility for directory
 * creation and provides a consistent location for all exported files.
 *
 * The function uses fs-extra's ensureDirSync which handles the directory creation
 * without throwing an error if the directory already exists.
 *
 * @returns The absolute path to the exports directory
 * @private Internal helper function not exported from module
 * @source
 * @notExported
 */
function ensureExportDir(): string {
  const exportDir = join(app.getPath("userData"), "exports");
  ensureDirSync(exportDir);
  return exportDir;
}

/**
 * Prompts the user to select a file location for export
 *
 * Displays a native save dialog allowing the user to choose where to save
 * an exported file. This function provides a consistent way to handle file
 * selection across all export functions in the module.
 *
 * The dialog is configured to:
 * - Start at the provided default path
 * - Filter files by the specified types
 * - Allow directory creation during navigation
 * - Return undefined if canceled by user
 *
 * @param mainWindow - The Electron BrowserWindow to attach the dialog to
 * @param defaultPath - The suggested file path to initialize the dialog with
 * @param filters - Array of file filters to limit selection options
 * @returns Promise resolving to selected file path or undefined if canceled
 *
 * @example
 * // Show dialog to save CSV file
 * const filePath = await promptForExportLocation(
 *   mainWindow,
 *   join(ensureExportDir(), 'export.csv'),
 *   [{ name: 'CSV Files', extensions: ['csv'] }]
 * );
 *
 * if (filePath) {
 *   // User selected a path
 *   writeDataToFile(filePath, data);
 * } else {
 *   // User canceled the dialog
 *   showCancelMessage();
 * }
 * @source
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
 * Converts an array of objects to a properly formatted CSV string
 *
 * Transforms a JavaScript object array into a valid CSV format with headers
 * and properly escaped values. This function handles various data types and
 * ensures proper formatting of string values that may contain special characters.
 *
 * Features:
 * - Supports custom header mapping for readable column names
 * - Properly escapes string values with quotes
 * - Serializes nested objects as JSON strings
 * - Handles null and undefined values as empty strings
 * - Returns empty string for empty input arrays
 *
 * @param data - Array of objects to convert to CSV format
 * @param headers - Optional mapping of object keys to display column names
 * @returns Properly formatted CSV string with headers and rows
 * @private Internal helper function not exported from module
 *
 * @example
 * // Basic usage with default headers
 * const people = [
 *   { name: 'John', age: 30 },
 *   { name: 'Jane', age: 25 }
 * ];
 * const csv = objectToCSV(people);
 * // "name,age
 * // "John",30
 * // "Jane",25"
 *
 * @example
 * // With custom column headers
 * const csv = objectToCSV(people, { name: 'Full Name', age: 'Age (years)' });
 * // "Full Name,Age (years)
 * // "John",30
 * // "Jane",25"
 *
 * @source
 * @notExported
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
 *
 * Creates a comprehensive CSV export of all skipped tracks in the user's listening
 * history, including track metadata and skip statistics. This function formats
 * the skip data into a tabular structure optimized for analysis in spreadsheet
 * applications or data visualization tools.
 *
 * The export includes:
 * - Track identification (ID, name, artist, album)
 * - Skip frequency metrics (total, manual, automatic)
 * - Temporal information (first skip, most recent skip)
 *
 * The function handles the entire export process including:
 * - Retrieving and validating skip data
 * - Transforming complex data structures into CSV-compatible format
 * - Prompting for save location (if not provided)
 * - Writing data with proper error handling
 *
 * @param mainWindow - The Electron BrowserWindow to attach dialogs to
 * @param targetPath - Optional pre-defined export path (bypasses user prompt)
 * @returns Promise resolving to object containing success status, message, and path
 *
 * @example
 * // Export with user prompt for location
 * const result = await exportSkippedTracksToCSV(mainWindow);
 * if (result.success) {
 *   showSuccessMessage(`Exported to ${result.filePath}`);
 * } else {
 *   showErrorMessage(result.message);
 * }
 *
 * @example
 * // Export to specific path without prompt
 * const path = join(app.getPath('downloads'), 'skipped-tracks.csv');
 * const result = await exportSkippedTracksToCSV(mainWindow, path);
 *
 * @source
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
 *
 * Creates a detailed CSV export containing aggregated statistics for each artist
 * in the user's listening history. This export focuses on artist-level metrics,
 * particularly skip behavior patterns, making it ideal for analyzing which artists
 * are most frequently skipped.
 *
 * The export includes:
 * - Artist identification and basic metadata
 * - Comprehensive skip metrics (total, unique tracks, ratios)
 * - Skip behavior analysis (manual vs. auto skips)
 * - Engagement metrics (average play percentage before skipping)
 *
 * This function handles data retrieval, formatting, user prompts for save location,
 * and file writing with appropriate error handling throughout the process.
 *
 * @param mainWindow - The Electron BrowserWindow to attach dialogs to
 * @param targetPath - Optional pre-defined export path (bypasses user prompt)
 * @returns Promise resolving to object containing success status, message, and path
 *
 * @example
 * // Export with dialog prompt
 * const result = await exportArtistMetricsToCSV(mainWindow);
 * if (result.success) {
 *   console.log(`CSV saved to: ${result.filePath}`);
 * }
 *
 * @source
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
 *
 * Creates a time-series CSV export of listening and skip metrics aggregated by day,
 * enabling temporal analysis of user behavior patterns. This export is particularly
 * valuable for identifying trends and changes in listening habits over time.
 *
 * The export includes:
 * - Date-based metrics (one row per day with active listening)
 * - Daily skip counts and unique content metrics
 * - Skip pattern analysis (sequential skips, peak hours)
 * - Detailed skip type breakdown (preview, standard, near end)
 * - Skip intention metrics (manual vs. automatic)
 *
 * The function handles the complete export workflow including data aggregation,
 * format conversion, user interaction for save location, and file writing with
 * comprehensive error handling.
 *
 * @param mainWindow - The Electron BrowserWindow to attach dialogs to
 * @param targetPath - Optional pre-defined export path (bypasses user prompt)
 * @returns Promise resolving to object containing success status, message, and path
 *
 * @example
 * // Export daily metrics for analysis
 * try {
 *   const result = await exportDailyMetricsToCSV(mainWindow);
 *   if (result.success) {
 *     notifyUser("Export completed", `File saved to ${result.filePath}`);
 *   }
 * } catch (err) {
 *   handleError("Failed to export daily metrics", err);
 * }
 *
 * @source
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
 *
 * Creates a comprehensive JSON export containing the complete dataset of all
 * statistics, metrics, and analyzed patterns. This is the most complete export
 * option, providing structured data that preserves all relationships between
 * different statistical elements.
 *
 * The export includes:
 * - Complete statistics data structure with all metrics
 * - Full skipped tracks history with detailed event data
 * - Artist-level metrics and analysis
 * - Library-wide statistics and aggregations
 * - Temporal patterns and behavioral insights
 * - Export metadata (timestamp, application version)
 *
 * This function is ideal for:
 * - Full system backups
 * - Data migration between devices
 * - External analysis in specialized tools
 * - Debugging and troubleshooting
 *
 * @param mainWindow - The Electron BrowserWindow to attach dialogs to
 * @param targetPath - Optional pre-defined export path (bypasses user prompt)
 * @returns Promise resolving to object containing success status, message, and path
 *
 * @example
 * // Export all data with user-selected path
 * const result = await exportAllStatisticsToJSON(mainWindow);
 * if (result.success) {
 *   showNotification(`Full backup saved to ${result.filePath}`);
 * }
 *
 * @source
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
 *
 * Generates a human-readable text summary of key statistics and copies it
 * to the system clipboard. This function provides a quick way for users to
 * share their listening statistics without exporting files.
 *
 * The formatted summary includes:
 * - Header with generation timestamp
 * - Overview section with key metrics (tracks, artists, skip rate)
 * - Temporal analysis (top listening hours, day distribution)
 * - Clean formatting with section headers and separators
 *
 * The text format is optimized for readability when pasted into messaging
 * applications, social media, or documentation. All numeric values are
 * appropriately formatted with proper units and precision.
 *
 * @param statistics - The statistics data object to summarize
 * @returns Object containing success status and informational message
 *
 * @example
 * // Copy summary to clipboard for sharing
 * const stats = await getStatistics();
 * const result = copyStatisticsToClipboard(stats);
 *
 * if (result.success) {
 *   showToast("Statistics copied to clipboard");
 * } else {
 *   showError(result.message);
 * }
 *
 * @source
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
 *
 * Converts a duration in milliseconds to a human-readable string in the
 * format "Xh Ym Zs" (hours, minutes, seconds). This function handles
 * time unit calculations and formatting for display in statistics summaries
 * and exports.
 *
 * Features:
 * - Properly calculates hours, minutes, and seconds from milliseconds
 * - Uses abbreviated time units (h, m, s) for compact display
 * - Always shows all units even if they are zero
 * - Handles any positive millisecond value
 *
 * @param ms - Duration in milliseconds to format
 * @returns Formatted duration string in "Xh Ym Zs" format
 * @private Internal helper function not exported from module
 *
 * @example
 * formatDuration(3723000) // "1h 2m 3s" (1 hour, 2 minutes, 3 seconds)
 * formatDuration(65000)   // "0h 1m 5s" (1 minute, 5 seconds)
 * formatDuration(3000)    // "0h 0m 3s" (3 seconds)
 *
 * @source
 * @notExported
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor(ms / (1000 * 60 * 60));

  return `${hours}h ${minutes}m ${seconds}s`;
}

/**
 * Helper function to format top 5 values from an array
 *
 * Processes a numeric array to identify and format the top 5 highest values
 * with appropriate labels. This function is used for creating human-readable
 * summaries of various distribution data (like hourly or daily listening patterns).
 *
 * The function:
 * - Validates input array existence and content
 * - Maps array values to objects that preserve original indices
 * - Sorts in descending order by value
 * - Takes the top 5 items (or fewer if array is smaller)
 * - Applies a labeling function to each index
 * - Formats as a multi-line string with "label: value" format
 *
 * @param arr - Array of numeric values to analyze
 * @param labelFn - Function that converts indices to human-readable labels
 * @returns Formatted multi-line string of top 5 values with labels
 * @private Internal helper function not exported from module
 *
 * @example
 * // Format top listening hours
 * const hourlyDistribution = [10, 25, 5, 30, 15, 20];
 * const topHours = formatTop5FromArray(
 *   hourlyDistribution,
 *   (i) => `${i}:00-${i+1}:00`
 * );
 * // Returns:
 * // "3:00-4:00: 30
 * // 1:00-2:00: 25
 * // 5:00-6:00: 20
 * // 4:00-5:00: 15
 * // 0:00-1:00: 10"
 *
 * @source
 * @notExported
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
 *
 * Creates a CSV export of listening statistics aggregated by calendar week,
 * providing a medium-term view of listening patterns between daily and monthly
 * aggregations. This export is particularly useful for analyzing weekly rhythms
 * and patterns in listening behavior.
 *
 * The export includes:
 * - Week identifiers in ISO format (YYYY-Wnn)
 * - Total skip metrics for each week
 * - Unique content exposure (tracks, artists)
 * - Listening duration totals
 * - Average skip rates per week
 * - Day-of-week patterns (most skipped day)
 *
 * The function handles data retrieval, formatting, user prompts for save location,
 * and file writing with comprehensive error handling throughout the process.
 *
 * @param mainWindow - The Electron BrowserWindow to attach dialogs to
 * @param targetPath - Optional pre-defined export path (bypasses user prompt)
 * @returns Promise resolving to object containing success status, message, and path
 *
 * @example
 * // Export weekly metrics with user-selected location
 * const result = await exportWeeklyMetricsToCSV(mainWindow);
 *
 * if (result.success) {
 *   console.log(`Weekly metrics saved to ${result.filePath}`);
 * } else {
 *   console.error(`Export failed: ${result.message}`);
 * }
 *
 * @source
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
 *
 * Creates a specialized CSV export focused on library-wide metrics and skip
 * behavior analysis. Unlike other exports that focus on time-series or item-specific
 * data, this export provides a holistic view of the entire listening library,
 * highlighting overall patterns and distributions.
 *
 * The export includes multiple sections:
 * - Summary statistics (track counts, skip rates, percentages)
 * - Skip distribution analysis (how skips are distributed across the library)
 * - Genre analysis (which genres experience the most skips)
 * - Library composition metrics
 *
 * Each section is formatted with appropriate headers and organization to
 * make the CSV readable both in spreadsheet applications and text editors.
 *
 * @param mainWindow - The Electron BrowserWindow to attach dialogs to
 * @param targetPath - Optional pre-defined export path (bypasses user prompt)
 * @returns Promise resolving to object containing success status, message, and path
 *
 * @example
 * // Export library statistics
 * try {
 *   const result = await exportLibraryStatisticsToCSV(mainWindow);
 *   if (result.success) {
 *     showSuccessMessage(`Library analysis exported to ${result.filePath}`);
 *   }
 * } catch (error) {
 *   logError("Library export failed", error);
 * }
 *
 * @source
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
 *
 * Creates a specialized CSV export focused on temporal listening patterns,
 * providing insights into how listening behavior varies by time of day,
 * day of week, and across different time periods. This export is particularly
 * valuable for identifying rhythms and patterns in user engagement.
 *
 * The export includes multiple interconnected sections:
 * - Hourly distribution of skips and plays throughout the day
 * - Daily distribution across the week with pattern identification
 * - Session metrics showing how listening is clustered in time
 * - Skip rate variations by time period
 *
 * The CSV format uses section headers and multi-part organization to present
 * related data in a coherent structure, making it suitable for both visual
 * inspection and programmatic analysis in spreadsheet applications.
 *
 * @param mainWindow - The Electron BrowserWindow to attach dialogs to
 * @param targetPath - Optional pre-defined export path (bypasses user prompt)
 * @returns Promise resolving to object containing success status, message, and path
 *
 * @example
 * // Export time patterns for visualization
 * const result = await exportTimePatternsToCSV(mainWindow);
 * if (result.success) {
 *   openVisualizationTool(result.filePath);
 * } else {
 *   showExportError(result.message);
 * }
 *
 * @source
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
 *
 * Creates a CSV export of algorithmically detected patterns in the user's skip behavior,
 * providing insights into potentially meaningful listening preferences and habits.
 * This export represents the highest level of analysis in the statistics system,
 * focusing on identified patterns rather than raw data.
 *
 * The export includes:
 * - Pattern type classification (genre-based, time-based, etc.)
 * - Pattern name and description in human-readable format
 * - Confidence scores indicating pattern reliability
 * - Affected tracks count and related metadata
 * - Significance metrics indicating pattern importance
 *
 * This export is particularly valuable for understanding the "why" behind skip
 * behaviors, moving beyond simple metrics to behavioral insights. The data is
 * formatted for easy import into analysis tools or presentation software.
 *
 * @param mainWindow - The Electron BrowserWindow to attach dialogs to
 * @param targetPath - Optional pre-defined export path (bypasses user prompt)
 * @returns Promise resolving to object containing success status, message, and path
 *
 * @example
 * // Export detected patterns for presentation
 * const result = await exportDetectedPatternsToCSV(mainWindow);
 * if (result.success) {
 *   presentPatternFindings(result.filePath);
 * } else {
 *   notifyNoPatterns("Insufficient data to detect meaningful patterns yet");
 * }
 *
 * @source
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
