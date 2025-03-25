/**
 * Persistent storage module for Spotify Skip Tracker
 *
 * This is the main entry point for all storage-related functionality.
 * It re-exports the modularized storage functions from specialized files.
 */

// Re-export all storage utilities
export * from "./utils";

// Re-export settings storage functions
export * from "./settings-store";

// Re-export logging functions
export {
  clearLogs,
  getAvailableLogFiles,
  getLogs,
  getLogsFromFile,
  // re-export all the storage functions
  saveLog,
} from "./logs-store";

// Re-export tracks storage functions
export * from "./tracks-store";

// Re-export enhanced statistics storage functions
export * from "./statistics-store";
