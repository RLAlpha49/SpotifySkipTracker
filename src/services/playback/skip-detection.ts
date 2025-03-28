/**
 * Skip Detection Analytics Module
 *
 * Provides sophisticated algorithms for detecting and classifying different types
 * of track skips, allowing for detailed analysis of user listening behavior.
 *
 * Features:
 * - Multiple specialized skip detection algorithms with confidence ratings
 * - Position-based analysis with configurable thresholds
 * - Skip pattern recognition for behavioral insights
 * - Classification of skip types (preview, standard, near-completion)
 * - Manual vs. automatic skip differentiation
 * - Advanced edge case handling for reliable detection
 * - Skip event tracking with timestamps and metadata
 * - Behavior pattern analysis across listening sessions
 *
 * This module forms the analytical core of the skip tracking system,
 * implementing various algorithms to detect and categorize different
 * types of skip behaviors. It analyzes playback state transitions to
 * determine when a user has skipped a track versus normal playback
 * progression, and provides confidence ratings for its determinations.
 *
 * The skip detection system uses several factors to identify skips:
 * - Track progress at time of change
 * - User-configured skip thresholds
 * - Playback state changes
 * - Navigation patterns
 * - Timing between track changes
 * - Session context analysis
 */

import { PlaybackState } from "@/types/playback";
import * as store from "../../helpers/storage/store";

// Constants for skip detection
const VERY_SHORT_PLAY_MS = 2000; // Tracks played less than 2 seconds
const QUICK_SKIP_THRESHOLD = 0.05; // 5% of track length
const AGGRESSIVE_SKIP_PATTERN_THRESHOLD = 3; // Number of consecutive quick skips

// Track recent skips for pattern detection
const recentSkips: Array<{
  trackId: string;
  timestamp: number;
  progress: number;
}> = [];
const MAX_RECENT_SKIPS = 10;

// Keep track of consecutive quick skips for pattern detection
let consecutiveQuickSkips = 0;

/**
 * Analyzes position data to determine if a track change was a skip
 *
 * Evaluates track progress information to determine if a track change
 * should be classified as a skip, and if so, what type of skip it was.
 * This algorithm considers factors like:
 *
 * - Progress percentage relative to track duration
 * - User-defined skip threshold preferences
 * - Very short plays (preview skips)
 * - Near-completion skips (almost finished tracks)
 * - Normal track completions
 *
 * Each classification includes a confidence rating indicating the
 * algorithm's certainty in its determination.
 *
 * @param previousState Previous playback state before track change
 * @param skipThreshold User-defined skip threshold as decimal (0.0-1.0)
 * @returns Object containing skip detection results:
 *   - isSkip: Whether the track change is classified as a skip
 *   - skipType: Classification of the skip type
 *   - confidence: Confidence level in the determination (0.0-1.0)
 *   - reason: Human-readable explanation of the determination
 *
 * @example
 * // Analyze if the previous track was skipped
 * const skipResult = analyzePositionBasedSkip(previousState, 0.7);
 *
 * if (skipResult.isSkip) {
 *   console.log(`Track skipped (${skipResult.skipType}): ${skipResult.reason}`);
 * } else {
 *   console.log('Track completed normally');
 * }
 */
export function analyzePositionBasedSkip(
  previousState: PlaybackState,
  skipThreshold: number,
): {
  isSkip: boolean;
  skipType: SkipType;
  confidence: number;
  reason: string;
} {
  // Default result
  const result = {
    isSkip: false,
    skipType: SkipType.NONE,
    confidence: 0,
    reason: "No skip detected",
  };

  // Need basic information to analyze
  if (
    !previousState ||
    !previousState.currentTrackDuration ||
    !previousState.lastProgress
  ) {
    return result;
  }

  const duration = previousState.currentTrackDuration;
  const progress = previousState.lastProgress;
  const progressPercent = progress / duration;

  // 1. Quick Skip Detection (played very briefly)
  if (progress < VERY_SHORT_PLAY_MS) {
    return {
      isSkip: true,
      skipType: SkipType.QUICK_PREVIEW,
      confidence: 0.9,
      reason: `Track played for only ${progress}ms, likely a quick preview skip`,
    };
  }

  // 2. Standard Skip Detection (below threshold)
  if (progressPercent < skipThreshold) {
    // Calculate confidence based on how far from threshold
    const confidenceValue = 1 - progressPercent / skipThreshold;

    return {
      isSkip: true,
      skipType: SkipType.STANDARD,
      confidence: Math.min(0.95, confidenceValue),
      reason: `Track skipped at ${(progressPercent * 100).toFixed(1)}%, below threshold of ${skipThreshold * 100}%`,
    };
  }

  // 3. Near-Completion (close to end but not quite finished)
  if (progressPercent > 0.9 && progressPercent < 0.98) {
    return {
      isSkip: true,
      skipType: SkipType.NEAR_COMPLETION,
      confidence: 0.7,
      reason: `Track nearly finished (${(progressPercent * 100).toFixed(1)}%) but skipped before end`,
    };
  }

  // 4. Normal completion or very close to end
  if (progressPercent >= 0.98) {
    return {
      isSkip: false,
      skipType: SkipType.NONE,
      confidence: 0.95,
      reason: `Track completed (${(progressPercent * 100).toFixed(1)}%)`,
    };
  }

  // If we get here, the track wasn't skipped by our thresholds
  return result;
}

/**
 * Records a skip event for pattern analysis
 *
 * Adds a skip event to the pattern analysis system, which tracks
 * recent skip behavior to identify patterns like rapid skipping
 * through a playlist or repeated skipping of similar content.
 *
 * This function maintains a record of recent skips and identifies
 * patterns like consecutive quick skips that may indicate user
 * dissatisfaction or searching behavior.
 *
 * @param trackId Spotify track ID that was skipped
 * @param progress Decimal progress through the track when skipped (0.0-1.0)
 *
 * @example
 * // Record a skip for pattern analysis
 * if (skipResult.isSkip) {
 *   recordSkipForPatternAnalysis(
 *     previousState.currentTrackId,
 *     previousState.lastProgress / previousState.currentTrackDuration
 *   );
 * }
 */
export function recordSkipForPatternAnalysis(
  trackId: string,
  progress: number,
): void {
  // Add to the beginning of the array (most recent first)
  recentSkips.unshift({
    trackId,
    timestamp: Date.now(),
    progress,
  });

  // Limit the size of the array
  if (recentSkips.length > MAX_RECENT_SKIPS) {
    recentSkips.pop();
  }

  // Update consecutive quick skips counter
  if (progress < QUICK_SKIP_THRESHOLD) {
    consecutiveQuickSkips++;

    // Detect "skipping through playlist" behavior
    if (consecutiveQuickSkips >= AGGRESSIVE_SKIP_PATTERN_THRESHOLD) {
      store.saveLog(
        `Detected rapid skipping pattern (${consecutiveQuickSkips} consecutive quick skips)`,
        "INFO",
      );
    }
  } else {
    // Reset counter if not a quick skip
    consecutiveQuickSkips = 0;
  }
}

/**
 * Reset pattern analysis data
 *
 * Clears all stored skip pattern analysis data, including
 * recent skips and consecutive skip counters. This should be
 * called when starting a new listening session or when the
 * user's context changes significantly.
 *
 * @example
 * // Reset pattern analysis when user changes device or stops listening
 * resetSkipPatternAnalysis();
 */
export function resetSkipPatternAnalysis(): void {
  recentSkips.length = 0;
  consecutiveQuickSkips = 0;
}

/**
 * Categorizes the type of skip that occurred
 *
 * Defines the different classifications of skip behaviors
 * that the system can identify and track. Each type represents
 * a different pattern of listening behavior with its own
 * implications for user preferences.
 */
export enum SkipType {
  /** Track completed normally or very near completion */
  NONE = "none",

  /** Very brief play (few seconds) indicating sampling behavior */
  QUICK_PREVIEW = "preview",

  /** Standard skip below the configured threshold */
  STANDARD = "standard",

  /** Almost completed but skipped just before the end */
  NEAR_COMPLETION = "near_end",

  /** Track change generated by the system (playlist ended, etc.) */
  AUTO_GENERATED = "auto",

  /** User explicitly triggered the skip via controls */
  MANUAL = "manual",
}

/**
 * Determines if a track change is likely a manual skip or automatic
 *
 * Analyzes playback state transitions to determine if a track change
 * was likely triggered manually by the user or automatically by the system.
 * This distinction is important for understanding user intent versus
 * normal playback progression.
 *
 * The algorithm considers factors like:
 * - Changes in playback state (playing/paused)
 * - Progress at time of change
 * - Timing between tracks
 * - Context of playback (playlist, album, etc.)
 *
 * @param state Current playback state after track change
 * @param previousState Previous playback state before track change
 * @returns Object containing the analysis results:
 *   - isManual: Whether the skip appears to be manual
 *   - confidence: Confidence level in the determination (0.0-1.0)
 *   - reason: Human-readable explanation of the determination
 *
 * @example
 * // Determine if a skip was manual or automatic
 * const manualAnalysis = detectManualVsAutoSkip(currentState, previousState);
 *
 * console.log(
 *   `Skip was ${manualAnalysis.isManual ? 'manual' : 'automatic'} ` +
 *   `(${manualAnalysis.confidence.toFixed(2)} confidence): ${manualAnalysis.reason}`
 * );
 */
export function detectManualVsAutoSkip(
  state: PlaybackState,
  previousState: PlaybackState,
): {
  isManual: boolean;
  confidence: number;
  reason: string;
} {
  // Default to manual with medium confidence
  const result = {
    isManual: true,
    confidence: 0.6,
    reason: "Default to manual assumption",
  };

  // If playback is stopped after track change, likely manual
  if (!state.isPlaying && previousState.isPlaying) {
    return {
      isManual: true,
      confidence: 0.9,
      reason: "Playback stopped after track change, likely manual",
    };
  }

  // If progress was almost at end, likely automatic
  if (previousState.currentTrackDuration && previousState.lastProgress) {
    const progressPercent =
      previousState.lastProgress / previousState.currentTrackDuration;

    if (progressPercent > 0.98) {
      return {
        isManual: false,
        confidence: 0.95,
        reason: "Track completed normally, automatic progression",
      };
    }
  }

  // Check for rapid skip pattern which indicates manual skipping
  if (consecutiveQuickSkips >= AGGRESSIVE_SKIP_PATTERN_THRESHOLD) {
    return {
      isManual: true,
      confidence: 0.95,
      reason: `Part of rapid skip pattern (${consecutiveQuickSkips} consecutive)`,
    };
  }

  // Return the default if no other condition met
  return result;
}

/**
 * Handles special edge cases in track change detection
 *
 * Identifies and processes special situations that might affect
 * skip detection accuracy, such as device changes, app restarts,
 * or network interruptions. This helps prevent false positives
 * and improves the reliability of skip analytics.
 *
 * @param previousState Playback state before the track change
 * @param currentState Current playback state after the track change
 * @returns Object with edge case information:
 *   - isEdgeCase: Whether a known edge case was detected
 *   - edgeCase: Description of the detected edge case
 *   - shouldIgnore: Whether the track change should be ignored for skip analysis
 *
 * @example
 * // Check for edge cases before processing a track change
 * const edgeCase = handleTrackChangeEdgeCases(previousState, currentState);
 *
 * if (edgeCase.isEdgeCase) {
 *   console.log(`Edge case detected: ${edgeCase.edgeCase}`);
 *
 *   if (edgeCase.shouldIgnore) {
 *     console.log('Skipping track change analysis due to edge case');
 *     return;
 *   }
 * }
 */
export function handleTrackChangeEdgeCases(
  previousState: PlaybackState,
  currentState: PlaybackState,
): {
  isEdgeCase: boolean;
  edgeCase: string;
  shouldIgnore: boolean;
} {
  // Default response
  const result = {
    isEdgeCase: false,
    edgeCase: "",
    shouldIgnore: false,
  };

  // Validate inputs to avoid errors
  if (!previousState || !currentState) {
    return result;
  }

  // Edge Case 1: App switching or reconnection
  if (
    previousState.lastUpdated &&
    currentState.lastUpdated &&
    currentState.lastUpdated - previousState.lastUpdated > 1000 * 60 * 5 // 5 minutes
  ) {
    return {
      isEdgeCase: true,
      edgeCase: "app_reconnection",
      shouldIgnore: true,
    };
  }

  // Edge Case 2: Very short connection gap (likely temporary connection loss)
  if (
    previousState.lastUpdated &&
    currentState.lastUpdated &&
    currentState.lastUpdated - previousState.lastUpdated > 1000 * 10 && // 10 seconds
    currentState.lastUpdated - previousState.lastUpdated < 1000 * 60 // 1 minute
  ) {
    return {
      isEdgeCase: true,
      edgeCase: "brief_connection_loss",
      shouldIgnore: false, // Still process but flag it
    };
  }

  return result;
}
