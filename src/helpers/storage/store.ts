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
export * from "./logs-store";

// Re-export skipped tracks functions
export * from "./tracks-store";
