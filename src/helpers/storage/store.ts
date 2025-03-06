/**
 * Storage Service for Spotify Skip Tracker
 *
 * This module provides persistent storage functionality for the application,
 * handling settings, logs, and skip statistics. It uses the Electron app's
 * user data directory to store files securely on the user's machine.
 *
 * Key Features:
 * - Application settings management
 * - Logging system with configurable verbosity
 * - Storage for skipped track statistics
 * - Automatic log rotation and archiving
 */

import { app } from "electron";
import path from "path";
import fs from "fs";

// Create app data directory if it doesn't exist
const appDataPath = path.join(app.getPath("userData"), "data");
console.log("App data directory:", app.getPath("userData"));
console.log("Full data path:", appDataPath);

if (!fs.existsSync(appDataPath)) {
  fs.mkdirSync(appDataPath, { recursive: true });
}

// Create logs directory if it doesn't exist
const logsPath = path.join(appDataPath, "logs");
if (!fs.existsSync(logsPath)) {
  fs.mkdirSync(logsPath, { recursive: true });
}

/**
 * Log Rotation System
 *
 * At application startup, we archive the previous session's log file
 * with a timestamp to maintain history while keeping the current log clean
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

/**
 * Application Settings Schema
 *
 * Defines the structure and types for application settings
 */
interface SettingsSchema {
  clientId: string; // Spotify API Client ID
  clientSecret: string; // Spotify API Client Secret
  redirectUri: string; // OAuth redirect URI
  logLevel: "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL"; // Log verbosity
  logLineCount: number; // Number of log lines to show in UI
  skipThreshold: number; // Number of skips before suggesting removal
  timeframeInDays: number; // Time window for skip analysis
  skipProgress: number; // Progress percentage threshold to count as skip
}

// Default settings applied when no settings file exists
const defaultSettings: SettingsSchema = {
  clientId: "",
  clientSecret: "",
  redirectUri: "http://localhost:8888/callback",
  logLevel: "INFO",
  logLineCount: 100,
  skipThreshold: 3,
  timeframeInDays: 30,
  skipProgress: 70,
};

// Path to settings file
const settingsFilePath = path.join(appDataPath, "settings.json");

/**
 * Save application settings to disk
 *
 * @param settings - Application settings to save
 * @returns True if settings were saved successfully, false otherwise
 */
export function saveSettings(settings: SettingsSchema): boolean {
  try {
    // Create settings file if it doesn't exist
    if (!fs.existsSync(path.dirname(settingsFilePath))) {
      fs.mkdirSync(path.dirname(settingsFilePath), { recursive: true });
    }

    // Write settings to file
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
 * Get application settings from disk
 * If no settings file exists, creates one with default values
 *
 * @returns Current application settings
 */
export function getSettings(): SettingsSchema {
  try {
    // Read settings from file
    if (fs.existsSync(settingsFilePath)) {
      const settingsData = fs.readFileSync(settingsFilePath, "utf-8");
      const settings = JSON.parse(settingsData);
      return settings;
    }

    // If file doesn't exist, return default settings and save them
    console.log("No settings file found, using defaults");
    saveSettings(defaultSettings);
    return defaultSettings;
  } catch (error) {
    console.error("Failed to read settings:", error);
    return defaultSettings;
  }
}

/**
 * Application Logging System
 *
 * Saves log entries to both a current session log (latest.log) and daily log files
 * for historical tracking. Includes smart deduplication to prevent log spam.
 *
 * @param message - The log message to save
 * @param level - Severity level of the log message
 * @returns True if log was saved (or deduplicated), false on error
 */
export function saveLog(
  message: string,
  level: "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL" = "INFO",
): boolean {
  try {
    // Messages that we want to deduplicate more aggressively
    const commonMessages = [
      "Loaded skipped tracks from storage",
      "Settings loaded from storage",
      "Successfully loaded tokens from storage",
    ];

    // Check if this is a "Now playing" message
    const isNowPlayingMessage = message.startsWith("Now playing:");

    // Check for recent duplicate logs (anti-spam)
    const recentLogs = getLogs(5); // Check last 5 logs for better deduplication
    if (recentLogs.length > 0) {
      // For common repeating messages, check if any of the recent logs match
      if (commonMessages.some((common) => message.includes(common))) {
        for (const recentLog of recentLogs) {
          const logMatch = recentLog.match(/\[.*?\]\s+\[([A-Z]+)\]\s+(.*)/);
          if (logMatch && logMatch[2].includes(message)) {
            return true; // Pretend we saved it
          }
        }
      }

      // For "Now playing" messages, deduplicate more aggressively
      if (isNowPlayingMessage) {
        const songInfo = message.substring("Now playing: ".length);
        for (const recentLog of recentLogs) {
          if (
            recentLog.includes(songInfo) &&
            recentLog.includes("Now playing:")
          ) {
            return true;
          }
        }
      }

      // General deduplication for the most recent log
      const lastLogMatch = recentLogs[0].match(/\[.*?\]\s+\[([A-Z]+)\]\s+(.*)/);
      if (lastLogMatch) {
        const lastLogLevel = lastLogMatch[1];
        const lastLogMessage = lastLogMatch[2];

        // If same message and level within the last log, don't duplicate it
        // But make an exception for track skipped messages which should always be logged
        if (
          lastLogMessage === message &&
          lastLogLevel === level &&
          !message.includes("Track skipped:")
        ) {
          return true; // Pretend we saved it
        }
      }
    }

    const now = new Date();
    const timestamp = now.toLocaleTimeString();
    const logEntry = `[${timestamp}] [${level}] ${message}\n`;

    // Save to latest.log (current session log)
    fs.appendFileSync(latestLogPath, logEntry);

    // Also save to dated log file for historical purposes
    const formattedDate = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const datedLogFileName = `spotify-skip-tracker-${formattedDate}.log`;
    const datedLogFilePath = path.join(logsPath, datedLogFileName);
    fs.appendFileSync(datedLogFilePath, logEntry);

    return true;
  } catch (error) {
    console.error("Failed to save log:", error);
    return false;
  }
}

/**
 * Retrieve recent application logs
 *
 * Gets logs from both the current session and historical log files,
 * merging them in chronological order.
 *
 * @param count - Maximum number of log entries to return
 * @returns Array of log entries, ordered from oldest to newest
 */
export function getLogs(count: number = 100): string[] {
  try {
    // Always check latest.log first
    let allLogs: string[] = [];

    if (fs.existsSync(latestLogPath)) {
      const latestContent = fs.readFileSync(latestLogPath, "utf-8");
      const latestLogs = latestContent
        .split("\n")
        .filter((line) => line.trim() !== "")
        .reverse(); // Most recent first

      allLogs = [...latestLogs];
    }

    // Then check dated log files if we need more
    if (allLogs.length < count) {
      const logFiles = fs
        .readdirSync(logsPath)
        .filter((file) => file !== "latest.log" && file.endsWith(".log"))
        .sort()
        .reverse(); // Get most recent logs first

      for (const file of logFiles) {
        if (allLogs.length >= count) break;

        const filePath = path.join(logsPath, file);
        const fileContent = fs.readFileSync(filePath, "utf-8");
        const fileLogs = fileContent
          .split("\n")
          .filter((line) => line.trim() !== "")
          .reverse(); // Most recent first

        allLogs = [...allLogs, ...fileLogs];

        if (allLogs.length > count) {
          allLogs = allLogs.slice(0, count);
        }
      }
    }

    return allLogs.reverse(); // Return in chronological order
  } catch (error) {
    console.error("Failed to read logs:", error);
    return [];
  }
}

/**
 * Clear all application logs
 *
 * Removes all log files and creates a fresh, empty current session log
 *
 * @returns True if logs were successfully cleared, false on error
 */
export function clearLogs(): boolean {
  try {
    // Get all log files
    const files = fs.readdirSync(logsPath);

    // Delete each log file
    for (const file of files) {
      if (
        file === "latest.log" ||
        (file.startsWith("spotify-skip-tracker-") && file.endsWith(".log"))
      ) {
        fs.unlinkSync(path.join(logsPath, file));
      }
    }

    // Create a fresh latest.log
    fs.writeFileSync(latestLogPath, "");

    console.log("All logs cleared successfully");
    return true;
  } catch (error) {
    console.error("Failed to clear logs:", error);
    return false;
  }
}

/**
 * Skipped Track Information
 *
 * Data structure for tracking skip statistics for a track
 */
interface SkippedTrack {
  id: string; // Spotify track ID
  name: string; // Track name
  artist: string; // Artist name
  skipCount: number; // Number of times skipped
  notSkippedCount: number; // Number of times played to completion
  lastSkipped: string; // ISO date string of last skip
}

// Path to skipped tracks storage
const skippedTracksFilePath = path.join(appDataPath, "skipped-tracks.json");

/**
 * Save the full list of skipped tracks to storage
 *
 * @param tracks - Array of track data with skip statistics
 * @returns True if saved successfully, false on error
 */
export function saveSkippedTracks(tracks: SkippedTrack[]): boolean {
  try {
    // Write tracks to file
    fs.writeFileSync(skippedTracksFilePath, JSON.stringify(tracks, null, 2));
    return true;
  } catch (error) {
    console.error("Failed to save skipped tracks:", error);
    return false;
  }
}

/**
 * Get all skipped tracks from storage
 *
 * @returns Array of tracks with skip statistics, or empty array if none exist
 */
export function getSkippedTracks(): SkippedTrack[] {
  try {
    // Read tracks from file
    if (fs.existsSync(skippedTracksFilePath)) {
      const tracksData = fs.readFileSync(skippedTracksFilePath, "utf-8");
      return JSON.parse(tracksData);
    }

    // If file doesn't exist, return empty array
    return [];
  } catch (error) {
    console.error("Failed to read skipped tracks:", error);
    return [];
  }
}

/**
 * Update skip count for a specific track
 * If the track doesn't exist in storage, it is added
 *
 * @param track - Track information to update
 * @returns True if updated successfully, false on error
 */
export function updateSkippedTrack(track: SkippedTrack): boolean {
  try {
    const tracks = getSkippedTracks();
    const existingIndex = tracks.findIndex((t) => t.id === track.id);

    if (existingIndex >= 0) {
      // Update existing track
      tracks[existingIndex] = {
        ...tracks[existingIndex],
        ...track,
        skipCount: (tracks[existingIndex].skipCount || 0) + 1,
        lastSkipped: new Date().toISOString(),
      };
    } else {
      // Add new track
      tracks.push({
        ...track,
        skipCount: 1,
        notSkippedCount: 0,
        lastSkipped: new Date().toISOString(),
      });
    }

    return saveSkippedTracks(tracks);
  } catch (error) {
    console.error("Failed to update skipped track:", error);
    return false;
  }
}

/**
 * Update played-to-completion count for a specific track
 * If the track doesn't exist in storage, it is added
 *
 * @param track - Track information to update
 * @returns True if updated successfully, false on error
 */
export function updateNotSkippedTrack(track: SkippedTrack): boolean {
  try {
    const tracks = getSkippedTracks();
    const existingIndex = tracks.findIndex((t) => t.id === track.id);

    if (existingIndex >= 0) {
      // Update existing track - preserve skipCount and lastSkipped
      tracks[existingIndex] = {
        ...tracks[existingIndex],
        // Only update these fields, don't overwrite skipCount or lastSkipped
        id: track.id,
        name: track.name,
        artist: track.artist,
        notSkippedCount: (tracks[existingIndex].notSkippedCount || 0) + 1,
      };
    } else {
      // Add new track
      tracks.push({
        ...track,
        skipCount: 0,
        notSkippedCount: 1,
        lastSkipped: "", // No skip date for a track that wasn't skipped
      });
    }

    return saveSkippedTracks(tracks);
  } catch (error) {
    console.error("Failed to update not skipped track:", error);
    return false;
  }
}

/**
 * Path to the application data directory
 * Exported for use by other modules that need to access storage
 */
export const dataDirectory = appDataPath;
