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

// Handle "latest.log" at startup - rename it if it exists
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

// Define settings schema for type safety
interface SettingsSchema {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  logLevel: "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL";
  logLineCount: number;
  skipThreshold: number;
  timeframeInDays: number;
  skipProgress: number;
}

// Default settings
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

// Function to save settings
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

// Function to get settings
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

// Function to save log entry
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

// Function to get most recent logs
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

// Function to clear logs
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

// Skipped tracks management
interface SkippedTrack {
  id: string;
  name: string;
  artist: string;
  skipCount: number;
  notSkippedCount: number;
  lastSkipped: string;
}

const skippedTracksFilePath = path.join(appDataPath, "skipped-tracks.json");

// Function to save skipped tracks
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

// Function to get skipped tracks
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

// Function to add or update a skipped track
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

// Function to update a track when it's not skipped (completed)
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

// Export the path to the data directory for other utilities
export const dataDirectory = appDataPath;
