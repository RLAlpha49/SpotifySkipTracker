import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  analyzePositionBasedSkip,
  detectManualVsAutoSkip,
  handleTrackChangeEdgeCases,
  recordSkipForPatternAnalysis,
  resetSkipPatternAnalysis,
  SkipType,
} from "../../../../services/playback/skip-detection";
import { PlaybackState } from "../../../../types/playback";

// Mock the storage module
vi.mock("../../../../helpers/storage/store", () => ({
  saveLog: vi.fn(),
}));

// Helper function to create a valid PlaybackState object
function createPlaybackState(
  overrides: Partial<PlaybackState> = {},
): PlaybackState {
  return {
    isPlaying: true,
    currentTrackId: "track1",
    currentTrackName: "Test Track",
    currentArtistName: "Test Artist",
    currentAlbumName: "Test Album",
    currentAlbumArt: "album-art-url",
    currentDeviceName: "Test Device",
    currentDeviceType: "Computer",
    currentDeviceVolume: 80,
    currentTrackDuration: 180000, // 3 minutes
    currentTrackProgress: 30000, // 30 seconds
    currentTrackProgressPercent: 16.7,
    lastUpdated: Date.now(),
    recentTracks: [],
    libraryStatusLogged: false,
    totalPauseDuration: 0,
    lastSyncTime: Date.now(),
    isInLibrary: true,
    lastProgress: 30000, // 30 seconds
    lastTrackChangeTimestamp: Date.now(),
    ...overrides,
  };
}

describe("Skip Detection Service", () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Reset any pattern analysis data
    resetSkipPatternAnalysis();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("analyzePositionBasedSkip", () => {
    it("should detect quick preview skips (very short plays)", () => {
      // Create a state where the track was played for only 1 second
      const previousState = createPlaybackState({
        lastProgress: 1000, // 1 second
      });

      const result = analyzePositionBasedSkip(previousState, 0.3); // 30% threshold

      expect(result.isSkip).toBe(true);
      expect(result.skipType).toBe(SkipType.QUICK_PREVIEW);
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.reason).toContain("quick preview skip");
    });

    it("should detect standard skips below the threshold", () => {
      const previousState = createPlaybackState({
        lastProgress: 30000, // 30 seconds (16.7%)
      });

      const result = analyzePositionBasedSkip(previousState, 0.3); // 30% threshold

      expect(result.isSkip).toBe(true);
      expect(result.skipType).toBe(SkipType.STANDARD);
      expect(result.reason).toContain("below threshold");
    });

    it("should detect near-completion skips", () => {
      const previousState = createPlaybackState({
        lastProgress: 171000, // 2:51 (95% of the track)
      });

      const result = analyzePositionBasedSkip(previousState, 0.96); // 96% threshold

      expect(result.isSkip).toBe(true);
      expect(result.skipType).toBe(SkipType.STANDARD);
      expect(result.reason).toContain("below threshold");
    });

    it("should not count completed tracks as skips", () => {
      const previousState = createPlaybackState({
        lastProgress: 178000, // 2:58 (99% of the track)
      });

      const result = analyzePositionBasedSkip(previousState, 0.3); // 30% threshold

      expect(result.isSkip).toBe(false);
      expect(result.skipType).toBe(SkipType.NONE);
      expect(result.reason).toContain("completed");
    });

    it("should handle cases with missing data", () => {
      const incompleteState = createPlaybackState({
        currentTrackDuration: null,
        lastProgress: undefined,
      });

      const result = analyzePositionBasedSkip(incompleteState, 0.3);

      expect(result.isSkip).toBe(false);
      expect(result.skipType).toBe(SkipType.NONE);
    });

    it("should adjust confidence based on how far from threshold", () => {
      // Create a state where track played for 5% when threshold is 30%
      const earlySkipState = createPlaybackState({
        lastProgress: 9000, // 9 seconds (5% of track)
      });

      // Create a state where track played for 25% when threshold is 30%
      const nearThresholdState = createPlaybackState({
        currentTrackId: "track2",
        currentTrackName: "Test Track 2",
        lastProgress: 45000, // 45 seconds (25% of track)
      });

      const earlySkipResult = analyzePositionBasedSkip(earlySkipState, 0.3);
      const nearThresholdResult = analyzePositionBasedSkip(
        nearThresholdState,
        0.3,
      );

      // Early skip (5%) should have higher confidence than near threshold skip (25%)
      expect(earlySkipResult.confidence).toBeGreaterThan(
        nearThresholdResult.confidence,
      );
    });
  });

  describe("detectManualVsAutoSkip", () => {
    it("should detect manual skips when playback is stopped", () => {
      const previousState = createPlaybackState();

      const currentState = createPlaybackState({
        isPlaying: false, // Playback stopped
        currentTrackId: "track2",
        currentTrackName: "Next Track",
      });

      const result = detectManualVsAutoSkip(currentState, previousState);

      expect(result.isManual).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.reason).toContain("Playback stopped");
    });

    it("should detect automatic progression for completed tracks", () => {
      const previousState = createPlaybackState({
        lastProgress: 178000, // 2:58 (99% of the track)
      });

      const currentState = createPlaybackState({
        currentTrackId: "track2",
        currentTrackName: "Next Track",
      });

      const result = detectManualVsAutoSkip(currentState, previousState);

      expect(result.isManual).toBe(false);
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.reason).toContain("completed normally");
    });

    it("should detect manual skips as part of rapid skip pattern", () => {
      const previousState = createPlaybackState({
        lastProgress: 3000, // 3 seconds
      });

      const currentState = createPlaybackState({
        currentTrackId: "track2",
        currentTrackName: "Next Track",
      });

      // Simulate rapid skipping pattern by recording several quick skips
      recordSkipForPatternAnalysis("track1", 0.01); // 1%
      recordSkipForPatternAnalysis("track2", 0.02); // 2%
      recordSkipForPatternAnalysis("track3", 0.01); // 1%

      const result = detectManualVsAutoSkip(currentState, previousState);

      expect(result.isManual).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.reason).toContain("rapid skip pattern");
    });

    it("should return a default assumption when no clear indicators", () => {
      const previousState = createPlaybackState({
        lastProgress: 50000, // 50 seconds
      });

      const currentState = createPlaybackState({
        currentTrackId: "track2",
        currentTrackName: "Next Track",
      });

      const result = detectManualVsAutoSkip(currentState, previousState);

      expect(result.isManual).toBe(true); // Default assumption is manual
      expect(result.confidence).toBe(0.6); // Medium confidence
      expect(result.reason).toContain("Default");
    });
  });

  describe("recordSkipForPatternAnalysis", () => {
    it("should keep track of consecutive quick skips", () => {
      // Record three quick skips
      recordSkipForPatternAnalysis("track1", 0.03); // 3%
      recordSkipForPatternAnalysis("track2", 0.02); // 2%
      recordSkipForPatternAnalysis("track3", 0.04); // 4%

      // Should detect as part of rapid skip pattern
      const previousState = createPlaybackState({
        currentTrackId: "track3",
        lastProgress: 3000, // 3 seconds
      });

      const currentState = createPlaybackState({
        currentTrackId: "track4",
        currentTrackName: "Next Track",
      });

      const result = detectManualVsAutoSkip(currentState, previousState);

      expect(result.isManual).toBe(true);
      expect(result.reason).toContain("rapid skip pattern");
      expect(result.reason).toContain("3 consecutive"); // 3 quick skips recorded
    });

    it("should reset counter when a non-quick skip occurs", () => {
      // Record two quick skips
      recordSkipForPatternAnalysis("track1", 0.03); // 3%
      recordSkipForPatternAnalysis("track2", 0.02); // 2%

      // Record a non-quick skip
      recordSkipForPatternAnalysis("track3", 0.3); // 30%

      // Record another quick skip
      recordSkipForPatternAnalysis("track4", 0.04); // 4%

      // Should not detect as part of rapid skip pattern (counter was reset)
      const previousState = createPlaybackState({
        currentTrackId: "track4",
        lastProgress: 3000, // 3 seconds
      });

      const currentState = createPlaybackState({
        currentTrackId: "track5",
        currentTrackName: "Next Track",
      });

      const result = detectManualVsAutoSkip(currentState, previousState);

      expect(result.isManual).toBe(true); // Default to manual
      expect(result.reason).not.toContain("rapid skip pattern"); // Not detected as pattern
      expect(result.confidence).toBe(0.6); // Medium confidence (default)
    });
  });

  describe("resetSkipPatternAnalysis", () => {
    it("should reset the pattern analysis data", () => {
      // Record some skips
      recordSkipForPatternAnalysis("track1", 0.03); // 3%
      recordSkipForPatternAnalysis("track2", 0.02); // 2%
      recordSkipForPatternAnalysis("track3", 0.01); // 1%

      // Create a state for testing
      const previousState = createPlaybackState({
        currentTrackId: "track3",
        lastProgress: 3000, // 3 seconds
      });

      const currentState = createPlaybackState({
        currentTrackId: "track4",
        currentTrackName: "Next Track",
      });

      // Before reset, pattern should be detected
      let result = detectManualVsAutoSkip(currentState, previousState);
      expect(result.reason).toContain("rapid skip pattern");

      // Reset the pattern analysis
      resetSkipPatternAnalysis();

      // After reset, pattern should not be detected
      result = detectManualVsAutoSkip(currentState, previousState);
      expect(result.reason).not.toContain("rapid skip pattern");
    });
  });

  describe("handleTrackChangeEdgeCases", () => {
    it("should handle null states gracefully", () => {
      const result = handleTrackChangeEdgeCases(
        null as unknown as PlaybackState,
        null as unknown as PlaybackState,
      );

      // Default response for invalid input should be false/ignore
      expect(result.isEdgeCase).toBe(false);
      expect(result.shouldIgnore).toBe(false);
    });

    it("should detect app reconnection after long gap", () => {
      const previousState = createPlaybackState({
        lastUpdated: Date.now() - 1000 * 60 * 10, // 10 minutes ago
      });

      const currentState = createPlaybackState({
        currentTrackId: "track2",
        currentTrackName: "Next Track",
        lastUpdated: Date.now(),
      });

      const result = handleTrackChangeEdgeCases(previousState, currentState);

      expect(result.isEdgeCase).toBe(true);
      expect(result.edgeCase).toBe("app_reconnection");
      expect(result.shouldIgnore).toBe(true);
    });

    it("should detect brief connection loss", () => {
      const previousState = createPlaybackState({
        lastUpdated: Date.now() - 1000 * 30, // 30 seconds ago
      });

      const currentState = createPlaybackState({
        // Same track ID
        lastUpdated: Date.now(),
      });

      const result = handleTrackChangeEdgeCases(previousState, currentState);

      expect(result.isEdgeCase).toBe(true);
      expect(result.edgeCase).toBe("brief_connection_loss");
      expect(result.shouldIgnore).toBe(false); // Still process but flag it
    });

    it("should not treat normal track changes as edge cases", () => {
      const previousState = createPlaybackState({
        lastProgress: 90000, // 1:30
        lastUpdated: Date.now() - 1000, // 1 second ago
      });

      const currentState = createPlaybackState({
        currentTrackId: "track2", // Different track
        currentTrackName: "Next Track",
        lastUpdated: Date.now(),
      });

      const result = handleTrackChangeEdgeCases(previousState, currentState);

      expect(result.isEdgeCase).toBe(false);
      expect(result.shouldIgnore).toBe(false);
    });
  });
});
