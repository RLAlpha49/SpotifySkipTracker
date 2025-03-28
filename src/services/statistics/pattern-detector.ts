/**
 * Skip Pattern Detection Service
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
 * Detected pattern types
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
 * Pattern detection result structure
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
 * Ensures the statistics directory exists
 */
function ensureStatisticsDir() {
  const statsDir = join(app.getPath("userData"), "data", "statistics");
  ensureDirSync(statsDir);
  return statsDir;
}

/**
 * Detects skip patterns from the collected data
 * @returns Array of detected skip patterns
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
 * Detect patterns where user consistently skips certain artists
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

interface TimePatterns {
  hourlyDistribution: number[];
  peakSkipHours: number[];
  dayOfWeekDistribution?: number[] | null;
  dayDistribution?: number[] | null;
  peakSkipDays?: number[];
  skipsByTimeOfDay?: Record<string, number>;
}

/**
 * Detect patterns related to time of day skip behavior
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

// Use the SkipEvent interface for specific skip events within a track
// Export this interface since it's referenced in SkippedTrack
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
 * Detect patterns of immediate skips
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
 * Detect patterns of consecutive skips (skip streaks)
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
 * Detect patterns related to specific listening contexts
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
 * Helper function to calculate confidence score for a pattern
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
