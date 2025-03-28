/**
 * Central Storage Management System
 *
 * Acts as the primary entry point and facade for all storage-related operations
 * in the Spotify Skip Tracker application. This module implements a modular
 * architecture for storage management by:
 *
 * - Aggregating specialized storage modules into a unified API
 * - Providing centralized access to all persistence functions
 * - Maintaining separation of concerns through modular design
 * - Simplifying imports through re-exporting of specialized functions
 *
 * The storage system handles multiple data types including:
 * - User settings and preferences
 * - Skipped tracks and playback history
 * - Application logs and debugging information
 * - Statistical aggregations and analysis data
 *
 * This unified interface allows the application to interact with various
 * storage mechanisms through a single, consistent API while maintaining
 * separation of implementation details.
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
  saveLog,
} from "./logs-store";

// Re-export tracks storage functions
export * from "./tracks-store";

// Re-export enhanced statistics storage functions
export * from "./statistics-store";
