/**
 * Playback History Management Module
 *
 * Manages comprehensive track history data collection, storage, and analysis
 * with a focus on track skipping behavior and listening patterns over time.
 *
 * Features:
 * - Detailed skip event recording with rich metadata
 * - Chronological track history management
 * - Time-based skip pattern analysis
 * - Context-aware skip tracking (playlist, album, etc.)
 * - Skip classification with confidence ratings
 * - Multi-dimensional history data structures
 * - Skip event aggregation and trend analysis
 * - Sophisticated storage management for history data
 * - Device and session tracking across listening periods
 *
 * This module serves as the persistent storage layer for the playback
 * monitoring system, recording detailed information about skipped tracks
 * and listening patterns over time. It maintains rich contextual data
 * that enables sophisticated analytics and insights into user listening
 * behavior, focusing particularly on skip patterns and preferences.
 *
 * The history system captures multiple dimensions of skipping behavior:
 * - When tracks are skipped (time of day, session context)
 * - How tracks are skipped (manual vs. automatic, progress percentage)
 * - Where tracks are skipped (device, playlist, listening context)
 * - Patterns in skipping (repeat skips, genre preferences, artists)
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
 *
 * Comprehensive data structure for tracking detailed information
 * about skipped tracks, including rich metadata about each skip
 * event and contextual information about listening patterns.
 */
interface SkippedTrackWithEvents extends ExtendedSkippedTrack {
  /** Detailed record of individual skip events with metadata */
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

  /** Album name for context and grouping */
  album?: string;

  /** Most recent context the track was skipped in */
  lastContext?: {
    type: string;
    uri?: string;
    name?: string;
    id?: string;
  };

  /** Aggregated statistics about contexts track was skipped in */
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

  /** Distribution of skips by hour of day (24-element array) */
  timeOfDayData?: Array<number>;
}

/**
 * Updates the list of recently played tracks from Spotify
 *
 * Fetches the user's recently played tracks from the Spotify API
 * and updates the application state to reflect the current listening
 * history. This provides a baseline of listening data for skip detection
 * and backward navigation identification.
 *
 * @returns Promise that resolves when the update is complete
 *
 * @example
 * // Refresh recent tracks history
 * async function refreshHistory() {
 *   await updateRecentTracks();
 *   console.log('Recent tracks history updated from Spotify');
 * }
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
 * Loads all recorded skipped track data from the application's
 * persistent storage, providing access to the complete history
 * of skipped tracks for analysis and display.
 *
 * @returns Promise resolving to an array of skipped track records
 *
 * @example
 * // Load skipped tracks for display
 * async function loadSkippedTracks() {
 *   const tracks = await getSkippedTracks();
 *   console.log(`Loaded ${tracks.length} skipped tracks from storage`);
 *   return tracks;
 * }
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
 *
 * Comprehensive data structure for recording a skip event with
 * detailed contextual information, analysis results, and metadata.
 * This structure provides the foundation for sophisticated skip
 * analytics and pattern recognition.
 */
export interface SkipInfo {
  /** Spotify track ID */
  id: string;

  /** Track name */
  name: string;

  /** Artist name */
  artist: string;

  /** Album name (optional) */
  album?: string;

  /** Timestamp when skip occurred (milliseconds since epoch) */
  skippedAt: number;

  /** Duration track was played before skipping (milliseconds) */
  playDuration: number;

  /** Total track duration (milliseconds) */
  trackDuration: number;

  /** Percentage of track played before skipping (0.0-1.0) */
  playPercentage: number;

  /** Spotify device ID where skip occurred */
  deviceId?: string;

  /** Spotify device name where skip occurred */
  deviceName?: string;

  /** Classification of skip type (preview, standard, near_end, etc.) */
  skipType: string;

  /** Whether skip appears to be manual vs. automatic */
  isManualSkip: boolean;

  /** Confidence in skip classification (0.0-1.0) */
  confidence: number;

  /** Human-readable explanation of skip classification */
  reason: string;

  /** Listening context information */
  context?: {
    /** Context type: 'playlist', 'album', 'artist', 'collection', 'radio', etc. */
    type: string;

    /** Spotify URI of the context */
    uri?: string;

    /** Human-readable name of the context */
    name?: string;

    /** Spotify ID of the context */
    id?: string;
  };
}

/**
 * Records a track skip in the application's history
 *
 * Stores detailed information about a skipped track in the application's
 * persistent storage, including comprehensive metadata about the skip
 * event. This function supports two parameter styles:
 *
 * 1. Complete SkipInfo object with all details
 * 2. Individual parameters for basic skip recording
 *
 * The function implements sophisticated storage logic:
 * - Merges new skip events with existing skip history
 * - Updates metadata with each skip occurrence
 * - Tracks skip patterns over time
 * - Maintains contextual information about skips
 * - Handles storage errors gracefully
 *
 * @param trackIdOrInfo Track ID or detailed SkipInfo object
 * @param trackName Track name (when using individual parameters)
 * @param artistName Artist name (when using individual parameters)
 * @param skippedAt Timestamp when track was skipped (when using individual parameters)
 * @param progress Progress percentage at which the track was skipped (when using individual parameters)
 * @returns Promise that resolves when the skip has been recorded
 *
 * @example
 * // Record a skip with detailed information
 * const skipInfo = {
 *   id: 'spotify:track:1234567890',
 *   name: 'Track Name',
 *   artist: 'Artist Name',
 *   album: 'Album Name',
 *   skippedAt: Date.now(),
 *   playDuration: 45000,
 *   trackDuration: 180000,
 *   playPercentage: 0.25,
 *   deviceName: 'My Device',
 *   skipType: 'standard',
 *   isManualSkip: true,
 *   confidence: 0.85,
 *   reason: 'Track skipped at 25%, below threshold of 70%',
 *   context: {
 *     type: 'playlist',
 *     name: 'My Playlist',
 *     id: 'playlist:1234567890'
 *   }
 * };
 *
 * await recordSkippedTrack(skipInfo);
 *
 * @example
 * // Record a skip with basic information
 * await recordSkippedTrack(
 *   'spotify:track:1234567890',  // Track ID
 *   'Track Name',                // Track name
 *   'Artist Name',               // Artist name
 *   Date.now(),                  // Current timestamp
 *   0.25                         // 25% progress
 * );
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
