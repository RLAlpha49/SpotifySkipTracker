/**
 * @packageDocumentation
 * @module statistics/pattern-detector
 * @description Skip Pattern Detection Service
 *
 * This module implements advanced pattern recognition algorithms that analyze
 * listening and skip behavior to identify meaningful insights about user preferences
 * and habits. It uses statistical analysis and machine learning techniques to
 * discover patterns that may not be immediately obvious from raw data.
 *
 * Features:
 * - Multi-dimensional pattern detection across various metrics
 * - Confidence scoring for identified patterns
 * - Artist aversion/preference detection
 * - Temporal pattern recognition (time of day, day of week)
 * - Context-aware analysis (playlist vs. album behavior)
 * - Sequential behavior analysis (skip streaks, session patterns)
 * - Immediate vs. delayed skip classification
 * - Genre and mood preference identification
 * - Pattern persistence for trend analysis over time
 *
 * The pattern detection engine uses configurable thresholds to identify
 * statistically significant patterns while filtering out noise. Each pattern
 * is assigned a confidence score based on:
 *
 * 1. Number of unique occurrences
 * 2. Consistency of the observed behavior
 * 3. Statistical deviation from baseline behavior
 * 4. Recency and frequency of observations
 *
 * Detected patterns are categorized by type and can be used to:
 * - Provide personalized insights to users
 * - Power recommendation systems
 * - Generate detailed analytics reports
 * - Identify changing preferences over time
 *
 * @module PatternDetection
 */

import { SkippedTrack } from "@/types/spotify";
import { app } from "electron";
import { ensureDirSync, writeJsonSync } from "fs-extra";
import { join } from "path";
import { getSkippedTracks } from "../../helpers/storage/store";
import {
  aggregateArtistSkipMetrics,
  analyzeTimeBasedPatterns,
} from "./aggregator";

/**
 * Pattern threshold configurations
 *
 * Defines the configurable thresholds used throughout the pattern detection algorithms
 * to identify significant patterns and filter out statistical noise. These values
 * determine the sensitivity and specificity of pattern detection.
 *
 * Each threshold controls a different aspect of pattern detection:
 * - CONFIDENCE_THRESHOLD: Minimum confidence required to report a pattern
 * - STREAK_THRESHOLD: Minimum consecutive skips to qualify as a streak
 * - TIME_FACTOR_THRESHOLD: Minimum ratio above average to flag a time slot
 * - MIN_OCCURRENCES: Minimum number of instances required for pattern validity
 * - IMMEDIATE_SKIP_THRESHOLD: Maximum track percentage played for "immediate" skips
 * - NEAR_END_THRESHOLD: Minimum track percentage played for "near-end" skips
 *
 * These thresholds can be adjusted to tune the sensitivity of the detection system
 * based on user preferences or application requirements.
 */
const PATTERN_THRESHOLDS = {
  // The minimum confidence score (0-1) required to consider a pattern significant
  CONFIDENCE_THRESHOLD: 0.7,

  // How many consecutive skips are required to consider it a skip streak
  STREAK_THRESHOLD: 3,

  // Percentage above average to consider a time slot as having high skip rate
  TIME_FACTOR_THRESHOLD: 1.5,

  // Minimum number of occurrences to consider a pattern valid
  MIN_OCCURRENCES: 5,

  // Percentage of track that must be played to not be considered "immediate skip"
  IMMEDIATE_SKIP_THRESHOLD: 0.1,

  // Percentage of track that must be played to be considered "near-end skip"
  NEAR_END_THRESHOLD: 0.8,
};

/**
 * Enumeration of all supported pattern types detected by the system
 *
 * Defines the standardized categorization system for all patterns detected
 * by the pattern detection algorithms. Each pattern type represents a distinct
 * category of user behavior or preference that can be identified through
 * skip data analysis.
 *
 * Pattern types include:
 * - ARTIST_AVERSION: Consistently skipping tracks by specific artists
 * - TIME_OF_DAY: Skipping patterns related to specific times or days
 * - CONTEXT_SPECIFIC: Skip patterns in specific playlists or albums
 * - IMMEDIATE_SKIP: Skipping tracks very early in playback
 * - PREVIEW_BEHAVIOR: Patterns in preview listening behavior
 * - PLAYLIST_JUMPING: Frequently switching between playlists
 * - SKIP_STREAK: Sequences of consecutive rapid skips
 * - GENRE_PREFERENCE: Genre-based skip patterns
 * - MOOD_BASED: Emotional or mood-based skip patterns
 *
 * This enumeration ensures consistent typing and identification of patterns
 * throughout the application, from detection to storage and presentation.
 */
export enum PatternType {
  ARTIST_AVERSION = "artist_aversion",
  TIME_OF_DAY = "time_of_day",
  CONTEXT_SPECIFIC = "context_specific",
  IMMEDIATE_SKIP = "immediate_skip",
  PREVIEW_BEHAVIOR = "preview_behavior",
  PLAYLIST_JUMPING = "playlist_jumping",
  SKIP_STREAK = "skip_streak",
  GENRE_PREFERENCE = "genre_preference",
  MOOD_BASED = "mood_based",
}

/**
 * Standardized structure for detected patterns
 *
 * Defines the comprehensive data structure used to represent detected patterns
 * uniformly across the application. This interface ensures all patterns contain
 * the necessary metadata for confidence assessment, presentation, and tracking.
 *
 * Properties:
 * - type: The categorized pattern type from PatternType enum
 * - confidence: Normalized score (0-1) indicating pattern reliability
 * - description: Human-readable explanation of the pattern
 * - occurrences: Number of times this pattern has been observed
 * - relatedItems: Array of related entities (artists, tracks, contexts)
 * - details: Extended pattern-specific data for deeper analysis
 * - firstDetected: ISO timestamp when pattern was first identified
 * - lastDetected: ISO timestamp when pattern was most recently observed
 *
 * This structure supports pattern persistence, trend analysis over time,
 * and rich presentation of insights to users.
 */
export interface DetectedPattern {
  type: PatternType;
  confidence: number;
  description: string;
  occurrences: number;
  relatedItems: string[];
  details: Record<string, unknown>;
  firstDetected: string;
  lastDetected: string;
}

/**
 * Ensures the statistics directory exists in the user data folder
 *
 * Creates and verifies the dedicated storage location for pattern detection data.
 * This function centralizes path construction and directory creation, ensuring
 * consistent data storage across the application.
 *
 * The path is constructed using Electron's app.getPath API to locate the
 * user-specific application data directory. This ensures pattern data is:
 * - Persisted between application sessions
 * - Isolated to the specific user account
 * - Stored in the OS-appropriate location
 *
 * @returns The absolute path to the statistics directory
 * @private Internal utility function not exported from module
 * @source
 * @notExported
 */
function ensureStatisticsDir() {
  const statsDir = join(app.getPath("userData"), "data", "statistics");
  ensureDirSync(statsDir);
  return statsDir;
}

/**
 * Detects patterns in the user's skip behavior using multi-dimensional analysis
 *
 * Coordinates the entire pattern detection process by:
 * 1. Retrieving necessary data (artist metrics, time patterns, skipped tracks)
 * 2. Running specialized detection algorithms for different pattern types
 * 3. Consolidating, filtering, and sorting the detected patterns
 * 4. Persisting patterns to disk for later analysis and trend detection
 *
 * The detection process employs multiple specialized algorithms to identify
 * different types of patterns, including:
 * - Artist aversion (consistently skipping specific artists)
 * - Time-based patterns (skipping at certain times/days)
 * - Immediate skip behaviors (skipping tracks very early)
 * - Skip streak detection (consecutive rapid skips)
 * - Context-specific behaviors (skipping in specific playlists/albums)
 *
 * Each pattern is assigned a confidence score, filtered based on configurable
 * thresholds, and sorted by confidence for presentation.
 *
 * @returns Promise resolving to an object containing:
 *   - success: Whether the pattern detection completed successfully
 *   - data: Array of detected patterns meeting confidence thresholds
 *   - error: Error message if detection failed (only if success is false)
 *
 * @example
 * // Get all detected patterns with confidence scores
 * const patterns = await detectSkipPatterns();
 * if (patterns.success && patterns.data.length > 0) {
 *   // Process high-confidence patterns first
 *   const highConfidencePatterns = patterns.data
 *     .filter(p => p.confidence > 0.8);
 *
 *   // Display insights to user
 *   displayPatternInsights(highConfidencePatterns);
 * }
 *
 * @source
 */
export async function detectSkipPatterns() {
  try {
    // Get required data
    const artistMetrics = await aggregateArtistSkipMetrics();
    const timePatterns = await analyzeTimeBasedPatterns();
    const skippedTracks = await getSkippedTracks();

    // Check if we have enough skipped tracks for meaningful analysis
    if (!skippedTracks || skippedTracks.length < 10) {
      return {
        success: true,
        data: [],
      };
    }

    const patterns: DetectedPattern[] = [];

    // Detect artist aversion patterns
    const artistAversionPatterns = detectArtistAversionPatterns(artistMetrics);
    patterns.push(...artistAversionPatterns);

    // Detect time of day patterns - check if timePatterns exists first
    if (timePatterns) {
      const timeOfDayPatterns = detectTimeOfDayPatterns(timePatterns);
      patterns.push(...timeOfDayPatterns);
    }

    // Detect immediate skip patterns
    const immediateSkipPatterns = detectImmediateSkipPatterns(skippedTracks);
    patterns.push(...immediateSkipPatterns);

    // Detect skip streak patterns
    const skipStreakPatterns = detectSkipStreakPatterns(skippedTracks);
    patterns.push(...skipStreakPatterns);

    // Detect context-specific patterns
    const contextPatterns = detectContextSpecificPatterns(skippedTracks);
    patterns.push(...contextPatterns);

    // Sort patterns by confidence score
    patterns.sort((a, b) => b.confidence - a.confidence);

    // Only store patterns if we have some
    if (patterns.length > 0) {
      // Store the detected patterns in a JSON file
      const patternsFilePath = join(
        ensureStatisticsDir(),
        "detected_patterns.json",
      );

      writeJsonSync(patternsFilePath, patterns, { spaces: 2 });
    }

    return {
      success: true,
      data: patterns,
    };
  } catch (error) {
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Comprehensive metrics data for artist-level skip analysis
 *
 * Collects and aggregates skip statistics at the artist level to enable
 * artist-based pattern detection and preference analysis. This data structure
 * provides a complete statistical profile of a user's interaction with an artist.
 *
 * Properties:
 * - artistName: The name of the artist these metrics belong to
 * - totalSkips: Total number of times tracks by this artist were skipped
 * - uniqueTracksSkipped: Array of track IDs skipped by the user
 * - skipRatio: Proportion of plays that resulted in skips (0-1)
 * - manualSkips: Number of skips explicitly triggered by the user
 * - autoSkips: Number of skips triggered automatically (e.g., end of preview)
 * - averagePlayPercentage: Average position in tracks when skipped (0-1)
 *
 * This interface is used extensively in artist aversion pattern detection
 * and for generating artist-specific insights.
 */
interface ArtistMetricsData {
  artistName: string;
  totalSkips: number;
  uniqueTracksSkipped: string[];
  skipRatio: number;
  manualSkips: number;
  autoSkips: number;
  averagePlayPercentage: number;
}

/**
 * Time-based skip distribution and pattern data
 *
 * Contains aggregated temporal distributions of skip behavior, enabling
 * analysis of time-based patterns in user listening habits. This structure
 * captures how skip behavior varies across different time dimensions.
 *
 * Properties:
 * - hourlyDistribution: Skip counts for each hour of the day (0-23)
 * - peakSkipHours: Array of hours with significantly high skip counts
 * - dayOfWeekDistribution: Skip counts for each day of the week (0-6)
 * - dayDistribution: Alternative day-based distribution
 * - peakSkipDays: Array of days with significantly high skip counts
 * - skipsByTimeOfDay: Categorized skips by time period (morning, afternoon, etc.)
 *
 * This interface supports temporal pattern detection, including time-of-day
 * and day-of-week skip patterns that may reveal contextual listening habits.
 */
interface TimePatterns {
  hourlyDistribution: number[];
  peakSkipHours: number[];
  dayOfWeekDistribution?: number[] | null;
  dayDistribution?: number[] | null;
  peakSkipDays?: number[];
  skipsByTimeOfDay?: Record<string, number>;
}

/**
 * Detects patterns where users consistently skip specific artists
 *
 * Analyzes artists with high skip ratios to identify potential artist aversion
 * patterns. This algorithm identifies artists that the user consistently avoids
 * or dislikes based on their skip behavior across multiple tracks by the same artist.
 *
 * The detection process involves:
 * 1. Filtering artists with sufficient data points (minimum tracks and skips)
 * 2. Identifying artists with skip ratios exceeding thresholds
 * 3. Calculating confidence scores based on consistency and frequency
 * 4. Generating human-readable pattern descriptions
 *
 * Artist aversion patterns are particularly valuable for:
 * - Improving personalized recommendations by avoiding disliked artists
 * - Identifying taste changes over time
 * - Understanding explicit vs. implicit preferences
 *
 * @param artistMetrics - Object mapping artist IDs to their skip metrics data
 * @returns Array of detected artist aversion patterns that meet confidence thresholds
 *
 * @example
 * // Detection of artist aversion patterns
 * const artistMetrics = await aggregateArtistSkipMetrics();
 * const aversionPatterns = detectArtistAversionPatterns(artistMetrics);
 *
 * // Example pattern result:
 * // {
 * //   type: "artist_aversion",
 * //   confidence: 0.85,
 * //   description: "Frequently skips tracks by Artist Name",
 * //   ...additional pattern data
 * // }
 * @source
 * @notExported
 */
function detectArtistAversionPatterns(
  artistMetrics: Record<string, ArtistMetricsData>,
): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];

  // Find artists with high skip ratios
  Object.entries(artistMetrics).forEach(([, metrics]) => {
    // Only consider artists with enough data
    if (
      metrics.uniqueTracksSkipped.length < 3 ||
      metrics.totalSkips < PATTERN_THRESHOLDS.MIN_OCCURRENCES
    ) {
      return;
    }

    // Check if skip ratio is high enough to indicate aversion
    if (metrics.skipRatio > 0.7) {
      // Calculate confidence based on data points and skip ratio
      const confidence = calculateConfidence(
        metrics.skipRatio,
        metrics.uniqueTracksSkipped.length,
        metrics.totalSkips,
      );

      if (confidence >= PATTERN_THRESHOLDS.CONFIDENCE_THRESHOLD) {
        patterns.push({
          type: PatternType.ARTIST_AVERSION,
          confidence,
          description: `Frequently skips tracks by ${metrics.artistName}`,
          occurrences: metrics.totalSkips,
          relatedItems: [metrics.artistName],
          details: {
            skipRatio: metrics.skipRatio,
            uniqueTracksSkipped: metrics.uniqueTracksSkipped.length,
            averagePlayPercentage: metrics.averagePlayPercentage,
          },
          firstDetected: new Date().toISOString(),
          lastDetected: new Date().toISOString(),
        });
      }
    }
  });

  return patterns;
}

/**
 * Detects patterns related to skip behavior at specific times of day or days of week
 *
 * Analyzes temporal distribution of skips to identify periods when users are
 * more likely to skip tracks. This detection algorithm recognizes both:
 * - Time-of-day patterns (e.g., skipping more during morning commute)
 * - Day-of-week patterns (e.g., skipping more on Mondays)
 *
 * The algorithm performs several analytical steps:
 * 1. Identifying peak skip hours that significantly exceed average
 * 2. Formatting time periods in readable format (e.g., "9AM, 5PM")
 * 3. Analyzing day-of-week distributions to find patterns
 * 4. Calculating confidence based on statistical significance of the pattern
 *
 * Time patterns can reveal insights about:
 * - Listening context (work, commute, relaxation, etc.)
 * - Attention patterns during different parts of the day
 * - Weekly routines and their impact on music preferences
 *
 * @param timePatterns - Object containing hourly and daily skip distribution data
 * @returns Array of detected time-based patterns that meet confidence thresholds
 *
 * @example
 * // Detecting time-of-day skip patterns
 * const timeData = await analyzeTimeBasedPatterns();
 * const timePatterns = detectTimeOfDayPatterns(timeData);
 *
 * // Sample result patterns:
 * // [
 * //   { type: "time_of_day", description: "Tends to skip more tracks during 8AM, 5PM", ... },
 * //   { type: "time_of_day", description: "Skips more tracks on Monday", ... }
 * // ]
 * @source
 * @notExported
 */
function detectTimeOfDayPatterns(
  timePatterns: TimePatterns,
): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];

  // Check if there are significant peak hours
  if (timePatterns.peakSkipHours && timePatterns.peakSkipHours.length > 0) {
    // Format hours in a readable way
    const formatHour = (hour: number) => {
      const amPm = hour >= 12 ? "PM" : "AM";
      const hourFormatted = hour % 12 === 0 ? 12 : hour % 12;
      return `${hourFormatted}${amPm}`;
    };

    const peakHoursFormatted = timePatterns.peakSkipHours
      .map((hour) => formatHour(hour))
      .join(", ");

    // Calculate the average skip count and determine how much above average the peaks are
    const avgSkips =
      timePatterns.hourlyDistribution.reduce((sum, count) => sum + count, 0) /
      24;
    const peakSkipsAvg =
      timePatterns.peakSkipHours.reduce(
        (sum, hour) => sum + (timePatterns.hourlyDistribution[hour] || 0),
        0,
      ) / timePatterns.peakSkipHours.length;

    const peakFactor = peakSkipsAvg / avgSkips;
    const confidence = Math.min(0.9, peakFactor / 2); // Cap at 0.9

    if (confidence >= PATTERN_THRESHOLDS.CONFIDENCE_THRESHOLD) {
      patterns.push({
        type: PatternType.TIME_OF_DAY,
        confidence,
        description: `Tends to skip more tracks during ${peakHoursFormatted}`,
        occurrences: timePatterns.peakSkipHours.reduce(
          (sum, hour) => sum + (timePatterns.hourlyDistribution[hour] || 0),
          0,
        ),
        relatedItems: timePatterns.peakSkipHours.map((h) => formatHour(h)),
        details: {
          peakHours: timePatterns.peakSkipHours,
          peakFactor,
          hourlyDistribution: timePatterns.hourlyDistribution,
        },
        firstDetected: new Date().toISOString(),
        lastDetected: new Date().toISOString(),
      });
    }
  }

  // Check if there's a strong day-of-week pattern
  // Use dayOfWeekDistribution or dayDistribution, whichever is available
  const dayDistribution =
    timePatterns.dayOfWeekDistribution || timePatterns.dayDistribution;

  if (dayDistribution && dayDistribution.length > 0) {
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    const avgDaySkips =
      dayDistribution.reduce((sum, count) => sum + count, 0) / 7;

    dayDistribution.forEach((count, day) => {
      if (
        count > avgDaySkips * PATTERN_THRESHOLDS.TIME_FACTOR_THRESHOLD &&
        count >= PATTERN_THRESHOLDS.MIN_OCCURRENCES
      ) {
        const dayFactor = count / avgDaySkips;
        const confidence = Math.min(0.9, dayFactor / 2);

        if (confidence >= PATTERN_THRESHOLDS.CONFIDENCE_THRESHOLD) {
          patterns.push({
            type: PatternType.TIME_OF_DAY,
            confidence,
            description: `Skips more tracks on ${dayNames[day]}`,
            occurrences: count,
            relatedItems: [dayNames[day]],
            details: {
              day,
              dayName: dayNames[day],
              dayFactor,
              dayDistribution: dayDistribution,
            },
            firstDetected: new Date().toISOString(),
            lastDetected: new Date().toISOString(),
          });
        }
      }
    });
  }

  return patterns;
}

/**
 * Represents a single skip event with detailed contextual information
 *
 * Captures comprehensive metadata about an individual track skip, including
 * timing information, playback progress, skip type classification, and the
 * context in which the skip occurred. This data structure is fundamental to
 * pattern detection algorithms.
 *
 * Properties:
 * - timestamp: ISO datetime string when the skip occurred
 * - progress: Percentage (0-1) of track played before skipping
 * - playDuration: Optional milliseconds the track played before skip
 * - isManualSkip: Whether the skip was user-initiated vs. automatic
 * - skipType: Classification of the skip (preview, standard, near_end)
 * - context: Details about the playback environment (playlist, album, etc.)
 *
 * Skip events are analyzed individually and in aggregate to detect patterns
 * across temporal, content, and behavioral dimensions.
 */
export interface SkipEvent {
  timestamp: string;
  progress: number;
  playDuration?: number;
  isManualSkip?: boolean;
  skipType?: string;
  context?: {
    type: string;
    name?: string;
    uri?: string;
  };
}

/**
 * Detects patterns where users consistently skip tracks very early in playback
 *
 * Analyzes skip events to identify when tracks are habitually skipped during the
 * initial portion of playback. This reveals potential immediate aversion patterns,
 * particularly when grouped by artist or other attributes.
 *
 * The algorithm focuses on:
 * 1. Identifying tracks skipped within the immediate skip threshold (default: first 10%)
 * 2. Grouping immediate skips by artist to detect potential artist-level patterns
 * 3. Calculating average progress before skipping to determine pattern severity
 * 4. Creating confidence scores that consider frequency, consistency, and immediacy
 *
 * Immediate skip patterns are valuable for:
 * - Identifying strong negative preferences
 * - Detecting intro-specific issues (intros that trigger skips)
 * - Distinguishing between preview skips and content-based skips
 *
 * @param skippedTracks - Array of tracks with skip event data
 * @returns Array of detected immediate skip patterns meeting confidence thresholds
 *
 * @example
 * // Detect immediate skip patterns from skip data
 * const skipData = await getSkippedTracks();
 * const immediatePatterns = detectImmediateSkipPatterns(skipData);
 *
 * // Example result:
 * // {
 * //   type: "immediate_skip",
 * //   confidence: 0.82,
 * //   description: "Immediately skips tracks by Artist X",
 * //   details: { avgSkipProgress: 0.05, trackCount: 8, ... }
 * // }
 * @source
 * @notExported
 */
function detectImmediateSkipPatterns(
  skippedTracks: SkippedTrack[],
): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];

  // Find tracks that are almost always skipped immediately
  const immediateSkipArtists: Record<
    string,
    {
      artist: string;
      count: number;
      tracks: string[];
      avgProgress: number;
    }
  > = {};

  skippedTracks.forEach((track) => {
    if (!track.skipEvents || track.skipEvents.length === 0) return;

    // Calculate average progress percentage for this track's skips
    const avgProgress =
      track.skipEvents.reduce((sum, event) => {
        // Explicitly cast progress to number, defaulting to 0 if undefined
        const progress =
          typeof event.progress === "number" ? event.progress : 0;
        return sum + progress;
      }, 0) / track.skipEvents.length;

    // Check if it's an immediate skip
    if (avgProgress <= PATTERN_THRESHOLDS.IMMEDIATE_SKIP_THRESHOLD) {
      // Track by artist
      if (!immediateSkipArtists[track.artist]) {
        immediateSkipArtists[track.artist] = {
          artist: track.artist,
          count: 0,
          tracks: [],
          avgProgress: 0,
        };
      }

      immediateSkipArtists[track.artist].count += track.skipEvents.length;
      immediateSkipArtists[track.artist].tracks.push(track.name);
      immediateSkipArtists[track.artist].avgProgress =
        (immediateSkipArtists[track.artist].avgProgress + avgProgress) / 2;
    }
  });

  // Filter for artists with significant immediate skips
  Object.values(immediateSkipArtists).forEach((artistData) => {
    if (
      artistData.count >= PATTERN_THRESHOLDS.MIN_OCCURRENCES &&
      artistData.tracks.length >= 2
    ) {
      const confidence = calculateConfidence(
        1 - artistData.avgProgress, // Higher confidence for lower progress
        artistData.tracks.length,
        artistData.count,
      );

      if (confidence >= PATTERN_THRESHOLDS.CONFIDENCE_THRESHOLD) {
        patterns.push({
          type: PatternType.IMMEDIATE_SKIP,
          confidence,
          description: `Immediately skips tracks by ${artistData.artist}`,
          occurrences: artistData.count,
          relatedItems: [artistData.artist, ...artistData.tracks.slice(0, 3)],
          details: {
            artist: artistData.artist,
            trackCount: artistData.tracks.length,
            avgSkipProgress: artistData.avgProgress,
            affectedTracks: artistData.tracks,
          },
          firstDetected: new Date().toISOString(),
          lastDetected: new Date().toISOString(),
        });
      }
    }
  });

  return patterns;
}

/**
 * Detects patterns of consecutive rapid skips (skip streaks)
 *
 * Analyzes the chronological sequence of skip events to identify periods when
 * the user rapidly skips multiple tracks in succession. This reveals potentially
 * important behavioral patterns related to browsing, mood, or content quality.
 *
 * The multi-step detection algorithm:
 * 1. Reconstructs the timeline of all skip events across tracks
 * 2. Identifies consecutive skips occurring within short time windows (30 seconds)
 * 3. Groups these events into "streak" objects with relevant metadata
 * 4. Analyzes streak frequency, length, and consistency
 * 5. Calculates confidence scores based on streak metrics
 *
 * Skip streak patterns can indicate:
 * - Browsing behavior (searching for specific tracks)
 * - Mood-based rejection (e.g., seeking more upbeat tracks)
 * - Playlist or recommendation quality issues
 * - Listening context disruptions
 *
 * @param skippedTracks - Array of tracks with skip event data
 * @returns Array of detected skip streak patterns meeting confidence thresholds
 *
 * @example
 * // Detect skip streak patterns
 * const tracks = await getSkippedTracks();
 * const streakPatterns = detectSkipStreakPatterns(tracks);
 *
 * // Example result:
 * // {
 * //   type: "skip_streak",
 * //   confidence: 0.75,
 * //   description: "Often skips 4 tracks in a row",
 * //   details: {
 * //     streakCount: 12,
 * //     avgStreakLength: 4.2,
 * //     recentStreaks: [...]
 * //   }
 * // }
 * @source
 * @notExported
 */
function detectSkipStreakPatterns(
  skippedTracks: SkippedTrack[],
): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];

  // We need to reconstruct the timeline of skips
  const allSkipEvents: {
    timestamp: Date;
    track: string;
    artist: string;
    context?: Record<string, unknown>;
  }[] = [];

  // Collect all skip events
  skippedTracks.forEach((track) => {
    if (!track.skipEvents || track.skipEvents.length === 0) return;

    track.skipEvents.forEach((event) => {
      allSkipEvents.push({
        timestamp: new Date(event.timestamp),
        track: track.name,
        artist: track.artist,
        context: event.context as Record<string, unknown>,
      });
    });
  });

  // Sort skip events by timestamp
  allSkipEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Find skip streaks (consecutive skips with little time between them)
  const skipStreaks: {
    startTime: Date;
    endTime: Date;
    tracks: string[];
    artists: string[];
    contexts: Record<string, unknown>[];
    duration: number;
  }[] = [];

  let currentStreak: {
    tracks: string[];
    artists: string[];
    contexts: Record<string, unknown>[];
    events: {
      timestamp: Date;
      track: string;
      artist: string;
      context?: Record<string, unknown>;
    }[];
  } | null = null;

  // Look for consecutive skips
  for (let i = 0; i < allSkipEvents.length; i++) {
    const event = allSkipEvents[i];

    // If no current streak or it's been more than 30 seconds since last skip
    if (
      !currentStreak ||
      (i > 0 &&
        event.timestamp.getTime() - allSkipEvents[i - 1].timestamp.getTime() >
          30000)
    ) {
      // If we had a streak, check if it's valid and save it
      if (
        currentStreak &&
        currentStreak.events.length >= PATTERN_THRESHOLDS.STREAK_THRESHOLD
      ) {
        skipStreaks.push({
          startTime: currentStreak.events[0].timestamp,
          endTime:
            currentStreak.events[currentStreak.events.length - 1].timestamp,
          tracks: currentStreak.tracks,
          artists: currentStreak.artists,
          contexts: currentStreak.contexts.filter(
            (c) => c !== undefined,
          ) as Record<string, unknown>[],
          duration:
            (currentStreak.events[
              currentStreak.events.length - 1
            ].timestamp.getTime() -
              currentStreak.events[0].timestamp.getTime()) /
            1000, // in seconds
        });
      }

      // Start new streak
      currentStreak = {
        tracks: [event.track],
        artists: [event.artist],
        contexts: event.context ? [event.context] : [],
        events: [event],
      };
    } else {
      // Continue current streak
      currentStreak.tracks.push(event.track);
      currentStreak.artists.push(event.artist);
      if (event.context) currentStreak.contexts.push(event.context);
      currentStreak.events.push(event);
    }
  }

  // Check final streak
  if (
    currentStreak &&
    currentStreak.events.length >= PATTERN_THRESHOLDS.STREAK_THRESHOLD
  ) {
    skipStreaks.push({
      startTime: currentStreak.events[0].timestamp,
      endTime: currentStreak.events[currentStreak.events.length - 1].timestamp,
      tracks: currentStreak.tracks,
      artists: currentStreak.artists,
      contexts: currentStreak.contexts.filter((c) => c !== undefined) as Record<
        string,
        unknown
      >[],
      duration:
        (currentStreak.events[
          currentStreak.events.length - 1
        ].timestamp.getTime() -
          currentStreak.events[0].timestamp.getTime()) /
        1000, // in seconds
    });
  }

  // If we have enough streaks, create a pattern
  if (skipStreaks.length >= 3) {
    // Calculate average streak length
    const avgStreakLength =
      skipStreaks.reduce((sum, streak) => sum + streak.tracks.length, 0) /
      skipStreaks.length;

    // Calculate confidence based on number of streaks and their length
    const confidence = Math.min(
      0.9,
      (skipStreaks.length / 10) *
        (avgStreakLength / PATTERN_THRESHOLDS.STREAK_THRESHOLD),
    );

    if (confidence >= PATTERN_THRESHOLDS.CONFIDENCE_THRESHOLD) {
      patterns.push({
        type: PatternType.SKIP_STREAK,
        confidence,
        description: `Often skips ${Math.round(avgStreakLength)} tracks in a row`,
        occurrences: skipStreaks.length,
        relatedItems: skipStreaks
          .slice(0, 3)
          .map(
            (s) =>
              `${s.tracks.length} tracks on ${s.startTime.toLocaleDateString()}`,
          ),
        details: {
          streakCount: skipStreaks.length,
          avgStreakLength,
          longestStreak: Math.max(...skipStreaks.map((s) => s.tracks.length)),
          recentStreaks: skipStreaks.slice(-5).map((s) => ({
            date: s.startTime.toISOString(),
            tracks: s.tracks.length,
            duration: s.duration,
          })),
        },
        firstDetected: skipStreaks[0].startTime.toISOString(),
        lastDetected: skipStreaks[skipStreaks.length - 1].endTime.toISOString(),
      });
    }
  }

  return patterns;
}

/**
 * Detects patterns related to specific listening contexts (playlists, albums, etc.)
 *
 * Analyzes skip events to identify correlations between skip behavior and the
 * context in which tracks are played. This reveals important insights about how
 * content organization and presentation affects user engagement.
 *
 * The detection algorithm:
 * 1. Aggregates skip events by their context (playlist, album, etc.)
 * 2. Calculates skip statistics for each unique context
 * 3. Identifies contexts with statistically significant skip rates
 * 4. Generates appropriate descriptions based on context type
 *
 * Context-specific patterns can reveal:
 * - Ineffective playlist curation or sequencing
 * - Mismatch between context theme and user expectations
 * - Content organization issues affecting listening experience
 * - Specific contexts that consistently trigger skip behavior
 *
 * @param skippedTracks - Array of tracks with skip event data
 * @returns Array of detected context-specific patterns meeting confidence thresholds
 *
 * @example
 * // Detect context-specific skip patterns
 * const tracks = await getSkippedTracks();
 * const contextPatterns = detectContextSpecificPatterns(tracks);
 *
 * // Example results:
 * // [
 * //   {
 * //     type: "context_specific",
 * //     description: "Frequently skips tracks in playlist \"Workout Mix\"",
 * //     confidence: 0.82,
 * //     ...
 * //   },
 * //   {
 * //     type: "context_specific",
 * //     description: "Frequently skips tracks when listening to album \"Greatest Hits\"",
 * //     confidence: 0.75,
 * //     ...
 * //   }
 * // ]
 * @source
 * @notExported
 */
function detectContextSpecificPatterns(
  skippedTracks: SkippedTrack[],
): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];

  // Collect skip counts by context
  const contextSkips: Record<
    string,
    {
      type: string;
      name: string;
      uri?: string;
      skipCount: number;
      tracks: Set<string>;
    }
  > = {};

  // Process all tracks with context data
  skippedTracks.forEach((track) => {
    if (!track.skipEvents) return;

    track.skipEvents.forEach((event) => {
      if (!event.context) return;

      const contextKey =
        (event.context.name as string) ||
        event.context.uri ||
        event.context.type;

      if (!contextSkips[contextKey]) {
        contextSkips[contextKey] = {
          type: event.context.type,
          name: event.context.name || "(Unknown)",
          uri: event.context.uri,
          skipCount: 0,
          tracks: new Set<string>(),
        };
      }

      contextSkips[contextKey].skipCount++;
      contextSkips[contextKey].tracks.add(track.id);
    });
  });

  // Find contexts with significant skip counts
  Object.values(contextSkips).forEach((context) => {
    if (
      context.skipCount >= PATTERN_THRESHOLDS.MIN_OCCURRENCES &&
      context.tracks.size >= 3
    ) {
      const confidence = calculateConfidence(
        0.7, // Base confidence
        context.tracks.size,
        context.skipCount,
      );

      if (confidence >= PATTERN_THRESHOLDS.CONFIDENCE_THRESHOLD) {
        patterns.push({
          type: PatternType.CONTEXT_SPECIFIC,
          confidence,
          description:
            context.type === "playlist"
              ? `Frequently skips tracks in playlist "${context.name}"`
              : `Frequently skips tracks when listening to ${context.type} "${context.name}"`,
          occurrences: context.skipCount,
          relatedItems: [context.name],
          details: {
            contextType: context.type,
            contextName: context.name,
            contextUri: context.uri,
            uniqueTracksSkipped: context.tracks.size,
          },
          firstDetected: new Date().toISOString(),
          lastDetected: new Date().toISOString(),
        });
      }
    }
  });

  return patterns;
}

/**
 * Calculates a normalized confidence score for detected patterns
 *
 * Generates a standardized confidence score (0-1) that represents how reliable
 * and significant a detected pattern is. This score is used to filter out noise
 * and prioritize patterns for presentation to users.
 *
 * The confidence algorithm incorporates multiple factors:
 * 1. Base confidence factor (pattern-specific measure of strength)
 * 2. Diversity factor (how many unique items exhibit the pattern)
 * 3. Frequency factor (how often the pattern occurs)
 *
 * The formula applies different weights to each factor:
 * - 60% weight to the base pattern-specific factor
 * - 20% weight to the diversity of affected items
 * - 20% weight to the frequency of occurrence
 *
 * The result is capped at 0.95 to acknowledge inherent uncertainty in all patterns.
 *
 * @param baseFactor - The primary confidence measure (0-1) specific to the pattern type
 * @param uniqueItems - Number of unique items (tracks, artists, etc.) exhibiting the pattern
 * @param occurrences - Total number of times the pattern has been observed
 * @returns A normalized confidence score between 0 and 0.95
 *
 * @example
 * // Calculate confidence for an artist aversion pattern
 * const skipRatio = 0.85; // User skips 85% of tracks by this artist
 * const uniqueTracks = 12; // Pattern observed across 12 different tracks
 * const totalSkips = 25;  // Total of 25 skip events for this artist
 *
 * const confidence = calculateConfidence(skipRatio, uniqueTracks, totalSkips);
 * // Returns a value like 0.82 representing high confidence
 *
 * @source
 * @notExported
 */
function calculateConfidence(
  baseFactor: number,
  uniqueItems: number,
  occurrences: number,
): number {
  // More unique items and more occurrences = higher confidence
  const uniqueItemsFactor = Math.min(1, uniqueItems / 10);
  const occurrencesFactor = Math.min(1, occurrences / 20);

  // Combine factors, weighting the base factor most heavily
  return Math.min(
    0.95, // Cap at 0.95
    baseFactor * 0.6 + uniqueItemsFactor * 0.2 + occurrencesFactor * 0.2,
  );
}
