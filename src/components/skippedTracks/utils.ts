import { SkippedTrack } from "@/types/spotify";

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
    return track.skipCount;
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - timeframeInDays);

  return track.skipTimestamps.filter((timestamp) => {
    const skipDate = new Date(timestamp);
    return skipDate >= cutoffDate;
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
  const totalPlays = track.skipCount + track.notSkippedCount;
  if (totalPlays === 0) return "0%";

  const ratio = (track.skipCount / totalPlays) * 100;
  return `${ratio.toFixed(0)}%`;
};

/**
 * Formats ISO date string to localized date and time
 *
 * @param dateString - ISO timestamp string
 * @returns Human-readable formatted date string
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return "Never";

  const date = new Date(dateString);
  return date.toLocaleDateString() + " " + date.toLocaleTimeString();
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

  return b.skipCount - a.skipCount;
};
