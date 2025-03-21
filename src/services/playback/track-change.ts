/**
 * Track change detection and handling
 *
 * Handles the logic for detecting and processing track changes,
 * including skip detection and track completion metrics.
 */

import * as spotifyApi from "../spotify";
import * as store from "../../helpers/storage/store";
import {
  getPlaybackState,
  getTrackLastLogged,
  setTrackLastLogged,
} from "./state";
import { recordSkippedTrack } from "./history";

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

    // Get recently played tracks to check if this is a navigation to previous tracks
    const recentlyPlayed = await spotifyApi.getRecentlyPlayedTracks(20);
    const isInRecentlyPlayed = recentlyPlayed?.items?.some(
      (item) => item.track.id === previousTrackId,
    );

    // If track changed before the skip threshold and is not in recently played, consider it skipped
    if (progressPercent < skipProgressThreshold && !isInRecentlyPlayed) {
      store.saveLog(
        `Track "${state.currentTrackName}" was skipped at ${(progressPercent * 100).toFixed(1)}% (threshold: ${skipProgressThreshold * 100}%)`,
        "INFO",
      );

      // Record this as a skipped track
      await recordSkippedTrack(
        previousTrackId,
        state.currentTrackName || "",
        state.currentArtistName || "",
        Date.now(),
        progressPercent * 100,
      );

      // Record enhanced statistics for skipped track
      try {
        // Get track artist ID (we'll retrieve only the first one for simplicity)
        const trackInfo = await spotifyApi.getTrack(previousTrackId);
        const artistId = trackInfo?.artists?.[0]?.id || "unknown";

        // Update stats with skipped track information
        await store.updateTrackStatistics(
          previousTrackId,
          state.currentTrackName || "",
          artistId,
          state.currentArtistName || "",
          duration,
          true, // was skipped
          lastProgress,
          state.currentDeviceName,
          state.currentDeviceType,
          Date.now(),
        );

        store.saveLog(
          `Enhanced statistics recorded for skipped track "${state.currentTrackName}"`,
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
        trackData.skipCount >= settings.skipThreshold
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
    } else if (isInRecentlyPlayed) {
      // Track was navigated to from recently played (likely using previous button)
      store.saveLog(
        `Track "${state.currentTrackName}" was navigated to from recently played (not counted as skip)`,
        "DEBUG",
      );
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

        // Update statistics with completed track information
        await store.updateTrackStatistics(
          previousTrackId,
          state.currentTrackName || "",
          artistId,
          state.currentArtistName || "",
          duration,
          false, // not skipped
          duration, // Played full duration
          state.currentDeviceName,
          state.currentDeviceType,
          Date.now(),
        );

        store.saveLog(
          `Enhanced statistics recorded for completed track "${state.currentTrackName}"`,
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

  // Only log "Now Playing" once every 5 minutes for the same track
  // to avoid log spam during continuous playback
  if (now - lastLogged > 5 * 60 * 1000) {
    store.saveLog(`Now playing: "${trackName}" by ${artistName}`, "INFO");
    setTrackLastLogged(trackId, now);
  }
}
