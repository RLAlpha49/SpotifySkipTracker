/**
 * Track change detection and handling
 *
 * Handles the logic for detecting and processing track changes,
 * including skip detection and track completion metrics.
 */

import * as store from "../../helpers/storage/store";
import * as spotifyApi from "../spotify";
import { recordSkippedTrack } from "./history";
import {
  analyzePositionBasedSkip,
  detectManualVsAutoSkip,
  handleTrackChangeEdgeCases,
  recordSkipForPatternAnalysis,
} from "./skip-detection";
import {
  getPlaybackState,
  getTrackLastLogged,
  setTrackLastLogged,
  updatePlaybackState,
} from "./state";

const recentlyPlayedHistory: Array<{ id: string; timestamp: number }> = [];
const MAX_HISTORY_SIZE = 50;

// Store the most recently navigated-to track to distinguish between
// backward navigation and skipping after backward navigation
let lastNavigatedToTrackId: string | null = null;
let lastNavigationTimestamp: number = 0;
const NAVIGATION_EXPIRY_TIME = 60000; // 60 seconds

/**
 * Adds a track to the local history
 *
 * @param trackId Track ID to add to history
 */
function addToLocalHistory(trackId: string): void {
  if (!trackId) return;

  // Add to start of array with current timestamp
  recentlyPlayedHistory.unshift({
    id: trackId,
    timestamp: Date.now(),
  });

  // Trim if needed
  if (recentlyPlayedHistory.length > MAX_HISTORY_SIZE) {
    recentlyPlayedHistory.pop();
  }

  // Add this info to the playback state
  updatePlaybackState({
    lastTrackChangeTimestamp: Date.now(),
  });
}

/**
 * Check if navigating to a previous track based on local history
 *
 * @param newTrackId ID of the track being navigated to
 * @param previousTrackId ID of the track being navigated from
 * @param progressPercent How far through the previous track we were
 * @returns Whether this appears to be a backward navigation
 */
function isBackwardNavigationInLocalHistory(
  newTrackId: string,
  previousTrackId: string,
  progressPercent: number,
): boolean {
  if (!newTrackId || recentlyPlayedHistory.length <= 1) return false;

  const now = Date.now();

  // If we're coming from a track we recently navigated to,
  // this is probably a skip, not backward navigation
  if (
    lastNavigatedToTrackId === previousTrackId &&
    now - lastNavigationTimestamp < NAVIGATION_EXPIRY_TIME &&
    progressPercent < 0.3 // Less than 30% through the track
  ) {
    store.saveLog(
      `User likely skipping a previously navigated-to track (${previousTrackId})`,
      "DEBUG",
    );
    return false;
  }

  // Skip the first entry (current track) and look for the new track ID
  let positionInHistory = -1;
  for (let i = 1; i < recentlyPlayedHistory.length; i++) {
    if (recentlyPlayedHistory[i].id === newTrackId) {
      positionInHistory = i;
      break;
    }
  }

  if (positionInHistory === -1) return false;

  // Only consider it backward navigation if:
  // 1. The track is in our recent history (position found)
  // 2. It's relatively recent (one of the last 10 tracks)
  // 3. OR it was played very recently (last 2 minutes)
  const isRecentPosition = positionInHistory < 10;
  const trackTimestamp = recentlyPlayedHistory[positionInHistory].timestamp;
  const isRecentTime = now - trackTimestamp < 120000; // 2 minutes

  if (isRecentPosition || isRecentTime) {
    store.saveLog(
      `Local history indicates backward navigation to previously played track at position ${positionInHistory}`,
      "DEBUG",
    );

    // Remember this as a backward navigation for future reference
    lastNavigatedToTrackId = newTrackId;
    lastNavigationTimestamp = now;

    return true;
  }

  // If the track is in history but not recent, don't consider it backward navigation
  // This handles the case of skipping to a track that was played long ago
  return false;
}

/**
 * Handles a track change event
 *
 * @param newTrackId Spotify ID of the new track
 */
export async function handleTrackChange(newTrackId: string): Promise<void> {
  try {
    // Log the new track ID for context
    store.saveLog(`Processing track change to ID: ${newTrackId}`, "DEBUG");

    const state = getPlaybackState();
    const previousTrackId = state.currentTrackId;
    const lastProgress = state.lastProgress || 0;
    const duration = state.currentTrackDuration || 0;

    // Skip handling if there was no previous track
    if (!previousTrackId) {
      store.saveLog("No previous track to evaluate for skip", "DEBUG");
      addToLocalHistory(newTrackId); // Still add to history
      return;
    }

    // Get settings for skip threshold
    const settings = store.getSettings();
    const skipProgressThreshold = settings.skipProgress / 100 || 0.7; // Convert from percentage to decimal

    // Calculate progress as a percentage for evaluation
    const progressPercent = duration > 0 ? lastProgress / duration : 0;

    // Track change detected, evaluate if it was a skip or completion
    store.saveLog(
      `Track changed from "${state.currentTrackName}" (${previousTrackId}) to a new track (${newTrackId}) at ${(progressPercent * 100).toFixed(1)}% progress`,
      "DEBUG",
    );

    // Check if this is a repeated track (same track playing again)
    const isRepeatedTrack = previousTrackId === newTrackId;
    if (isRepeatedTrack) {
      store.saveLog(
        `Track "${state.currentTrackName}" is repeating - not a skip`,
        "DEBUG",
      );
      return;
    }

    // Handle track change edge cases first
    const edgeCaseResult = handleTrackChangeEdgeCases(
      state,
      getPlaybackState(), // Current state
    );

    if (edgeCaseResult.isEdgeCase) {
      store.saveLog(`Detected edge case: ${edgeCaseResult.edgeCase}`, "DEBUG");

      if (edgeCaseResult.shouldIgnore) {
        store.saveLog(
          `Ignoring track change due to edge case: ${edgeCaseResult.edgeCase}`,
          "DEBUG",
        );
        addToLocalHistory(newTrackId); // Still add to history
        return;
      }
    }

    // Step 1: Check our local history with improved logic that considers timing and sequence
    const isBackwardNavigation = isBackwardNavigationInLocalHistory(
      newTrackId,
      previousTrackId,
      progressPercent,
    );

    // Step 2: Get recently played tracks from Spotify API as backup
    const recentlyPlayed = await spotifyApi.getRecentlyPlayedTracks();

    // Step 3: Check if new track appears before previous track in Spotify history
    // (this is our original approach, kept as a fallback)
    let isPreviousTrackNavigationAPI = false;

    if (recentlyPlayed?.items) {
      const newTrackIndex = recentlyPlayed.items.findIndex(
        (item) => item.track.id === newTrackId,
      );

      const previousTrackIndex = recentlyPlayed.items.findIndex(
        (item) => item.track.id === previousTrackId,
      );

      // If both tracks are in recently played AND the new track appears before the previous track
      // in the history, this is likely a "previous track" navigation
      if (
        newTrackIndex !== -1 &&
        previousTrackIndex !== -1 &&
        newTrackIndex < previousTrackIndex &&
        previousTrackIndex - newTrackIndex < 3 // They're close together in history
      ) {
        isPreviousTrackNavigationAPI = true;
        store.saveLog(
          `API history indicates backward navigation: "${newTrackId}" (position ${newTrackIndex}) from "${previousTrackId}" (position ${previousTrackIndex})`,
          "DEBUG",
        );
      }
    }

    // Also check if the previous track itself is in recently played
    const isPreviousTrackInRecentlyPlayed = recentlyPlayed?.items?.some(
      (item) => item.track.id === previousTrackId,
    );

    // Add the current track to our history AFTER all the checks
    addToLocalHistory(newTrackId);

    // Special handling for skipping forward from a track we previously navigated back to
    if (
      lastNavigatedToTrackId === previousTrackId &&
      Date.now() - lastNavigationTimestamp < NAVIGATION_EXPIRY_TIME &&
      progressPercent < 0.3 // Less than 30% through the track
    ) {
      // We previously navigated back to this track, and now we're skipping forward from it
      // This should be counted as a skip, not a navigation
      store.saveLog(
        `User skipping forward from a previously navigated-to track (${previousTrackId}) - counting as skip`,
        "DEBUG",
      );

      // Continue to skip handling below - don't return or mark as navigation
    }
    // Only if NOT skipping from a previously navigated track, check backward navigation
    else {
      // Combine all our detection signals with more flexible logic
      const isNavigatingBackward =
        isBackwardNavigation || isPreviousTrackNavigationAPI;

      // Log the decision factors more clearly
      store.saveLog(
        `Navigation detection: local=${isBackwardNavigation}, API=${isPreviousTrackNavigationAPI}, inRecentlyPlayed=${isPreviousTrackInRecentlyPlayed}`,
        "DEBUG",
      );

      // If we detected backward navigation, don't count it as a skip
      if (isNavigatingBackward) {
        store.saveLog(
          `Track change for "${state.currentTrackName}" detected as backward navigation - not counted as skip`,
          "DEBUG",
        );
        return;
      }
    }

    // Now use our enhanced position-based skip detection
    const skipAnalysis = analyzePositionBasedSkip(state, skipProgressThreshold);

    // Record this skip for pattern analysis regardless of library status
    if (skipAnalysis.isSkip) {
      recordSkipForPatternAnalysis(previousTrackId, progressPercent);
    }

    // Determine if it was a manual action or automatic
    let skipTypeInfo = {} as {
      isManual: boolean;
      confidence: number;
      reason: string;
    };

    if (skipAnalysis.isSkip) {
      skipTypeInfo = detectManualVsAutoSkip(
        getPlaybackState(), // Current state
        state, // Previous state
      );

      store.saveLog(
        `Skip type detection: ${skipTypeInfo.isManual ? "manual" : "automatic"} (${skipTypeInfo.confidence.toFixed(2)} confidence) - ${skipTypeInfo.reason}`,
        "DEBUG",
      );
    }

    // If track changed before the skip threshold, consider it skipped
    if (skipAnalysis.isSkip) {
      // Check if the track is in the user's library (only count skips for library tracks)
      if (!state.isInLibrary) {
        store.saveLog(
          `Track "${state.currentTrackName}" was skipped but not in library - skip not counted`,
          "DEBUG",
        );
        return;
      }

      store.saveLog(
        `Track "${state.currentTrackName}" was skipped at ${(progressPercent * 100).toFixed(1)}% (threshold: ${skipProgressThreshold * 100}%): ${skipAnalysis.reason}`,
        "INFO",
      );

      // Record this as a skipped track
      await recordSkippedTrack({
        id: previousTrackId,
        name: state.currentTrackName || "",
        artist: state.currentArtistName || "",
        album: state.currentAlbumName || "",
        skippedAt: Date.now(),
        playDuration: lastProgress,
        trackDuration: duration,
        playPercentage: Math.round(progressPercent * 100),
        deviceId: state.deviceId || undefined,
        deviceName: state.deviceName || undefined,
        skipType: skipAnalysis.skipType,
        isManualSkip: skipTypeInfo.isManual,
        confidence: skipTypeInfo.confidence,
        reason: skipAnalysis.reason,
      });

      // Record enhanced statistics for skipped track
      try {
        // Get track artist ID (we'll retrieve only the first one for simplicity)
        const trackInfo = await spotifyApi.getTrack(previousTrackId);
        const artistId = trackInfo?.artists?.[0]?.id || "unknown";
        const artistName =
          trackInfo?.artists?.[0]?.name ||
          state.currentArtistName ||
          "Unknown Artist";
        const trackName =
          trackInfo?.name || state.currentTrackName || "Unknown Track";
        const trackDuration = trackInfo?.duration_ms || duration || 0;

        // Update stats with skipped track information
        await store.updateTrackStatistics(
          previousTrackId,
          trackName,
          artistId,
          artistName,
          trackDuration,
          true, // was skipped
          lastProgress,
          state.currentDeviceName || null,
          state.currentDeviceType || null,
          Date.now(),
          skipAnalysis.skipType, // Add skip type to statistics
          skipTypeInfo.isManual, // Add whether it was manual or automatic
        );

        store.saveLog(
          `Enhanced statistics recorded for skipped track "${trackName}" (${skipAnalysis.skipType})`,
          "DEBUG",
        );
      } catch (error) {
        store.saveLog(
          `Failed to record enhanced skip statistics: ${error}`,
          "ERROR",
        );
      }

      // If auto-unlike is enabled and we've reached the skip threshold, unlike the track
      const skippedTracks = await store.getSkippedTracks();
      const trackData = skippedTracks.find(
        (track) => track.id === previousTrackId,
      );

      if (
        trackData &&
        settings.autoUnlike &&
        (trackData.skipCount || 0) >= settings.skipThreshold
      ) {
        try {
          const result = await spotifyApi.unlikeTrack(previousTrackId, true);
          if (result) {
            store.saveLog(
              `Auto-removed track "${state.currentTrackName}" from library (skipped ${trackData.skipCount} times)`,
              "INFO",
            );
          }
        } catch (error) {
          store.saveLog(`Failed to unlike track: ${error}`, "ERROR");
        }
      }
    } else {
      // Track was played through to completion (or close enough)
      store.saveLog(
        `Track "${state.currentTrackName}" completed (${(progressPercent * 100).toFixed(1)}%)`,
        "DEBUG",
      );

      // Record enhanced statistics for completed track
      try {
        // Get track artist ID
        const trackInfo = await spotifyApi.getTrack(previousTrackId);
        const artistId = trackInfo?.artists?.[0]?.id || "unknown";
        const artistName =
          trackInfo?.artists?.[0]?.name ||
          state.currentArtistName ||
          "Unknown Artist";
        const trackName =
          trackInfo?.name || state.currentTrackName || "Unknown Track";
        const trackDuration = trackInfo?.duration_ms || duration || 0;

        // Calculate actual played duration - for completed tracks, use the full duration or last progress
        // whichever is greater (in case the progress reporting caught it a bit before the end)
        const actualPlayedDuration = Math.max(
          lastProgress,
          trackDuration * 0.98,
        );

        // Update statistics with completed track information
        await store.updateTrackStatistics(
          previousTrackId,
          trackName,
          artistId,
          artistName,
          trackDuration,
          false, // not skipped
          actualPlayedDuration, // Use calculated actual played duration
          state.currentDeviceName || null,
          state.currentDeviceType || null,
          Date.now(),
        );

        store.saveLog(
          `Enhanced statistics recorded for completed track "${trackName}"`,
          "DEBUG",
        );
      } catch (error) {
        store.saveLog(
          `Failed to record enhanced completion statistics: ${error}`,
          "ERROR",
        );
      }

      // Update not-skipped count (previously tracked)
      try {
        await store.updateNotSkippedTrack({
          id: previousTrackId,
          name: state.currentTrackName || "",
          artist: state.currentArtistName || "",
          skipCount: 0,
          notSkippedCount: 1,
          lastSkipped: "",
        });

        store.saveLog(
          `Recorded completed play for "${state.currentTrackName}"`,
          "DEBUG",
        );
      } catch (error) {
        store.saveLog(`Failed to update not-skipped count: ${error}`, "ERROR");
      }
    }
  } catch (error) {
    store.saveLog(`Error handling track change: ${error}`, "ERROR");
  }
}

/**
 * Logs the currently playing track at appropriate intervals
 *
 * @param trackId Spotify track ID
 * @param trackName Track name
 * @param artistName Artist name
 */
export function logNowPlaying(
  trackId: string,
  trackName: string,
  artistName: string,
): void {
  const now = Date.now();
  const lastLogged = getTrackLastLogged(trackId);
  const state = getPlaybackState();

  // Always log if this is an explicit track change (different track than before)
  const isTrackChange =
    state.lastTrackChangeTimestamp &&
    now - state.lastTrackChangeTimestamp < 3000; // Within 3 seconds of a track change

  // Log the track if:
  // 1. It's a new track change event, OR
  // 2. It hasn't been logged in the last 5 minutes (for continuous playback)
  if (isTrackChange || now - lastLogged > 5 * 60 * 1000) {
    store.saveLog(`Now playing: "${trackName}" by ${artistName}`, "INFO");
    setTrackLastLogged(trackId, now);
  }
}
