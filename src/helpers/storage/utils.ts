/**
 * Storage utilities shared across different storage modules
 *
 * Provides common functionality and path definitions for storage operations.
 */

import { app } from "electron";
import path from "path";
import fs from "fs";

// Initialize application data directories
export const appDataPath = path.join(app.getPath("userData"), "data");
export const logsPath = path.join(appDataPath, "logs");
export const skipsPath = path.join(appDataPath, "skipped-tracks.json");
export const settingsFilePath = path.join(appDataPath, "settings.json");

/**
 * Clean up old log files based on maxLogFiles setting
 * Keeps only the specified number of most recent log files
 *
 * @param maxFiles Maximum number of log files to keep
 */
export function cleanupOldLogs(maxFiles: number): void {
  try {
    if (maxFiles <= 0) return; // Skip if setting is invalid

    if (!fs.existsSync(logsPath)) return; // Skip if logs directory doesn't exist

    // Get all log files except the current log file
    const logFiles = fs
      .readdirSync(logsPath)
      .filter((file) => file !== "latest.log" && file.endsWith(".log"))
      .map((file) => {
        const stats = fs.statSync(path.join(logsPath, file));
        return { file, mtime: stats.mtime.getTime() };
      })
      .sort((a, b) => b.mtime - a.mtime); // Sort newest first

    // If we have more files than the max, delete the oldest ones
    if (logFiles.length > maxFiles) {
      const filesToDelete = logFiles.slice(maxFiles);

      for (const { file } of filesToDelete) {
        try {
          fs.unlinkSync(path.join(logsPath, file));
          console.log(`Deleted old log file: ${file}`);
        } catch (error) {
          console.error(`Failed to delete log file ${file}:`, error);
        }
      }

      console.log(
        `Cleaned up ${filesToDelete.length} old log files, keeping ${maxFiles} most recent`,
      );
    }
  } catch (error) {
    console.error("Error cleaning up old logs:", error);
  }
}

/**
 * Initializes storage directories
 * Ensures all required directories exist before storage operations
 */
export function initializeStorage(): void {
  console.log("App data directory:", app.getPath("userData"));
  console.log("Full data path:", appDataPath);

  // Create main data directory if it doesn't exist
  if (!fs.existsSync(appDataPath)) {
    fs.mkdirSync(appDataPath, { recursive: true });
  }

  // Create logs directory if it doesn't exist
  if (!fs.existsSync(logsPath)) {
    fs.mkdirSync(logsPath, { recursive: true });
  }
}

/**
 * Archive the current log file with a timestamp
 * Used during application startup to start with a clean log
 * 
 * @param maxLogFiles Optional parameter for maximum log files to keep (defaults to 10)
 */
export function archiveCurrentLog(maxLogFiles = 10): void {
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

      // Clean up old logs after archiving
      cleanupOldLogs(maxLogFiles);
    } catch (error) {
      console.error("Failed to archive previous log:", error);
    }
  }
}

// Initialize storage when this module is imported
initializeStorage();
archiveCurrentLog();
