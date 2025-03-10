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
 */
export function archiveCurrentLog(): void {
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
}

// Initialize storage when this module is imported
initializeStorage();
archiveCurrentLog();
