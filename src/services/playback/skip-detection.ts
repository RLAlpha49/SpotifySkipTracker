/**
 * Skip detection algorithms
 *
 * Provides specialized detection for different types of skips
 * and track change events, with position-based analysis.
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
 * @param previousState Previous playback state before track change
 * @param skipThreshold User-defined skip threshold (percentage)
 * @returns Skip detection result
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
 * @param trackId Track that was skipped
 * @param progress Progress percentage when skipped
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
 */
export function resetSkipPatternAnalysis(): void {
  recentSkips.length = 0;
  consecutiveQuickSkips = 0;
}

/**
 * Categorizes the type of skip that occurred
 */
export enum SkipType {
  NONE = "none", // Not a skip
  QUICK_PREVIEW = "preview", // Quick preview (few seconds)
  STANDARD = "standard", // Normal skip (below threshold)
  NEAR_COMPLETION = "near_end", // Almost completed but skipped
  AUTO_GENERATED = "auto", // Automatically generated (e.g. playlist ended)
  MANUAL = "manual", // User manually skipped
}

/**
 * Determines if a track change is likely a manual skip or automatic
 *
 * @param state Current playback state
 * @param previousState Previous playback state
 * @returns Whether the skip appears to be manual or automatic
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
 * Handles edge cases in track change detection
 *
 * @param previousState Previous playback state
 * @param currentState Current playback state
 * @returns Information about the edge case
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
