/**
 * Logs storage module
 *
 * Manages application logs with features for:
 * - Log persistence with level filtering
 * - Log rotation to prevent file size issues
 * - Log retrieval with filtering options
 */

import fs from "fs";
import path from "path";
import { LogLevel } from "@/types/logging";
import { logsPath, cleanupOldLogs } from "./utils";
import { getSettings } from "./settings-store";

// Latest log file location
const latestLogPath = path.join(logsPath, "latest.log");

// Cache for recent logs to prevent duplicates
const recentLogs = new Map<string, { count: number; timestamp: number }>();
const DEDUPLICATION_WINDOW_MS = 5000; // 5 seconds window for deduplication

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

    // Create a key for deduplication (exclude timestamp for comparing content)
    const dedupeKey = `[${level}] ${message}`;
    const timestamp = now.getTime();

    // Check for duplicate logs within the deduplication window
    const existingLog = recentLogs.get(dedupeKey);

    if (existingLog) {
      // If the log is identical and recent, just increment the count
      if (timestamp - existingLog.timestamp < DEDUPLICATION_WINDOW_MS) {
        existingLog.count++;
        existingLog.timestamp = timestamp;
        // Don't write duplicate logs
        return true;
      }

      // If we've accumulated duplicates but it's been long enough, write a summary
      if (existingLog.count > 1) {
        const summaryLine = `[${formattedTime}] [${level}] Last message repeated ${existingLog.count} times\n`;
        fs.appendFileSync(latestLogPath, summaryLine, { encoding: "utf-8" });
      }
    }

    // Update the recent logs cache
    recentLogs.set(dedupeKey, { count: 1, timestamp });

    // Clean up old entries from the deduplication cache (older than the window)
    for (const [key, entry] of recentLogs.entries()) {
      if (timestamp - entry.timestamp > DEDUPLICATION_WINDOW_MS) {
        recentLogs.delete(key);
      }
    }

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

          // Check and enforce the maximum number of log files
          if (settings.maxLogFiles && settings.maxLogFiles > 0) {
            cleanupOldLogs(settings.maxLogFiles);
          }
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
 * Deletes all archived log files and clears the current log file
 *
 * @returns Boolean indicating success or failure
 */
export function clearLogs(): boolean {
  try {
    // Clear the current log file
    fs.writeFileSync(latestLogPath, "", "utf-8");

    // Delete all archived log files
    if (fs.existsSync(logsPath)) {
      const logFiles = fs
        .readdirSync(logsPath)
        .filter((file) => file !== "latest.log" && file.endsWith(".log"));

      let deletedCount = 0;

      for (const file of logFiles) {
        try {
          fs.unlinkSync(path.join(logsPath, file));
          deletedCount++;
        } catch (error) {
          console.error(`Failed to delete log file ${file}:`, error);
        }
      }

      console.log(`Deleted ${deletedCount} archived log files`);
    }

    // Log the clearing action
    saveLog("All logs cleared by user", "INFO", false);

    return true;
  } catch (error) {
    console.error("Failed to clear logs:", error);
    return false;
  }
}
