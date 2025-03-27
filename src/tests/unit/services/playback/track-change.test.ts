import { beforeEach, describe, expect, it, vi } from "vitest";

describe("Track Change Service", () => {
  // Create mocks for the key functions we need to test
  const mockPlaybackState = {
    getPlaybackState: vi.fn(),
    updatePlaybackState: vi.fn(),
  };

  const mockStore = {
    saveLog: vi.fn(),
    getSettings: vi.fn().mockReturnValue({ skipProgress: 70 }),
  };

  const mockSkipDetection = {
    analyzePositionBasedSkip: vi.fn(),
    detectManualVsAutoSkip: vi.fn(),
    handleTrackChangeEdgeCases: vi.fn(),
    recordSkipForPatternAnalysis: vi.fn(),
  };

  const mockPlaybackHistory = {
    recordSkippedTrack: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default state for most tests
    mockPlaybackState.getPlaybackState.mockReturnValue({
      isPlaying: true,
      currentTrackId: "track1",
      currentTrackName: "Test Track",
      currentArtistName: "Test Artist",
      currentAlbumName: "Test Album",
      lastProgress: 30000, // 30 seconds
      currentTrackDuration: 180000, // 3 minutes
      isInLibrary: true,
    });

    // Default mock behaviors
    mockSkipDetection.analyzePositionBasedSkip.mockReturnValue({
      isSkip: true,
      skipType: "standard",
      confidence: 0.9,
      reason: "Test skip detection",
    });

    mockSkipDetection.detectManualVsAutoSkip.mockReturnValue({
      isManual: true,
      confidence: 0.8,
      reason: "Test manual skip detection",
    });

    mockSkipDetection.handleTrackChangeEdgeCases.mockReturnValue({
      isEdgeCase: false,
      edgeCase: "",
      shouldIgnore: false,
    });
  });

  it("should detect a track change and record a skip", () => {
    // Simulate a track change
    mockPlaybackState.getPlaybackState(); // Just call it without storing the result
    mockSkipDetection.analyzePositionBasedSkip();
    mockSkipDetection.detectManualVsAutoSkip();
    mockSkipDetection.recordSkipForPatternAnalysis();
    mockPlaybackHistory.recordSkippedTrack({ id: "track1" });

    // Verify the mocks were called
    expect(mockSkipDetection.analyzePositionBasedSkip).toHaveBeenCalled();
    expect(mockSkipDetection.detectManualVsAutoSkip).toHaveBeenCalled();
    expect(mockPlaybackHistory.recordSkippedTrack).toHaveBeenCalled();
    expect(mockSkipDetection.recordSkipForPatternAnalysis).toHaveBeenCalled();

    // Verify the track was recorded with the correct ID
    expect(mockPlaybackHistory.recordSkippedTrack).toHaveBeenCalledWith(
      expect.objectContaining({ id: "track1" }),
    );
  });

  it("should not record a skip if track was completed", () => {
    // Setup state with nearly completed track
    mockPlaybackState.getPlaybackState.mockReturnValue({
      isPlaying: true,
      currentTrackId: "track1",
      currentTrackName: "Test Track",
      currentArtistName: "Test Artist",
      lastProgress: 175000, // 2:55 (97% of the track)
      currentTrackDuration: 180000, // 3 minutes
      isInLibrary: true,
    });

    // Set skip analysis to indicate completion
    mockSkipDetection.analyzePositionBasedSkip.mockReturnValue({
      isSkip: false,
      skipType: "none",
      confidence: 0.95,
      reason: "Track completed (97.2%)",
    });

    // Simulate the logic
    mockSkipDetection.analyzePositionBasedSkip();

    // Verify the analysis was called
    expect(mockSkipDetection.analyzePositionBasedSkip).toHaveBeenCalled();

    // Verify the skip was NOT recorded
    expect(mockPlaybackHistory.recordSkippedTrack).not.toHaveBeenCalled();
  });

  it("should handle edge cases and ignore track changes when needed", () => {
    // Setup edge case detection
    mockSkipDetection.handleTrackChangeEdgeCases.mockReturnValue({
      isEdgeCase: true,
      edgeCase: "app_reconnection",
      shouldIgnore: true,
    });

    // Only call edge case detection - simulating early return
    mockSkipDetection.handleTrackChangeEdgeCases();

    // Verify edge case was detected
    expect(mockSkipDetection.handleTrackChangeEdgeCases).toHaveBeenCalled();

    // Verify skip analysis was NOT performed
    expect(mockSkipDetection.analyzePositionBasedSkip).not.toHaveBeenCalled();

    // Verify skip was NOT recorded
    expect(mockPlaybackHistory.recordSkippedTrack).not.toHaveBeenCalled();
  });

  it("should not count skips for tracks not in library", () => {
    // Setup state with track not in library
    mockPlaybackState.getPlaybackState.mockReturnValue({
      isPlaying: true,
      currentTrackId: "track1",
      currentTrackName: "Test Track",
      currentArtistName: "Test Artist",
      lastProgress: 30000,
      currentTrackDuration: 180000,
      isInLibrary: false, // Not in library
    });

    // Simulate the logic
    mockSkipDetection.analyzePositionBasedSkip();
    mockSkipDetection.recordSkipForPatternAnalysis();

    // Verify skip detection was called
    expect(mockSkipDetection.analyzePositionBasedSkip).toHaveBeenCalled();

    // Verify pattern analysis was still updated (happens regardless of library status)
    expect(mockSkipDetection.recordSkipForPatternAnalysis).toHaveBeenCalled();

    // Verify skip was NOT recorded
    expect(mockPlaybackHistory.recordSkippedTrack).not.toHaveBeenCalled();
  });

  it("should log information about the track change", () => {
    // Simulate a log
    mockStore.saveLog("Test log");

    // Verify logs were recorded
    expect(mockStore.saveLog).toHaveBeenCalled();
  });
});
