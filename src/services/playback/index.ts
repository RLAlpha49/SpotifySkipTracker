/**
 * @packageDocumentation
 * @module playback
 * @description Playback Monitoring Service Module
 *
 * Provides the central entry point for the Spotify playback monitoring subsystem,
 * exposing a clean, simplified API for starting and controlling Spotify
 * playback tracking throughout the application.
 *
 * Features:
 * - Consolidated interface for all playback monitoring functionality
 * - Abstraction of complex internal monitoring implementation details
 * - Clean separation of public API from internal implementation
 * - Simple monitoring lifecycle management (start/stop/check status)
 * - Standardized access to playback control operations
 * - Protection from module interdependency issues
 *
 * This module serves as the facade for the playback monitoring system,
 * hiding the complexity of the specialized internal modules while
 * exposing only the necessary functions for external consumption.
 *
 * The monitoring system tracks Spotify playback in real-time, detecting:
 * - Track changes and skips
 * - Listening patterns and behaviors
 * - Playback state transitions
 * - Device changes and volume adjustments
 *
 * @module PlaybackMonitoring
 *
 * @example
 * // Starting the monitoring service
 * import { startPlaybackMonitoring } from './services/playback';
 *
 * startPlaybackMonitoring(mainWindow, clientId, clientSecret);
 *
 * @example
 * // Checking monitoring status
 * import { isMonitoringActive } from './services/playback';
 *
 * if (isMonitoringActive()) {
 *   console.log('Monitoring is currently running');
 * }
 *
 * @example
 * // Stopping the monitoring service
 * import { stopPlaybackMonitoring } from './services/playback';
 *
 * stopPlaybackMonitoring();
 * @source
 */

// Export core monitoring control functions
export {
  isMonitoringActive,
  startPlaybackMonitoring,
  stopPlaybackMonitoring,
} from "./monitor";

// No need to export state management, track change handlers, or history tracking
// as they're intended to be used internally by the monitor module
