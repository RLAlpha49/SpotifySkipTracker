/**
 * Playback monitoring module
 *
 * This is the main entry point for all playback monitoring functionality.
 * It re-exports the modularized functions from specialized files.
 */

// Export monitor functionality
export {
  startPlaybackMonitoring,
  stopPlaybackMonitoring,
  isMonitoringActive,
} from "./monitor";

// No need to export state management, track change handlers, or history tracking
// as they're intended to be used internally by the monitor module
