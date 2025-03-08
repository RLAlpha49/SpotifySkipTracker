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

/**
 * Application settings schema interface
 */
interface SettingsSchema {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  logLevel: "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL";
  logLineCount: number;
  skipThreshold: number;
  timeframeInDays: number;
  skipProgress: number;
  autoStartMonitoring: boolean;
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
 * Creates default settings file if none exists
 *
 * @returns Current application settings object
 */
export function getSettings(): SettingsSchema {
  try {
    if (fs.existsSync(settingsFilePath)) {
      const settingsData = fs.readFileSync(settingsFilePath, "utf-8");
      const settings = JSON.parse(settingsData);
      return settings;
    }

    console.log("No settings file found, using defaults");
    saveSettings(defaultSettings);
    return defaultSettings;
  } catch (error) {
    console.error("Failed to read settings:", error);
    return defaultSettings;
  }
}

/**
 * Writes a log message to application log files
 * Implements intelligent deduplication to prevent log spam
 *
 * @param message - Log message content
 * @param level - Severity level of the log message
 * @returns Boolean indicating success or failure
 */
export function saveLog(
  message: string,
  level: "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL" = "INFO",
): boolean {
  try {
    // Generate timestamp with millisecond precision
    const now = new Date();
    const timestamp =
      now.toLocaleTimeString() +
      `.${now.getMilliseconds().toString().padStart(3, "0")}`;

    // Get recent logs for deduplication
    const recentLogs = getLogs(20);

    // Universal deduplication for all log types
    for (const recentLog of recentLogs) {
      const logMatch = recentLog.match(/\[.*?\]\s+\[([A-Z]+)\]\s+(.*)/);
      if (logMatch && logMatch[1] === level) {
        const recentMessage = logMatch[2];

        // Check for exact duplicate
        if (recentMessage === message) {
          // Get log timestamp
          const logTimestamp = recentLog.match(/\[(.*?)\]/)?.[1];
          if (logTimestamp) {
            try {
              // Parse timestamp
              const logTime = new Date(`${now.toDateString()} ${logTimestamp}`);
              const timeDiff = now.getTime() - logTime.getTime();

              // Deduplicate identical messages within 2 seconds
              if (timeDiff < 2000) {
                return true; // Skip duplicate
              }
            } catch {
              // Continue if parsing fails
            }
          }
        }
      }
    }

    // Special case for "Now playing" messages
    if (message.startsWith("Now playing:")) {
      const songInfo = message.substring("Now playing: ".length);
      for (const recentLog of recentLogs) {
        if (
          recentLog.includes(songInfo) &&
          recentLog.includes("Now playing:")
        ) {
          return true; // Deduplicate "Now playing" messages
        }
      }
    }

    // Special case for track status messages
    const trackStatusPatterns = [
      /Track "(.*?)" by (.*?) is in your library/,
      /Track "(.*?)" by (.*?) was paused/,
      /Track "(.*?)" by (.*?) resumed after/,
    ];

    for (const pattern of trackStatusPatterns) {
      const trackMatch = message.match(pattern);
      if (trackMatch) {
        const [, trackName, artistName] = trackMatch;

        // Check for messages about the same track
        for (const recentLog of recentLogs) {
          if (
            recentLog.includes(`"${trackName}"`) &&
            recentLog.includes(`by ${artistName}`)
          ) {
            const logMatch = recentLog.match(/\[.*?\]\s+\[([A-Z]+)\]\s+(.*)/);
            if (logMatch && logMatch[2] !== message) {
              // Different message about same track
              const logTimestamp = recentLog.match(/\[(.*?)\]/)?.[1];
              if (logTimestamp) {
                try {
                  const logTime = new Date(
                    `${now.toDateString()} ${logTimestamp}`,
                  );
                  const timeDiff = now.getTime() - logTime.getTime();

                  // Deduplicate messages about same track within 500ms
                  if (timeDiff < 500) {
                    return true;
                  }
                } catch {
                  // Continue if parsing fails
                }
              }
            }
          }
        }
      }
    }

    // Pattern-based deduplication for common messages
    const commonPatterns = [
      /Loaded \d+ skipped tracks from storage/,
      /Settings loaded from storage/,
      /Spotify tokens loaded from secure storage/,
      /Using existing valid tokens/,
      /Started Spotify playback monitoring/,
      /Monitoring auto-started/,
      /Successfully refreshed .* token/,
      /Auto-starting Spotify playback monitoring/,
      /Application initialized/,
    ];

    for (const pattern of commonPatterns) {
      if (pattern.test(message)) {
        for (const recentLog of recentLogs) {
          const logMatch = recentLog.match(/\[.*?\]\s+\[([A-Z]+)\]\s+(.*)/);
          if (logMatch && pattern.test(logMatch[2])) {
            const logTimestamp = recentLog.match(/\[(.*?)\]/)?.[1];
            if (logTimestamp) {
              try {
                const logTime = new Date(
                  `${now.toDateString()} ${logTimestamp}`,
                );
                const timeDiff = now.getTime() - logTime.getTime();

                // Deduplicate common messages within 3 seconds
                if (timeDiff < 3000) {
                  return true;
                }
              } catch {
                // Continue if parsing fails
              }
            }
          }
        }
      }
    }

    const logEntry = `[${timestamp}] [${level}] ${message}\n`;

    // Write to current session log
    fs.appendFileSync(latestLogPath, logEntry);

    // Write to dated log file for historical records
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
 * Retrieves application logs from current and historical files
 *
 * @param count - Maximum number of log entries to return
 * @returns Array of log entries in chronological order
 */
export function getLogs(count: number = 100): string[] {
  try {
    let allLogs: string[] = [];

    // Get logs from current session
    if (fs.existsSync(latestLogPath)) {
      const latestContent = fs.readFileSync(latestLogPath, "utf-8");
      const latestLogs = latestContent
        .split("\n")
        .filter((line) => line.trim() !== "")
        .reverse(); // Most recent first

      allLogs = [...latestLogs];
    }

    // Get logs from historical files if needed
    if (allLogs.length < count) {
      const logFiles = fs
        .readdirSync(logsPath)
        .filter((file) => file !== "latest.log" && file.endsWith(".log"))
        .sort()
        .reverse(); // Most recent first

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
 * Clears all application logs
 *
 * @returns Boolean indicating success or failure
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

    // Create empty current session log
    fs.writeFileSync(latestLogPath, "");

    console.log("All logs cleared successfully");
    return true;
  } catch (error) {
    console.error("Failed to clear logs:", error);
    return false;
  }
}

/**
 * Skipped track data structure
 */
interface SkippedTrack {
  id: string;
  name: string;
  artist: string;
  skipCount: number;
  notSkippedCount: number;
  lastSkipped: string;
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
    fs.writeFileSync(skippedTracksFilePath, JSON.stringify(tracks, null, 2));
    return true;
  } catch (error) {
    console.error("Failed to save skipped tracks:", error);
    return false;
  }
}

/**
 * Retrieves skipped tracks data from storage
 *
 * @returns Array of tracks with skip statistics
 */
export function getSkippedTracks(): SkippedTrack[] {
  try {
    if (fs.existsSync(skippedTracksFilePath)) {
      const tracksData = fs.readFileSync(skippedTracksFilePath, "utf-8");
      return JSON.parse(tracksData);
    }
    return [];
  } catch (error) {
    console.error("Failed to read skipped tracks:", error);
    return [];
  }
}

/**
 * Updates skip count for a specific track
 * Adds track to storage if it doesn't exist
 *
 * @param track - Track information to update
 * @returns Boolean indicating success or failure
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
 * Updates played-to-completion count for a track
 * Adds track to storage if it doesn't exist
 *
 * @param track - Track information to update
 * @returns Boolean indicating success or failure
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
 * Removes a track from skipped tracks storage
 *
 * @param trackId - Spotify ID of the track to remove
 * @returns Boolean indicating success or failure
 */
export function removeSkippedTrack(trackId: string): boolean {
  try {
    const tracks = getSkippedTracks();
    const initialLength = tracks.length;

    // Filter out the track with the matching ID
    const filteredTracks = tracks.filter((track) => track.id !== trackId);

    // If no tracks were removed, return false
    if (filteredTracks.length === initialLength) {
      console.log(`Track ${trackId} not found in skipped tracks data`);
      return false;
    }

    // Save the updated tracks list
    return saveSkippedTracks(filteredTracks);
  } catch (error) {
    console.error(`Failed to remove skipped track ${trackId}:`, error);
    return false;
  }
}

/**
 * Application data directory path
 */
export const dataDirectory = appDataPath;
