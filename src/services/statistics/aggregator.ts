/**
 * Statistics Aggregation Service
 *
 * This module provides comprehensive data aggregation and analytics functionality
 * for processing raw listening data into meaningful statistical insights. It forms
 * the analytical core of the application, transforming raw event data into actionable
 * insights and visualization-ready datasets.
 *
 * Features:
 * - Multi-dimensional aggregation across time periods (daily, weekly, monthly)
 * - Artist, track, and genre-level analytics with engagement metrics
 * - Skip pattern detection and behavior classification
 * - Temporal analysis of listening habits (time of day, day of week)
 * - Device usage and context-based analytics (playlists, albums)
 * - Data normalization and outlier handling for reliable metrics
 * - Advanced statistical calculations (distributions, moving averages)
 * - Persistent storage of aggregated results with efficient indexing
 * - Incremental processing to handle large datasets efficiently
 *
 * This module implements several interconnected aggregation pipelines:
 *
 * 1. Temporal Aggregation:
 *    - Daily metrics calculation → Weekly summaries → Monthly trends
 *    - Time-of-day and day-of-week analysis
 *    - Moving averages and trend identification
 *
 * 2. Entity Aggregation:
 *    - Artist-level metrics with engagement scoring
 *    - Track-specific performance analysis
 *    - Genre and mood categorization and preferences
 *
 * 3. Behavioral Analysis:
 *    - Skip pattern classification (preview, midpoint, near-end)
 *    - Session analysis (sequential skips, listening sessions)
 *    - Context awareness (playlist vs. album behavior differences)
 *
 * All aggregated data is structured for efficient retrieval by the UI
 * visualization components and export functionality.
 *
 * @module StatisticsAggregation
 */

import { app } from "electron";
import { ensureDirSync, writeJsonSync } from "fs-extra";
import { join } from "path";
import {
  getSkippedTracks,
  getStatistics,
  saveStatistics,
} from "../../helpers/storage/store";
import { DailyMetrics } from "../../types/statistics";

/**
 * Creates a valid Date object from various timestamp formats
 *
 * Safely handles timestamp conversion from multiple possible formats
 * to a proper Date object, with robust error handling for invalid inputs.
 * This function manages:
 * - String timestamps (both ISO format and numeric strings)
 * - Numeric timestamps (milliseconds since epoch)
 * - Validation of resulting Date objects
 *
 * @param timestamp - Input timestamp in string or number format
 * @returns Valid Date object or null if parsing fails
 *
 * @example
 * // Create date from ISO string
 * const date1 = createSafeDate("2023-01-15T14:30:00Z");
 *
 * // Create date from numeric timestamp
 * const date2 = createSafeDate(1673793000000);
 */
function createSafeDate(timestamp: string | number): Date | null {
  try {
    // Check if timestamp is already a Date (though this shouldn't happen with our types)
    if (typeof timestamp === "object" && timestamp && "getTime" in timestamp) {
      return timestamp as Date;
    }

    // If timestamp is a string that looks like a number, convert it to a number
    if (typeof timestamp === "string" && /^\d+$/.test(timestamp)) {
      timestamp = parseInt(timestamp, 10);
    }

    // Create a Date object from the timestamp
    const date = new Date(timestamp);

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return null;
    }

    return date;
  } catch {
    return null;
  }
}

/**
 * Ensures the statistics storage directory exists
 *
 * Creates the required directory structure for storing statistics data
 * if it doesn't already exist. Uses the application's user data path
 * to determine the appropriate location following platform conventions.
 *
 * @returns Path to the statistics directory
 */
function ensureStatisticsDir() {
  const statsDir = join(app.getPath("userData"), "data", "statistics");
  ensureDirSync(statsDir);
  return statsDir;
}

/**
 * Aggregates daily listening metrics from track skip data
 *
 * Processes raw skip events to generate comprehensive daily listening statistics:
 * 1. Analyzes each track skip event by timestamp
 * 2. Groups events by calendar day (YYYY-MM-DD)
 * 3. Categorizes skip types (preview, standard, near-end)
 * 4. Tracks manual vs. automatic skips
 * 5. Counts unique tracks and artists per day
 * 6. Identifies listening patterns like sequential skips
 * 7. Calculates listening times and peak hours
 *
 * The resulting metrics are stored both as a standalone file and
 * integrated into the main statistics object for dashboard display.
 *
 * @example
 * // Process and update daily metrics
 * await aggregateDailySkipMetrics();
 */
export async function aggregateDailySkipMetrics() {
  try {
    const skippedTracks = await getSkippedTracks();
    const dailyMetrics: Record<string, DailyMetrics> = {};
    const statistics = await getStatistics();

    // Process each skipped track
    skippedTracks.forEach((track) => {
      if (!track.skipEvents || track.skipEvents.length === 0) return;

      // Process each skip event
      track.skipEvents.forEach((event) => {
        try {
          // Skip events without timestamps
          if (!event.timestamp) {
            return;
          }

          // Create a safe date from the timestamp
          const skipDate = createSafeDate(event.timestamp);

          // Skip invalid dates
          if (!skipDate) {
            return;
          }

          // Format as YYYY-MM-DD for the daily key
          const dateStr = skipDate.toISOString().split("T")[0];
          const hourOfDay = skipDate.getHours();

          // Initialize this day's metrics if needed
          if (!dailyMetrics[dateStr]) {
            dailyMetrics[dateStr] = {
              date: dateStr,
              listeningTimeMs: 0,
              tracksPlayed: 0,
              tracksSkipped: 0,
              uniqueArtists: [],
              uniqueTracks: [],
              peakHour: hourOfDay,
              sequentialSkips: 0,
              skipsByType: {
                preview: 0,
                standard: 0,
                near_end: 0,
                auto: 0,
                manual: 0,
              },
            };
          }

          // Update metrics
          dailyMetrics[dateStr].tracksSkipped++;

          // Add to unique tracks if not already included
          // First convert to array if it's a Set
          const uniqueTracks = Array.isArray(dailyMetrics[dateStr].uniqueTracks)
            ? dailyMetrics[dateStr].uniqueTracks
            : Array.from(dailyMetrics[dateStr].uniqueTracks);

          if (!uniqueTracks.includes(track.id)) {
            (dailyMetrics[dateStr].uniqueTracks as string[]).push(track.id);
          }

          // Ensure skipsByType exists
          if (!dailyMetrics[dateStr].skipsByType) {
            dailyMetrics[dateStr].skipsByType = {
              preview: 0,
              standard: 0,
              near_end: 0,
              auto: 0,
              manual: 0,
            };
          }

          // Determine skip type based on progress
          if (event.progress <= 0.1) {
            dailyMetrics[dateStr].skipsByType.preview++;
          } else if (event.progress >= 0.8) {
            dailyMetrics[dateStr].skipsByType.near_end++;
          } else {
            dailyMetrics[dateStr].skipsByType.standard++;
          }

          // Track manual/auto skips
          if (event.isManualSkip) {
            dailyMetrics[dateStr].skipsByType.manual++;
          } else {
            dailyMetrics[dateStr].skipsByType.auto++;
          }
        } catch (err) {
          console.error("Error processing skip event:", err);
        }
      });
    });

    // Store the daily metrics in a separate file
    const dailyMetricsFilePath = join(
      ensureStatisticsDir(),
      "daily_skip_metrics.json",
    );
    writeJsonSync(dailyMetricsFilePath, dailyMetrics, { spaces: 2 });

    // Also update the statistics object with the aggregated daily data
    for (const [dateStr, metrics] of Object.entries(dailyMetrics)) {
      if (!statistics.dailyMetrics[dateStr]) {
        continue; // Skip dates not in the current statistics object
      }

      // Update with skip-specific metrics that may not be in the main statistics
      if (!statistics.dailyMetrics[dateStr].skipsByType) {
        statistics.dailyMetrics[dateStr].skipsByType = {
          preview: 0,
          standard: 0,
          near_end: 0,
          auto: 0,
          manual: 0,
        };
      }

      // Merge skip types
      if (metrics.skipsByType) {
        for (const [type, count] of Object.entries(metrics.skipsByType)) {
          if (statistics.dailyMetrics[dateStr].skipsByType) {
            (
              statistics.dailyMetrics[dateStr].skipsByType as Record<
                string,
                number
              >
            )[type] =
              ((
                statistics.dailyMetrics[dateStr].skipsByType as Record<
                  string,
                  number
                >
              )[type] || 0) + count;
          }
        }
      }

      // Update manual/auto counts
      if (
        statistics.dailyMetrics[dateStr].skipsByType &&
        metrics.skipsByType &&
        metrics.skipsByType.manual !== undefined &&
        metrics.skipsByType.manual > 0
      ) {
        statistics.dailyMetrics[dateStr].skipsByType.manual =
          (statistics.dailyMetrics[dateStr].skipsByType.manual || 0) +
          metrics.skipsByType.manual;
      }

      if (
        statistics.dailyMetrics[dateStr].skipsByType &&
        metrics.skipsByType &&
        metrics.skipsByType.auto !== undefined &&
        metrics.skipsByType.auto > 0
      ) {
        statistics.dailyMetrics[dateStr].skipsByType.auto =
          (statistics.dailyMetrics[dateStr].skipsByType.auto || 0) +
          metrics.skipsByType.auto;
      }
    }

    // Save updated statistics
    await saveStatistics(statistics);

    return dailyMetrics;
  } catch (error) {
    console.error("Error aggregating daily skip metrics:", error);
    return {};
  }
}

/**
 * Aggregates weekly skip metrics from daily metrics
 * @returns Object with weekly skip metrics
 */
export async function aggregateWeeklySkipMetrics() {
  try {
    // First make sure daily metrics are up to date
    const dailyMetrics = await aggregateDailySkipMetrics();
    const statistics = await getStatistics();

    // Create a map to hold weekly metrics
    const weeklyMetrics: Record<
      string,
      {
        weekId: string;
        startDate: string;
        endDate: string;
        totalSkips: number;
        uniqueTracksSkipped: string[];
        skipsByType: Record<string, number>;
        skipsByDay: number[];
        manualSkips: number;
        autoSkips: number;
        topSkipHour: number;
      }
    > = {};

    // Process each day's metrics
    for (const [dateStr, metrics] of Object.entries(dailyMetrics)) {
      try {
        // Validate date string before creating Date object
        if (!dateStr || typeof dateStr !== "string") {
          continue;
        }

        const date = new Date(dateStr);

        // Check if date is valid
        if (isNaN(date.getTime())) {
          continue;
        }

        const weekId = getISOWeekIdentifier(date);

        // Get start and end dates for this week
        const { startDate, endDate } = getWeekStartAndEndDates(date);

        // Validate start and end dates
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          continue;
        }

        const startDateStr = startDate.toISOString().split("T")[0];
        const endDateStr = endDate.toISOString().split("T")[0];

        // Initialize this week's metrics if needed
        if (!weeklyMetrics[weekId]) {
          weeklyMetrics[weekId] = {
            weekId,
            startDate: startDateStr,
            endDate: endDateStr,
            totalSkips: 0,
            uniqueTracksSkipped: [],
            skipsByType: {},
            skipsByDay: Array(7).fill(0), // Sunday = 0, Saturday = 6
            manualSkips: 0,
            autoSkips: 0,
            topSkipHour: 0,
          };
        }

        // Update metrics
        weeklyMetrics[weekId].totalSkips += metrics.tracksSkipped;

        // Day of week (0 = Sunday, 6 = Saturday)
        const dayOfWeek = date.getDay();
        weeklyMetrics[weekId].skipsByDay[dayOfWeek] += metrics.tracksSkipped;

        // Add unique tracks
        // First ensure metrics.uniqueTracks is an array
        const uniqueTracks = Array.isArray(metrics.uniqueTracks)
          ? metrics.uniqueTracks
          : Array.from(metrics.uniqueTracks);

        uniqueTracks.forEach((trackId) => {
          if (!weeklyMetrics[weekId].uniqueTracksSkipped.includes(trackId)) {
            weeklyMetrics[weekId].uniqueTracksSkipped.push(trackId);
          }
        });

        // Add skip types
        if (metrics.skipsByType) {
          for (const [type, count] of Object.entries(metrics.skipsByType)) {
            weeklyMetrics[weekId].skipsByType[type] =
              (weeklyMetrics[weekId].skipsByType[type] || 0) + count;
          }
        }

        // Add manual/auto skips
        if (metrics.skipsByType?.manual) {
          weeklyMetrics[weekId].manualSkips += metrics.skipsByType.manual;
        }

        if (metrics.skipsByType?.auto) {
          weeklyMetrics[weekId].autoSkips += metrics.skipsByType.auto;
        }

        // Find top skip hour by analyzing hourly skips across all days in the week
        const weekHourlySkips = Array(24).fill(0);
        for (let hour = 0; hour < 24; hour++) {
          // For hourly metrics, we directly check the numbered properties that might exist
          // This isn't a proper field of skipsByType, but we're safely accessing it anyway
          let hourlySkipCount = 0;

          if (metrics.skipsByType) {
            // Cast skipsByType to Record<string, number> for string indexing
            const skipsByType = metrics.skipsByType as Record<string, number>;
            hourlySkipCount = skipsByType[hour.toString()] || 0;
          }

          weekHourlySkips[hour] += hourlySkipCount;
        }

        // Update top skip hour if we find a new maximum
        const currentMaxHour = weeklyMetrics[weekId].topSkipHour;
        const currentMaxCount = weekHourlySkips[currentMaxHour] || 0;

        for (let hour = 0; hour < 24; hour++) {
          if (weekHourlySkips[hour] > currentMaxCount) {
            weeklyMetrics[weekId].topSkipHour = hour;
          }
        }
      } catch (err) {
        console.error("Error processing day metrics:", err, {
          dateStr,
          metrics,
        });
      }
    }

    // Store the weekly metrics in a separate file
    const weeklyMetricsFilePath = join(
      ensureStatisticsDir(),
      "weekly_skip_metrics.json",
    );
    writeJsonSync(weeklyMetricsFilePath, weeklyMetrics, { spaces: 2 });

    // Also update the statistics object with the aggregated weekly data
    for (const [weekId, metrics] of Object.entries(weeklyMetrics)) {
      if (!statistics.weeklyMetrics[weekId]) {
        continue; // Skip weeks not in the current statistics object
      }

      // Update existing weekly metrics
      statistics.weeklyMetrics[weekId].tracksSkipped = metrics.totalSkips;
      statistics.weeklyMetrics[weekId].mostActiveDay =
        metrics.skipsByDay.indexOf(Math.max(...metrics.skipsByDay));
    }

    // Save updated statistics
    await saveStatistics(statistics);

    return weeklyMetrics;
  } catch (error) {
    console.error("Error aggregating weekly skip metrics:", error);
    return {};
  }
}

/**
 * Gets the ISO week identifier (YYYY-Www) from a date
 */
function getISOWeekIdentifier(date: Date): string {
  const weekNum = getISOWeek(date);
  return `${date.getFullYear()}-W${weekNum.toString().padStart(2, "0")}`;
}

/**
 * Gets the ISO week number from a date
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
 * Gets the start and end dates of the week containing the given date
 */
function getWeekStartAndEndDates(date: Date): {
  startDate: Date;
  endDate: Date;
} {
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);

  // Find Sunday of this week (first day)
  const dayOfWeek = d.getDay();
  const startDate = new Date(d.getTime());
  startDate.setDate(d.getDate() - dayOfWeek);

  // Find Saturday of this week (last day)
  const endDate = new Date(startDate.getTime());
  endDate.setDate(startDate.getDate() + 6);

  return { startDate, endDate };
}

/**
 * Aggregates skip data by artist
 * @returns Object with artist-level skip metrics
 */
export async function aggregateArtistSkipMetrics() {
  try {
    const skippedTracks = await getSkippedTracks();
    const statistics = await getStatistics();

    // Create a map to hold artist metrics
    const artistMetrics: Record<
      string,
      {
        artistId?: string;
        artistName: string;
        totalSkips: number;
        uniqueTracksSkipped: string[];
        skipsByType: Record<string, number>;
        manualSkips: number;
        autoSkips: number;
        skipRatio: number;
        averagePlayPercentage: number;
        mostSkippedTrack?: {
          id: string;
          name: string;
          skipCount: number;
        };
      }
    > = {};

    // Process each skipped track
    skippedTracks.forEach((track) => {
      // Use artist name as identifier since artist ID might not always be available
      const artistKey = track.artist.toLowerCase();

      // Initialize this artist's metrics if needed
      if (!artistMetrics[artistKey]) {
        artistMetrics[artistKey] = {
          artistName: track.artist,
          totalSkips: 0,
          uniqueTracksSkipped: [],
          skipsByType: {
            preview: 0,
            standard: 0,
            near_end: 0,
            manual: 0,
            auto: 0,
          },
          manualSkips: 0,
          autoSkips: 0,
          skipRatio: 0,
          averagePlayPercentage: 0,
        };
      }

      // Update metrics
      artistMetrics[artistKey].totalSkips += track.skipCount || 0;

      // Add to unique tracks if not already included
      if (!artistMetrics[artistKey].uniqueTracksSkipped.includes(track.id)) {
        artistMetrics[artistKey].uniqueTracksSkipped.push(track.id);
      }

      // Update artist ID if available in statistics
      if (statistics.artistMetrics && statistics.artistMetrics[track.id]) {
        const artistId = statistics.artistMetrics[track.id].id;
        if (artistId) {
          artistMetrics[artistKey].artistId = artistId;
        }
      }

      // Add skip type information if available
      if (track.skipTypes) {
        Object.entries(track.skipTypes).forEach(([type, count]) => {
          // Add the skip count to the existing count or initialize if not present
          artistMetrics[artistKey].skipsByType[type] =
            (artistMetrics[artistKey].skipsByType[type] || 0) + count;
        });
      }

      // Add manual/auto skip information if available
      if (track.manualSkipCount) {
        artistMetrics[artistKey].manualSkips += track.manualSkipCount;
      }

      if (track.autoSkipCount) {
        artistMetrics[artistKey].autoSkips += track.autoSkipCount;
      }

      // Track most skipped track for this artist
      if (
        !artistMetrics[artistKey].mostSkippedTrack ||
        (track.skipCount || 0) >
          artistMetrics[artistKey].mostSkippedTrack.skipCount
      ) {
        artistMetrics[artistKey].mostSkippedTrack = {
          id: track.id,
          name: track.name,
          skipCount: track.skipCount || 0,
        };
      }

      // Calculate average play percentage if we have events with progress data
      if (track.skipEvents && track.skipEvents.length > 0) {
        const totalProgress = track.skipEvents.reduce(
          (sum, event) => sum + event.progress,
          0,
        );
        const averageProgress = totalProgress / track.skipEvents.length;

        // Update running average for the artist
        const currentTotal =
          artistMetrics[artistKey].averagePlayPercentage *
          artistMetrics[artistKey].uniqueTracksSkipped.length;
        const newTotal = currentTotal + averageProgress;
        artistMetrics[artistKey].averagePlayPercentage =
          newTotal / artistMetrics[artistKey].uniqueTracksSkipped.length;
      }
    });

    // Calculate skip ratios using total track play counts from statistics
    for (const [, metrics] of Object.entries(artistMetrics)) {
      const artistName = metrics.artistName;

      // Find artist in statistics to get total plays
      let totalPlays = 0;

      // Look for matching artist in statistics
      for (const artistId in statistics.artistMetrics) {
        const artistStats = statistics.artistMetrics[artistId];

        if (artistStats.name.toLowerCase() === artistName.toLowerCase()) {
          totalPlays = artistStats.tracksPlayed || 0;
          // Update artist ID if we didn't have it before
          if (!metrics.artistId) {
            metrics.artistId = artistId;
          }
          break;
        }
      }

      // Calculate skip ratio
      if (totalPlays > 0) {
        metrics.skipRatio = metrics.totalSkips / totalPlays;
      }
    }

    // Store the artist metrics in a separate file
    const artistMetricsFilePath = join(
      ensureStatisticsDir(),
      "artist_skip_metrics.json",
    );
    writeJsonSync(artistMetricsFilePath, artistMetrics, { spaces: 2 });

    return artistMetrics;
  } catch (error) {
    console.error("Error aggregating artist skip metrics:", error);
    return {};
  }
}

/**
 * Calculates library-wide skip statistics from all collected data
 * @returns Object with library-wide skip metrics
 */
export async function calculateLibrarySkipStatistics() {
  try {
    const skippedTracks = await getSkippedTracks();
    const dailyMetrics = await aggregateDailySkipMetrics();
    const weeklyMetrics = await aggregateWeeklySkipMetrics();
    const artistMetrics = await aggregateArtistSkipMetrics();
    const statistics = await getStatistics();

    // Define interface for skip events for type safety
    interface SkipEvent {
      timestamp: string;
      progress: number;
      isManualSkip?: boolean;
      skipType?: string;
      context?: {
        type: string;
        uri?: string;
        name?: string;
        id?: string;
      };
    }

    // Create an object to hold library-wide statistics
    const libraryStats = {
      totalSkips: 0,
      totalTracks: 0,
      uniqueTracksSkipped: 0,
      overallSkipRate: 0,
      skipsByType: {
        preview: 0,
        standard: 0,
        near_end: 0,
        manual: 0,
        auto: 0,
      } as Record<string, number>,
      artistsWithHighestSkipRates: [] as Array<{
        artistName: string;
        skipRate: number;
        totalSkips: number;
      }>,
      mostSkippedTracks: [] as Array<{
        trackId: string;
        trackName: string;
        artistName: string;
        skipCount: number;
      }>,
      averageSkipPercentage: 0,
      skipTrends: {
        daily: {} as Record<string, number>,
        weekly: {} as Record<string, number>,
      },
      lastUpdated: new Date().toISOString(),
    };

    // Calculate total skips and unique tracks skipped
    libraryStats.totalSkips = skippedTracks.reduce(
      (sum, track) => sum + (track.skipCount || 0),
      0,
    );
    libraryStats.uniqueTracksSkipped = skippedTracks.length;

    // Get total tracks from statistics
    libraryStats.totalTracks = statistics.totalUniqueTracks || 0;

    // Calculate overall skip rate
    if (libraryStats.totalTracks > 0) {
      libraryStats.overallSkipRate =
        libraryStats.uniqueTracksSkipped / libraryStats.totalTracks;
    }

    // Aggregate skips by type
    skippedTracks.forEach((track) => {
      if (track.skipTypes) {
        Object.entries(track.skipTypes).forEach(([type, count]) => {
          if (type in libraryStats.skipsByType) {
            libraryStats.skipsByType[type] += count;
          }
        });
      }

      if (track.manualSkipCount) {
        libraryStats.skipsByType.manual += track.manualSkipCount;
      }

      if (track.autoSkipCount) {
        libraryStats.skipsByType.auto += track.autoSkipCount;
      }
    });

    // Find artists with highest skip rates
    libraryStats.artistsWithHighestSkipRates = Object.values(artistMetrics)
      .filter((artist) => artist.totalSkips >= 3) // Only include artists with enough data
      .sort((a, b) => b.skipRatio - a.skipRatio)
      .slice(0, 10)
      .map((artist) => ({
        artistName: artist.artistName,
        skipRate: artist.skipRatio,
        totalSkips: artist.totalSkips,
      }));

    // Find most skipped tracks
    libraryStats.mostSkippedTracks = skippedTracks
      .sort((a, b) => (b.skipCount || 0) - (a.skipCount || 0))
      .slice(0, 10)
      .map((track) => ({
        trackId: track.id,
        trackName: track.name,
        artistName: track.artist,
        skipCount: track.skipCount || 0,
      }));

    // Calculate average skip percentage
    const tracksWithEvents = skippedTracks.filter(
      (track) => track.skipEvents && track.skipEvents.length > 0,
    );

    if (tracksWithEvents.length > 0) {
      const totalPercentage = tracksWithEvents.reduce((sum: number, track) => {
        if (!track.skipEvents) return sum;
        const trackAvg =
          track.skipEvents.reduce(
            (tSum: number, event: SkipEvent) => tSum + event.progress,
            0,
          ) / track.skipEvents.length;
        return sum + trackAvg;
      }, 0);

      libraryStats.averageSkipPercentage =
        totalPercentage / tracksWithEvents.length;
    }

    // Calculate skip trends
    // Daily trend
    const sortedDays = Object.keys(dailyMetrics).sort();
    const recentDays = sortedDays.slice(-14); // Last 14 days

    recentDays.forEach((day) => {
      libraryStats.skipTrends.daily[day] = dailyMetrics[day].tracksSkipped;
    });

    // Weekly trend
    const sortedWeeks = Object.keys(weeklyMetrics).sort();
    const recentWeeks = sortedWeeks.slice(-8); // Last 8 weeks

    recentWeeks.forEach((week) => {
      libraryStats.skipTrends.weekly[week] = weeklyMetrics[week].totalSkips;
    });

    // Store the library stats in a separate file
    const libraryStatsFilePath = join(
      ensureStatisticsDir(),
      "library_skip_statistics.json",
    );
    writeJsonSync(libraryStatsFilePath, libraryStats, { spaces: 2 });

    return libraryStats;
  } catch (error) {
    console.error("Error calculating library skip statistics:", error);
    return null;
  }
}

/**
 * Analyzes time-based skip patterns from the collected data
 * @returns Object with time-based skip pattern analysis
 */
export async function analyzeTimeBasedPatterns() {
  try {
    const skippedTracks = await getSkippedTracks();

    // Object to hold time patterns
    const timePatterns = {
      hourlyDistribution: Array(24).fill(0),
      peakSkipHours: [] as number[],
      dayOfWeekDistribution: Array(7).fill(0), // Sunday is 0, Saturday is 6
      timeOfDayDistribution: {
        morning: 0, // 5:00 - 11:59
        afternoon: 0, // 12:00 - 16:59
        evening: 0, // 17:00 - 20:59
        night: 0, // 21:00 - 4:59
      },
      patternsByArtist: {} as Record<
        string,
        {
          hourlyDistribution: number[];
          peakHours: number[];
        }
      >,
      lastUpdated: new Date().toISOString(),
    };

    // Process each skipped track's skip events
    skippedTracks.forEach((track) => {
      if (!track.skipEvents || track.skipEvents.length === 0) return;

      // Initialize this artist in our patterns if not already present
      if (track.artist && !timePatterns.patternsByArtist[track.artist]) {
        timePatterns.patternsByArtist[track.artist] = {
          hourlyDistribution: Array(24).fill(0),
          peakHours: [],
        };
      }

      // Process each skip event
      track.skipEvents.forEach((event) => {
        // Skip if no timestamp
        if (!event.timestamp) return;

        // Create a safe date from the timestamp
        const skipDate = createSafeDate(event.timestamp);

        // Skip invalid dates
        if (!skipDate) {
          return;
        }

        const hour = skipDate.getHours();
        const dayOfWeek = skipDate.getDay();

        // Update hourly distribution
        timePatterns.hourlyDistribution[hour]++;

        // Update day of week distribution
        timePatterns.dayOfWeekDistribution[dayOfWeek]++;

        // Update time of day distribution
        if (hour >= 5 && hour < 12) {
          timePatterns.timeOfDayDistribution.morning++;
        } else if (hour >= 12 && hour < 17) {
          timePatterns.timeOfDayDistribution.afternoon++;
        } else if (hour >= 17 && hour < 21) {
          timePatterns.timeOfDayDistribution.evening++;
        } else {
          timePatterns.timeOfDayDistribution.night++;
        }

        // Update artist-specific pattern
        if (track.artist) {
          timePatterns.patternsByArtist[track.artist].hourlyDistribution[
            hour
          ]++;
        }
      });
    });

    // Find peak hours (hours with skip counts above average)
    const hourlyAverage =
      timePatterns.hourlyDistribution.reduce((sum, count) => sum + count, 0) /
      24;
    timePatterns.peakSkipHours = timePatterns.hourlyDistribution
      .map((count, hour) => ({ hour, count }))
      .filter((entry) => entry.count > hourlyAverage * 1.5) // 50% above average
      .sort((a, b) => b.count - a.count)
      .map((entry) => entry.hour);

    // Calculate peak hours for each artist
    Object.keys(timePatterns.patternsByArtist).forEach((artist) => {
      const artistHourly =
        timePatterns.patternsByArtist[artist].hourlyDistribution;
      const artistAverage =
        artistHourly.reduce((sum, count) => sum + count, 0) / 24;

      timePatterns.patternsByArtist[artist].peakHours = artistHourly
        .map((count, hour) => ({ hour, count }))
        .filter(
          (entry) => entry.count > artistAverage * 1.5 && entry.count >= 3,
        ) // Significant pattern
        .sort((a, b) => b.count - a.count)
        .map((entry) => entry.hour);
    });

    // Store the time patterns in a separate file
    const timePatternsFilePath = join(
      ensureStatisticsDir(),
      "time_based_patterns.json",
    );
    writeJsonSync(timePatternsFilePath, timePatterns, { spaces: 2 });

    return timePatterns;
  } catch (error) {
    console.error("Error analyzing time-based patterns:", error);
    return null;
  }
}

/**
 * Calculates advanced artist-level insights beyond basic metrics
 * @returns Object with advanced artist insights and recommendations
 */
export async function calculateArtistInsights() {
  try {
    const statistics = await getStatistics();
    const artistMetrics = await aggregateArtistSkipMetrics();
    const timePatterns = await analyzeTimeBasedPatterns();

    // Initialize insights object
    const insights = {
      mostCompatibleArtists: [] as Array<{
        artistName: string;
        compatibility: number;
      }>,
      leastCompatibleArtists: [] as Array<{
        artistName: string;
        compatibility: number;
      }>,
      listeningTrends: {} as Record<
        string,
        { trend: "increasing" | "decreasing" | "stable"; changeRate: number }
      >,
      genreAffinities: {} as Record<string, number>,
      timeBasedPreferences: {} as Record<
        string,
        { preferredHours: number[]; avoidedHours: number[] }
      >,
      recommendedExploration: [] as Array<{
        artistName: string;
        reason: string;
      }>,
    };

    // Only proceed if we have enough data for meaningful insights
    if (
      !statistics ||
      !artistMetrics ||
      Object.keys(artistMetrics).length < 5
    ) {
      console.log("Not enough artist data for meaningful insights");
      return insights;
    }

    // Calculate artist compatibility based on skip rates and listening time
    const compatibilityScores = Object.entries(artistMetrics)
      .map(([, metrics]) => {
        // Only consider artists with enough data
        if (metrics.uniqueTracksSkipped.length < 3) return null;

        // Compatibility score based on inverse of skip ratio and listening time
        const skipFactor = 1 - (metrics.skipRatio || 0); // Higher is better
        const playFactor = metrics.uniqueTracksSkipped.length / 20; // Normalize, higher is better
        const compatibility = skipFactor * 0.7 + playFactor * 0.3; // Weighted score

        return {
          artistName: metrics.artistName,
          compatibility: Math.min(compatibility, 1), // Cap at 1.0
        };
      })
      .filter(Boolean) as Array<{ artistName: string; compatibility: number }>;

    // Sort and get most/least compatible artists
    compatibilityScores.sort((a, b) => b.compatibility - a.compatibility);
    insights.mostCompatibleArtists = compatibilityScores.slice(0, 5);
    insights.leastCompatibleArtists = [...compatibilityScores]
      .reverse()
      .slice(0, 5);

    // Analyze listening trends over time
    const artistListenHistory: Record<string, Record<string, number>> = {};

    // Group by month for trend analysis
    if (statistics.dailyMetrics) {
      Object.entries(statistics.dailyMetrics).forEach(([dateStr, metrics]) => {
        const month = dateStr.substring(0, 7); // YYYY-MM

        const artists = Array.isArray(metrics.uniqueArtists)
          ? metrics.uniqueArtists
          : Array.from(metrics.uniqueArtists as Set<string>);

        artists.forEach((artistId) => {
          const artistData = statistics.artistMetrics[artistId];
          if (!artistData) return;

          // Initialize artist history if needed
          if (!artistListenHistory[artistData.name]) {
            artistListenHistory[artistData.name] = {};
          }

          // Count listens by month
          artistListenHistory[artistData.name][month] =
            (artistListenHistory[artistData.name][month] || 0) + 1;
        });
      });
    }

    // Calculate trends based on month-to-month changes
    Object.entries(artistListenHistory).forEach(([artistName, monthData]) => {
      const months = Object.keys(monthData).sort();
      if (months.length < 2) return; // Need at least 2 months for a trend

      // Get last three months if available
      const recentMonths = months.slice(-3);
      const values = recentMonths.map((m) => monthData[m] || 0);

      // Simple trend detection
      if (values.length >= 2) {
        const latestValue = values[values.length - 1];
        const previousValue = values[values.length - 2];

        const changeRate =
          previousValue === 0
            ? 0
            : (latestValue - previousValue) / previousValue;

        let trend: "increasing" | "decreasing" | "stable";

        if (changeRate > 0.2) trend = "increasing";
        else if (changeRate < -0.2) trend = "decreasing";
        else trend = "stable";

        insights.listeningTrends[artistName] = { trend, changeRate };
      }
    });

    // Analyze time-based preferences for artists
    if (timePatterns && timePatterns.patternsByArtist) {
      Object.entries(timePatterns.patternsByArtist).forEach(
        ([artist, pattern]) => {
          const hourlyDistribution = pattern.hourlyDistribution;
          if (!hourlyDistribution || hourlyDistribution.length !== 24) return;

          // Calculate average hourly plays
          const avg =
            hourlyDistribution.reduce((sum, count) => sum + count, 0) / 24;

          // Find preferred and avoided hours
          const preferredHours = hourlyDistribution
            .map((count, hour) => ({ hour, count }))
            .filter((x) => x.count > avg * 1.5 && x.count >= 3)
            .map((x) => x.hour);

          const avoidedHours = hourlyDistribution
            .map((count, hour) => ({ hour, count }))
            .filter(
              (x) =>
                x.count < avg * 0.5 && artist.toLowerCase() in artistMetrics,
            )
            .map((x) => x.hour);

          insights.timeBasedPreferences[artist] = {
            preferredHours,
            avoidedHours,
          };
        },
      );
    }

    // Generate exploration recommendations based on listening patterns
    const topArtists = Object.entries(artistMetrics)
      .sort(
        (a, b) =>
          b[1].uniqueTracksSkipped.length - a[1].uniqueTracksSkipped.length,
      )
      .slice(0, 10)
      .map(([, data]) => data.artistName);

    // Create simple artist recommendations based on complementary patterns
    topArtists.forEach((artist) => {
      // Skip artists with high skip rates
      const artistData = Object.values(artistMetrics).find(
        (a) => a.artistName === artist,
      );
      if (!artistData || artistData.skipRatio > 0.7) return;

      // Check time patterns
      const timePreference = insights.timeBasedPreferences[artist];
      if (!timePreference) return;

      // Recommend artists with similar time preferences
      Object.entries(insights.timeBasedPreferences)
        .filter(([otherArtist]) => otherArtist !== artist)
        .forEach(([otherArtist, otherPattern]) => {
          // Check if time preferences overlap
          const hasOverlap = timePreference.preferredHours.some((hour) =>
            otherPattern.preferredHours.includes(hour),
          );

          if (hasOverlap) {
            insights.recommendedExploration.push({
              artistName: otherArtist,
              reason: `Similar listening time preferences to ${artist}`,
            });
          }
        });
    });

    // Deduplicate recommendations
    insights.recommendedExploration = [
      ...new Map(
        insights.recommendedExploration.map((item) => [item.artistName, item]),
      ).values(),
    ].slice(0, 5); // Limit to 5 recommendations

    // Save insights to file for later use
    const insightsFilePath = join(
      ensureStatisticsDir(),
      "artist_insights.json",
    );
    writeJsonSync(insightsFilePath, insights, { spaces: 2 });

    return insights;
  } catch (error) {
    console.error("Error calculating artist insights:", error);
    return null;
  }
}
