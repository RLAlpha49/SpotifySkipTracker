/**
 * Core playback monitoring functionality
 *
 * Handles polling the Spotify API for playback state changes,
 * updating the UI, and coordinating playback event processing.
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
 * @param config Configuration options to override defaults
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
 * @returns The current monitoring configuration
 */
export function getMonitoringConfig(): PlaybackMonitorConfig {
  return { ...currentConfig };
}

/**
 * Resets the backoff strategy
 */
function resetBackoff(): void {
  consecutiveErrors = 0;
  currentBackoffDelay = currentConfig.initialBackoffDelay;
  isInBackoffMode = false;
}

/**
 * Implements exponential backoff strategy for API errors
 *
 * @returns The next polling interval in milliseconds
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
 * @param mainWindow Electron BrowserWindow for sending UI updates
 * @param spotifyClientId Spotify API client ID
 * @param spotifyClientSecret Spotify API client secret
 * @param config Optional monitoring configuration
 * @returns Success status of the monitoring initialization
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
 * @returns Success status of the monitoring termination
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
 * @returns Status of monitoring service
 */
export function isMonitoringActive(): boolean {
  return monitoringInterval !== null;
}

/**
 * Starts interval for smooth progress updates between API polls
 *
 * @param mainWindow Electron BrowserWindow for sending UI updates
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
 * @param mainWindow Electron BrowserWindow for sending UI updates
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
