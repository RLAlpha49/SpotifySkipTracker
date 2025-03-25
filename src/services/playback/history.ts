/**
 * Track history and recently played tracks management
 *
 * Handles fetching, storing, and processing of track history from Spotify.
 */

import * as spotifyApi from "../spotify";
import * as store from "../../helpers/storage/store";
import { setRecentTracks } from "./state";
import { SkippedTrack } from "@/types/spotify";

/**
 * Updates the list of recently played tracks from Spotify
 *
 * Fetches the user's recently played tracks and updates the state
 * to reflect the current listening history.
 */
export async function updateRecentTracks(): Promise<void> {
  try {
    // Get recently played tracks from Spotify API
    const recentlyPlayed = await spotifyApi.getRecentlyPlayedTracks();

    if (
      recentlyPlayed &&
      recentlyPlayed.items &&
      recentlyPlayed.items.length > 0
    ) {
      // Extract track IDs from the response
      const trackIds = recentlyPlayed.items.map((item) => item.track.id);

      // Update the state with the new list of recently played tracks
      setRecentTracks(trackIds);

      store.saveLog(
        `Updated recent tracks list (${trackIds.length} tracks)`,
        "DEBUG",
      );
    } else {
      store.saveLog(
        "No recent tracks found or API response was empty",
        "DEBUG",
      );
    }
  } catch (error) {
    store.saveLog(`Failed to update recent tracks: ${error}`, "ERROR");
  }
}

/**
 * Retrieves skipped tracks data from storage
 *
 * @returns Promise resolving to an array of skipped track records
 */
export async function getSkippedTracks(): Promise<SkippedTrack[]> {
  try {
    return await store.getSkippedTracks();
  } catch (error) {
    store.saveLog(`Failed to get skipped tracks: ${error}`, "ERROR");
    return [];
  }
}

/**
 * Extended SkippedTrack interface that includes skip events
 */
interface SkippedTrackWithEvents extends SkippedTrack {
  skipEvents?: Array<{
    timestamp: string;
    progress: number;
  }>;
}

/**
 * Processes a skip event for a track
 *
 * @param trackId Spotify track ID
 * @param trackName Track name
 * @param artistName Artist name
 * @param skippedAt Timestamp when the track was skipped
 * @param progress Progress percentage at which the track was skipped
 */
export async function recordSkippedTrack(
  trackId: string,
  trackName: string,
  artistName: string,
  skippedAt: number = Date.now(),
  progress: number,
): Promise<void> {
  try {
    // Get existing skipped tracks data
    const skippedTracks = await getSkippedTracks();

    // Check if track exists in the skipped tracks list
    const existingTrackIndex = skippedTracks.findIndex(
      (track) => track.id === trackId,
    );

    const skippedAtStr = skippedAt.toString();

    const skipEvent = {
      timestamp: skippedAtStr,
      progress,
    };

    if (existingTrackIndex >= 0) {
      // Update existing entry
      const track = skippedTracks[existingTrackIndex];
      track.skipCount = (track.skipCount || 0) + 1;
      track.lastSkipped = skippedAtStr;

      // Add to skipTimestamps array if it exists
      if (!track.skipTimestamps) {
        track.skipTimestamps = [];
      }
      track.skipTimestamps.push(skippedAtStr);

      // Cast to extended type to handle skipEvents
      const trackWithEvents = track as SkippedTrackWithEvents;

      if (!Array.isArray(trackWithEvents.skipEvents)) {
        trackWithEvents.skipEvents = [];
      }

      trackWithEvents.skipEvents.push(skipEvent);
    } else {
      // Create new entry with the base SkippedTrack properties
      // and add the skipEvents array as an extension
      const newTrack: SkippedTrackWithEvents = {
        id: trackId,
        name: trackName,
        artist: artistName,
        skipCount: 1,
        notSkippedCount: 0, // Initialize to 0 for a new track
        lastSkipped: skippedAtStr,
        skipTimestamps: [skippedAtStr],
        skipEvents: [skipEvent],
      };

      skippedTracks.push(newTrack);
    }

    // Save updated data
    await store.saveSkippedTracks(skippedTracks);

    store.saveLog(
      `Recorded skip for "${trackName}" by ${artistName} at ${progress.toFixed(2)}% progress`,
      "INFO",
    );
  } catch (error) {
    store.saveLog(`Failed to record skipped track: ${error}`, "ERROR");
  }
}
