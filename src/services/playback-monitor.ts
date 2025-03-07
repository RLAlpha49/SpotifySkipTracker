/**
 * Spotify Playback Monitoring Service
 *
 * This service is responsible for monitoring Spotify playback in real-time and
 * detecting when tracks are skipped. It uses the Spotify Web API to poll the
 * current playback state and tracks user listening behavior.
 *
 * Key Features:
 * - Real-time monitoring of Spotify playback
 * - Skip detection based on configurable progress thresholds
 * - Tracking of play completion stats
 * - Integration with library management (removing frequently skipped tracks)
 * - Statistics collection and storage
 */

import { BrowserWindow } from "electron";
import {
  getCurrentPlayback,
  getRecentlyPlayedTracks,
  isTrackInLibrary,
  unlikeTrack,
  refreshAccessToken,
} from "./spotify-api";
import { saveLog, getSettings } from "../helpers/storage/store";

/**
 * Internal state for tracking playback information
 * Maintains the current playback state and history between polling intervals
 */
interface PlaybackState {
  trackId: string | null;
  trackName: string | null;
  artistName: string | null;
  albumName: string | null;
  albumArt: string;
  progress: number;
  duration: number;
  isInLibrary: boolean;
  lastProgress: number;
  recentTracks: string[];
  libraryStatusLogged: boolean;
  lastNowPlayingLog?: number;
  lastUpdateTime?: number;
  lastSyncTime?: number;
  isPlaying: boolean;
  pauseStartTime?: number;
  totalPauseDuration: number;
}

let playbackState: PlaybackState = {
  trackId: null,
  trackName: null,
  artistName: null,
  albumName: null,
  albumArt: "",
  progress: 0,
  duration: 0,
  isInLibrary: false,
  lastProgress: 0,
  recentTracks: [],
  libraryStatusLogged: false,
  isPlaying: false,
  totalPauseDuration: 0,
};

// Monitoring state variables
let monitoringInterval: NodeJS.Timeout | null = null;
let clientId: string;
let clientSecret: string;

// Define interfaces for Spotify API responses
/**
 * Represents an artist from the Spotify API
 */
interface SpotifyArtist {
  name: string;
  id: string;
}

/**
 * Represents an image from the Spotify API
 */
interface SpotifyImage {
  url: string;
  height: number;
  width: number;
}

/**
 * Represents an album from the Spotify API
 */
interface SpotifyAlbum {
  name: string;
  id: string;
  images: SpotifyImage[];
}

/**
 * Represents a track from the Spotify API
 */
interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  duration_ms: number;
}

/**
 * Represents a playback item from the Spotify API's recently played endpoint
 */
interface SpotifyPlaybackItem {
  track: SpotifyTrack;
}

/**
 * Response format from the Spotify recently played tracks API
 */
interface RecentlyPlayedResponse {
  items: SpotifyPlaybackItem[];
}

/**
 * Information about tracks that are skipped, including counts and timestamps
 */
interface SkippedTrackInfo {
  id: string;
  name: string;
  artist: string;
  skipCount: number;
  notSkippedCount: number;
  lastSkipped: string;
}

// Add a variable for the progress update interval
let progressUpdateInterval: NodeJS.Timeout | null = null;

/**
 * Starts the playback monitoring process.
 * Sets up regular intervals to check current playback and track skips.
 *
 * @param mainWindow - Electron BrowserWindow instance for sending updates
 * @param spotifyClientId - Spotify API client ID
 * @param spotifyClientSecret - Spotify API client secret
 * @returns boolean - Success status of starting the monitoring
 */
export function startPlaybackMonitoring(
  mainWindow: BrowserWindow,
  spotifyClientId: string,
  spotifyClientSecret: string,
): boolean {
  try {
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      saveLog("Restarting existing playback monitoring session", "DEBUG");
    }

    // Clear the progress update interval if it exists
    if (progressUpdateInterval) {
      clearInterval(progressUpdateInterval);
      progressUpdateInterval = null;
    }

    clientId = spotifyClientId;
    clientSecret = spotifyClientSecret;

    // Get settings for skip threshold
    const settings = getSettings();
    const skipProgressThreshold = settings.skipProgress / 100 || 0.7; // Convert from percentage to decimal

    saveLog(
      `Started Spotify playback monitoring (skip threshold: ${skipProgressThreshold * 100}%)`,
      "DEBUG",
    );

    // Initialize recent tracks
    updateRecentTracks();

    // Start the progress update interval (updates more frequently than API calls)
    startProgressUpdateInterval(mainWindow);

    // Start monitoring interval for API calls
    monitoringInterval = setInterval(() => {
      monitorPlayback(mainWindow);
    }, 1000);

    return true;
  } catch (error) {
    saveLog(`Failed to start playback monitoring: ${error}`, "ERROR");
    return false;
  }
}

/**
 * Stops the playback monitoring process.
 * Clears the monitoring interval and logs final state.
 *
 * @returns boolean - Success status of stopping the monitoring
 */
export function stopPlaybackMonitoring(): boolean {
  try {
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      monitoringInterval = null;
      saveLog("Stopped Spotify playback monitoring", "INFO");
    } else {
      saveLog("No active monitoring session to stop", "DEBUG");
    }

    // Clear the progress update interval when stopping monitoring
    if (progressUpdateInterval) {
      clearInterval(progressUpdateInterval);
      progressUpdateInterval = null;
    }

    return true;
  } catch (error) {
    saveLog(`Failed to stop playback monitoring: ${error}`, "ERROR");
    return false;
  }
}

/**
 * Checks if the playback monitoring service is currently active.
 *
 * @returns boolean - True if monitoring is active, false otherwise
 */
export function isMonitoringActive(): boolean {
  return monitoringInterval !== null;
}

/**
 * Starts the interval that updates the progress locally between API calls
 * This provides smoother progress updates in the UI
 *
 * @param mainWindow - Electron BrowserWindow instance for sending updates
 */
function startProgressUpdateInterval(mainWindow: BrowserWindow): void {
  // Clear any existing interval
  if (progressUpdateInterval) {
    clearInterval(progressUpdateInterval);
  }

  // Update UI every 250ms
  progressUpdateInterval = setInterval(() => {
    // Only update if track is playing
    if (
      playbackState.isPlaying &&
      playbackState.trackId &&
      playbackState.duration > 0
    ) {
      const now = Date.now();

      // Initialize lastSyncTime if needed
      if (!playbackState.lastSyncTime) {
        playbackState.lastSyncTime = now;
        return; // Skip this cycle
      }

      // Calculate elapsed time since last API sync in milliseconds
      const elapsedSinceSync = now - playbackState.lastSyncTime;

      // Calculate the absolute progress position in milliseconds
      const absProgressMs = playbackState.progress + elapsedSinceSync;

      // Cap progress at song duration
      const currentProgressMs = Math.min(absProgressMs, playbackState.duration);

      // Calculate progress in seconds for UI display
      const currentTimeSeconds = Math.floor(currentProgressMs / 1000);

      // Always send an update to the UI on each interval cycle
      // This ensures consistent update frequency regardless of song length
      if (playbackState.trackName && playbackState.artistName) {
        // First calculate precise progress as a percentage
        const progressPercent =
          (currentProgressMs / playbackState.duration) * 100;

        // Round to 2 decimal places for smoother updates
        const roundedProgressPercent = Math.min(
          Math.round(progressPercent * 100) / 100,
          100,
        );

        // Send absolute values to the UI
        mainWindow.webContents.send("spotify:playbackUpdate", {
          isPlaying: true,
          trackId: playbackState.trackId,
          trackName: playbackState.trackName,
          artistName: playbackState.artistName,
          albumName: playbackState.albumName || "",
          albumArt: playbackState.albumArt,
          progress: roundedProgressPercent,
          duration: Math.round(playbackState.duration / 1000),
          currentTimeMs: currentProgressMs,
          currentTimeSeconds: currentTimeSeconds,
          isInPlaylist: playbackState.isInLibrary,
        });
      }
    }
  }, 250);
}

/**
 * Main playback monitoring function.
 * Polls the Spotify API for current playback, detects track changes, and handles skip logic.
 *
 * @param mainWindow - Electron BrowserWindow instance for sending updates
 */
async function monitorPlayback(mainWindow: BrowserWindow): Promise<void> {
  try {
    // Get current playback from Spotify
    let playback;
    try {
      playback = await getCurrentPlayback(clientId, clientSecret);
    } catch (error: unknown) {
      // Type guard for error
      const authError = error as Error;
      const errorMessage = authError.message || String(authError);

      // If we get an authentication error, attempt to refresh the token
      if (
        errorMessage.includes("401") ||
        errorMessage.includes("unauthorized") ||
        errorMessage.includes("expired")
      ) {
        saveLog(
          "Auth token expired during playback check, attempting refresh...",
          "DEBUG",
        );

        try {
          // Try to refresh the token silently
          await refreshAccessToken(clientId, clientSecret);
          saveLog(
            "Successfully refreshed token during playback check",
            "DEBUG",
          );

          // Retry with the new token
          playback = await getCurrentPlayback(clientId, clientSecret);
        } catch (error: unknown) {
          const refreshError = error as Error;
          saveLog(
            `Failed to refresh token during playback check: ${refreshError.message || String(refreshError)}`,
            "ERROR",
          );
          // Rethrow to stop this cycle
          throw refreshError;
        }
      } else {
        saveLog(`Playback check error: ${errorMessage}`, "ERROR");
        throw authError;
      }
    }

    if (!playback) {
      // Nothing is playing, reset tracking and notify renderer
      resetPlaybackState();

      // Send empty playback update to renderer
      mainWindow.webContents.send("spotify:playbackUpdate", {
        isPlaying: false,
        trackId: "",
        trackName: "",
        artistName: "",
        albumName: "",
        albumArt: "",
        progress: 0,
        duration: 0,
        isInPlaylist: false,
      });

      return;
    }

    // Extract playback data
    const isPlaying = playback.is_playing;
    const item = playback.item;

    if (!item) {
      // No track data, reset and return
      resetPlaybackState();
      return;
    }

    // Get track details
    const trackId = item.id;
    const trackName = item.name;
    const artistName = item.artists[0].name;
    const albumName = item.album.name;
    const albumArt = item.album.images[0]?.url || "";
    const progress = playback.progress_ms;
    const duration = item.duration_ms;

    // Handle pause/play state changes
    const now = Date.now();

    // Track was previously playing but is now paused
    if (playbackState.isPlaying && !isPlaying) {
      // Record when the pause started
      playbackState.pauseStartTime = now;
      saveLog(`Track "${trackName}" was paused`, "DEBUG");
    }
    // Track was previously paused but is now playing
    else if (
      !playbackState.isPlaying &&
      isPlaying &&
      playbackState.pauseStartTime
    ) {
      // Calculate how long the track was paused and add to total
      const pauseDuration = now - playbackState.pauseStartTime;
      playbackState.totalPauseDuration += pauseDuration;

      // Reset pause start time
      playbackState.pauseStartTime = undefined;

      saveLog(
        `Track "${trackName}" resumed after ${Math.round(pauseDuration / 1000)} seconds paused`,
        "DEBUG",
      );
    }

    // Update the isPlaying state for local progress tracking
    playbackState.isPlaying = isPlaying;
    // Use API progress as the base progress
    playbackState.progress = progress;
    playbackState.albumArt = albumArt;
    // Set the sync time to now (used for local progress computation)
    playbackState.lastSyncTime = now;

    // Check if track is in library (need to check if in a playlist in this implementation)
    let isInLibrary = false;
    try {
      isInLibrary = await isTrackInLibrary(clientId, clientSecret, trackId);
    } catch (error: unknown) {
      const authError = error as Error;
      const errorMessage = authError.message || String(authError);

      // If we get an authentication error, attempt to refresh the token
      if (
        errorMessage.includes("401") ||
        errorMessage.includes("unauthorized") ||
        errorMessage.includes("expired")
      ) {
        saveLog(
          "Auth token expired during library check, attempting refresh...",
          "DEBUG",
        );

        try {
          // Try to refresh the token silently
          await refreshAccessToken(clientId, clientSecret);
          saveLog("Successfully refreshed token during library check", "DEBUG");

          // Retry with the new token
          isInLibrary = await isTrackInLibrary(clientId, clientSecret, trackId);
        } catch (error: unknown) {
          const refreshError = error as Error;
          saveLog(
            `Failed to refresh token during library check: ${refreshError.message || String(refreshError)}`,
            "ERROR",
          );
          // Continue with isInLibrary = false
        }
      } else {
        saveLog(`Library check error: ${errorMessage}`, "ERROR");
      }
    }

    // If track changed, check for skip
    if (playbackState.trackId && playbackState.trackId !== trackId) {
      await handleTrackChange(trackId);
      // Track changed, reset the libraryStatusLogged flag
      playbackState.libraryStatusLogged = false;
    }

    // Log library status only when:
    // 1. This is a new track (different from last one)
    // 2. The track is in the library
    // 3. We haven't logged it yet
    if (
      isInLibrary &&
      !playbackState.libraryStatusLogged &&
      (playbackState.trackId !== trackId ||
        playbackState.isInLibrary !== isInLibrary)
    ) {
      saveLog(
        `Track "${trackName}" by ${artistName} is in your library - skips will be tracked`,
        "DEBUG",
      );
      playbackState.libraryStatusLogged = true;
    }

    // Store the current timestamp for logging purposes
    const lastNowPlayingLog = playbackState.lastNowPlayingLog || 0;

    // Log "Now playing" only when:
    // 1. This is a new track (different from last one)
    // 2. We haven't logged it yet in recent tracks
    // 3. OR it's been more than 30 seconds since the last "Now playing" log for this track
    const shouldLogNowPlaying =
      !playbackState.recentTracks.includes(trackId) ||
      trackId !== playbackState.trackId ||
      now - lastNowPlayingLog > 30000;
    playbackState = {
      ...playbackState,
      trackId,
      trackName,
      artistName,
      albumName,
      progress,
      duration,
      isInLibrary,
      lastProgress: progress,
      libraryStatusLogged: playbackState.libraryStatusLogged,
      lastNowPlayingLog: shouldLogNowPlaying
        ? now
        : playbackState.lastNowPlayingLog || now,
    };

    // Log first play of a track or periodic update
    if (shouldLogNowPlaying) {
      saveLog(`Now playing: ${trackName} by ${artistName}`, "INFO");
    }

    // Update state with latest API values
    playbackState.trackId = trackId;
    playbackState.trackName = trackName;
    playbackState.artistName = artistName;
    playbackState.albumName = albumName;
    playbackState.progress = progress;
    playbackState.duration = duration;
    playbackState.lastProgress = progress;

    if (!isPlaying) {
      mainWindow.webContents.send("spotify:playbackUpdate", {
        isPlaying: false,
        trackId: "",
        trackName: "",
        artistName: "",
        albumName: "",
        albumArt: "",
        progress: 0,
        duration: 0,
        isInPlaylist: false,
      });
    }
  } catch (error) {
    saveLog(`Error in playback monitoring: ${error}`, "ERROR");
  }
}

/**
 * Handles track changes and detects if a track was skipped.
 *
 * This is the core of the skip detection logic:
 * - When a track changes, check how far through the previous track the user was
 * - If below the threshold, check if the track was paused for at least 15 seconds
 * - If it wasn't paused for long enough, count it as a skip
 * - Update statistics and potentially remove from library if skip count exceeds threshold
 *
 * @param newTrackId - The ID of the new track being played
 */
async function handleTrackChange(newTrackId: string): Promise<void> {
  try {
    // Skip detection logic
    const settings = getSettings();
    const skipProgressThreshold = settings.skipProgress / 100 || 0.7; // Convert from percentage to decimal
    const PAUSE_THRESHOLD_MS = 15 * 1000; // 15 seconds in milliseconds

    const progressPercentage =
      playbackState.lastProgress / playbackState.duration;

    // If we have a previous track and it's not in our recent tracks
    if (
      playbackState.trackId &&
      !playbackState.recentTracks.includes(newTrackId)
    ) {
      // Calculate the current pause duration if the track is paused
      let currentPauseDuration = 0;
      if (!playbackState.isPlaying && playbackState.pauseStartTime) {
        currentPauseDuration = Date.now() - playbackState.pauseStartTime;
      }

      // Total pause duration including current pause if track is paused
      const totalPauseDuration =
        playbackState.totalPauseDuration + currentPauseDuration;

      // Check if track was skipped - only if not paused for long enough
      if (
        progressPercentage < skipProgressThreshold &&
        totalPauseDuration < PAUSE_THRESHOLD_MS
      ) {
        console.log(
          "Track skipped:",
          playbackState.trackName,
          playbackState.artistName,
          progressPercentage,
          skipProgressThreshold,
          "Pause duration:",
          Math.round(totalPauseDuration / 1000) + "s",
        );
        // If track was in library, record the skip
        if (playbackState.isInLibrary) {
          // This is a skip - record it
          saveLog(
            `Track skipped: ${playbackState.trackName} by ${playbackState.artistName} (${Math.round(progressPercentage * 100)}% played)`,
            "INFO",
          );

          try {
            // Update skip count in storage
            const store = await import("../helpers/storage/store");
            await store.updateSkippedTrack({
              id: playbackState.trackId,
              name: playbackState.trackName || "",
              artist: playbackState.artistName || "",
              skipCount: 1,
              notSkippedCount: 0,
              lastSkipped: new Date().toISOString(),
            } as SkippedTrackInfo);

            // Check if track should be unliked
            const skipThresholdCount = settings.skipThreshold || 3; // This is correctly using skipThreshold
            const skippedTracks = await getSkippedTracks();
            const skippedTrack = skippedTracks.find(
              (track) => track.id === playbackState.trackId,
            );

            if (skippedTrack && skippedTrack.skipCount >= skipThresholdCount) {
              // Unlike track
              saveLog(
                `Track "${playbackState.trackName}" by ${playbackState.artistName} has been skipped ${skippedTrack.skipCount} times, removing from library`,
                "INFO",
              );

              try {
                await unlikeTrack(
                  clientId,
                  clientSecret,
                  playbackState.trackId,
                );
              } catch (error: unknown) {
                const authError = error as Error;
                const errorMessage = authError.message || String(authError);

                // If we get an authentication error, attempt to refresh the token
                if (
                  errorMessage.includes("401") ||
                  errorMessage.includes("unauthorized") ||
                  errorMessage.includes("expired")
                ) {
                  saveLog(
                    "Auth token expired during unlike, attempting refresh...",
                    "DEBUG",
                  );

                  try {
                    // Try to refresh the token silently
                    await refreshAccessToken(clientId, clientSecret);
                    saveLog(
                      "Successfully refreshed token during unlike",
                      "DEBUG",
                    );

                    // Retry with the new token
                    await unlikeTrack(
                      clientId,
                      clientSecret,
                      playbackState.trackId,
                    );
                  } catch (error: unknown) {
                    const refreshError = error as Error;
                    saveLog(
                      `Failed to refresh token during unlike: ${refreshError.message || String(refreshError)}`,
                      "ERROR",
                    );
                  }
                } else {
                  saveLog(`Error unliking track: ${errorMessage}`, "ERROR");
                }
              }
            }
          } catch (error: unknown) {
            saveLog(`Error updating skip count: ${error}`, "ERROR");
          }
        }
      } else if (
        progressPercentage < skipProgressThreshold &&
        totalPauseDuration >= PAUSE_THRESHOLD_MS
      ) {
        // The track was paused for a significant time, so we don't count it as a skip
        saveLog(
          `Track change after pause: ${playbackState.trackName} by ${playbackState.artistName} (paused for ${Math.round(totalPauseDuration / 1000)}s)`,
          "INFO",
        );
      } else if (progressPercentage >= skipProgressThreshold) {
        // Track was played enough to not be considered a skip
        saveLog(
          `Track played: ${playbackState.trackName} by ${playbackState.artistName} (${Math.round(progressPercentage * 100)}% played)`,
          "INFO",
        );

        // If track is in library, record it as played
        if (playbackState.isInLibrary) {
          try {
            // Update not skipped count in storage
            const store = await import("../helpers/storage/store");
            await store.updateNotSkippedTrack({
              id: playbackState.trackId,
              name: playbackState.trackName || "",
              artist: playbackState.artistName || "",
              skipCount: 0,
              notSkippedCount: 1,
              lastSkipped: "", // This wasn't skipped
            } as SkippedTrackInfo);
          } catch (error: unknown) {
            saveLog(`Error updating not skipped count: ${error}`, "ERROR");
          }
        }
      }
    }

    // Reset pause timing for new track
    playbackState.pauseStartTime = undefined;
    playbackState.totalPauseDuration = 0;

    // Update recent tracks list (maintain last 5)
    if (playbackState.trackId) {
      playbackState.recentTracks = [
        playbackState.trackId,
        ...playbackState.recentTracks.slice(0, 4),
      ];
    }
  } catch (error: unknown) {
    saveLog(`Track change error: ${error}`, "ERROR");
  }
}

/**
 * Updates the list of recently played tracks from Spotify.
 * This helps avoid false skip detection when users revisit recent tracks.
 */
async function updateRecentTracks(): Promise<void> {
  try {
    let recentlyPlayed: RecentlyPlayedResponse | null = null;

    try {
      recentlyPlayed = (await getRecentlyPlayedTracks(
        clientId,
        clientSecret,
      )) as RecentlyPlayedResponse;
    } catch (error: unknown) {
      const authError = error as Error;
      const errorMessage = authError.message || String(authError);

      // If we get an authentication error, attempt to refresh the token
      if (
        errorMessage.includes("401") ||
        errorMessage.includes("unauthorized") ||
        errorMessage.includes("expired")
      ) {
        saveLog(
          "Auth token expired during recent tracks check, attempting refresh...",
          "DEBUG",
        );

        try {
          // Try to refresh the token silently
          await refreshAccessToken(clientId, clientSecret);
          saveLog(
            "Successfully refreshed token during recent tracks check",
            "DEBUG",
          );

          // Retry with the new token
          recentlyPlayed = (await getRecentlyPlayedTracks(
            clientId,
            clientSecret,
          )) as RecentlyPlayedResponse;
        } catch (error: unknown) {
          const refreshError = error as Error;
          saveLog(
            `Failed to refresh token during recent tracks check: ${refreshError.message || String(refreshError)}`,
            "ERROR",
          );
          // Continue with recentlyPlayed = null
        }
      } else {
        saveLog(`Recent tracks check error: ${errorMessage}`, "ERROR");
      }
    }

    if (recentlyPlayed && recentlyPlayed.items) {
      playbackState.recentTracks = recentlyPlayed.items.map(
        (item) => item.track.id,
      );
    }
  } catch (error) {
    saveLog(`Error updating recent tracks: ${error}`, "DEBUG");
  }
}

/**
 * Reset playback state to defaults
 * Called when playback stops or errors occur
 */
function resetPlaybackState(): void {
  playbackState = {
    trackId: null,
    trackName: null,
    artistName: null,
    albumName: null,
    albumArt: "",
    progress: 0,
    duration: 0,
    isInLibrary: false,
    lastProgress: 0,
    recentTracks: playbackState.recentTracks || [],
    libraryStatusLogged: false,
    isPlaying: false,
    pauseStartTime: undefined,
    totalPauseDuration: 0,
  };
}

/**
 * Gets the list of skipped tracks from storage.
 *
 * @returns Promise<SkippedTrackInfo[]> - List of skipped tracks with counts and metadata
 */
async function getSkippedTracks(): Promise<SkippedTrackInfo[]> {
  try {
    // Import directly from the store module to avoid path issues
    const store = await import("../helpers/storage/store");
    return store.getSkippedTracks();
  } catch (error) {
    saveLog(`Error getting skipped tracks: ${error}`, "ERROR");
    return [];
  }
}
