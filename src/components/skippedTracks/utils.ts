/**
 * @packageDocumentation
 * @module skippedTracksUtils
 * @description Skipped Tracks Analysis Utility Functions
 *
 * This module provides specialized utility functions for analyzing, processing,
 * and formatting skipped track data throughout the application. These utilities
 * handle the complex calculations and data transformations required for skip
 * pattern analysis and library management.
 *
 * Core capabilities:
 * - Timestamp parsing and normalization
 * - Skip frequency analysis within configurable timeframes
 * - Ratio calculations for skip patterns
 * - Sorting and comparison functions for data visualization
 * - Date formatting for consistent UI presentation
 * - Threshold-based removal suggestion algorithms
 *
 * These utilities maintain consistency in how skip data is processed across
 * multiple components and views, ensuring reliable analysis results.
 */
import { SkippedTrack } from "@/types/spotify";

/**
 * Safely parses different timestamp formats into a standardized Date object
 *
 * Handles multiple timestamp formats that may exist in the dataset:
 * - ISO 8601 date strings
 * - Unix timestamp milliseconds as strings
 * - Other date string formats
 *
 * Returns null for invalid or empty timestamps to enable safe optional chaining.
 *
 * @param timestamp - Timestamp string in any supported format
 * @returns Standardized Date object or null if invalid
 * @source
 */
export const parseTimestamp = (timestamp: string): Date | null => {
  if (!timestamp) return null;

  try {
    if (!isNaN(Number(timestamp))) {
      return new Date(Number(timestamp));
    } else {
      return new Date(timestamp);
    }
  } catch (error) {
    console.error("Error parsing timestamp:", error);
    return null;
  }
};

/**
 * Counts track skips within a specified timeframe
 *
 * Analyzes a track's skip history to determine how many times it has been
 * skipped within the configured timeframe. Uses timestamp parsing to ensure
 * accurate date comparison regardless of timestamp format.
 *
 * Handles tracks with missing timestamp data by falling back to total skip count.
 *
 * @param track - Track data object containing skip history
 * @param timeframeInDays - Analysis window in days (e.g., 30 for last month)
 * @returns Number of times the track was skipped within the timeframe
 * @source
 */
export const getRecentSkipCount = (
  track: SkippedTrack,
  timeframeInDays: number,
): number => {
  if (!track.skipTimestamps || track.skipTimestamps.length === 0) {
    return track.skipCount || 0;
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - timeframeInDays);

  return track.skipTimestamps.filter((timestamp) => {
    const skipDate = parseTimestamp(timestamp);
    return skipDate && skipDate >= cutoffDate;
  }).length;
};

/**
 * Determines if a track should be suggested for removal from library
 *
 * Applies configured threshold criteria to identify tracks that are frequently
 * skipped and may be candidates for removal from the user's library. This is the
 * core decision algorithm for both automated and manual library cleanup.
 *
 * Uses error handling to ensure robust evaluation even with incomplete data.
 *
 * @param track - Track data object to evaluate
 * @param skipThreshold - Minimum number of skips to trigger suggestion
 * @param timeframeInDays - Timeframe to consider for skip analysis
 * @returns Boolean indicating if the track meets removal criteria
 * @source
 */
export const shouldSuggestRemoval = (
  track: SkippedTrack,
  skipThreshold: number,
  timeframeInDays: number,
): boolean => {
  try {
    const recentSkips = getRecentSkipCount(track, timeframeInDays);
    return recentSkips >= skipThreshold;
  } catch (error) {
    console.error("Error calculating skip suggestion:", error);
    return false;
  }
};

/**
 * Calculates the percentage of times a track is skipped when played
 *
 * Computes the ratio between skip count and total plays, providing insight
 * into how frequently the user chooses to skip a particular track when it
 * comes up in their listening session.
 *
 * Returns formatted percentage string ready for UI display.
 *
 * @param track - Track data object with play and skip counts
 * @returns Formatted percentage string (e.g., "75%")
 * @source
 */
export const calculateSkipRatio = (track: SkippedTrack): string => {
  const skipCount = track.skipCount || 0;
  const notSkippedCount = track.notSkippedCount || 0;
  const totalPlays = skipCount + notSkippedCount;

  if (totalPlays === 0) return "0%";

  const ratio = (skipCount / totalPlays) * 100;
  return `${ratio.toFixed(0)}%`;
};

/**
 * Retrieves the most recent skip timestamp from a track's history
 *
 * Identifies the most recent time a track was skipped by analyzing and
 * sorting all recorded skip timestamps. Handles both ISO string and
 * numeric timestamp formats for maximum compatibility.
 *
 * Falls back to lastSkipped field if detailed history is unavailable.
 *
 * @param track - Track data object with skip timestamp history
 * @returns Most recent skip timestamp as a string
 * @source
 */
export const getMostRecentTimestamp = (track: SkippedTrack): string => {
  if (track.skipTimestamps && track.skipTimestamps.length > 0) {
    // Sort timestamps in descending order (newest first)
    const sortedTimestamps = [...track.skipTimestamps].sort((a, b) => {
      const dateA = isNaN(Number(a)) ? new Date(a).getTime() : Number(a);
      const dateB = isNaN(Number(b)) ? new Date(b).getTime() : Number(b);
      return dateB - dateA;
    });
    return sortedTimestamps[0];
  }

  // Fallback to lastSkipped
  return track.lastSkipped || "";
};

/**
 * Converts timestamps to human-readable date and time format
 *
 * Transforms raw timestamps into localized, user-friendly date strings
 * for display in the UI. Handles both direct timestamp strings and
 * track objects with embedded timestamps.
 *
 * Includes comprehensive error handling for missing or invalid dates.
 *
 * @param dateString - ISO timestamp string or track object containing timestamps
 * @returns Localized, formatted date and time string
 * @source
 */
export const formatDate = (dateString: string | SkippedTrack): string => {
  // Handle case where the entire track is passed in
  if (typeof dateString !== "string") {
    const track = dateString;
    dateString = getMostRecentTimestamp(track);
  }

  if (!dateString) return "Never";

  try {
    const date = parseTimestamp(dateString);
    if (!date || isNaN(date.getTime())) return "Invalid date";
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid date";
  }
};

/**
 * Compares two tracks for sorting based on skip frequency
 *
 * Custom comparison function for array sorting that prioritizes tracks
 * by their recent skip count within the specified timeframe. Uses total
 * skip count as a secondary sort criterion when recent counts are equal.
 *
 * Designed for use with Array.sort() to order tracks by skip frequency.
 *
 * @param a - First track to compare
 * @param b - Second track to compare
 * @param timeframeInDays - Timeframe to consider for skip counting
 * @returns Sort comparison value: negative if a should come after b, positive if before
 * @source
 */
export const sortBySkipCount = (
  a: SkippedTrack,
  b: SkippedTrack,
  timeframeInDays: number,
): number => {
  const recentSkipsA = getRecentSkipCount(a, timeframeInDays);
  const recentSkipsB = getRecentSkipCount(b, timeframeInDays);

  if (recentSkipsB !== recentSkipsA) {
    return recentSkipsB - recentSkipsA;
  }

  return (b.skipCount || 0) - (a.skipCount || 0);
};
