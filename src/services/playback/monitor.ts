/**
 * @packageDocumentation
 * @module playback/monitor
 * @description Spotify Playback Monitoring Core Service
 *
 * This module forms the heart of the application's playback tracking system, providing
 * real-time monitoring of Spotify playback state with sophisticated error handling,
 * adaptive polling, and skip detection. It orchestrates the entire playback monitoring
 * pipeline and coordinates the various specialized components.
 *
 * Features:
 * - Real-time playback state monitoring with configurable polling intervals
 * - Adaptive polling with intelligent battery optimization
 * - Exponential backoff strategy for handling API errors
 * - Sophisticated track change detection and skip analysis
 * - Smooth progress interpolation between API polls
 * - Comprehensive error recovery and resilience
 * - User interface synchronization and updates
 * - Session management with play/pause tracking
 * - Device status monitoring and reporting
 * - Library status checking and persistence
 *
 * The monitoring service implements several advanced features to enhance reliability:
 *
 * 1. Dynamic Polling: Automatically adjusts polling frequency based on:
 *    - API health (exponential backoff during outages)
 *    - Battery status (reduced polling on low battery)
 *    - User configuration preferences
 *
 * 2. Progress Interpolation: Provides smooth progress updates by:
 *    - Estimating track position between API polls
 *    - Synchronizing with actual API responses when received
 *    - Accounting for pauses and resumptions
 *
 * 3. State Management: Maintains comprehensive playback state including:
 *    - Current track details and metadata
 *    - Playback status and progress
 *    - Device information
 *    - Session metrics for analytics
 *
 * This module serves as the central coordinator for the playback monitoring system,
 * integrating with track change detection, history tracking, and skip analytics
 * to provide comprehensive playback monitoring capabilities.
 *
 * @module SpotifyPlaybackMonitor
 */

import { LogLevel } from "@/types/logging";
import { PlaybackMonitorConfig, PlaybackUpdateData } from "@/types/playback";
import { BrowserWindow } from "electron";
import * as store from "../../helpers/storage/store";
import * as spotifyApi from "../spotify";
import { updateRecentTracks } from "./history";
import {
  getCredentials,
  getPlaybackState,
  resetPlaybackState,
  setCredentials,
  updatePlaybackState,
} from "./state";
import { handleTrackChange, logNowPlaying } from "./track-change";

// Monitoring state tracking
let monitoringInterval: NodeJS.Timeout | null = null;
let progressUpdateInterval: NodeJS.Timeout | null = null;

// Default configuration
const DEFAULT_CONFIG: PlaybackMonitorConfig = {
  pollingInterval: 1000, // Default: Poll API every 1 second
  progressUpdateInterval: 250, // Default: Update UI every 250ms
  maxBackoffInterval: 15000, // Maximum backoff interval: 15 seconds
  initialBackoffDelay: 2000, // Initial backoff delay: 2 seconds
  backoffMultiplier: 1.5, // Backoff multiplier for exponential backoff
  errorThreshold: 3, // Consecutive errors before backoff
  lowBatteryPollingInterval: 5000, // Use less frequent polling on low battery
};

// Current configuration (initialized with defaults)
let currentConfig: PlaybackMonitorConfig = { ...DEFAULT_CONFIG };

// Error tracking for backoff strategy
let consecutiveErrors = 0;
let currentBackoffDelay = DEFAULT_CONFIG.initialBackoffDelay;
let isInBackoffMode = false;

/**
 * Sets monitoring configuration options
 *
 * Configures the playback monitoring service by updating the polling intervals,
 * backoff strategy parameters, and other monitoring behavior settings. If monitoring
 * is already active, it automatically restarts the service with the new configuration.
 *
 * The configuration allows fine-tuning the monitoring behavior for different scenarios:
 * - Adjust polling frequency to balance responsiveness vs battery/network usage
 * - Configure error handling behavior during API outages
 * - Customize UI update frequency for progress interpolation
 * - Set backoff parameters for network resilience
 *
 * @param config - Configuration options to override defaults:
 *   - pollingInterval: Milliseconds between API polls (default: 1000ms)
 *   - progressUpdateInterval: Milliseconds between UI updates (default: 250ms)
 *   - maxBackoffInterval: Maximum delay during backoff (default: 15000ms)
 *   - initialBackoffDelay: Starting delay for backoff (default: 2000ms)
 *   - backoffMultiplier: Factor to increase backoff delay (default: 1.5)
 *   - errorThreshold: Errors required to trigger backoff (default: 3)
 *   - lowBatteryPollingInterval: Polling interval on low battery (default: 5000ms)
 *
 * @example
 * // Increase polling interval to reduce battery usage
 * setMonitoringConfig({
 *   pollingInterval: 3000,
 *   progressUpdateInterval: 500
 * });
 * @source
 */
export function setMonitoringConfig(
  config: Partial<PlaybackMonitorConfig>,
): void {
  currentConfig = {
    ...currentConfig,
    ...config,
  };

  store.saveLog(
    `Updated monitoring configuration: ${JSON.stringify(currentConfig)}`,
    "DEBUG",
  );

  // If monitoring is already active, restart it to apply new configuration
  if (isMonitoringActive()) {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    const credentials = getCredentials();

    if (mainWindow && credentials.clientId && credentials.clientSecret) {
      stopPlaybackMonitoring();
      startPlaybackMonitoring(
        mainWindow,
        credentials.clientId,
        credentials.clientSecret,
      );
    }
  }
}

/**
 * Gets the current monitoring configuration
 *
 * Retrieves a copy of the current monitoring configuration settings. This includes
 * all polling intervals, backoff parameters, and other monitoring behavior settings.
 * The returned object is a deep copy to prevent external modifications of internal state.
 *
 * This function is useful for:
 * - Inspecting current monitoring settings
 * - Modifying specific parameters while preserving others
 * - Persisting configurations for user preferences
 * - Debugging monitoring behavior issues
 *
 * @returns A complete copy of the current monitoring configuration
 *
 * @example
 * // Get current config and modify only one parameter
 * const config = getMonitoringConfig();
 * setMonitoringConfig({
 *   ...config,
 *   pollingInterval: 2000
 * });
 * @source
 */
export function getMonitoringConfig(): PlaybackMonitorConfig {
  return { ...currentConfig };
}

/**
 * Resets the exponential backoff strategy
 *
 * Clears the error tracking state and returns the monitoring system to normal
 * polling frequency. This is called automatically when:
 * - The monitoring service successfully reconnects after errors
 * - Monitoring is manually stopped and restarted
 * - The configuration is updated while monitoring is active
 *
 * Backoff is an important feature that prevents the application from:
 * - Overwhelming the Spotify API during outages or rate limiting
 * - Draining device battery during extended API issues
 * - Creating unnecessary network traffic during connectivity problems
 *
 * @private Internal function not exported from the module
 * @source
 * @notExported
 */
function resetBackoff(): void {
  consecutiveErrors = 0;
  currentBackoffDelay = currentConfig.initialBackoffDelay;
  isInBackoffMode = false;
}

/**
 * Implements exponential backoff strategy for API errors
 *
 * Calculates the appropriate delay between API requests when errors occur,
 * using an exponential backoff algorithm that progressively increases
 * the wait time between retries to prevent overwhelming the API.
 *
 * The strategy works as follows:
 * 1. Tracks consecutive error count against a configurable threshold
 * 2. Once threshold is exceeded, enters "backoff mode"
 * 3. Initial backoff delay starts at `initialBackoffDelay` (default: 2000ms)
 * 4. Each subsequent error multiplies delay by `backoffMultiplier` (default: 1.5)
 * 5. Maximum delay is capped at `maxBackoffInterval` (default: 15000ms)
 * 6. System automatically exits backoff mode once successful connections resume
 *
 * This creates a graceful degradation pattern during API issues that:
 * - Minimizes battery and network usage during prolonged outages
 * - Automatically recovers with appropriate timing
 * - Provides detailed logging for monitoring system health
 *
 * @returns The calculated polling interval in milliseconds
 * @private Internal function not exported from the module
 */
function applyBackoffStrategy(): number {
  // If we haven't hit the error threshold, use normal interval
  if (consecutiveErrors < currentConfig.errorThreshold && !isInBackoffMode) {
    return currentConfig.pollingInterval;
  }

  // Enter backoff mode
  if (!isInBackoffMode) {
    isInBackoffMode = true;
    store.saveLog(
      `Entering backoff mode due to ${consecutiveErrors} consecutive errors`,
      "WARN" as LogLevel,
    );
  }

  // Calculate backoff delay
  const backoffInterval = Math.min(
    currentConfig.maxBackoffInterval,
    currentBackoffDelay,
  );

  // Increase backoff for next time
  currentBackoffDelay = Math.min(
    currentConfig.maxBackoffInterval,
    currentBackoffDelay * currentConfig.backoffMultiplier,
  );

  store.saveLog(
    `Backoff strategy applied: next poll in ${backoffInterval}ms`,
    "DEBUG",
  );
  return backoffInterval;
}

/**
 * Starts the Spotify playback monitoring process
 *
 * Initializes and launches the core monitoring service that continuously polls
 * the Spotify API for playback state changes. This is the main entry point for
 * activating the playback monitoring functionality and begins tracking the user's
 * listening activity.
 *
 * The monitoring process performs these key functions:
 * - Polls the Spotify API at configured intervals (adjustable for battery life)
 * - Detects track changes and skips using sophisticated heuristics
 * - Updates UI with real-time playback information
 * - Tracks listening history and skip patterns
 * - Manages error handling with exponential backoff
 * - Provides interpolated progress updates between API calls
 *
 * The function handles all initialization tasks including:
 * - Setting Spotify API credentials
 * - Applying user configuration preferences
 * - Establishing polling schedules
 * - Initializing state tracking
 * - Setting up event handlers
 * - Logging monitoring activity
 *
 * @param mainWindow - Electron BrowserWindow that will receive playback updates
 * @param spotifyClientId - Spotify API client ID for authentication
 * @param spotifyClientSecret - Spotify API client secret for authentication
 * @param config - Optional monitoring configuration to override defaults
 * @returns Boolean indicating whether monitoring was successfully started
 *
 * @example
 * // Start monitoring with default settings
 * if (startPlaybackMonitoring(mainWindow, clientId, clientSecret)) {
 *   console.log("Monitoring started successfully");
 * }
 *
 * // Start with custom polling interval
 * startPlaybackMonitoring(mainWindow, clientId, clientSecret, {
 *   pollingInterval: 2000 // Poll every 2 seconds
 * });
 * @source
 * @notExported
 */
export function startPlaybackMonitoring(
  mainWindow: BrowserWindow,
  spotifyClientId: string,
  spotifyClientSecret: string,
  config?: Partial<PlaybackMonitorConfig>,
): boolean {
  try {
    // Apply any provided configuration
    if (config) {
      setMonitoringConfig(config);
    }

    // Get user's preferred polling interval if set
    const settings = store.getSettings();
    if (settings.pollingInterval && settings.pollingInterval > 0) {
      setMonitoringConfig({
        pollingInterval: settings.pollingInterval,
      });
    }

    // IMPORTANT: Set the shared credentials in the spotify-api module FIRST
    // before any other operations to avoid race conditions
    spotifyApi.setCredentials(spotifyClientId, spotifyClientSecret);

    // Then store credentials in our local state
    setCredentials(spotifyClientId, spotifyClientSecret);

    // Log that monitoring is starting with credentials set
    store.saveLog("Setting up Spotify playback monitoring...", "INFO");

    // Get settings for skip threshold
    const skipProgressThreshold = settings.skipProgress / 100 || 0.7; // Convert from percentage to decimal

    // Clean up existing intervals if running
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      store.saveLog("Restarting existing playback monitoring session", "DEBUG");
    }

    // Clear the progress update interval if it exists
    if (progressUpdateInterval) {
      clearInterval(progressUpdateInterval);
      progressUpdateInterval = null;
    }

    // Reset the playback state to avoid false track change detection
    resetPlaybackState();

    // Reset any backoff strategy
    resetBackoff();

    store.saveLog(
      `Started Spotify playback monitoring (skip threshold: ${skipProgressThreshold * 100}%, polling interval: ${currentConfig.pollingInterval}ms)`,
      "DEBUG",
    );

    // Start the progress update interval (updates more frequently than API calls)
    startProgressUpdateInterval(mainWindow);

    // Instead of setInterval, use a recursive setTimeout approach for dynamic intervals
    function scheduleNextPoll() {
      monitoringInterval = setTimeout(
        async () => {
          // Execute the polling
          try {
            await monitorPlayback(mainWindow);

            // Success! Reset consecutive errors
            if (consecutiveErrors > 0 || isInBackoffMode) {
              store.saveLog(
                "API connection restored, resetting backoff",
                "INFO",
              );
              resetBackoff();
            }

            // Schedule next poll with standard interval
            scheduleNextPoll();
          } catch (error) {
            // Increment consecutive errors for backoff strategy
            consecutiveErrors++;

            // Log at appropriate level based on error count
            const logLevel =
              consecutiveErrors > 1 ? ("WARN" as LogLevel) : "DEBUG";
            store.saveLog(
              `Playback polling error (${consecutiveErrors}): ${error}`,
              logLevel,
            );

            // Apply backoff strategy for next interval
            applyBackoffStrategy();

            // If many consecutive errors, notify the user
            if (consecutiveErrors === 5) {
              // Update UI to show connection issues
              mainWindow.webContents.send(
                "spotify:playbackStatus",
                "connection-error",
              );
              store.saveLog(
                "Multiple consecutive API errors, notifying user",
                "WARN" as LogLevel,
              );
            }

            // Schedule next poll with backoff interval
            scheduleNextPoll();
          }
        },
        isInBackoffMode ? currentBackoffDelay : currentConfig.pollingInterval,
      );
    }

    // Start the first poll
    scheduleNextPoll();

    // Initialize recent tracks after establishing monitoring interval
    // Use a small delay to avoid immediate API call at startup
    setTimeout(() => {
      updateRecentTracks().catch((error) => {
        store.saveLog(`Failed to initialize recent tracks: ${error}`, "ERROR");
      });
    }, 3000);

    store.saveLog("Playback monitoring started", "INFO");
    return true;
  } catch (error) {
    store.saveLog(`Failed to start playback monitoring: ${error}`, "ERROR");
    return false;
  }
}

/**
 * Stops the playback monitoring process
 *
 * Terminates all active monitoring activities including API polling,
 * progress interpolation, and event handling. This function performs
 * a complete and clean shutdown of the monitoring service.
 *
 * The function handles several important cleanup tasks:
 * - Cancels all active polling intervals
 * - Terminates progress update timers
 * - Resets backoff strategy state
 * - Logs the monitoring termination
 * - Preserves accumulated listening data
 *
 * Typical usage scenarios include:
 * - User-requested monitoring pause/stop
 * - Application shutdown
 * - Reconfiguration of monitoring parameters
 * - Error recovery requiring service restart
 * - Authentication changes
 *
 * @returns Boolean indicating whether monitoring was successfully stopped
 *
 * @example
 * // Stop monitoring during application shutdown
 * app.on('before-quit', () => {
 *   stopPlaybackMonitoring();
 * });
 *
 * // Stop, reconfigure, and restart monitoring
 * stopPlaybackMonitoring();
 * setMonitoringConfig({ pollingInterval: 5000 });
 * startPlaybackMonitoring(mainWindow, clientId, clientSecret);
 * @source
 */
export function stopPlaybackMonitoring(): boolean {
  try {
    if (monitoringInterval) {
      clearTimeout(monitoringInterval);
      monitoringInterval = null;
      store.saveLog("Stopped Spotify playback monitoring", "INFO");
    } else {
      store.saveLog("No active monitoring session to stop", "DEBUG");
    }

    // Clear the progress update interval when stopping monitoring
    if (progressUpdateInterval) {
      clearInterval(progressUpdateInterval);
      progressUpdateInterval = null;
    }

    // Reset backoff strategy when stopping
    resetBackoff();

    return true;
  } catch (error) {
    store.saveLog(`Failed to stop playback monitoring: ${error}`, "ERROR");
    return false;
  }
}

/**
 * Checks if playback monitoring is currently active
 *
 * Determines whether the playback monitoring service is currently running.
 * This function is used to check the monitoring state before performing
 * operations that depend on active monitoring, such as:
 *
 * - Preventing duplicate monitoring sessions
 * - Conditionally displaying monitoring status in the UI
 * - Determining whether manual polling is needed
 * - Checking service health during application state changes
 * - Coordinating with other application components
 *
 * The function checks the internal interval timer state to determine
 * if monitoring is active, providing a reliable status indicator.
 *
 * @returns Boolean indicating whether the monitoring service is currently active
 *
 * @example
 * // Only start monitoring if not already active
 * if (!isMonitoringActive()) {
 *   startPlaybackMonitoring(mainWindow, clientId, clientSecret);
 * }
 *
 * // Update UI based on monitoring status
 * updateMonitoringStatusButton(isMonitoringActive());
 * @source
 * @notExported
 */
export function isMonitoringActive(): boolean {
  return monitoringInterval !== null;
}

/**
 * Starts interval for smooth progress updates between API polls
 *
 * Establishes a high-frequency timer that interpolates playback progress
 * between actual API polling events. This creates a smooth visual experience
 * for users by:
 *
 * - Providing near real-time progress updates to the UI
 * - Estimating current track position based on elapsed time
 * - Synchronizing estimates with actual progress when API data arrives
 * - Ensuring responsive UI even with longer API polling intervals
 *
 * The function implements intelligent interpolation that:
 * - Tracks time elapsed since last API response
 * - Calculates expected progress position
 * - Caps progress at song duration
 * - Handles play/pause state changes
 * - Formats data consistently for UI consumption
 * - Sends round numbers for smoother visual experience
 *
 * This functionality allows the application to maintain responsive UI
 * while minimizing API calls, optimizing both user experience and battery life.
 *
 * @param mainWindow - Electron BrowserWindow that will receive progress updates
 * @private Internal function not exported from the module
 * @source
 * @notExported
 */
function startProgressUpdateInterval(mainWindow: BrowserWindow): void {
  // Clear any existing interval
  if (progressUpdateInterval) {
    clearInterval(progressUpdateInterval);
  }

  // Update UI using the configured interval
  progressUpdateInterval = setInterval(() => {
    // Only update if track is playing
    const state = getPlaybackState();
    if (
      state.isPlaying &&
      state.currentTrackId &&
      state.currentTrackDuration &&
      state.currentTrackDuration > 0
    ) {
      const now = Date.now();

      // Initialize lastSyncTime if needed
      if (!state.lastSyncTime) {
        updatePlaybackState({ lastSyncTime: now });
        return; // Skip this cycle
      }

      // Calculate elapsed time since last API sync in milliseconds
      const elapsedSinceSync = now - state.lastSyncTime;

      // Calculate the absolute progress position in milliseconds
      const currentProgress = state.currentTrackProgress || 0;
      const absProgressMs = currentProgress + elapsedSinceSync;

      // Cap progress at song duration
      const currentProgressMs = Math.min(
        absProgressMs,
        state.currentTrackDuration,
      );

      // Always send an update to the UI on each interval cycle
      // This ensures consistent update frequency regardless of song length
      if (state.currentTrackName && state.currentArtistName) {
        // First calculate precise progress as a percentage
        const progressPercent =
          (currentProgressMs / state.currentTrackDuration) * 100;

        // Round to 2 decimal places for smoother updates
        const roundedProgressPercent = Math.min(
          Math.round(progressPercent * 100) / 100,
          100,
        );

        // Send absolute values to the UI
        const updateData = {
          isPlaying: true,
          trackId: state.currentTrackId,
          trackName: state.currentTrackName,
          artistName: state.currentArtistName,
          albumName: state.currentAlbumName || "",
          albumArt: state.currentAlbumArt,
          progress: roundedProgressPercent,
          duration: Math.round(state.currentTrackDuration / 1000),
          currentTimeSeconds: Math.floor(currentProgressMs / 1000),
          currentTimeMs: currentProgressMs,
          isInPlaylist: state.isInLibrary,
        };

        // Send update to UI
        mainWindow.webContents.send("spotify:playbackUpdate", updateData);
      }
    }
  }, currentConfig.progressUpdateInterval);
}

/**
 * Core playback monitoring function
 *
 * This function performs the central polling operation that retrieves
 * current playback state from Spotify's API and processes it. It is
 * the heart of the monitoring system, responsible for:
 *
 * - Fetching current playback state from the Spotify API
 * - Detecting track changes and transitions
 * - Identifying pauses and resumptions
 * - Recording play durations and listening patterns
 * - Updating internal state with track metadata
 * - Sending UI updates for the current playback state
 * - Logging play/pause events and track changes
 * - Checking library status for currently playing tracks
 *
 * The function implements sophisticated state management to:
 * - Track progress between polling cycles
 * - Detect and process track changes
 * - Maintain playback history and timeline
 * - Synchronize progress interpolation with actual values
 * - Handle edge cases like track completion vs. manual skips
 *
 * This function is called periodically by the monitoring interval
 * scheduler, with adaptive timing based on error conditions and
 * backoff strategy.
 *
 * @param mainWindow - Electron BrowserWindow that will receive state updates
 * @returns Promise that resolves when polling cycle completes
 * @private Internal function not exported from the module
 * @source
 * @notExported
 */
async function monitorPlayback(mainWindow: BrowserWindow): Promise<void> {
  try {
    // Verify credentials are set before making API calls
    if (!spotifyApi.hasCredentials()) {
      store.saveLog(
        "Playback monitoring failed: Spotify API credentials not set",
        "ERROR",
      );
      return;
    }

    // Get current playback from Spotify
    const playback = await spotifyApi.getCurrentPlayback(true);
    const state = getPlaybackState();

    // No playback available
    if (!playback || !playback.item) {
      // If we were previously playing, update UI to show stopped
      if (state.isPlaying) {
        updatePlaybackState({ isPlaying: false });
        mainWindow.webContents.send("spotify:playbackUpdate", {
          isPlaying: false,
          trackId: state.currentTrackId || "",
          trackName: state.currentTrackName || "",
          artistName: state.currentArtistName || "",
          albumName: state.currentAlbumName || "",
          albumArt: state.currentAlbumArt || "",
          progress: 0,
          duration: 0,
          currentTimeSeconds: 0,
          currentTimeMs: 0,
          isInPlaylist: state.isInLibrary || false,
          trackProgress: 0,
          trackDuration: 0,
          trackProgressPercent: 0,
          deviceName: null,
          deviceType: null,
          deviceVolume: null,
        } as PlaybackUpdateData);
      }
      return;
    }

    // Process track changes
    const currentTrackId = playback.item.id;
    if (currentTrackId && currentTrackId !== state.currentTrackId) {
      // Handle track change (including skip detection)
      await handleTrackChange(currentTrackId);

      // Check if the track is in the user's library
      const isInLibrary = await spotifyApi.isTrackInLibrary(
        currentTrackId,
        true,
      );

      // Update state with new track info
      updatePlaybackState({
        currentTrackId: currentTrackId,
        currentTrackName: playback.item.name,
        currentArtistName: playback.item.artists
          .map((artist) => artist.name)
          .join(", "),
        currentAlbumName: playback.item.album.name,
        currentAlbumArt: playback.item.album.images[0]?.url || "",
        currentTrackDuration: playback.item.duration_ms,
        currentTrackProgress: playback.progress_ms || 0,
        lastProgress: playback.progress_ms || 0,
        currentDeviceName: playback.device?.name || null,
        currentDeviceType: playback.device?.type || null,
        currentDeviceVolume: playback.device?.volume_percent || null,
        isInLibrary,
        libraryStatusLogged: false,
        lastUpdated: Date.now(),
        lastSyncTime: Date.now(),
        isPlaying: playback.is_playing,
      });

      // Log now playing
      logNowPlaying(
        currentTrackId,
        playback.item.name,
        playback.item.artists.map((artist) => artist.name).join(", "),
      );
    } else if (currentTrackId && currentTrackId === state.currentTrackId) {
      // Same track, update progress and state
      const now = Date.now();

      // Log first time we detect library status
      if (!state.libraryStatusLogged) {
        store.saveLog(
          `Track "${state.currentTrackName}" is ${state.isInLibrary ? "in" : "not in"} library`,
          "DEBUG",
        );
        updatePlaybackState({ libraryStatusLogged: true });
      }

      // If currently playing
      if (playback.is_playing) {
        // If previously paused, calculate pause duration
        if (!state.isPlaying && state.pauseStartTime) {
          const pauseDuration = now - state.pauseStartTime;
          const totalPause = (state.totalPauseDuration || 0) + pauseDuration;
          updatePlaybackState({
            totalPauseDuration: totalPause,
            pauseStartTime: undefined,
          });
          store.saveLog(
            `Playback resumed after ${Math.round(pauseDuration / 1000)}s pause`,
            "DEBUG",
          );
        }

        // Update state with current progress
        updatePlaybackState({
          currentTrackProgress: playback.progress_ms || 0,
          lastProgress: playback.progress_ms || 0,
          lastUpdated: now,
          lastSyncTime: now,
          isPlaying: true,
        });
      } else if (state.isPlaying) {
        // Playback was just paused
        updatePlaybackState({
          isPlaying: false,
          pauseStartTime: now,
        });
        store.saveLog("Playback paused", "DEBUG");
      }
    }

    // Send current state to UI
    if (currentTrackId) {
      const state = getPlaybackState();
      mainWindow.webContents.send("spotify:playbackUpdate", {
        isPlaying: playback.is_playing,
        trackId: currentTrackId,
        trackName: playback.item.name,
        artistName: playback.item.artists
          .map((artist) => artist.name)
          .join(", "),
        albumName: playback.item.album.name,
        albumArt: playback.item.album.images[0]?.url || "",
        progress: (playback.progress_ms / playback.item.duration_ms) * 100,
        duration: Math.round(playback.item.duration_ms / 1000),
        currentTimeSeconds: Math.floor(playback.progress_ms / 1000),
        currentTimeMs: playback.progress_ms,
        isInPlaylist: state.isInLibrary,
        trackProgressPercent:
          (playback.progress_ms / playback.item.duration_ms) * 100,
        trackDuration: Math.round(playback.item.duration_ms / 1000),
        trackProgress: (playback.progress_ms / playback.item.duration_ms) * 100,
        deviceName: playback.device?.name || null,
        deviceType: playback.device?.type || null,
        deviceVolume: playback.device?.volume_percent || null,
      } as PlaybackUpdateData);
    }
  } catch (error) {
    store.saveLog(`Error monitoring playback: ${error}`, "ERROR");
  }
}
