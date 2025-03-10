/**
 * Spotify playback monitoring module
 *
 * Monitors Spotify playback in real-time to track listening patterns and detect skipped tracks.
 * Implements configurable thresholds for determining skip events and maintaining listening statistics.
 *
 * Core functionality:
 * - Real-time playback state monitoring via Spotify Web API
 * - Skip detection based on configurable progress thresholds
 * - Track completion statistics collection
 * - Library management integration for frequently skipped tracks
 * - Persistent storage of listening patterns
 */

import { BrowserWindow } from "electron";
import * as spotifyApi from "./spotify-api";
import * as store from "../helpers/storage/store";
import { SkippedTrack } from "@/types/spotify";

/**
 * State information about current playback including track metadata and progress
 */
interface PlaybackState {
  trackId: string;
  trackName: string;
  artistName: string;
  albumName: string;
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
  trackId: "",
  trackName: "",
  artistName: "",
  albumName: "",
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

// Monitoring state tracking
let monitoringInterval: NodeJS.Timeout | null = null;
let clientId: string;
let clientSecret: string;
// Keep track of which tracks have been logged
const trackLastLogged: Record<string, number> = {};

// Spotify API response interfaces
/**
 * Spotify artist entity
 */
interface SpotifyArtist {
  name: string;
  id: string;
}

/**
 * Spotify image resource
 */
interface SpotifyImage {
  url: string;
  height: number;
  width: number;
}

/**
 * Spotify album entity
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

// Add a variable for the progress update interval
let progressUpdateInterval: NodeJS.Timeout | null = null;

/**
 * Starts the Spotify playback monitoring process.
 * Initializes polling intervals for playback state tracking and skip detection.
 *
 * @param mainWindow - Electron BrowserWindow for sending UI updates
 * @param spotifyClientId - Spotify API client ID
 * @param spotifyClientSecret - Spotify API client secret
 * @returns Success status of the monitoring initialization
 */
export function startPlaybackMonitoring(
  mainWindow: BrowserWindow,
  spotifyClientId: string,
  spotifyClientSecret: string,
): boolean {
  try {
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

    clientId = spotifyClientId;
    clientSecret = spotifyClientSecret;

    // Get settings for skip threshold
    const settings = store.getSettings();
    const skipProgressThreshold = settings.skipProgress / 100 || 0.7; // Convert from percentage to decimal

    store.saveLog(
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
    store.saveLog(`Failed to start playback monitoring: ${error}`, "ERROR");
    return false;
  }
}

/**
 * Stops the playback monitoring process.
 * Clears monitoring intervals and performs cleanup.
 *
 * @returns Success status of the monitoring termination
 */
export function stopPlaybackMonitoring(): boolean {
  try {
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
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

    return true;
  } catch (error) {
    store.saveLog(`Failed to stop playback monitoring: ${error}`, "ERROR");
    return false;
  }
}

/**
 * Checks if playback monitoring is currently active.
 *
 * @returns Status of monitoring service
 */
export function isMonitoringActive(): boolean {
  return monitoringInterval !== null;
}

/**
 * Starts interval for smooth progress updates between API polls.
 * Provides more frequent UI updates than API polling alone.
 *
 * @param mainWindow - Electron BrowserWindow for sending UI updates
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
 * Core playback monitoring function.
 * Polls Spotify API for current playback state, processes track changes,
 * and implements skip detection logic.
 *
 * @param mainWindow - Electron BrowserWindow for sending UI updates
 */
async function monitorPlayback(mainWindow: BrowserWindow): Promise<void> {
  try {
    // Get current playback from Spotify
    let playback;
    try {
      playback = await spotifyApi.getCurrentPlayback(clientId, clientSecret);
      // If we reach here, the API call was successful after potential retries
    } catch (error: unknown) {
      // After all retries, if we still have an error, stop monitoring
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      store.saveLog(`Error in playback monitoring: ${errorMessage}`, "ERROR");
      store.saveLog(
        "Stopping playback monitoring due to persistent API errors",
        "ERROR",
      );

      // Stop the monitoring intervals
      stopPlaybackMonitoring();

      // Notify the UI that monitoring has stopped
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
        monitoringStopped: true, // Add flag to indicate monitoring was stopped due to errors
      });

      return;
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
      store.saveLog(`Track "${trackName}" was paused`, "DEBUG");
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

      store.saveLog(
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
      isInLibrary = await spotifyApi.isTrackInLibrary(
        clientId,
        clientSecret,
        trackId,
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
        store.saveLog(
          "Auth token expired during library check, attempting refresh...",
          "DEBUG",
        );

        try {
          // Try to refresh the token silently
          await spotifyApi.refreshAccessToken(clientId, clientSecret);
          store.saveLog(
            "Successfully refreshed token during library check",
            "DEBUG",
          );

          // Retry with the new token
          isInLibrary = await spotifyApi.isTrackInLibrary(
            clientId,
            clientSecret,
            trackId,
          );
        } catch (error: unknown) {
          const refreshError = error as Error;
          store.saveLog(
            `Failed to refresh token during library check: ${refreshError.message || String(refreshError)}`,
            "ERROR",
          );
          // Continue with isInLibrary = false
        }
      } else {
        store.saveLog(`Library check error: ${errorMessage}`, "ERROR");
      }
    }

    // Check for track changes - detect when a track has changed
    const trackChanged = playbackState.trackId !== trackId && trackId !== "";

    // Only log each unique track once per session
    const hasBeenLoggedBefore = trackId in trackLastLogged;

    // If track changed, check for skip and log "Now playing"
    if (trackChanged) {
      if (playbackState.trackId && playbackState.trackId !== "") {
        await handleTrackChange(trackId);
      }

      // Only log if we haven't seen this track before in this session
      if (!hasBeenLoggedBefore) {
        // Log the new track - ONLY when the track is new in this session
        store.saveLog(`Now playing: ${trackName} by ${artistName}`, "INFO");
        // Record that we've logged this track
        trackLastLogged[trackId] = now;
      }

      // Reset the libraryStatusLogged flag on track change
      playbackState.libraryStatusLogged = false;
    }

    // Log library status only when:
    // 1. This is a new track (different from last one)
    // 2. The track is in the library
    // 3. We haven't logged it yet
    if (
      isInLibrary &&
      !playbackState.libraryStatusLogged &&
      (trackChanged || playbackState.isInLibrary !== isInLibrary)
    ) {
      store.saveLog(
        `Track "${trackName}" by ${artistName} is in your library - skips will be tracked`,
        "DEBUG",
      );
      playbackState.libraryStatusLogged = true;
    }

    // Update state with latest API values
    playbackState.trackId = trackId;
    playbackState.trackName = trackName;
    playbackState.artistName = artistName;
    playbackState.albumName = albumName;
    playbackState.progress = progress;
    playbackState.duration = duration;
    playbackState.lastProgress = progress;
    playbackState.isInLibrary = isInLibrary;
    playbackState.lastNowPlayingLog = trackChanged
      ? now
      : playbackState.lastNowPlayingLog;

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
    store.saveLog(`Error in playback monitoring: ${error}`, "ERROR");
  }
}

/**
 * Processes track change events and implements skip detection.
 * Core algorithm for determining if a track was skipped based on:
 * - Playback progress percentage
 * - Pause duration
 * - Previously established patterns
 *
 * @param newTrackId - Spotify ID of the new track being played
 */
async function handleTrackChange(newTrackId: string): Promise<void> {
  try {
    // Skip detection logic
    const settings = store.getSettings();
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
          store.saveLog(
            `Track skipped: ${playbackState.trackName} by ${playbackState.artistName} (${Math.round(progressPercentage * 100)}% played)`,
            "INFO",
          );

          try {
            // Get current timestamp for this skip
            const currentSkipTime = new Date().toISOString();

            // Update skip count in storage
            await store.updateSkippedTrack({
              id: playbackState.trackId,
              name: playbackState.trackName,
              artist: playbackState.artistName,
              lastSkipped: currentSkipTime,
              skipTimestamps: [currentSkipTime],
            } as SkippedTrack);

            // Check if track should be unliked
            const skipThresholdCount = settings.skipThreshold || 3; // This is correctly using skipThreshold
            const skippedTracks = await getSkippedTracks();
            const skippedTrack = skippedTracks.find(
              (track) => track.id === playbackState.trackId,
            );

            if (skippedTrack && skippedTrack.skipCount >= skipThresholdCount) {
              // Unlike track
              store.saveLog(
                `Track "${playbackState.trackName}" by ${playbackState.artistName} has been skipped ${skippedTrack.skipCount} times, removing from library`,
                "INFO",
              );

              try {
                await spotifyApi.unlikeTrack(
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
                  store.saveLog(
                    "Auth token expired during unlike, attempting refresh...",
                    "DEBUG",
                  );

                  try {
                    // Try to refresh the token silently
                    await spotifyApi.refreshAccessToken(clientId, clientSecret);
                    store.saveLog(
                      "Successfully refreshed token during unlike",
                      "DEBUG",
                    );

                    // Retry with the new token
                    await spotifyApi.unlikeTrack(
                      clientId,
                      clientSecret,
                      playbackState.trackId,
                    );
                  } catch (error: unknown) {
                    const refreshError = error as Error;
                    store.saveLog(
                      `Failed to refresh token during unlike: ${refreshError.message || String(refreshError)}`,
                      "ERROR",
                    );
                  }
                } else {
                  store.saveLog(
                    `Error unliking track: ${errorMessage}`,
                    "ERROR",
                  );
                }
              }
            }
          } catch (error: unknown) {
            store.saveLog(`Error updating skip count: ${error}`, "ERROR");
          }
        }
      } else if (
        progressPercentage < skipProgressThreshold &&
        totalPauseDuration >= PAUSE_THRESHOLD_MS
      ) {
        // The track was paused for a significant time, so we don't count it as a skip
        store.saveLog(
          `Track change after pause: ${playbackState.trackName} by ${playbackState.artistName} (paused for ${Math.round(totalPauseDuration / 1000)}s)`,
          "INFO",
        );
      } else if (progressPercentage >= skipProgressThreshold) {
        // Track was played enough to not be considered a skip
        store.saveLog(
          `Track Completed: ${playbackState.trackName} by ${playbackState.artistName} (${Math.round(progressPercentage * 100)}% played)`,
          "INFO",
        );

        // If track is in library, record it as played
        if (playbackState.isInLibrary) {
          try {
            // Update not skipped count in storage
            await store.updateNotSkippedTrack({
              id: playbackState.trackId,
              name: playbackState.trackName || "",
              artist: playbackState.artistName || "",
              skipCount: 0,
              notSkippedCount: 1,
              lastSkipped: "", // This wasn't skipped
            } as SkippedTrack);
          } catch (error: unknown) {
            store.saveLog(
              `Error updating not skipped count: ${error}`,
              "ERROR",
            );
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
    store.saveLog(`Track change error: ${error}`, "ERROR");
  }
}

/**
 * Fetches recently played tracks from Spotify API.
 * Prevents false skip detection when users revisit recently played tracks.
 */
async function updateRecentTracks(): Promise<void> {
  try {
    let recentlyPlayed: RecentlyPlayedResponse | null = null;

    try {
      // Use the API function with built-in retry mechanism
      recentlyPlayed = (await spotifyApi.getRecentlyPlayedTracks(
        clientId,
        clientSecret,
      )) as RecentlyPlayedResponse;
    } catch (error: unknown) {
      // All retries failed, log the error but continue with null recent tracks
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      store.saveLog(
        `Unable to get recently played tracks: ${errorMessage}`,
        "ERROR",
      );
      // Continue with recentlyPlayed = null
    }

    if (recentlyPlayed && recentlyPlayed.items) {
      playbackState.recentTracks = recentlyPlayed.items.map(
        (item) => item.track.id,
      );
    }
  } catch (error) {
    store.saveLog(`Error updating recent tracks: ${error}`, "DEBUG");
  }
}

/**
 * Resets playback state to default values.
 * Called when playback stops or after significant errors.
 */
function resetPlaybackState(): void {
  playbackState = {
    trackId: "",
    trackName: "",
    artistName: "",
    albumName: "",
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
 * Retrieves skipped track information from persistent storage.
 *
 * @returns List of skipped tracks with metadata and counts
 */
async function getSkippedTracks(): Promise<SkippedTrack[]> {
  try {
    return store.getSkippedTracks();
  } catch (error) {
    store.saveLog(`Error getting skipped tracks: ${error}`, "ERROR");
    return [];
  }
}
