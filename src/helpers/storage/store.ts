/**
 * Persistent storage module for Spotify Skip Tracker
 *
 * Provides data persistence functionality for application settings,
 * logging, and skip statistics. Utilizes Electron's user data directory
 * for secure file storage.
 *
 * Core functionality:
 * - Settings persistence and retrieval
 * - Logging system with rotation and deduplication
 * - Skip statistics tracking and analysis
 */

import { app } from "electron";
import path from "path";
import fs from "fs";
import { SettingsSchema } from "@/types/settings";
import { SkippedTrack } from "@/types/spotify";
import { LogLevel } from "@/types/logging";

// Initialize application data directories
const appDataPath = path.join(app.getPath("userData"), "data");
console.log("App data directory:", app.getPath("userData"));
console.log("Full data path:", appDataPath);

if (!fs.existsSync(appDataPath)) {
  fs.mkdirSync(appDataPath, { recursive: true });
}

// Initialize logs directory
const logsPath = path.join(appDataPath, "logs");
if (!fs.existsSync(logsPath)) {
  fs.mkdirSync(logsPath, { recursive: true });
}

const skipsPath = path.join(appDataPath, "skipped-tracks.json");

// Export paths for use in other modules
export { appDataPath, logsPath, skipsPath };

/**
 * Log rotation system
 *
 * Archives previous session's log file with timestamp
 * to maintain history while starting with a clean log
 */
const latestLogPath = path.join(logsPath, "latest.log");
if (fs.existsSync(latestLogPath)) {
  try {
    const stats = fs.statSync(latestLogPath);
    const logDate = new Date(stats.mtime);
    const timestamp = logDate.toISOString().replace(/[:.]/g, "-");
    const archivedLogPath = path.join(
      logsPath,
      `spotify-skip-tracker-${timestamp}.log`,
    );
    fs.renameSync(latestLogPath, archivedLogPath);
    console.log(`Archived previous log to ${archivedLogPath}`);
  } catch (error) {
    console.error("Failed to archive previous log:", error);
  }
}

// Default settings configuration
const defaultSettings: SettingsSchema = {
  clientId: "",
  clientSecret: "",
  redirectUri: "http://localhost:8888/callback",
  logLevel: "INFO",
  logLineCount: 100,
  skipThreshold: 3,
  timeframeInDays: 30,
  skipProgress: 70,
  autoStartMonitoring: true,
};

// Settings file location
const settingsFilePath = path.join(appDataPath, "settings.json");

/**
 * Persists application settings to disk
 *
 * @param settings - Application settings to save
 * @returns Boolean indicating success or failure
 */
export function saveSettings(settings: SettingsSchema): boolean {
  try {
    // Create settings directory if needed
    if (!fs.existsSync(path.dirname(settingsFilePath))) {
      fs.mkdirSync(path.dirname(settingsFilePath), { recursive: true });
    }

    fs.writeFileSync(
      settingsFilePath,
      JSON.stringify(settings, null, 2),
      "utf-8",
    );
    console.log("Settings saved successfully to:", settingsFilePath);
    return true;
  } catch (error) {
    console.error("Failed to save settings:", error);
    return false;
  }
}

/**
 * Retrieves application settings from disk
 *
 * @returns Current application settings or defaults if not found
 */
export function getSettings(): SettingsSchema {
  try {
    if (fs.existsSync(settingsFilePath)) {
      const fileContent = fs.readFileSync(settingsFilePath, "utf-8");
      const settings = JSON.parse(fileContent) as SettingsSchema;
      return { ...defaultSettings, ...settings };
    }
  } catch (error) {
    console.error("Error reading settings file:", error);
  }

  return defaultSettings;
}

/**
 * Saves a log message to the application log file
 *
 * @param message - Log message content
 * @param level - Severity level of the log (default: INFO)
 * @param allowRotation - Whether to perform log rotation if needed (default: true)
 * @returns Boolean indicating success or failure
 */
export function saveLog(
  message: string,
  level: LogLevel = "INFO",
  allowRotation = true,
): boolean {
  try {
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(logsPath)) {
      fs.mkdirSync(logsPath, { recursive: true });
    }

    // Get current settings (especially log level filter)
    const settings = getSettings();
    const logLevelOrder = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"];
    const configuredLogLevel =
      settings.fileLogLevel || settings.logLevel || "INFO";
    const configuredLevelIndex = logLevelOrder.indexOf(configuredLogLevel);
    const currentLevelIndex = logLevelOrder.indexOf(level);

    // Skip logs below the configured log level
    if (currentLevelIndex < configuredLevelIndex) {
      return false;
    }

    // Format timestamp HH:MM:SS AM/PM.ms format
    const now = new Date();
    const formattedTime =
      now
        .toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
        .replace(/\s/, " ") +
      `.${now.getMilliseconds().toString().padStart(3, "0")}`;

    const logLine = `[${formattedTime}] [${level}] ${message}\n`;

    // Append log to file
    fs.appendFileSync(latestLogPath, logLine, { encoding: "utf-8" });

    // Perform log rotation if needed
    if (allowRotation) {
      const settings = getSettings();
      const MAX_LOG_LINES = settings.logLineCount || 1000;

      if (fs.existsSync(latestLogPath)) {
        const logContent = fs.readFileSync(latestLogPath, "utf-8");
        const logLines = logContent
          .split("\n")
          .filter((line) => line.trim() !== "");

        if (logLines.length > MAX_LOG_LINES) {
          // Keep only the most recent MAX_LOG_LINES lines
          const truncatedLines = logLines.slice(-MAX_LOG_LINES);
          fs.writeFileSync(
            latestLogPath,
            truncatedLines.join("\n") + "\n",
            "utf-8",
          );
          console.log(
            `Log file rotated, kept ${MAX_LOG_LINES} most recent lines`,
          );

          // Also log this rotation event
          saveLog(
            `Log file rotated, keeping ${MAX_LOG_LINES} most recent lines`,
            "INFO",
            false,
          );
        }
      }
    }

    return true;
  } catch (error) {
    console.error("Failed to save log:", error);
    return false;
  }
}

/**
 * Retrieves recent log entries from log files
 *
 * @param count - Number of log lines to return (default: 100)
 * @returns Array of log lines
 */
export function getLogs(count: number = 100): string[] {
  try {
    if (fs.existsSync(latestLogPath)) {
      const logContent = fs.readFileSync(latestLogPath, "utf-8");
      const logLines = logContent
        .split("\n")
        .filter((line) => line.trim() !== "");

      // If we have enough lines in the current log, return the most recent ones
      if (logLines.length >= count) {
        return logLines.slice(-count);
      }

      // Otherwise, gather logs from archived log files as well
      const logs = [...logLines];
      const remainingCount = count - logs.length;

      // Get list of log files, newest first
      const logFiles = fs
        .readdirSync(logsPath)
        .filter((file) => file !== "latest.log" && file.endsWith(".log"))
        .map((file) => {
          const stats = fs.statSync(path.join(logsPath, file));
          return { file, mtime: stats.mtime.getTime() };
        })
        .sort((a, b) => b.mtime - a.mtime);

      // Gather logs from archive files until we have enough
      for (const { file } of logFiles) {
        if (logs.length >= count) break;

        const archiveContent = fs.readFileSync(
          path.join(logsPath, file),
          "utf-8",
        );
        const archiveLines = archiveContent
          .split("\n")
          .filter((line) => line.trim() !== "");

        // Add as many lines as needed from this archive
        const linesToAdd = Math.min(remainingCount, archiveLines.length);
        logs.unshift(...archiveLines.slice(-linesToAdd));
      }

      return logs.slice(-count);
    }

    return [];
  } catch (error) {
    console.error("Error reading logs:", error);
    return [
      `[${new Date().toLocaleTimeString()}] [ERROR] Error reading logs: ${error}`,
    ];
  }
}

/**
 * Clears all log files
 *
 * @returns Boolean indicating success or failure
 */
export function clearLogs(): boolean {
  try {
    // Clear the current log file
    fs.writeFileSync(latestLogPath, "", "utf-8");

    // Log the clearing action
    saveLog("Logs cleared by user", "INFO");

    return true;
  } catch (error) {
    console.error("Failed to clear logs:", error);
    return false;
  }
}

// Skipped tracks storage location
const skippedTracksFilePath = path.join(appDataPath, "skipped-tracks.json");

/**
 * Persists skipped tracks data to storage
 *
 * @param tracks - Array of track data with skip statistics
 * @returns Boolean indicating success or failure
 */
export function saveSkippedTracks(tracks: SkippedTrack[]): boolean {
  try {
    // Create directory if it doesn't exist
    if (!fs.existsSync(path.dirname(skippedTracksFilePath))) {
      fs.mkdirSync(path.dirname(skippedTracksFilePath), { recursive: true });
    }

    fs.writeFileSync(
      skippedTracksFilePath,
      JSON.stringify(tracks, null, 2),
      "utf-8",
    );
    console.log(
      `Saved ${tracks.length} skipped tracks to:`,
      skippedTracksFilePath,
    );
    return true;
  } catch (error) {
    console.error("Failed to save skipped tracks:", error);
    return false;
  }
}

/**
 * Retrieves skipped tracks data from storage
 *
 * @returns Array of track data with skip statistics
 */
export function getSkippedTracks(): SkippedTrack[] {
  try {
    if (fs.existsSync(skippedTracksFilePath)) {
      const fileContent = fs.readFileSync(skippedTracksFilePath, "utf-8");
      const tracks = JSON.parse(fileContent) as SkippedTrack[];

      // Handle potential naming differences between skipTimestamps and skipHistory
      return tracks.map((track) => {
        if (!track.skipTimestamps && track.skipHistory) {
          // Map legacy skipHistory to skipTimestamps
          return {
            ...track,
            skipTimestamps: track.skipHistory,
          };
        }
        return track;
      });
    }
  } catch (error) {
    console.error("Error reading skipped tracks file:", error);
  }

  return [];
}

/**
 * Updates or adds a skipped track entry
 *
 * @param track - Track data to update
 * @returns Boolean indicating success or failure
 */
export function updateSkippedTrack(track: SkippedTrack): boolean {
  try {
    // Get current tracks
    const tracks = getSkippedTracks();
    const now = new Date().toISOString();

    // Find existing track or add new one
    const existingIndex = tracks.findIndex((t) => t.id === track.id);
    if (existingIndex >= 0) {
      const existing = tracks[existingIndex];

      // Update with incremented skip count
      tracks[existingIndex] = {
        ...existing,
        name: track.name || existing.name,
        artist: track.artist || existing.artist,
        skipCount: (existing.skipCount || 0) + 1,
        lastSkipped: now,
        skipTimestamps: [...(existing.skipTimestamps || []), now],
      };
    } else {
      // Add new track
      tracks.push({
        ...track,
        skipCount: 1,
        notSkippedCount: 0,
        lastSkipped: now,
        skipTimestamps: [now],
      });
    }

    return saveSkippedTracks(tracks);
  } catch (error) {
    console.error("Failed to update skipped track:", error);
    return false;
  }
}

/**
 * Updates a track's non-skipped playback count
 *
 * @param track - Track that was played without skipping
 * @returns Boolean indicating success or failure
 */
export function updateNotSkippedTrack(track: SkippedTrack): boolean {
  try {
    // Get current tracks
    const tracks = getSkippedTracks();

    // Find existing track or add new one
    const existingIndex = tracks.findIndex((t) => t.id === track.id);
    if (existingIndex >= 0) {
      // Update with incremented not-skipped count
      const existing = tracks[existingIndex];
      tracks[existingIndex] = {
        ...existing,
        name: track.name || existing.name,
        artist: track.artist || existing.artist,
        notSkippedCount: (existing.notSkippedCount || 0) + 1,
      };
    } else {
      // Add new track with only not-skipped count
      tracks.push({
        ...track,
        skipCount: 0,
        notSkippedCount: 1,
        lastSkipped: "",
        skipTimestamps: [],
      });
    }

    return saveSkippedTracks(tracks);
  } catch (error) {
    console.error("Failed to update not-skipped track:", error);
    return false;
  }
}

/**
 * Removes a track from the skipped tracks list
 *
 * @param trackId - Spotify track ID to remove
 * @returns Boolean indicating success or failure
 */
export function removeSkippedTrack(trackId: string): boolean {
  try {
    // Get current tracks
    const tracks = getSkippedTracks();

    // Filter out the specified track
    const filteredTracks = tracks.filter((t) => t.id !== trackId);

    // Only save if a track was actually removed
    if (filteredTracks.length < tracks.length) {
      return saveSkippedTracks(filteredTracks);
    }

    return true;
  } catch (error) {
    console.error("Failed to remove skipped track:", error);
    return false;
  }
}

/**
 * Filters skipped tracks by a specified timeframe
 *
 * @param days - Number of days to look back
 * @returns Tracks skipped within the timeframe
 */
export function filterSkippedTracksByTimeframe(
  days: number = 30,
): SkippedTrack[] {
  const tracks = getSkippedTracks();
  if (tracks.length === 0) return [];

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return tracks.filter((track) => {
    if (!track.skipTimestamps || track.skipTimestamps.length === 0) {
      if (!track.lastSkipped) return false;
      return new Date(track.lastSkipped) >= cutoffDate;
    }

    // Check if any skip timestamps are within the timeframe
    return track.skipTimestamps.some((timestamp) => {
      return new Date(timestamp) >= cutoffDate;
    });
  });
}

/**
 * Application data directory path
 */
export const dataDirectory = appDataPath;
