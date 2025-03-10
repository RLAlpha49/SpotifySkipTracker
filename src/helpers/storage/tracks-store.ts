/**
 * Tracks storage module
 *
 * Manages skipped track data persistence with features for:
 * - Storing track skip statistics
 * - Tracking complete playbacks
 * - Time-based analysis of skip patterns
 */

import fs from "fs";
import path from "path";
import { SkippedTrack } from "@/types/spotify";
import { skipsPath } from "./utils";

// Skipped tracks storage location
const skippedTracksFilePath = skipsPath;

/**
 * Persists skipped tracks data to storage
 *
 * @param tracks - Array of track data with skip statistics
 * @returns Boolean indicating success or failure
 */
export function saveSkippedTracks(tracks: SkippedTrack[]): boolean {
  try {
    // Create directory if it doesn't exist
    if (!fs.existsSync(path.dirname(skippedTracksFilePath))) {
      fs.mkdirSync(path.dirname(skippedTracksFilePath), { recursive: true });
    }

    fs.writeFileSync(
      skippedTracksFilePath,
      JSON.stringify(tracks, null, 2),
      "utf-8",
    );
    console.log(
      `Saved ${tracks.length} skipped tracks to:`,
      skippedTracksFilePath,
    );
    return true;
  } catch (error) {
    console.error("Failed to save skipped tracks:", error);
    return false;
  }
}

/**
 * Retrieves skipped tracks data from storage
 *
 * @returns Array of track data with skip statistics
 */
export function getSkippedTracks(): SkippedTrack[] {
  try {
    if (fs.existsSync(skippedTracksFilePath)) {
      const fileContent = fs.readFileSync(skippedTracksFilePath, "utf-8");
      const tracks = JSON.parse(fileContent) as SkippedTrack[];

      // Handle potential naming differences between skipTimestamps and skipHistory
      return tracks.map((track) => {
        if (!track.skipTimestamps && track.skipHistory) {
          // Map legacy skipHistory to skipTimestamps
          return {
            ...track,
            skipTimestamps: track.skipHistory,
          };
        }
        return track;
      });
    }
  } catch (error) {
    console.error("Error reading skipped tracks file:", error);
  }

  return [];
}

/**
 * Updates or adds a skipped track entry
 *
 * @param track - Track data to update
 * @returns Boolean indicating success or failure
 */
export function updateSkippedTrack(track: SkippedTrack): boolean {
  try {
    // Get current tracks
    const tracks = getSkippedTracks();
    const now = new Date().toISOString();

    // Find existing track or add new one
    const existingIndex = tracks.findIndex((t) => t.id === track.id);
    if (existingIndex >= 0) {
      const existing = tracks[existingIndex];

      // Update with incremented skip count
      tracks[existingIndex] = {
        ...existing,
        name: track.name || existing.name,
        artist: track.artist || existing.artist,
        skipCount: (existing.skipCount || 0) + 1,
        lastSkipped: now,
        skipTimestamps: [...(existing.skipTimestamps || []), now],
      };
    } else {
      // Add new track
      tracks.push({
        ...track,
        skipCount: 1,
        notSkippedCount: 0,
        lastSkipped: now,
        skipTimestamps: [now],
      });
    }

    return saveSkippedTracks(tracks);
  } catch (error) {
    console.error("Failed to update skipped track:", error);
    return false;
  }
}

/**
 * Updates a track's non-skipped playback count
 *
 * @param track - Track that was played without skipping
 * @returns Boolean indicating success or failure
 */
export function updateNotSkippedTrack(track: SkippedTrack): boolean {
  try {
    // Get current tracks
    const tracks = getSkippedTracks();

    // Find existing track or add new one
    const existingIndex = tracks.findIndex((t) => t.id === track.id);
    if (existingIndex >= 0) {
      // Update with incremented not-skipped count
      const existing = tracks[existingIndex];
      tracks[existingIndex] = {
        ...existing,
        name: track.name || existing.name,
        artist: track.artist || existing.artist,
        notSkippedCount: (existing.notSkippedCount || 0) + 1,
      };
    } else {
      // Add new track with only not-skipped count
      tracks.push({
        ...track,
        skipCount: 0,
        notSkippedCount: 1,
        lastSkipped: "",
        skipTimestamps: [],
      });
    }

    return saveSkippedTracks(tracks);
  } catch (error) {
    console.error("Failed to update not-skipped track:", error);
    return false;
  }
}

/**
 * Removes a track from the skipped tracks list
 *
 * @param trackId - Spotify track ID to remove
 * @returns Boolean indicating success or failure
 */
export function removeSkippedTrack(trackId: string): boolean {
  try {
    // Get current tracks
    const tracks = getSkippedTracks();

    // Filter out the specified track
    const filteredTracks = tracks.filter((t) => t.id !== trackId);

    // Only save if a track was actually removed
    if (filteredTracks.length < tracks.length) {
      return saveSkippedTracks(filteredTracks);
    }

    return true;
  } catch (error) {
    console.error("Failed to remove skipped track:", error);
    return false;
  }
}

/**
 * Filters skipped tracks by a specified timeframe
 *
 * @param days - Number of days to look back
 * @returns Tracks within the timeframe (including non-skipped tracks)
 */
export function filterSkippedTracksByTimeframe(
  days: number = 30,
): SkippedTrack[] {
  const tracks = getSkippedTracks();
  if (tracks.length === 0) return [];

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return tracks.filter((track) => {
    // Always include tracks that have never been skipped but were fully played
    if (!track.skipCount || track.skipCount === 0) {
      return true;
    }

    // For tracks with no skip timestamps, check the lastSkipped date
    if (!track.skipTimestamps || track.skipTimestamps.length === 0) {
      if (!track.lastSkipped) return true; // Include if no timestamp available
      return new Date(track.lastSkipped) >= cutoffDate;
    }

    // Check if any skip timestamps are within the timeframe
    return track.skipTimestamps.some((timestamp) => {
      return new Date(timestamp) >= cutoffDate;
    });
  });
}
