/**
 * Track history and recently played tracks management
 *
 * Handles fetching, storing, and processing of track history from Spotify.
 */

import { SkippedTrack } from "@/types/spotify";
import * as store from "../../helpers/storage/store";
import * as spotifyApi from "../spotify";
import { setRecentTracks } from "./state";

// Extend SkippedTrack for backward compatibility
interface ExtendedSkippedTrack extends SkippedTrack {
  skipTimestamps?: string[];
  skipHistory?: string[];
  notSkippedCount?: number;
}

/**
 * Extended SkippedTrack interface that includes skip events
 */
interface SkippedTrackWithEvents extends ExtendedSkippedTrack {
  skipEvents?: Array<{
    timestamp: string;
    progress: number;
    skipType?: string;
    isManual?: boolean;
    context?: {
      type: string;
      uri?: string;
      name?: string;
      id?: string;
    };
  }>;
  album?: string;
  lastContext?: {
    type: string;
    uri?: string;
    name?: string;
    id?: string;
  };
  contextStats?: {
    total: number;
    contexts: Record<
      string,
      {
        type: string;
        name?: string;
        uri?: string;
        count: number;
      }
    >;
  };
  timeOfDayData?: Array<number>;
}

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
 * Enhanced skipped track information with detailed classification
 */
export interface SkipInfo {
  id: string;
  name: string;
  artist: string;
  album?: string;
  skippedAt: number;
  playDuration: number;
  trackDuration: number;
  playPercentage: number;
  deviceId?: string;
  deviceName?: string;
  skipType: string;
  isManualSkip: boolean;
  confidence: number;
  reason: string;

  // Listening context information
  context?: {
    type: string; // 'playlist', 'album', 'artist', 'collection', 'radio', etc.
    uri?: string;
    name?: string;
    id?: string;
  };
}

/**
 * Records a track skip in the application's history
 *
 * @param trackIdOrInfo Track ID or detailed skip info object
 * @param trackName Track name (when using individual parameters)
 * @param artistName Artist name (when using individual parameters)
 * @param skippedAt Timestamp when track was skipped (when using individual parameters)
 * @param progress Progress percentage at which the track was skipped (when using individual parameters)
 */
export async function recordSkippedTrack(
  trackIdOrInfo: string | SkipInfo,
  trackName?: string,
  artistName?: string,
  skippedAt: number = Date.now(),
  progress?: number,
): Promise<void> {
  // Get existing skipped tracks data - placing outside of try/catch to handle this error differently
  let skippedTracks;
  try {
    skippedTracks = await getSkippedTracks();
  } catch (error) {
    // If getSkippedTracks fails, log the error and exit early without saving
    store.saveLog(`Failed to get skipped tracks: ${error}`, "ERROR");
    return; // Critical: Exit the function here to prevent proceeding with save
  }

  try {
    // Handle both parameter styles
    let trackId: string;
    let skipEvent: {
      timestamp: string;
      progress: number;
      skipType?: string;
      isManual?: boolean;
      context?: {
        type: string;
        uri?: string;
        name?: string;
        id?: string;
      };
    };
    let trackAlbum: string | undefined;
    let trackArtist: string;
    let trackNameToUse: string;
    let skippedAtToUse: number;

    // Check if first parameter is an object (enhanced skip info)
    if (typeof trackIdOrInfo === "object") {
      const skipInfo = trackIdOrInfo;
      trackId = skipInfo.id;
      trackNameToUse = skipInfo.name;
      trackArtist = skipInfo.artist;
      trackAlbum = skipInfo.album;
      skippedAtToUse = skipInfo.skippedAt;

      skipEvent = {
        timestamp: skipInfo.skippedAt.toString(),
        progress: skipInfo.playPercentage,
        skipType: skipInfo.skipType,
        isManual: skipInfo.isManualSkip,
        context: skipInfo.context,
      };
    } else {
      // Original parameter style
      trackId = trackIdOrInfo;
      trackNameToUse = trackName || "";
      trackArtist = artistName || "";
      skippedAtToUse = skippedAt;

      skipEvent = {
        timestamp: skippedAt.toString(),
        progress: progress || 0,
      };
    }

    // Check if track exists in the skipped tracks list
    const existingTrackIndex = skippedTracks.findIndex(
      (track) => track.id === trackId,
    );

    const skippedAtStr = skippedAtToUse.toString();

    if (existingTrackIndex >= 0) {
      // Update existing entry
      const track = skippedTracks[existingTrackIndex];
      track.skipCount = (track.skipCount || 0) + 1;
      track.lastSkipped = skippedAtStr;

      // Add to skipTimestamps array if it exists
      const extendedTrack = track as ExtendedSkippedTrack;
      if (!extendedTrack.skipTimestamps) {
        extendedTrack.skipTimestamps = [];
      }
      extendedTrack.skipTimestamps.push(skippedAtStr);

      // Cast to extended type to handle skipEvents
      const trackWithEvents = track as SkippedTrackWithEvents;

      if (!Array.isArray(trackWithEvents.skipEvents)) {
        trackWithEvents.skipEvents = [];
      }

      trackWithEvents.skipEvents.push(skipEvent);

      // Update skip type counts
      if (!trackWithEvents.skipTypes) {
        trackWithEvents.skipTypes = {};
      }
      const skipTypeKey = skipEvent.skipType || "standard";
      trackWithEvents.skipTypes[skipTypeKey] =
        (trackWithEvents.skipTypes[skipTypeKey] || 0) + 1;

      // Update manual/automatic skip counts
      if (skipEvent.isManual !== undefined) {
        if (skipEvent.isManual) {
          trackWithEvents.manualSkipCount =
            (trackWithEvents.manualSkipCount || 0) + 1;
        } else {
          trackWithEvents.autoSkipCount =
            (trackWithEvents.autoSkipCount || 0) + 1;
        }
      }

      // Update time-of-day data
      if (!trackWithEvents.timeOfDayData) {
        trackWithEvents.timeOfDayData = Array(24).fill(0);
      }
      const skipHour = new Date(parseInt(skippedAtStr)).getHours();
      trackWithEvents.timeOfDayData[skipHour] += 1;

      // Update context data if available
      if (skipEvent.context) {
        // Store the last context
        trackWithEvents.lastContext = skipEvent.context;

        // Initialize context stats if needed
        if (!trackWithEvents.contextStats) {
          trackWithEvents.contextStats = {
            total: 0,
            contexts: {},
          };
        }

        const contextType = skipEvent.context.type;
        const contextId =
          skipEvent.context.id || skipEvent.context.uri || "unknown";
        const contextName = skipEvent.context.name || "Unknown";

        // Increment total count
        trackWithEvents.contextStats.total += 1;

        // Initialize and update specific context
        if (!trackWithEvents.contextStats.contexts[contextId]) {
          trackWithEvents.contextStats.contexts[contextId] = {
            type: contextType,
            name: contextName,
            count: 0,
          };
        }

        trackWithEvents.contextStats.contexts[contextId].count += 1;
      }
    } else {
      // Create new entry with the base SkippedTrack properties
      // and add the skipEvents array as an extension
      const newTrack: SkippedTrackWithEvents = {
        id: trackId,
        name: trackNameToUse,
        artist: trackArtist,
        skipCount: 1,
        notSkippedCount: 0, // Initialize to 0 for a new track
        lastSkipped: skippedAtStr,
        skipTimestamps: [skippedAtStr],
        skipEvents: [skipEvent],
        // Initialize skip type tracking
        skipTypes: {
          [skipEvent.skipType || "standard"]: 1,
        },
        // Initialize manual/automatic counts if available
        ...(skipEvent.isManual !== undefined && {
          manualSkipCount: skipEvent.isManual ? 1 : 0,
          autoSkipCount: skipEvent.isManual ? 0 : 1,
        }),
        // Initialize time-of-day data
        timeOfDayData: (() => {
          const hourArray = Array(24).fill(0);
          const skipHour = new Date(parseInt(skippedAtStr)).getHours();
          hourArray[skipHour] = 1;
          return hourArray;
        })(),
      };

      // Add album if available (from enhanced info)
      if (trackAlbum) {
        newTrack.album = trackAlbum;
      }

      // Add context information if available
      if (skipEvent.context) {
        newTrack.lastContext = skipEvent.context;

        const contextType = skipEvent.context.type;
        const contextId =
          skipEvent.context.id || skipEvent.context.uri || "unknown";
        const contextName = skipEvent.context.name || "Unknown";

        newTrack.contextStats = {
          total: 1,
          contexts: {
            [contextId]: {
              type: contextType,
              name: contextName,
              count: 1,
            },
          },
        };
      }

      skippedTracks.push(newTrack);
    }

    // Save updated data
    await store.saveSkippedTracks(skippedTracks);

    store.saveLog(
      `Recorded skip for "${trackNameToUse}" by ${trackArtist} - Skip type: ${skipEvent.skipType || "standard"}`,
      "INFO",
    );
  } catch (error) {
    store.saveLog(`Failed to record skipped track: ${error}`, "ERROR");
  }
}
