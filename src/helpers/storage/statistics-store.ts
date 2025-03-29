/**
 * @packageDocumentation
 * @module statistics-store
 * @description Statistics Storage and Analysis Module
 *
 * This module provides comprehensive functionality for storing, retrieving, and analyzing
 * Spotify listening statistics. It serves as the data persistence layer for all metrics
 * related to playback behavior, skip patterns, and listening habits.
 *
 * Features:
 * - Persistent storage of all listening statistics and metrics
 * - Data normalization and integrity preservation
 * - Comprehensive pattern analysis algorithms
 * - Time-based aggregation (daily, weekly, monthly)
 * - Artist and track-level metrics
 * - Device usage analytics
 * - Skip pattern detection and classification
 * - Context-aware listening analysis
 * - Temporal behavior modeling (time of day, day of week)
 * - Session tracking and analysis
 * - Data import/export capabilities
 *
 * The module ensures proper data serialization/deserialization, handling specialized
 * data structures like Sets appropriately for storage. It includes validation and
 * repair mechanisms to maintain data integrity across application restarts.
 *
 * This serves as the foundation for all data visualization and insights presented
 * in the application's statistics dashboard.
 */

import { SkippedTrack } from "@/types/spotify";
import { StatisticsData, TrackMetrics } from "@/types/statistics";
import { app } from "electron";
import { ensureDir, existsSync, readJsonSync, writeJsonSync } from "fs-extra";
import { join } from "path";

// Extended interface to add timeOfDayData property
interface ExtendedTrackMetrics extends TrackMetrics {
  timeOfDayData?: number[];
}

// File path for statistics storage
const statisticsFilePath = join(
  app.getPath("userData"),
  "data",
  "statistics.json",
);

/**
 * Default empty statistics data structure
 */
const defaultStatisticsData: StatisticsData = {
  lastUpdated: new Date().toISOString(),
  dailyMetrics: {},
  weeklyMetrics: {},
  monthlyMetrics: {},
  artistMetrics: {},
  sessions: [],
  totalUniqueTracks: 0,
  totalUniqueArtists: 0,
  overallSkipRate: 0,
  discoveryRate: 0,
  totalListeningTimeMs: 0,
  topArtistIds: [],
  hourlyDistribution: Array(24).fill(0),
  dailyDistribution: Array(7).fill(0),
  deviceMetrics: {},
  trackMetrics: {},
  skipPatterns: {},
  recentDiscoveries: [],
  avgSessionDurationMs: 0,
  hourlyListeningTime: Array(24).fill(0),
  repeatListeningRate: 0,
  recentSkipRateTrend: Array(14).fill(0),
  recentListeningTimeTrend: Array(14).fill(0),
};

/**
 * Retrieves statistics data from persistent storage
 *
 * Loads the complete statistics data structure from the application's user data directory,
 * performing data validation and repair operations to ensure integrity. If no statistics
 * file exists, it creates a new one with default values.
 *
 * The function performs several important operations:
 * - Ensures the data directory exists before attempting to read
 * - Creates default statistics if no file is found
 * - Converts serialized arrays back to Set objects for uniqueness tracking
 * - Repairs any missing or corrupted data fields
 * - Preserves backward compatibility with older data formats
 *
 * @returns Promise resolving to the complete statistics data object
 * @throws Error if file operations fail or data cannot be processed
 *
 * @example
 * // Get statistics for dashboard display
 * try {
 *   const stats = await getStatistics();
 *   displaySkipRate(stats.overallSkipRate);
 *   renderTimeChart(stats.hourlyDistribution);
 * } catch (error) {
 *   showErrorMessage("Failed to load statistics");
 * }
 * @source
 */
export const getStatistics = async (): Promise<StatisticsData> => {
  try {
    await ensureDir(join(app.getPath("userData"), "data"));

    if (!existsSync(statisticsFilePath)) {
      await saveStatistics(defaultStatisticsData);
      return { ...defaultStatisticsData };
    }

    const statistics: StatisticsData = readJsonSync(statisticsFilePath);

    // Process any potential issues with the loaded data
    const fixedStatistics = processLoadedStatistics(statistics);

    return fixedStatistics;
  } catch (error) {
    console.error("Error reading statistics:", error);
    throw error;
  }
};

/**
 * Saves statistics data to persistent storage
 *
 * Writes the complete statistics data structure to a JSON file in the application's
 * user data directory. The function handles proper serialization of complex data
 * structures (like Sets) and updates the lastUpdated timestamp.
 *
 * The function performs several important operations:
 * - Ensures the data directory exists before attempting to write
 * - Updates the lastUpdated timestamp to the current time
 * - Converts Set objects to arrays for proper JSON serialization
 * - Formats JSON with proper indentation for readability
 * - Handles error conditions gracefully
 *
 * @param statistics - Complete statistics data object to save
 * @returns Promise resolving to a boolean indicating success (true) or failure (false)
 *
 * @example
 * // Update and save statistics after processing a skipped track
 * const stats = await getStatistics();
 * stats.totalSkips++;
 * stats.overallSkipRate = stats.totalSkips / stats.totalPlays;
 * await saveStatistics(stats);
 * @source
 */
export const saveStatistics = async (
  statistics: StatisticsData,
): Promise<boolean> => {
  try {
    await ensureDir(join(app.getPath("userData"), "data"));

    // Update the lastUpdated timestamp
    statistics.lastUpdated = new Date().toISOString();

    // Before saving, convert all Set objects to arrays for proper serialization
    const preparedStatistics = prepareStatisticsForSave(statistics);

    writeJsonSync(statisticsFilePath, preparedStatistics, { spaces: 2 });
    return true;
  } catch (error) {
    console.error("Error saving statistics:", error);
    return false;
  }
};

/**
 * Prepares statistics data for saving by converting Sets to arrays
 *
 * Performs necessary transformations on the statistics data structure to ensure
 * it can be properly serialized as JSON. This primarily involves converting Set
 * objects (which cannot be directly serialized) to arrays while preserving the
 * rest of the data structure.
 *
 * The function creates a deep copy of the statistics object and recursively
 * processes all time-based metrics (daily, weekly, monthly) to ensure proper
 * handling of unique track and artist collections.
 *
 * @param statistics - The statistics data object to prepare for serialization
 * @returns A serializable version of the statistics with all Sets converted to arrays
 * @private Internal function not exported from the module
 */
function prepareStatisticsForSave(statistics: StatisticsData): StatisticsData {
  const result = { ...statistics };

  // Process daily metrics
  for (const dateKey in result.dailyMetrics) {
    const metric = result.dailyMetrics[dateKey];
    if (metric.uniqueArtists instanceof Set) {
      result.dailyMetrics[dateKey] = {
        ...metric,
        uniqueArtists: Array.from(metric.uniqueArtists),
      };
    }
    if (metric.uniqueTracks instanceof Set) {
      result.dailyMetrics[dateKey] = {
        ...result.dailyMetrics[dateKey],
        uniqueTracks: Array.from(metric.uniqueTracks),
      };
    }
  }

  // Process weekly metrics
  for (const weekKey in result.weeklyMetrics) {
    const metric = result.weeklyMetrics[weekKey];
    if (metric.uniqueArtists instanceof Set) {
      result.weeklyMetrics[weekKey] = {
        ...metric,
        uniqueArtists: Array.from(metric.uniqueArtists),
      };
    }
    if (metric.uniqueTracks instanceof Set) {
      result.weeklyMetrics[weekKey] = {
        ...result.weeklyMetrics[weekKey],
        uniqueTracks: Array.from(metric.uniqueTracks),
      };
    }
  }

  // Process monthly metrics
  for (const monthKey in result.monthlyMetrics) {
    const metric = result.monthlyMetrics[monthKey];
    if (metric.uniqueArtists instanceof Set) {
      result.monthlyMetrics[monthKey] = {
        ...metric,
        uniqueArtists: Array.from(metric.uniqueArtists),
      };
    }
    if (metric.uniqueTracks instanceof Set) {
      result.monthlyMetrics[monthKey] = {
        ...result.monthlyMetrics[monthKey],
        uniqueTracks: Array.from(metric.uniqueTracks),
      };
    }
  }

  return result;
}

/**
 * Processes loaded statistics to ensure data integrity
 *
 * Performs validation and repair operations on statistics data loaded from storage,
 * ensuring all required fields exist and data structures are in the correct format.
 * This function is crucial for maintaining backward compatibility and recovering
 * from potential data corruption.
 *
 * The function performs several critical operations:
 * - Merges loaded data with default values to ensure all fields exist
 * - Converts arrays back to Set objects for uniqueness tracking
 * - Handles missing or corrupted data fields
 * - Ensures type consistency across the data structure
 * - Preserves compatibility with changes to the data schema over time
 *
 * @param statistics - The raw statistics data loaded from storage
 * @returns A validated and repaired statistics data object
 * @private Internal function not exported from the module
 */
function processLoadedStatistics(statistics: StatisticsData): StatisticsData {
  // Ensure all required properties exist
  const result = {
    ...defaultStatisticsData,
    ...statistics,
  };

  // Process daily metrics - convert arrays to Sets and handle empty objects
  for (const dateKey in result.dailyMetrics) {
    const metric = result.dailyMetrics[dateKey];

    // Fix uniqueArtists
    if (Array.isArray(metric.uniqueArtists)) {
      result.dailyMetrics[dateKey].uniqueArtists = new Set(
        metric.uniqueArtists,
      );
    } else if (
      !metric.uniqueArtists ||
      (typeof metric.uniqueArtists === "object" &&
        Object.keys(metric.uniqueArtists).length === 0)
    ) {
      // Handle empty object or missing field
      result.dailyMetrics[dateKey].uniqueArtists = new Set<string>();
    }

    // Fix uniqueTracks
    if (Array.isArray(metric.uniqueTracks)) {
      result.dailyMetrics[dateKey].uniqueTracks = new Set(metric.uniqueTracks);
    } else if (
      !metric.uniqueTracks ||
      (typeof metric.uniqueTracks === "object" &&
        Object.keys(metric.uniqueTracks).length === 0)
    ) {
      // Handle empty object or missing field
      result.dailyMetrics[dateKey].uniqueTracks = new Set<string>();
    }
  }

  // Process weekly metrics
  for (const weekKey in result.weeklyMetrics) {
    const metric = result.weeklyMetrics[weekKey];

    // Fix uniqueArtists
    if (Array.isArray(metric.uniqueArtists)) {
      result.weeklyMetrics[weekKey].uniqueArtists = new Set(
        metric.uniqueArtists,
      );
    } else if (
      !metric.uniqueArtists ||
      (typeof metric.uniqueArtists === "object" &&
        Object.keys(metric.uniqueArtists).length === 0)
    ) {
      result.weeklyMetrics[weekKey].uniqueArtists = new Set<string>();
    }

    // Fix uniqueTracks
    if (Array.isArray(metric.uniqueTracks)) {
      result.weeklyMetrics[weekKey].uniqueTracks = new Set(metric.uniqueTracks);
    } else if (
      !metric.uniqueTracks ||
      (typeof metric.uniqueTracks === "object" &&
        Object.keys(metric.uniqueTracks).length === 0)
    ) {
      result.weeklyMetrics[weekKey].uniqueTracks = new Set<string>();
    }
  }

  // Process monthly metrics
  for (const monthKey in result.monthlyMetrics) {
    const metric = result.monthlyMetrics[monthKey];

    // Fix uniqueArtists
    if (Array.isArray(metric.uniqueArtists)) {
      result.monthlyMetrics[monthKey].uniqueArtists = new Set(
        metric.uniqueArtists,
      );
    } else if (
      !metric.uniqueArtists ||
      (typeof metric.uniqueArtists === "object" &&
        Object.keys(metric.uniqueArtists).length === 0)
    ) {
      result.monthlyMetrics[monthKey].uniqueArtists = new Set<string>();
    }

    // Fix uniqueTracks
    if (Array.isArray(metric.uniqueTracks)) {
      result.monthlyMetrics[monthKey].uniqueTracks = new Set(
        metric.uniqueTracks,
      );
    } else if (
      !metric.uniqueTracks ||
      (typeof metric.uniqueTracks === "object" &&
        Object.keys(metric.uniqueTracks).length === 0)
    ) {
      result.monthlyMetrics[monthKey].uniqueTracks = new Set<string>();
    }
  }

  // Recalculate totals to ensure accuracy
  // This will be done when the statistics are updated, but we do it here as well for loaded data
  result.totalUniqueTracks = calculateUniqueTrackCount(result);
  result.totalUniqueArtists = calculateUniqueArtistCount(result);

  return result;
}

/**
 * Calculate the total unique track count from all metrics
 *
 * Performs a comprehensive count of all unique tracks that appear across the entire
 * statistical dataset. This function utilizes a Set to ensure each track is counted
 * exactly once, even if it appears in multiple time periods or contexts.
 *
 * The counting process includes:
 * - Examining daily metrics to extract track IDs from both Set and Array formats
 * - Directly processing track IDs from the trackMetrics collection (more reliable source)
 * - Handling different data formats that may exist due to serialization/deserialization
 *
 * This function is crucial for accurate reporting of the user's music diversity and
 * exposure to different tracks over time.
 *
 * @param statistics - The complete statistics data structure
 * @returns The total number of unique tracks encountered
 * @private Internal utility function
 */
function calculateUniqueTrackCount(statistics: StatisticsData): number {
  const allTracks = new Set<string>();

  // Collect from daily metrics
  for (const dateKey in statistics.dailyMetrics) {
    const metric = statistics.dailyMetrics[dateKey];
    if (metric.uniqueTracks instanceof Set) {
      Array.from(metric.uniqueTracks).forEach((id) => allTracks.add(id));
    } else if (Array.isArray(metric.uniqueTracks)) {
      metric.uniqueTracks.forEach((id) => allTracks.add(id));
    }
  }

  // Collect from track metrics directly (more reliable)
  for (const trackId in statistics.trackMetrics) {
    allTracks.add(trackId);
  }

  return allTracks.size;
}

/**
 * Calculate the total unique artist count from all metrics
 *
 * Determines the total number of distinct artists present in the user's listening history
 * across all time periods. This function employs a Set data structure to ensure each artist
 * is counted only once regardless of how many tracks or listening sessions they appear in.
 *
 * The counting process includes:
 * - Processing daily metrics to extract artist IDs from both Set and Array formats
 * - Directly incorporating artist IDs from the artistMetrics collection for reliability
 * - Handling various data formats that may result from storage serialization processes
 *
 * This metric is essential for measuring music discovery and diversity in the user's
 * listening patterns, forming the basis for artist-related analytics and visualizations.
 *
 * @param statistics - The complete statistics data structure
 * @returns The total number of unique artists encountered in the listening history
 * @source
 */
export function calculateUniqueArtistCount(statistics: StatisticsData): number {
  const allArtists = new Set<string>();

  // Collect from daily metrics
  for (const dateKey in statistics.dailyMetrics) {
    const metric = statistics.dailyMetrics[dateKey];
    if (metric.uniqueArtists instanceof Set) {
      Array.from(metric.uniqueArtists).forEach((id) => allArtists.add(id));
    } else if (Array.isArray(metric.uniqueArtists)) {
      metric.uniqueArtists.forEach((id) => allArtists.add(id));
    }
  }

  // Collect from artist metrics directly (more reliable)
  for (const artistId in statistics.artistMetrics) {
    allArtists.add(artistId);
  }

  return allArtists.size;
}

/**
 * Updates statistics with details about a played track
 *
 * Processes comprehensive playback data for a single track and updates multiple
 * statistical metrics across various time periods and aggregation levels. This function
 * serves as the core data processing engine for the statistics system, capturing detailed
 * information about each listening event.
 *
 * The function performs extensive updates to:
 * - Daily, weekly, and monthly aggregated metrics
 * - Artist-specific statistics and patterns
 * - Device usage analytics
 * - Track-level metrics including skip rates and completion percentages
 * - Skip pattern detection and classification
 * - Listening session management and analysis
 * - Time-of-day and day-of-week distribution patterns
 *
 * This function handles both skipped and fully played tracks differently,
 * with more detailed metrics collected for skipped content to enable pattern analysis.
 * It ensures data integrity through extensive validation and initialization of required
 * data structures before processing.
 *
 * @param trackId - Spotify ID of the track
 * @param trackName - Name of the track
 * @param artistId - Spotify ID of the artist
 * @param artistName - Name of the artist
 * @param durationMs - Duration of the track in milliseconds
 * @param wasSkipped - Whether the track was skipped before completion
 * @param playedTimeMs - How much of the track was played in milliseconds
 * @param deviceName - Name of the device used for playback
 * @param deviceType - Type of the device used for playback
 * @param timestamp - When the track was played (defaults to current time)
 * @param skipType - Classification of skip type (preview, standard, near_end)
 * @param isManualSkip - Whether the skip was manually triggered by user
 * @returns Promise resolving to boolean indicating success or failure
 *
 * @example
 * // Record a skipped track with detailed information
 * await updateTrackStatistics(
 *   '4uLU6hMCjMI75M1A2tKUQC', // Track ID
 *   'Never Gonna Give You Up',
 *   '0gxyHStUsqpMadRV0Di1Qt', // Artist ID
 *   'Rick Astley',
 *   213000, // Track duration (3:33)
 *   true,   // Track was skipped
 *   45000,  // Played for 45 seconds
 *   'iPhone 12',
 *   'smartphone',
 *   Date.now(),
 *   'standard',
 *   true    // User manually skipped
 * );
 *
 * @example
 * // Record a fully played track
 * await updateTrackStatistics(
 *   '5nujrmhLynf4yMoMtj8AQF',
 *   'Levitating',
 *   '6M2wZ9GZgrQXHCFfjv46we',
 *   'Dua Lipa',
 *   203000,
 *   false,  // Not skipped
 *   203000, // Played in full
 *   'Desktop',
 *   'computer',
 * );
 *
 * @source
 */
export async function updateTrackStatistics(
  trackId: string,
  trackName: string,
  artistId: string,
  artistName: string,
  durationMs: number,
  wasSkipped: boolean,
  playedTimeMs: number,
  deviceName: string | null,
  deviceType: string | null,
  timestamp: number = Date.now(),
  skipType: string = "standard",
  isManualSkip: boolean = true,
): Promise<boolean> {
  try {
    // Get current statistics data
    const statistics = await getStatistics();
    const date = new Date(timestamp);

    // Get current date, week, and month strings (using current timestamp, not future dates)
    const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD
    const month = dateStr.substring(0, 7); // YYYY-MM

    // Calculate ISO week number
    const weekNum = getISOWeek(date);
    const weekStr = `${date.getFullYear()}-W${weekNum.toString().padStart(2, "0")}`;

    // Get hour of day for various metrics
    const hourOfDay = date.getHours();

    // Initialize properties if they don't exist
    if (!statistics.dailyMetrics) statistics.dailyMetrics = {};
    if (!statistics.weeklyMetrics) statistics.weeklyMetrics = {};
    if (!statistics.monthlyMetrics) statistics.monthlyMetrics = {};
    if (!statistics.artistMetrics) statistics.artistMetrics = {};
    if (!statistics.sessions) statistics.sessions = [];
    if (!statistics.deviceMetrics) statistics.deviceMetrics = {};
    if (!statistics.trackMetrics) statistics.trackMetrics = {};
    if (!statistics.skipPatterns) statistics.skipPatterns = {};
    if (!statistics.recentDiscoveries) statistics.recentDiscoveries = [];
    if (!statistics.hourlyListeningTime)
      statistics.hourlyListeningTime = Array(24).fill(0);
    if (!statistics.recentSkipRateTrend)
      statistics.recentSkipRateTrend = Array(14).fill(0);
    if (!statistics.recentListeningTimeTrend)
      statistics.recentListeningTimeTrend = Array(14).fill(0);
    if (statistics.hourlyDistribution === undefined)
      statistics.hourlyDistribution = Array(24).fill(0);
    if (statistics.dailyDistribution === undefined)
      statistics.dailyDistribution = Array(7).fill(0);
    if (statistics.topArtistIds === undefined) statistics.topArtistIds = [];
    if (statistics.discoveryRate === undefined) statistics.discoveryRate = 0;
    if (statistics.repeatListeningRate === undefined)
      statistics.repeatListeningRate = 0;
    if (statistics.avgSessionDurationMs === undefined)
      statistics.avgSessionDurationMs = 0;

    // Initialize skip type metrics if they don't exist
    if (!statistics.skipTypeMetrics) {
      statistics.skipTypeMetrics = {
        preview: 0,
        standard: 0,
        near_end: 0,
        auto: 0,
        manual: 0,
        byTimeOfDay: Array(24).fill(0),
      };
    }

    // Update daily metrics - ensure the object exists before accessing it
    const dailyMetric = statistics.dailyMetrics[dateStr] || {
      date: dateStr,
      listeningTimeMs: 0,
      tracksPlayed: 0,
      tracksSkipped: 0,
      uniqueArtists: new Set<string>(),
      uniqueTracks: new Set<string>(),
      peakHour: 0,
      sequentialSkips: 0,
      skipsByType: {
        preview: 0,
        standard: 0,
        near_end: 0,
        auto: 0,
        manual: 0,
      },
    };

    dailyMetric.listeningTimeMs += playedTimeMs;
    dailyMetric.tracksPlayed += 1;

    // Update skip metrics if this was a skip
    if (wasSkipped) {
      dailyMetric.tracksSkipped += 1;

      // Update skip type metrics
      if (wasSkipped) {
        // Ensure skipsByType is initialized
        if (!dailyMetric.skipsByType) {
          dailyMetric.skipsByType = {
            preview: 0,
            standard: 0,
            near_end: 0,
            auto: 0,
            manual: 0,
          };
        }

        // Increment the appropriate skip type counter
        if (skipType === "preview") {
          dailyMetric.skipsByType.preview += 1;
          statistics.skipTypeMetrics.preview += 1;
        } else if (skipType === "near_end") {
          dailyMetric.skipsByType.near_end += 1;
          statistics.skipTypeMetrics.near_end += 1;
        } else if (skipType === "standard") {
          dailyMetric.skipsByType.standard += 1;
          statistics.skipTypeMetrics.standard += 1;
        } else {
          // Default to standard if unknown type
          dailyMetric.skipsByType.standard += 1;
          statistics.skipTypeMetrics.standard += 1;
        }

        // Update manual/auto skip counts
        if (isManualSkip) {
          dailyMetric.skipsByType.manual += 1;
          statistics.skipTypeMetrics.manual += 1;
        } else {
          dailyMetric.skipsByType.auto += 1;
          statistics.skipTypeMetrics.auto += 1;
        }

        // Update hourly distribution for skipped tracks
        statistics.skipTypeMetrics.byTimeOfDay[hourOfDay] += 1;

        // If we have a track id and the track metrics exist, update time-of-day data
        if (trackId && statistics.trackMetrics[trackId]) {
          const trackMetric = statistics.trackMetrics[
            trackId
          ] as ExtendedTrackMetrics;

          // Initialize time-of-day data if needed
          if (!trackMetric.timeOfDayData) {
            trackMetric.timeOfDayData = Array(24).fill(0);
          }

          // Increment skip count for this hour
          trackMetric.timeOfDayData[hourOfDay] += 1;
        }
      }

      // Ensure uniqueArtists is a Set
      if (!dailyMetric.uniqueArtists) {
        dailyMetric.uniqueArtists = new Set<string>();
      } else if (Array.isArray(dailyMetric.uniqueArtists)) {
        dailyMetric.uniqueArtists = new Set<string>(dailyMetric.uniqueArtists);
      } else if (
        typeof dailyMetric.uniqueArtists === "object" &&
        !(dailyMetric.uniqueArtists instanceof Set)
      ) {
        // Handle case where it's an object but not a Set
        dailyMetric.uniqueArtists = new Set<string>();
      }

      // Ensure uniqueTracks is a Set
      if (!dailyMetric.uniqueTracks) {
        dailyMetric.uniqueTracks = new Set<string>();
      } else if (Array.isArray(dailyMetric.uniqueTracks)) {
        dailyMetric.uniqueTracks = new Set<string>(dailyMetric.uniqueTracks);
      } else if (
        typeof dailyMetric.uniqueTracks === "object" &&
        !(dailyMetric.uniqueTracks instanceof Set)
      ) {
        // Handle case where it's an object but not a Set
        dailyMetric.uniqueTracks = new Set<string>();
      }

      // Now safely add to Sets
      (dailyMetric.uniqueArtists as Set<string>).add(artistId);
      (dailyMetric.uniqueTracks as Set<string>).add(trackId);

      // Update peak hour
      const hourlyDist = [...statistics.hourlyDistribution];
      hourlyDist[hourOfDay] += 1;
      statistics.hourlyDistribution = hourlyDist;

      // Update hourly listening time
      if (!statistics.hourlyListeningTime) {
        statistics.hourlyListeningTime = Array(24).fill(0);
      }
      statistics.hourlyListeningTime[hourOfDay] += playedTimeMs;

      if (hourlyDist[hourOfDay] > hourlyDist[dailyMetric.peakHour]) {
        dailyMetric.peakHour = hourOfDay;
      }

      statistics.dailyMetrics[dateStr] = dailyMetric;

      // Update day of week distribution
      const dayOfWeek = date.getDay(); // 0 (Sunday) to 6 (Saturday)
      const dailyDist = [...statistics.dailyDistribution];
      dailyDist[dayOfWeek] += 1;
      statistics.dailyDistribution = dailyDist;

      // Update weekly metrics
      const weeklyMetric = statistics.weeklyMetrics[weekStr] || {
        date: weekStr,
        listeningTimeMs: 0,
        tracksPlayed: 0,
        tracksSkipped: 0,
        uniqueArtists: new Set<string>(),
        uniqueTracks: new Set<string>(),
        mostActiveDay: 0,
        avgSessionDurationMs: 0,
      };

      weeklyMetric.listeningTimeMs += playedTimeMs;
      weeklyMetric.tracksPlayed += 1;
      if (wasSkipped) weeklyMetric.tracksSkipped += 1;

      // Ensure uniqueArtists is a Set
      if (!weeklyMetric.uniqueArtists) {
        weeklyMetric.uniqueArtists = new Set<string>();
      } else if (Array.isArray(weeklyMetric.uniqueArtists)) {
        weeklyMetric.uniqueArtists = new Set<string>(
          weeklyMetric.uniqueArtists,
        );
      } else if (
        typeof weeklyMetric.uniqueArtists === "object" &&
        !(weeklyMetric.uniqueArtists instanceof Set)
      ) {
        // Handle case where it's an object but not a Set
        weeklyMetric.uniqueArtists = new Set<string>();
      }

      // Ensure uniqueTracks is a Set
      if (!weeklyMetric.uniqueTracks) {
        weeklyMetric.uniqueTracks = new Set<string>();
      } else if (Array.isArray(weeklyMetric.uniqueTracks)) {
        weeklyMetric.uniqueTracks = new Set<string>(weeklyMetric.uniqueTracks);
      } else if (
        typeof weeklyMetric.uniqueTracks === "object" &&
        !(weeklyMetric.uniqueTracks instanceof Set)
      ) {
        // Handle case where it's an object but not a Set
        weeklyMetric.uniqueTracks = new Set<string>();
      }

      // Now safely add to Sets
      (weeklyMetric.uniqueArtists as Set<string>).add(artistId);
      (weeklyMetric.uniqueTracks as Set<string>).add(trackId);

      // Update most active day for the week
      const weekDayDist = Array(7).fill(0);
      for (const date in statistics.dailyMetrics) {
        if (date.startsWith(weekStr.substring(0, 4))) {
          const dayDate = new Date(date);
          const weekNum = getISOWeek(dayDate);
          const weekOfDay = `${dayDate.getFullYear()}-W${weekNum.toString().padStart(2, "0")}`;

          if (weekOfDay === weekStr) {
            const dayIdx = dayDate.getDay();
            weekDayDist[dayIdx] += statistics.dailyMetrics[date].tracksPlayed;
          }
        }
      }

      weeklyMetric.mostActiveDay = weekDayDist.indexOf(
        Math.max(...weekDayDist),
      );
      statistics.weeklyMetrics[weekStr] = weeklyMetric;

      // Update monthly metrics
      const monthlyMetric = statistics.monthlyMetrics[month] || {
        date: month,
        listeningTimeMs: 0,
        tracksPlayed: 0,
        tracksSkipped: 0,
        uniqueArtists: new Set<string>(),
        uniqueTracks: new Set<string>(),
        weeklyTrend: [],
        skipRateChange: 0,
      };

      monthlyMetric.listeningTimeMs += playedTimeMs;
      monthlyMetric.tracksPlayed += 1;
      if (wasSkipped) monthlyMetric.tracksSkipped += 1;

      // Ensure uniqueArtists is a Set
      if (!monthlyMetric.uniqueArtists) {
        monthlyMetric.uniqueArtists = new Set<string>();
      } else if (Array.isArray(monthlyMetric.uniqueArtists)) {
        monthlyMetric.uniqueArtists = new Set<string>(
          monthlyMetric.uniqueArtists,
        );
      } else if (
        typeof monthlyMetric.uniqueArtists === "object" &&
        !(monthlyMetric.uniqueArtists instanceof Set)
      ) {
        // Handle case where it's an object but not a Set
        monthlyMetric.uniqueArtists = new Set<string>();
      }

      // Ensure uniqueTracks is a Set
      if (!monthlyMetric.uniqueTracks) {
        monthlyMetric.uniqueTracks = new Set<string>();
      } else if (Array.isArray(monthlyMetric.uniqueTracks)) {
        monthlyMetric.uniqueTracks = new Set<string>(
          monthlyMetric.uniqueTracks,
        );
      } else if (
        typeof monthlyMetric.uniqueTracks === "object" &&
        !(monthlyMetric.uniqueTracks instanceof Set)
      ) {
        // Handle case where it's an object but not a Set
        monthlyMetric.uniqueTracks = new Set<string>();
      }

      // Now safely add to Sets
      (monthlyMetric.uniqueArtists as Set<string>).add(artistId);
      (monthlyMetric.uniqueTracks as Set<string>).add(trackId);

      // Calculate weekly trends for the month
      const weeks = Object.keys(statistics.weeklyMetrics)
        .filter((w) => w.startsWith(month.substring(0, 4)))
        .filter((w) => {
          const weekDate = getDateOfISOWeek(
            parseInt(w.substring(6)),
            parseInt(w.substring(0, 4)),
          );
          return weekDate.toISOString().substring(0, 7) === month;
        });

      monthlyMetric.weeklyTrend = weeks.map(
        (w) => statistics.weeklyMetrics[w].tracksPlayed,
      );

      // Calculate month-over-month skip rate change
      const prevMonth = new Date(date.getFullYear(), date.getMonth() - 1, 1)
        .toISOString()
        .substring(0, 7);

      if (statistics.monthlyMetrics[prevMonth]) {
        const prevMonthData = statistics.monthlyMetrics[prevMonth];
        const prevSkipRate =
          prevMonthData.tracksSkipped / prevMonthData.tracksPlayed;
        const currentSkipRate =
          monthlyMetric.tracksSkipped / monthlyMetric.tracksPlayed;

        // Calculate percentage change
        monthlyMetric.skipRateChange =
          currentSkipRate !== 0 && prevSkipRate !== 0
            ? ((currentSkipRate - prevSkipRate) / prevSkipRate) * 100
            : 0;
      }

      statistics.monthlyMetrics[month] = monthlyMetric;

      // Update artist metrics
      const artistMetric = statistics.artistMetrics[artistId] || {
        id: artistId,
        name: artistName,
        listeningTimeMs: 0,
        skipRate: 0,
        tracksPlayed: 0,
        avgListeningBeforeSkipMs: 0,
        mostPlayedTrackId: "",
        mostSkippedTrackId: "",
        recentListenCount: 0,
        isNewDiscovery: false,
      };

      artistMetric.listeningTimeMs += playedTimeMs;
      artistMetric.tracksPlayed += 1;

      // Track most played and most skipped
      const artistTrackCount: Record<string, number> = {};
      const artistSkipCount: Record<string, number> = {};

      // Get existing data
      Object.values(statistics.sessions).forEach((session) => {
        session.trackIds.forEach((tid) => {
          if (tid === trackId) {
            artistTrackCount[tid] = (artistTrackCount[tid] || 0) + 1;
          }
        });
      });

      // Add current track play
      artistTrackCount[trackId] = (artistTrackCount[trackId] || 0) + 1;

      if (wasSkipped) {
        artistSkipCount[trackId] = (artistSkipCount[trackId] || 0) + 1;
      }

      // Find most played track
      let mostPlayed = artistMetric.mostPlayedTrackId;
      let maxPlays = 0;

      for (const [tid, count] of Object.entries(artistTrackCount)) {
        if (count > maxPlays) {
          maxPlays = count;
          mostPlayed = tid;
        }
      }

      // Find most skipped track
      let mostSkipped = artistMetric.mostSkippedTrackId;
      let maxSkips = 0;

      for (const [tid, count] of Object.entries(artistSkipCount)) {
        if (count > maxSkips) {
          maxSkips = count;
          mostSkipped = tid;
        }
      }

      artistMetric.mostPlayedTrackId = mostPlayed;
      artistMetric.mostSkippedTrackId = mostSkipped;

      // Update skip rate and average listening time
      const totalPlays = artistMetric.tracksPlayed;
      const newSkipRate =
        (artistMetric.skipRate * (totalPlays - 1) + (wasSkipped ? 1 : 0)) /
        totalPlays;

      artistMetric.skipRate = newSkipRate;

      if (wasSkipped) {
        const oldAvgTimeBeforeSkip = artistMetric.avgListeningBeforeSkipMs;
        const oldSkipCount = Math.round(
          artistMetric.skipRate * (totalPlays - 1),
        );

        if (oldSkipCount > 0) {
          artistMetric.avgListeningBeforeSkipMs =
            (oldAvgTimeBeforeSkip * oldSkipCount + playedTimeMs) /
            (oldSkipCount + 1);
        } else {
          artistMetric.avgListeningBeforeSkipMs = playedTimeMs;
        }
      }

      // Calculate recent listen count and new discovery status
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

      // Check when this artist was first listened to
      const firstListen =
        Object.entries(statistics.dailyMetrics)
          .filter(([, metric]) => {
            const artistsArray = Array.isArray(metric.uniqueArtists)
              ? metric.uniqueArtists
              : Array.from(metric.uniqueArtists as Set<string>);
            return artistsArray.includes(artistId);
          })
          .map(([dateKey]) => dateKey)
          .sort()[0] || dateStr;

      // Update new discovery status
      artistMetric.isNewDiscovery = firstListen >= thirtyDaysAgoStr;

      // If this is a new discovery, add to recent discoveries list
      if (
        artistMetric.isNewDiscovery &&
        !statistics.recentDiscoveries?.includes(artistId)
      ) {
        statistics.recentDiscoveries?.push(artistId);
        // Keep the list trimmed to most recent 50 discoveries
        if (
          statistics.recentDiscoveries &&
          statistics.recentDiscoveries.length > 50
        ) {
          statistics.recentDiscoveries =
            statistics.recentDiscoveries.slice(-50);
        }
      }

      // Count plays in the last 30 days
      artistMetric.recentListenCount = Object.entries(statistics.dailyMetrics)
        .filter(([dateKey]) => dateKey >= thirtyDaysAgoStr)
        .reduce((count, [, metric]) => {
          const artistsArray = Array.isArray(metric.uniqueArtists)
            ? metric.uniqueArtists
            : Array.from(metric.uniqueArtists as Set<string>);
          return count + (artistsArray.includes(artistId) ? 1 : 0);
        }, 1); // Include current play

      statistics.artistMetrics[artistId] = artistMetric;

      // Update global statistics - recalculate instead of using the existing logic
      statistics.totalUniqueTracks = calculateUniqueTrackCount(statistics);
      statistics.totalUniqueArtists = calculateUniqueArtistCount(statistics);

      statistics.totalListeningTimeMs += playedTimeMs;

      // Calculate overall skip rate
      const totalTracks = Object.values(statistics.dailyMetrics).reduce(
        (sum, day) => sum + day.tracksPlayed,
        0,
      );

      const totalSkipped = Object.values(statistics.dailyMetrics).reduce(
        (sum, day) => sum + day.tracksSkipped,
        0,
      );

      statistics.overallSkipRate =
        totalTracks > 0 ? totalSkipped / totalTracks : 0;

      // Update recent skip rate trend (last 14 days)
      const last14Days = Object.keys(statistics.dailyMetrics).sort().slice(-14);

      statistics.recentSkipRateTrend = last14Days.map((dateKey) => {
        const metric = statistics.dailyMetrics[dateKey];
        return metric.tracksPlayed > 0
          ? metric.tracksSkipped / metric.tracksPlayed
          : 0;
      });

      // Pad with zeros if we don't have 14 days of data yet
      while (statistics.recentSkipRateTrend.length < 14) {
        statistics.recentSkipRateTrend.unshift(0);
      }

      // Update recent listening time trend (last 14 days)
      statistics.recentListeningTimeTrend = last14Days.map((dateKey) => {
        return statistics.dailyMetrics[dateKey].listeningTimeMs;
      });

      // Pad with zeros if we don't have 14 days of data yet
      while (statistics.recentListeningTimeTrend.length < 14) {
        statistics.recentListeningTimeTrend.unshift(0);
      }

      // Update top artists and calculate discovery rate
      const artistPlaytime: Record<string, number> = {};
      const firstAppearances: Record<string, string> = {}; // artistId -> first date

      // Calculate artist playtime and first appearances
      for (const [date, day] of Object.entries(statistics.dailyMetrics)) {
        let artists: string[] = [];

        // Handle both Set and array types
        if (day.uniqueArtists instanceof Set) {
          artists = Array.from(day.uniqueArtists);
        } else if (Array.isArray(day.uniqueArtists)) {
          artists = day.uniqueArtists;
        }

        artists.forEach((artistId) => {
          if (
            !firstAppearances[artistId] ||
            date < firstAppearances[artistId]
          ) {
            firstAppearances[artistId] = date;
          }
        });
      }

      // Sum up artist playtimes
      for (const [artistId, metrics] of Object.entries(
        statistics.artistMetrics,
      )) {
        artistPlaytime[artistId] = metrics.listeningTimeMs;
      }

      // Sort artists by playtime and get top IDs
      statistics.topArtistIds = Object.entries(artistPlaytime)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id]) => id);

      // Calculate discovery rate (new artists in last 30 days / total artists)
      const newArtistsCount = Object.values(firstAppearances).filter(
        (date) => date >= thirtyDaysAgoStr,
      ).length;

      statistics.discoveryRate =
        statistics.totalUniqueArtists > 0
          ? newArtistsCount / statistics.totalUniqueArtists
          : 0;

      // Update device metrics
      const deviceId = `${deviceType || "Unknown"}-${deviceName || "Unknown"}`;
      const deviceMetric = statistics.deviceMetrics[deviceId] || {
        deviceType: deviceType || "Unknown",
        deviceName: deviceName || "Unknown",
        listeningTimeMs: 0,
        tracksPlayed: 0,
        skipRate: 0,
        peakUsageHour: 0,
      };

      deviceMetric.listeningTimeMs += playedTimeMs;
      deviceMetric.tracksPlayed += 1;

      // Update device skip rate
      deviceMetric.skipRate =
        (deviceMetric.skipRate * (deviceMetric.tracksPlayed - 1) +
          (wasSkipped ? 1 : 0)) /
        deviceMetric.tracksPlayed;

      // Update peak usage hour
      const deviceHourCount: Record<number, number> = {};

      // Increment current hour
      deviceHourCount[hourOfDay] = (deviceHourCount[hourOfDay] || 0) + 1;

      // Find peak usage hour
      let peakHour = deviceMetric.peakUsageHour;
      let maxUsage = deviceHourCount[peakHour] || 0;

      for (const [hour, count] of Object.entries(deviceHourCount)) {
        if (count > maxUsage) {
          maxUsage = count;
          peakHour = parseInt(hour);
        }
      }

      deviceMetric.peakUsageHour = peakHour;
      statistics.deviceMetrics[deviceId] = deviceMetric;

      // Update track metrics
      const trackMetric = statistics.trackMetrics[trackId] || {
        id: trackId,
        name: trackName,
        artistName: artistName,
        playCount: 0,
        skipCount: 0,
        avgCompletionPercent: 0,
        lastPlayed: new Date().toISOString(),
        hasBeenRepeated: false,
      };

      trackMetric.playCount += 1;
      if (wasSkipped) trackMetric.skipCount += 1;

      // Update average completion percentage
      const completionPercent = (playedTimeMs / durationMs) * 100;
      trackMetric.avgCompletionPercent =
        (trackMetric.avgCompletionPercent * (trackMetric.playCount - 1) +
          completionPercent) /
        trackMetric.playCount;

      trackMetric.lastPlayed = new Date(timestamp).toISOString();

      // Check if track has been repeated in the current session
      if (statistics.sessions && statistics.sessions.length > 0) {
        const currentSession =
          statistics.sessions[statistics.sessions.length - 1];
        // If the track appears more than once in the current session
        if (currentSession.trackIds) {
          trackMetric.hasBeenRepeated =
            currentSession.trackIds.filter((id) => id === trackId).length > 1;
        }
      }

      statistics.trackMetrics[trackId] = trackMetric;

      // Update skip patterns
      const skipPatternKey = dateStr;
      const skipPattern = statistics.skipPatterns[skipPatternKey] || {
        date: dateStr,
        maxConsecutiveSkips: 0,
        skipSequenceCount: 0,
        avgSkipsPerSequence: 0,
        highSkipRateHours: [],
      };

      // Track consecutive skips
      if (wasSkipped && statistics.sessions && statistics.sessions.length > 0) {
        const currentSession =
          statistics.sessions[statistics.sessions.length - 1];

        // Count consecutive skips in current session
        let consecutiveSkips = 1; // Start with 1 for the current skip

        if (currentSession.trackIds && currentSession.trackIds.length > 1) {
          let i = currentSession.trackIds.length - 2; // Start from the previous track

          while (i >= 0 && i >= currentSession.trackIds.length - 10) {
            // Look at most 10 tracks back
            const trackAtIndex = currentSession.trackIds[i];
            const trackMetrics = statistics.trackMetrics[trackAtIndex];
            if (
              trackMetrics &&
              trackMetrics.skipCount === trackMetrics.playCount
            ) {
              consecutiveSkips++;
            } else {
              break;
            }
            i--;
          }
        }

        // If we have a sequence of 2+ skips
        if (consecutiveSkips > 1) {
          skipPattern.skipSequenceCount += 1;
          skipPattern.avgSkipsPerSequence =
            (skipPattern.avgSkipsPerSequence *
              (skipPattern.skipSequenceCount - 1) +
              consecutiveSkips) /
            skipPattern.skipSequenceCount;

          if (consecutiveSkips > skipPattern.maxConsecutiveSkips) {
            skipPattern.maxConsecutiveSkips = consecutiveSkips;
          }
        }

        // Increment sequential skips in daily metrics
        if (dailyMetric.sequentialSkips === undefined)
          dailyMetric.sequentialSkips = 0;
        if (consecutiveSkips > 1) dailyMetric.sequentialSkips += 1;

        // Update high skip rate hours
        if (!skipPattern.highSkipRateHours) skipPattern.highSkipRateHours = [];
        if (!skipPattern.highSkipRateHours.includes(hourOfDay)) {
          skipPattern.highSkipRateHours.push(hourOfDay);
          skipPattern.highSkipRateHours.sort((a, b) => a - b);

          // Keep only the top 5 hours with highest skip rates
          if (skipPattern.highSkipRateHours.length > 5) {
            skipPattern.highSkipRateHours = skipPattern.highSkipRateHours.slice(
              0,
              5,
            );
          }
        }
      }

      statistics.skipPatterns[skipPatternKey] = skipPattern;
      statistics.dailyMetrics[dateStr] = dailyMetric;

      // Update sessions or create new session
      // Determine if this belongs to an existing session or starts a new one
      // Sessions are considered continuous if tracks are played within 30 minutes of each other
      const currentTime = timestamp;
      let sessionFound = false;

      if (statistics.sessions && statistics.sessions.length > 0) {
        // Reverse the array to find the most recent session first
        const recentSessions = [...statistics.sessions].reverse();

        for (const session of recentSessions) {
          if (!session.endTime) continue; // Skip sessions without end time

          const sessionEndTime = new Date(session.endTime).getTime();

          // If within 30 minutes (1800000ms), add to existing session
          if (currentTime - sessionEndTime <= 1800000) {
            session.endTime = new Date(currentTime).toISOString();
            session.durationMs =
              currentTime - new Date(session.startTime).getTime();

            if (!session.trackIds) session.trackIds = [];
            session.trackIds.push(trackId);

            if (!session.skippedTracks) session.skippedTracks = 0;
            if (wasSkipped) session.skippedTracks += 1;

            session.deviceName = deviceName || session.deviceName;
            session.deviceType = deviceType || session.deviceType;

            // Check for track repetition within session
            if (session.repeatedTracks === undefined)
              session.repeatedTracks = 0;
            const trackOccurrences = session.trackIds.filter(
              (id) => id === trackId,
            ).length;
            if (trackOccurrences > 1) {
              session.repeatedTracks += 1;
            }

            // Calculate non-skip streaks
            if (session.longestNonSkipStreak === undefined)
              session.longestNonSkipStreak = 0;

            // Count current non-skip streak if not skipped
            if (!wasSkipped && session.trackIds) {
              let currentStreak = 1;
              let i = session.trackIds.length - 2; // Start from previous track

              while (i >= 0) {
                const prevTrackId = session.trackIds[i];
                const prevTrackMetric = statistics.trackMetrics[prevTrackId];
                if (
                  prevTrackMetric &&
                  prevTrackMetric.skipCount < prevTrackMetric.playCount
                ) {
                  currentStreak++;
                } else {
                  break;
                }
                i--;
              }

              // Update longest streak if current one is longer
              if (currentStreak > session.longestNonSkipStreak) {
                session.longestNonSkipStreak = currentStreak;
              }
            }

            sessionFound = true;
            break;
          }
        }
      }

      // If no suitable session found, create new one
      if (!sessionFound) {
        const newSession = {
          id: `session-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          startTime: new Date(currentTime).toISOString(),
          endTime: new Date(currentTime).toISOString(),
          durationMs: 0,
          trackIds: [trackId],
          skippedTracks: wasSkipped ? 1 : 0,
          deviceName: deviceName || "Unknown",
          deviceType: deviceType || "Unknown",
          repeatedTracks: 0,
          longestNonSkipStreak: wasSkipped ? 0 : 1,
        };

        if (!statistics.sessions) statistics.sessions = [];
        statistics.sessions.push(newSession);

        // Keep only the 100 most recent sessions
        if (statistics.sessions.length > 100) {
          statistics.sessions = statistics.sessions.slice(-100);
        }
      }

      // Calculate average session duration
      if (statistics.sessions && statistics.sessions.length > 0) {
        const totalDuration = statistics.sessions.reduce(
          (sum, session) => sum + (session.durationMs || 0),
          0,
        );
        statistics.avgSessionDurationMs =
          totalDuration / statistics.sessions.length;

        // Update weekly metric's avg session duration
        if (weeklyMetric && weeklyMetric.avgSessionDurationMs !== undefined) {
          const sessionsThisWeek = statistics.sessions.filter((session) => {
            if (!session.startTime) return false;
            const sessionDate = new Date(session.startTime);
            const sessionWeekNum = getISOWeek(sessionDate);
            const sessionWeekStr = `${sessionDate.getFullYear()}-W${sessionWeekNum.toString().padStart(2, "0")}`;
            return sessionWeekStr === weekStr;
          });

          if (sessionsThisWeek.length > 0) {
            const weekTotalDuration = sessionsThisWeek.reduce(
              (sum, session) => sum + (session.durationMs || 0),
              0,
            );
            weeklyMetric.avgSessionDurationMs =
              weekTotalDuration / sessionsThisWeek.length;
          }
        }
      }

      // Calculate repeat listening rate
      if (statistics.sessions && statistics.sessions.length > 0) {
        const totalRepeatTracks = statistics.sessions.reduce(
          (sum, session) => sum + (session.repeatedTracks || 0),
          0,
        );
        const totalTracksInSessions = statistics.sessions.reduce(
          (sum, session) =>
            sum + (session.trackIds ? session.trackIds.length : 0),
          0,
        );

        statistics.repeatListeningRate =
          totalTracksInSessions > 0
            ? totalRepeatTracks / totalTracksInSessions
            : 0;
      }

      // Make sure to update all the metrics by assigning them back to the statistics object
      if (weeklyMetric) statistics.weeklyMetrics[weekStr] = weeklyMetric;
      if (monthlyMetric) statistics.monthlyMetrics[month] = monthlyMetric;
      if (artistMetric) statistics.artistMetrics[artistId] = artistMetric;
      statistics.dailyMetrics[dateStr] = dailyMetric;
      statistics.skipPatterns[skipPatternKey] = skipPattern;

      // Save updated statistics
      try {
        await saveStatistics(statistics);
        return true;
      } catch (error) {
        console.error("Failed to save updated statistics:", error);
        return false;
      }
    }

    // Add explicit return for the non-skip path
    return true;
  } catch (error) {
    console.error("Failed to update track statistics:", error);
    return false;
  }
}

/**
 * Helper function to get the ISO week number from a date
 *
 * Calculates the ISO 8601 week number for any given date. In this standard:
 * - Weeks start on Monday
 * - The first week of the year contains the first Thursday of that year
 * - Week 1 is the week containing January 4th
 *
 * This calculation handles edge cases around year boundaries correctly and
 * provides consistent week numbering for date-based aggregation in statistics.
 *
 * @param date - Date object to calculate the ISO week number for
 * @returns The ISO week number (1-53)
 * @private Internal helper function
 * @source
 */
function getISOWeek(date: Date): number {
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  // Thursday in current week decides the year
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  // January 4 is always in week 1
  const week1 = new Date(d.getFullYear(), 0, 4);
  // Adjust to Thursday in week 1 and count number of weeks from date to week1
  return (
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7,
    )
  );
}

/**
 * Helper function to get a date from ISO week number
 *
 * Converts an ISO week number and year into a Date object representing
 * the start of that week (Monday). This is the inverse operation of getISOWeek
 * and is used for reconstructing dates from weekly aggregated data.
 *
 * The function handles the complexities of the ISO 8601 week date system,
 * accounting for week boundaries and ensuring consistency with the week
 * numbering used throughout the statistics system.
 *
 * @param week - ISO week number (1-53)
 * @param year - Year containing the specified week
 * @returns Date object representing the Monday of the specified week
 * @private Internal helper function
 */
function getDateOfISOWeek(week: number, year: number): Date {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dayOfWeek = simple.getDay();
  const ISOweekStart = simple;
  if (dayOfWeek <= 4)
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  return ISOweekStart;
}

/**
 * Clear all statistics data and reset to default empty state
 *
 * Completely erases all collected listening statistics and reinitializes
 * the statistics store with empty default values. This function is typically
 * used when the user wants to reset their listening history or when data
 * integrity issues require a fresh start.
 *
 * The function:
 * - Creates a new default statistics object with the current timestamp
 * - Ensures the target directory exists
 * - Directly writes the default data to storage, bypassing the normal save process
 * - Handles any errors that occur during the reset operation
 *
 * @returns Promise resolving to boolean indicating success (true) or failure (false)
 *
 * @example
 * // Reset all statistics
 * const success = await clearStatistics();
 * if (success) {
 *   showNotification("Statistics have been reset");
 * } else {
 *   showErrorMessage("Failed to reset statistics");
 * }
 * @source
 */
export const clearStatistics = async (): Promise<boolean> => {
  try {
    // Create a fresh default statistics object with current timestamp
    const freshDefault = {
      ...defaultStatisticsData,
      lastUpdated: new Date().toISOString(),
    };

    // Make sure directory exists
    await ensureDir(join(app.getPath("userData"), "data"));

    // Write the default data directly to file instead of using saveStatistics
    // to avoid any issues with async handling
    writeJsonSync(statisticsFilePath, freshDefault, { spaces: 2 });

    return true;
  } catch (error) {
    console.error("Error clearing statistics:", error);
    return false;
  }
};

/**
 * Analyzes the manual vs. automatic skip patterns in the user's listening history
 *
 * Compares and contrasts user-initiated skips with automatic skips (timeout or end-of-preview)
 * to identify patterns in explicit user rejection versus passive non-engagement. This function
 * processes the entire skip history to build a comprehensive picture of user intent.
 *
 * The analysis includes:
 * - Total count of all skips, categorized as manual or automatic
 * - Percentage distribution between manual and automatic skips
 * - Hourly distribution of both skip types across a 24-hour day
 * - Identification of peak hours for both manual and automatic skips
 *
 * This analysis helps distinguish between active content rejection (manual skips)
 * and passive disengagement (automatic skips), providing insights into user
 * intent and attention patterns throughout the day.
 *
 * @returns Promise resolving to a detailed manual vs. automatic skip analysis object
 *
 * @example
 * // Analyze manual vs. automatic skip behavior
 * const skipTypeAnalysis = await analyzeManualVsAutoSkipPatterns();
 * console.log(`Manual skips: ${skipTypeAnalysis.manualSkipPercentage.toFixed(1)}%`);
 * console.log(`Auto skips: ${skipTypeAnalysis.autoSkipPercentage.toFixed(1)}%`);
 * renderSkipTypeChart(skipTypeAnalysis);
 * @source
 */
export async function analyzeManualVsAutoSkipPatterns(): Promise<{
  totalSkips: number;
  manualSkips: number;
  autoSkips: number;
  manualSkipPercentage: number;
  autoSkipPercentage: number;
  manualByHour: number[];
  autoByHour: number[];
  mostFrequentManualSkipHour: number;
  mostFrequentAutoSkipHour: number;
}> {
  try {
    // Import the store module for getSkippedTracks
    const store = await import("../../helpers/storage/store");
    const skippedTracks = await store.getSkippedTracks();

    // Initialize result structure
    const result = {
      totalSkips: 0,
      manualSkips: 0,
      autoSkips: 0,
      manualSkipPercentage: 0,
      autoSkipPercentage: 0,
      manualByHour: Array(24).fill(0),
      autoByHour: Array(24).fill(0),
      mostFrequentManualSkipHour: 0,
      mostFrequentAutoSkipHour: 0,
    };

    // Aggregate data from skipped tracks
    skippedTracks.forEach((track: SkippedTrack) => {
      const manualCount = track.manualSkipCount || 0;
      const autoCount = track.autoSkipCount || 0;

      result.totalSkips += track.skipCount || 0;
      result.manualSkips += manualCount;
      result.autoSkips += autoCount;

      // Analyze time-of-day patterns if available - use timeOfDay instead of timeOfDayData
      if (track.timeOfDay && typeof track.timeOfDay === "object") {
        // Convert timeOfDay object to array format
        const hourlyData = Array(24).fill(0);

        // Process the timeOfDay object which contains string hour keys
        Object.entries(track.timeOfDay).forEach(([hourKey, count]) => {
          const hour = parseInt(hourKey, 10);
          if (!isNaN(hour) && hour >= 0 && hour < 24) {
            hourlyData[hour] = count;
          }
        });

        // We need to estimate how many skips at each hour were manual vs. auto
        // using the overall ratio for this track as an approximation
        const totalTrackSkips = manualCount + autoCount;
        if (totalTrackSkips > 0) {
          const manualRatio = manualCount / totalTrackSkips;

          hourlyData.forEach((hourCount: number, hour: number) => {
            const estimatedManualForHour = Math.round(hourCount * manualRatio);
            const estimatedAutoForHour = hourCount - estimatedManualForHour;

            result.manualByHour[hour] += estimatedManualForHour;
            result.autoByHour[hour] += estimatedAutoForHour;
          });
        }
      }
    });

    // Calculate percentages
    if (result.totalSkips > 0) {
      result.manualSkipPercentage =
        (result.manualSkips / result.totalSkips) * 100;
      result.autoSkipPercentage = (result.autoSkips / result.totalSkips) * 100;
    }

    // Find peak hours
    let maxManual = 0;
    let maxAuto = 0;

    result.manualByHour.forEach((count, hour) => {
      if (count > maxManual) {
        maxManual = count;
        result.mostFrequentManualSkipHour = hour;
      }
    });

    result.autoByHour.forEach((count, hour) => {
      if (count > maxAuto) {
        maxAuto = count;
        result.mostFrequentAutoSkipHour = hour;
      }
    });

    return result;
  } catch (error) {
    console.error("Error analyzing manual vs. automatic skip patterns:", error);
    // Return a default result on error
    return {
      totalSkips: 0,
      manualSkips: 0,
      autoSkips: 0,
      manualSkipPercentage: 0,
      autoSkipPercentage: 0,
      manualByHour: Array(24).fill(0),
      autoByHour: Array(24).fill(0),
      mostFrequentManualSkipHour: 0,
      mostFrequentAutoSkipHour: 0,
    };
  }
}

/**
 * Analyzes skip patterns based on listening context
 *
 * Performs a detailed analysis of how skip behavior varies across different
 * listening contexts, such as playlists, albums, and artist pages. This function
 * identifies which contexts tend to produce higher skip rates and which lead
 * to more engaged listening.
 *
 * The analysis includes:
 * - Breakdown of skips by context type (playlist, album, artist, etc.)
 * - Percentage distribution across different context types
 * - Identification of specific high-skip contexts (e.g., particular playlists)
 * - Ranking of contexts by skip frequency
 * - Contextual metadata for each top-skipped context
 *
 * This analysis helps identify whether certain context types lead to more
 * skipping behavior and can reveal patterns in content curation that may
 * affect listening engagement.
 *
 * @returns Promise resolving to a detailed context-based skip analysis
 *
 * @example
 * // Analyze which contexts lead to most skips
 * const contextPatterns = await analyzeListeningContextPatterns();
 * if (contextPatterns.mostSkippedContext) {
 *   console.log(`Most skipped in: ${contextPatterns.mostSkippedContext.type} - ${contextPatterns.mostSkippedContext.name}`);
 * }
 * @source
 */
export async function analyzeListeningContextPatterns(): Promise<{
  totalSkips: number;
  byContextType: Record<
    string,
    {
      count: number;
      percentage: number;
      topContexts: Array<{
        id: string;
        name: string;
        count: number;
        percentage: number;
      }>;
    }
  >;
  mostSkippedContext: {
    type: string;
    id: string;
    name: string;
    count: number;
  } | null;
}> {
  try {
    // Read skipped tracks from file
    const skippedTracksFilePath = join(
      getUserDataFolder(),
      "skipped_tracks.json",
    );

    if (!existsSync(skippedTracksFilePath)) {
      return {
        totalSkips: 0,
        byContextType: {},
        mostSkippedContext: null,
      };
    }

    const skippedTracks: SkippedTrack[] =
      readJsonSync(skippedTracksFilePath, { throws: false }) || [];

    // Default result structure
    const result = {
      totalSkips: 0,
      byContextType: {} as Record<
        string,
        {
          count: number;
          percentage: number;
          topContexts: Array<{
            id: string;
            name: string;
            count: number;
            percentage: number;
          }>;
        }
      >,
      mostSkippedContext: null as {
        type: string;
        id: string;
        name: string;
        count: number;
      } | null,
    };

    // Process each skipped track
    skippedTracks.forEach((track: SkippedTrack) => {
      if (!track.contextStats) return;

      // Create a typed version of contextStats that allows string indexing
      type ContextData = {
        type: string;
        name?: string;
        uri?: string;
        count: number;
      };

      type IndexableContextStats = {
        [key: string]: {
          count: number;
          contexts?: Record<string, ContextData>;
        };
      };

      // Cast to the indexable type to avoid TypeScript errors
      const indexableContextStats =
        track.contextStats as unknown as IndexableContextStats;

      // Count total skips that have context data
      let trackSkipsWithContext = 0;

      // Use for...in loop with the properly typed object
      for (const contextType in indexableContextStats) {
        if (contextType !== "total" && contextType !== "contexts") {
          // Access specific context types and their count values
          const contextCount = indexableContextStats[contextType]?.count;
          if (typeof contextCount === "number") {
            trackSkipsWithContext += contextCount;
          }
        }
      }

      result.totalSkips += trackSkipsWithContext;

      // Process each context type
      for (const contextType in indexableContextStats) {
        if (contextType !== "total" && contextType !== "contexts") {
          // Initialize context type in result if needed
          if (!result.byContextType[contextType]) {
            result.byContextType[contextType] = {
              count: 0,
              percentage: 0,
              topContexts: [],
            };
          }

          // Access the count and contexts safely using the typed object
          const contextCount = indexableContextStats[contextType]?.count;
          const contexts = indexableContextStats[contextType]?.contexts;

          // Add counts from this track
          if (typeof contextCount === "number") {
            result.byContextType[contextType].count += contextCount;
          }

          // Process individual contexts within this type
          if (contexts) {
            for (const contextId in contexts) {
              const contextData = contexts[contextId];
              if (!contextData) continue;

              // Find existing context or create new entry
              const existingContext = result.byContextType[
                contextType
              ].topContexts.find((c) => c.id === contextId);

              if (existingContext) {
                existingContext.count += contextData.count || 0;
              } else {
                result.byContextType[contextType].topContexts.push({
                  id: contextId,
                  name: contextData.name || "(Unknown)",
                  count: contextData.count || 0,
                  percentage: 0, // Will calculate later
                });
              }

              // Check if this is the most skipped context overall
              if (
                !result.mostSkippedContext ||
                (result.mostSkippedContext &&
                  (contextData.count || 0) > result.mostSkippedContext.count)
              ) {
                result.mostSkippedContext = {
                  type: contextType,
                  id: contextId,
                  name: contextData.name || "(Unknown)",
                  count: contextData.count || 0,
                };
              }
            }
          }
        }
      }
    });

    // Calculate percentages
    if (result.totalSkips > 0) {
      Object.keys(result.byContextType).forEach((contextType) => {
        // Calculate percentage for this context type
        result.byContextType[contextType].percentage =
          (result.byContextType[contextType].count / result.totalSkips) * 100;

        // Sort top contexts by count (descending)
        result.byContextType[contextType].topContexts.sort(
          (a, b) => b.count - a.count,
        );

        // Limit to top 5 contexts
        result.byContextType[contextType].topContexts = result.byContextType[
          contextType
        ].topContexts.slice(0, 5);

        // Calculate percentages for each context
        result.byContextType[contextType].topContexts.forEach((context) => {
          context.percentage =
            (context.count / result.byContextType[contextType].count) * 100;
        });
      });
    }

    return result;
  } catch (error) {
    console.error("Error analyzing listening context patterns:", error);
    return {
      totalSkips: 0,
      byContextType: {},
      mostSkippedContext: null,
    };
  }
}

/**
 * Gets the user data folder path
 *
 * Provides a consistent way to access the application's user data directory
 * across the statistics module. This function centralizes the path retrieval
 * logic, making it easier to maintain path consistency throughout the codebase.
 *
 * The user data folder is where all persistent application data is stored,
 * including statistics, settings, and cache files. Using this function ensures
 * that all statistics-related files are stored in the correct location.
 *
 * @returns The absolute path to the user data folder
 * @private Internal helper function
 */
function getUserDataFolder(): string {
  return app.getPath("userData");
}

/**
 * Analyzes time-of-day skip patterns
 *
 * Performs a comprehensive analysis of when users tend to skip tracks throughout
 * the day, week, and across different time periods. This function identifies
 * temporal patterns in listening behavior, such as peak skip hours, day of week
 * trends, and weekday vs. weekend differences.
 *
 * The analysis includes:
 * - Hourly distribution of skips across 24 hours
 * - Percentage-based normalization to account for overall listening volume
 * - Identification of peak skip hours (when users are most likely to skip)
 * - Low skip periods (when users are most engaged)
 * - Time-of-day categorization (morning, afternoon, evening, night)
 * - Day-of-week distribution patterns
 * - Weekday vs. weekend comparison
 *
 * This analysis helps identify optimal listening times and pattern differences
 * that may correlate with user mood, activity level, or environmental factors.
 *
 * @returns Promise resolving to a detailed time-based pattern analysis object
 *
 * @example
 * // Get time-based skip patterns for visualization
 * const timePatterns = await analyzeTimeOfDaySkipPatterns();
 * renderHourlyChart(timePatterns.hourlyDistribution);
 * highlightPeakHours(timePatterns.peakSkipHours);
 * @source
 */
export async function analyzeTimeOfDaySkipPatterns(): Promise<{
  hourlyDistribution: number[];
  hourlyPercentages: number[];
  peakSkipHours: number[];
  lowSkipHours: number[];
  morningSkips: number;
  afternoonSkips: number;
  eveningSkips: number;
  nightSkips: number;
  totalSkips: number;
  skipsByDayOfWeek: number[];
  weekdayVsWeekendSkips: {
    weekday: { count: number; percentage: number };
    weekend: { count: number; percentage: number };
  };
}> {
  try {
    // Get user data path
    const skippedTracksFilePath = join(
      getUserDataFolder(),
      "skipped_tracks.json",
    );

    if (!existsSync(skippedTracksFilePath)) {
      return getDefaultTimeOfDayResult();
    }

    const skippedTracks: SkippedTrack[] =
      readJsonSync(skippedTracksFilePath, { throws: false }) || [];

    // Initialize result structure with explicit types for arrays that were causing errors
    const result = {
      hourlyDistribution: Array(24).fill(0),
      hourlyPercentages: Array(24).fill(0),
      peakSkipHours: [] as number[],
      lowSkipHours: [] as number[],
      morningSkips: 0,
      afternoonSkips: 0,
      eveningSkips: 0,
      nightSkips: 0,
      totalSkips: 0,
      skipsByDayOfWeek: Array(7).fill(0),
      weekdayVsWeekendSkips: {
        weekday: { count: 0, percentage: 0 },
        weekend: { count: 0, percentage: 0 },
      },
    };

    // Process each skipped track's time data
    skippedTracks.forEach((track) => {
      // If we have hourly data - use timeOfDay instead of timeOfDayData
      if (track.timeOfDay && typeof track.timeOfDay === "object") {
        // Convert timeOfDay object to array format
        const hourlyData = Array(24).fill(0);

        // Process the timeOfDay object which contains string hour keys
        Object.entries(track.timeOfDay).forEach(([hourKey, count]) => {
          const hour = parseInt(hourKey, 10);
          if (!isNaN(hour) && hour >= 0 && hour < 24) {
            hourlyData[hour] = count;
          }
        });

        for (let hour = 0; hour < 24; hour++) {
          result.hourlyDistribution[hour] += hourlyData[hour];

          // Add to time of day groups
          if (hour >= 5 && hour <= 11) {
            result.morningSkips += hourlyData[hour];
          } else if (hour >= 12 && hour <= 17) {
            result.afternoonSkips += hourlyData[hour];
          } else if (hour >= 18 && hour <= 21) {
            result.eveningSkips += hourlyData[hour];
          } else {
            result.nightSkips += hourlyData[hour];
          }

          result.totalSkips += hourlyData[hour];
        }
      }

      // Process skip timestamps for day of week analysis
      // Use skipEvents timestamps instead of skipTimestamps
      if (track.skipEvents && Array.isArray(track.skipEvents)) {
        track.skipEvents.forEach((event) => {
          const timestamp = new Date(event.timestamp).getTime();
          if (!isNaN(timestamp)) {
            const date = new Date(timestamp);
            const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

            result.skipsByDayOfWeek[dayOfWeek]++;

            // Count weekday vs weekend
            if (dayOfWeek === 0 || dayOfWeek === 6) {
              result.weekdayVsWeekendSkips.weekend.count++;
            } else {
              result.weekdayVsWeekendSkips.weekday.count++;
            }
          }
        });
      }
    });

    // Calculate percentages
    if (result.totalSkips > 0) {
      for (let i = 0; i < 24; i++) {
        result.hourlyPercentages[i] =
          (result.hourlyDistribution[i] / result.totalSkips) * 100;
      }
    }

    // Find peak and low skip hours (top 3 and bottom 3)
    const hourlyRanked = [...result.hourlyDistribution]
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count);

    // Set the peak and low hours (using the defined array types)
    result.peakSkipHours = hourlyRanked.slice(0, 3).map((h) => h.hour);
    result.lowSkipHours = hourlyRanked
      .slice(-3)
      .reverse()
      .map((h) => h.hour);

    // Calculate weekday vs weekend percentages
    const totalDayOfWeekSkips = result.skipsByDayOfWeek.reduce(
      (sum, count) => sum + count,
      0,
    );
    if (totalDayOfWeekSkips > 0) {
      result.weekdayVsWeekendSkips.weekday.percentage =
        (result.weekdayVsWeekendSkips.weekday.count / totalDayOfWeekSkips) *
        100;

      result.weekdayVsWeekendSkips.weekend.percentage =
        (result.weekdayVsWeekendSkips.weekend.count / totalDayOfWeekSkips) *
        100;
    }

    return result;
  } catch (error) {
    console.error("Error analyzing time-of-day skip patterns:", error);
    return getDefaultTimeOfDayResult();
  }
}

/**
 * Returns default empty results for time-of-day analysis
 */
function getDefaultTimeOfDayResult() {
  return {
    hourlyDistribution: Array(24).fill(0),
    hourlyPercentages: Array(24).fill(0),
    peakSkipHours: [] as number[],
    lowSkipHours: [] as number[],
    morningSkips: 0,
    afternoonSkips: 0,
    eveningSkips: 0,
    nightSkips: 0,
    totalSkips: 0,
    skipsByDayOfWeek: Array(7).fill(0),
    weekdayVsWeekendSkips: {
      weekday: { count: 0, percentage: 0 },
      weekend: { count: 0, percentage: 0 },
    },
  };
}

/**
 * Generates a concise summary of key statistics
 *
 * Creates a high-level overview of the most important listening metrics
 * for dashboard display and quick insights. This function extracts and
 * calculates essential values from the full statistics data structure.
 *
 * The summary includes:
 * - Total number of unique tracks played
 * - Total skips across all time periods
 * - Overall skip percentage (ratio of skips to plays)
 * - Today's skip count (current day statistics)
 * - Current week's skip count
 * - Current month's skip count
 * - Average time before skipping (in seconds)
 *
 * This summary provides a quick snapshot of listening behavior without
 * the need to process the full statistics data structure, making it
 * ideal for dashboard displays and regular UI updates.
 *
 * @returns Promise resolving to a statistics summary object
 *
 * @example
 * // Display key metrics on dashboard
 * const summary = await getStatisticsSummary();
 * updateStatisticsWidget({
 *   skips: summary.totalSkips,
 *   rate: summary.skipPercentage.toFixed(1) + '%',
 *   todayCount: summary.todaySkips
 * });
 * @source
 */
export const getStatisticsSummary = async (): Promise<{
  totalTracks: number;
  totalSkips: number;
  skipPercentage: number;
  todaySkips: number;
  weekSkips: number;
  monthSkips: number;
  avgSkipTime: number;
}> => {
  try {
    const statistics = await getStatistics();

    // Calculate total tracks and skips
    const totalTracks = statistics.totalUniqueTracks || 0;

    // Calculate skip percentage
    let totalSkips = 0;
    let totalPlays = 0;

    // Count skips from track metrics
    Object.values(statistics.trackMetrics).forEach((track) => {
      totalSkips += track.skipCount || 0;
      totalPlays += track.playCount || 0;
    });

    // Calculate skip percentage (avoid divide by zero)
    const skipPercentage =
      totalPlays > 0 ? Math.round((totalSkips / totalPlays) * 100) : 0;

    // Calculate today's skips
    const today = new Date().toISOString().split("T")[0];
    const todayMetrics = statistics.dailyMetrics[today];
    const todaySkips = todayMetrics ? todayMetrics.tracksSkipped : 0;

    // Calculate this week's skips
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Set to beginning of week (Sunday)
    let weekSkips = 0;

    // Sum up skips for each day in the current week
    Object.entries(statistics.dailyMetrics).forEach(([dateStr, metrics]) => {
      const date = new Date(dateStr);
      if (date >= startOfWeek && date <= now) {
        weekSkips += metrics.tracksSkipped;
      }
    });

    // Calculate this month's skips
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    let monthSkips = 0;

    // Sum up skips for each day in the current month
    Object.entries(statistics.dailyMetrics).forEach(([dateStr, metrics]) => {
      const date = new Date(dateStr);
      if (date >= startOfMonth && date <= now) {
        monthSkips += metrics.tracksSkipped;
      }
    });

    // Calculate average skip time (in seconds)
    let totalSkipTimeMs = 0;
    let skipCount = 0;

    Object.values(statistics.trackMetrics).forEach((track) => {
      if (track.skipCount > 0 && track.avgCompletionPercent !== undefined) {
        // Only count tracks that have been skipped
        const trackDuration = 180000; // Default to 3 minutes if we don't have actual duration
        const avgSkipTimeForTrack =
          (track.avgCompletionPercent / 100) * trackDuration;
        totalSkipTimeMs += avgSkipTimeForTrack * track.skipCount;
        skipCount += track.skipCount;
      }
    });

    const avgSkipTime =
      skipCount > 0
        ? Math.round(totalSkipTimeMs / skipCount / 1000) // Convert to seconds
        : 60; // Default to 60 seconds if no data

    return {
      totalTracks,
      totalSkips,
      skipPercentage,
      todaySkips,
      weekSkips,
      monthSkips,
      avgSkipTime,
    };
  } catch (error) {
    console.error("Error getting statistics summary:", error);
    // Return default values if there's an error
    return {
      totalTracks: 0,
      totalSkips: 0,
      skipPercentage: 0,
      todaySkips: 0,
      weekSkips: 0,
      monthSkips: 0,
      avgSkipTime: 0,
    };
  }
};

/**
 * Retrieves a list of recently skipped tracks
 *
 * Fetches and formats information about the most recently skipped tracks,
 * including detailed metadata and skip statistics. This function provides
 * the data needed for "Recently Skipped" UI displays and trend analysis.
 *
 * The returned data includes:
 * - Track identifiers and basic metadata (name, artist, album)
 * - Timestamp of most recent skip
 * - Skip percentage (how often this track is skipped)
 * - Total skip count for each track
 *
 * The results are sorted by recency, with the most recently skipped tracks
 * appearing first. This provides an up-to-date view of listening behavior
 * and helps identify potential patterns in recently skipped content.
 *
 * @param limit - Maximum number of tracks to return (default: 10)
 * @returns Promise resolving to an array of recent skipped track objects
 *
 * @example
 * // Display the 5 most recently skipped tracks
 * const recentSkips = await getRecentSkippedTracks(5);
 * renderRecentSkipsWidget(recentSkips);
 * @source
 */
export const getRecentSkippedTracks = async (
  limit: number = 10,
): Promise<
  Array<{
    id: string;
    name: string;
    artist: string;
    album: string;
    timestamp: string;
    skipPercentage: number;
    skipCount: number;
  }>
> => {
  try {
    const statistics = await getStatistics();

    // Convert track metrics to array and sort by last played (most recent first)
    const tracks = Object.entries(statistics.trackMetrics)
      .map(([id, metrics]) => ({
        id,
        name: metrics.name || "Unknown Track",
        artist: metrics.artistName || "Unknown Artist",
        album: "Unknown Album", // We don't have album info in the metrics
        timestamp: metrics.lastPlayed || new Date().toISOString(),
        skipPercentage:
          metrics.skipCount > 0
            ? Math.round(
                (metrics.skipCount / Math.max(metrics.playCount, 1)) * 100,
              )
            : 0,
        skipCount: metrics.skipCount || 0,
      }))
      .filter((track) => track.skipCount > 0) // Only include tracks that have been skipped
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      ) // Sort by most recent
      .slice(0, limit); // Take only the specified number of tracks

    return tracks;
  } catch (error) {
    console.error("Error getting recent skipped tracks:", error);
    return [];
  }
};

/**
 * Retrieves the top skipped artists based on skip count and percentage
 *
 * Analyzes the artist-level skip statistics across the entire listening history
 * and returns a list of artists whose tracks are skipped most frequently. This
 * function helps identify potential patterns in artist preferences and listening
 * behavior.
 *
 * The analysis includes:
 * - Total skip count for each artist's tracks
 * - Skip percentage (skips relative to total plays)
 * - Number of tracks played for each artist
 * - Sorting by skip frequency with percentage as a secondary factor
 *
 * This data is useful for understanding which artists' music the user tends
 * to skip more frequently, which may indicate changing music preferences or
 * context-dependent listening patterns.
 *
 * @param limit - Maximum number of artists to return (default: 5)
 * @returns Promise resolving to an array of artists sorted by skip frequency
 *
 * @example
 * // Display the top 3 most frequently skipped artists
 * const topSkippedArtists = await getTopSkippedArtists(3);
 * renderArtistSkipChart(topSkippedArtists);
 * @source
 */
export const getTopSkippedArtists = async (
  limit: number = 5,
): Promise<
  Array<{
    id: string;
    name: string;
    skipCount: number;
    trackCount: number;
    skipPercentage: number;
  }>
> => {
  try {
    const statistics = await getStatistics();

    // Group tracks by artist and calculate aggregate statistics
    const artistStats: Record<
      string,
      {
        id: string;
        name: string;
        skipCount: number;
        trackCount: number;
        totalTracks: number;
      }
    > = {};

    // Process track metrics to aggregate by artist
    Object.values(statistics.trackMetrics).forEach((track) => {
      const artistId = track.id.split(":")[0] || "unknown"; // Generate an ID if we don't have one
      const artistName = track.artistName || "Unknown Artist";

      if (!artistStats[artistId]) {
        artistStats[artistId] = {
          id: artistId,
          name: artistName,
          skipCount: 0,
          trackCount: 0,
          totalTracks: 0,
        };
      }

      artistStats[artistId].skipCount += track.skipCount || 0;
      artistStats[artistId].trackCount += track.playCount || 0;
      artistStats[artistId].totalTracks += 1;
    });

    // Convert to array, calculate skip percentage, and sort by skipCount
    const artists = Object.values(artistStats)
      .map((artist) => ({
        id: artist.id,
        name: artist.name,
        skipCount: artist.skipCount,
        trackCount: artist.trackCount,
        skipPercentage:
          artist.trackCount > 0
            ? Math.round((artist.skipCount / artist.trackCount) * 100)
            : 0,
      }))
      .filter((artist) => artist.skipCount > 0) // Only include artists with skips
      .sort(
        (a, b) =>
          b.skipCount - a.skipCount || b.skipPercentage - a.skipPercentage,
      ) // Sort by skip count, then percentage
      .slice(0, limit); // Take only the specified number of artists

    return artists;
  } catch (error) {
    console.error("Error getting top skipped artists:", error);
    return [];
  }
};

/**
 * Retrieves recent listening sessions
 *
 * Fetches and formats information about the most recent listening sessions,
 * providing a chronological view of the user's listening behavior. Sessions
 * represent continuous periods of listening activity separated by significant
 * time gaps.
 *
 * The returned data includes:
 * - Session identifier and start timestamp
 * - Duration of the session in minutes
 * - Number of tracks played during the session
 * - Skip count and calculated skip percentage
 *
 * This function is primarily used for dashboard visualizations and reports
 * that show patterns in listening duration and engagement over time.
 * Results are sorted by recency with the most recent sessions first.
 *
 * @param limit - Maximum number of sessions to return (default: 3)
 * @returns Promise resolving to an array of recent listening session objects
 *
 * @example
 * // Display the last 5 listening sessions
 * const recentSessions = await getRecentSessions(5);
 * renderSessionHistoryChart(recentSessions);
 * @source
 */
export const getRecentSessions = async (
  limit: number = 3,
): Promise<
  Array<{
    id: string;
    date: string;
    duration: number;
    trackCount: number;
    skipCount: number;
    skipPercentage: number;
  }>
> => {
  try {
    const statistics = await getStatistics();

    // Convert sessions to the format needed for the dashboard
    const sessions = statistics.sessions
      .map((session) => ({
        id: session.id,
        date: session.startTime,
        duration: Math.round(session.durationMs / 60000), // Convert to minutes
        trackCount: session.trackIds.length,
        skipCount: session.skippedTracks,
        skipPercentage:
          session.trackIds.length > 0
            ? Math.round(
                (session.skippedTracks / session.trackIds.length) * 100,
              )
            : 0,
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Sort by most recent
      .slice(0, limit);

    return sessions;
  } catch (error) {
    console.error("Error getting recent sessions:", error);
    return [];
  }
};

/**
 * Exports all statistics data to a JSON file
 *
 * Creates a complete export of all listening statistics and saves it as a
 * JSON file in the user's downloads folder. This function enables users to
 * backup their listening data, transfer it between devices, or use it for
 * external analysis.
 *
 * The export process includes:
 * - Retrieving the complete statistics dataset
 * - Converting complex data structures for proper serialization
 * - Generating a timestamped filename for uniqueness
 * - Saving the formatted data to the user's downloads directory
 *
 * The exported file contains all metrics, patterns, and listening history
 * in a well-structured JSON format.
 *
 * @returns Promise resolving to boolean indicating success (true) or failure (false)
 *
 * @example
 * // Export statistics and show result to user
 * const exported = await exportStatistics();
 * if (exported) {
 *   showSuccess("Statistics exported to Downloads folder");
 * } else {
 *   showError("Failed to export statistics");
 * }
 * @source
 */
export const exportStatistics = async (): Promise<boolean> => {
  try {
    const statistics = await getStatistics();
    const userDownloadsFolder = app.getPath("downloads");
    const timestamp = new Date().toISOString().replace(/:/g, "-").split(".")[0];
    const exportFilePath = join(
      userDownloadsFolder,
      `spotify-statistics-${timestamp}.json`,
    );

    // Prepare statistics for export
    const exportData = prepareStatisticsForSave(statistics);

    // Write to file
    writeJsonSync(exportFilePath, exportData, { spaces: 2 });

    return true;
  } catch (error) {
    console.error("Error exporting statistics:", error);
    return false;
  }
};

/**
 * Clears all statistics data
 *
 * Wrapper function around clearStatistics that provides a more consistent
 * and descriptive name for the IPC interface. This function is the primary
 * entry point for resetting statistics data when called from other parts of
 * the application, particularly from the UI.
 *
 * The function completely reinitializes the statistics storage, erasing all
 * collected metrics, patterns, and listening history. This operation cannot
 * be undone unless the user has previously exported their data.
 *
 * @returns Promise resolving to boolean indicating success (true) or failure (false)
 *
 * @example
 * // Clear all statistics from the UI
 * ipcRenderer.invoke('statistics:clearAll').then(success => {
 *   if (success) {
 *     refreshDashboard();
 *   }
 * });
 * @source
 */
export const clearAllStatistics = async (): Promise<boolean> => {
  return await clearStatistics();
};
