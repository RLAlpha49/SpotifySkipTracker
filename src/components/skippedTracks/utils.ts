import { SkippedTrack } from "@/types/spotify";

/**
 * Safely converts any timestamp format to a Date object
 *
 * @param timestamp - Timestamp string (ISO or numeric)
 * @returns Date object or null if invalid
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
 * Calculates skips within the configured time window
 *
 * @param track - Track to analyze for recent skips
 * @param timeframeInDays - Number of days to consider for recent skips
 * @returns Number of skips within the timeframe
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
 * Evaluates if a track exceeds the skip threshold
 *
 * @param track - Track to evaluate against threshold
 * @param skipThreshold - Threshold of skips to mark for removal
 * @param timeframeInDays - Timeframe in days to consider for evaluation
 * @returns Boolean indicating if track should be suggested for removal
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
 * Calculates percentage of skips relative to total plays
 *
 * @param track - Track to calculate skip ratio for
 * @returns Formatted percentage string
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
 * Gets the most recent timestamp from a track's skip history
 *
 * @param track - Track to get the most recent timestamp from
 * @returns The most recent timestamp string
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
 * Formats ISO date string to localized date and time
 *
 * @param dateString - ISO timestamp string or track object
 * @returns Human-readable formatted date string
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
 * Comparison function for sorting tracks by skip frequency
 *
 * @param a - First track to compare
 * @param b - Second track to compare
 * @param timeframeInDays - Timeframe in days to consider for sorting
 * @returns Sort value (-1, 0, 1) for array sorting
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
