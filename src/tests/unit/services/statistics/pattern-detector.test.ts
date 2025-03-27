import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("electron", () => ({
  app: {
    getPath: vi.fn().mockReturnValue("/mock/path"),
  },
}));

vi.mock("fs-extra", () => ({
  ensureDirSync: vi.fn(),
  writeJsonSync: vi.fn(),
}));

vi.mock("path", () => ({
  join: (...args: string[]) => args.join("/"),
}));

// Mock storage functions
vi.mock("../../../../helpers/storage/store", () => ({
  getSkippedTracks: vi.fn(),
}));

// Mock aggregator functions that pattern detector depends on
vi.mock("../../../../services/statistics/aggregator", () => ({
  aggregateArtistSkipMetrics: vi.fn(),
  analyzeTimeBasedPatterns: vi.fn(),
}));

// Import after mocks are defined
import * as fsExtra from "fs-extra";
import { getSkippedTracks } from "../../../../helpers/storage/store";
import {
  aggregateArtistSkipMetrics,
  analyzeTimeBasedPatterns,
} from "../../../../services/statistics/aggregator";
import {
  detectSkipPatterns,
  PatternType,
} from "../../../../services/statistics/pattern-detector";

describe("Pattern Detector", () => {
  // Sample data for tests
  const mockArtistMetrics = {
    artist1: {
      artistName: "Artist One",
      totalSkips: 20,
      uniqueTracksSkipped: ["track1", "track2", "track3", "track4", "track5"],
      skipRatio: 0.9, // High skip ratio for testing
      manualSkips: 15,
      autoSkips: 5,
      averagePlayPercentage: 0.2,
    },
    artist2: {
      artistName: "Artist Two",
      totalSkips: 3, // Not enough skips to be significant
      uniqueTracksSkipped: ["track10", "track11"],
      skipRatio: 0.5,
      manualSkips: 2,
      autoSkips: 1,
      averagePlayPercentage: 0.5,
    },
    artist3: {
      artistName: "Artist Three",
      totalSkips: 12,
      uniqueTracksSkipped: ["track20", "track21", "track22", "track23"],
      skipRatio: 0.3, // Low skip ratio
      manualSkips: 8,
      autoSkips: 4,
      averagePlayPercentage: 0.6,
    },
  };

  const mockTimePatterns = {
    hourlyDistribution: Array(24)
      .fill(0)
      .map((_, i) => (i === 9 || i === 22 ? 20 : 5)), // Peaks at 9AM and 10PM
    peakSkipHours: [9, 22],
    dayOfWeekDistribution: [10, 15, 5, 7, 12, 25, 18], // Peak on Friday
    dayDistribution: Array(31).fill(5), // Fill with some default value
    peakSkipDays: [5, 12, 19, 26], // Example peak days (Fridays)
    skipsByTimeOfDay: {
      morning: 35,
      afternoon: 25,
      evening: 40,
      night: 20,
    },
  };

  // Sample skipped tracks for tests
  const mockSkippedTracks = [
    // Immediate skips pattern data
    {
      id: "track1",
      name: "Skip Me Fast",
      artist: "Quick Skipper",
      skipCount: 15,
      skipEvents: Array(15)
        .fill(0)
        .map(() => ({
          timestamp: new Date().toISOString(),
          progress: 0.05, // Very early skip
          playDuration: 5000, // 5 seconds
          isManualSkip: true,
          context: {
            type: "playlist",
            name: "Morning Mix",
            uri: "spotify:playlist:123",
          },
        })),
    },
    // Skip streak pattern data
    {
      id: "track2",
      name: "Part of Streak 1",
      artist: "Streak Artist",
      skipCount: 5,
      skipEvents: Array(5)
        .fill(0)
        .map((_, i) => ({
          timestamp: new Date(Date.now() - i * 60000).toISOString(), // Each skip 1 min apart
          progress: 0.3,
          playDuration: 30000,
          isManualSkip: true,
          context: {
            type: "playlist",
            name: "Evening Mix",
            uri: "spotify:playlist:456",
          },
        })),
    },
    {
      id: "track3",
      name: "Part of Streak 2",
      artist: "Streak Artist",
      skipCount: 5,
      skipEvents: Array(5)
        .fill(0)
        .map((_, i) => ({
          timestamp: new Date(Date.now() - (i * 60000 + 5000)).toISOString(), // Each right after track2
          progress: 0.4,
          playDuration: 40000,
          isManualSkip: true,
          context: {
            type: "playlist",
            name: "Evening Mix",
            uri: "spotify:playlist:456",
          },
        })),
    },
    // Context specific pattern data
    {
      id: "track4",
      name: "Context Specific Skip",
      artist: "Various Artists",
      skipCount: 10,
      skipEvents: Array(10)
        .fill(0)
        .map(() => ({
          timestamp: new Date().toISOString(),
          progress: 0.5,
          playDuration: 50000,
          isManualSkip: true,
          context: {
            type: "playlist",
            name: "Workout Mix",
            uri: "spotify:playlist:789",
          },
        })),
    },
  ];

  beforeEach(() => {
    // Reset all mocks
    vi.resetAllMocks();

    // Setup default mock implementations
    vi.mocked(getSkippedTracks).mockResolvedValue(mockSkippedTracks);
    vi.mocked(aggregateArtistSkipMetrics).mockResolvedValue(mockArtistMetrics);
    vi.mocked(analyzeTimeBasedPatterns).mockResolvedValue(mockTimePatterns);
  });

  it("should detect artist aversion patterns", async () => {
    const result = await detectSkipPatterns();

    // Validate result
    expect(result.success).toBe(true);
    expect(result.data.length).toBeGreaterThan(0);

    // Find artist aversion patterns
    const artistAversionPatterns = result.data.filter(
      (pattern) => pattern.type === PatternType.ARTIST_AVERSION,
    );

    // Should detect Artist One with high skip ratio
    expect(artistAversionPatterns.length).toBeGreaterThan(0);

    // Validate specific pattern details
    const artistOnePattern = artistAversionPatterns.find((pattern) =>
      pattern.relatedItems.includes("Artist One"),
    );

    expect(artistOnePattern).toBeDefined();
    expect(artistOnePattern?.confidence).toBeGreaterThan(0.7); // Passing confidence threshold
    expect(artistOnePattern?.occurrences).toBe(20); // Total skips from the mock data
  });

  it("should detect time of day patterns", async () => {
    const result = await detectSkipPatterns();

    // Find time of day patterns
    const timePatterns = result.data.filter(
      (pattern) => pattern.type === PatternType.TIME_OF_DAY,
    );

    // Should detect time patterns from the mock data
    expect(timePatterns.length).toBeGreaterThan(0);

    // Validate one of the time patterns
    const morningPattern = timePatterns.find(
      (pattern) =>
        pattern.description.includes("9 AM") ||
        pattern.description.includes("09:00"),
    );

    expect(morningPattern).toBeDefined();
    expect(morningPattern?.confidence).toBeGreaterThan(0.5);
  });

  it("should detect immediate skip patterns", async () => {
    const result = await detectSkipPatterns();

    // Find immediate skip patterns
    const immediateSkipPatterns = result.data.filter(
      (pattern) => pattern.type === PatternType.IMMEDIATE_SKIP,
    );

    expect(immediateSkipPatterns.length).toBeGreaterThan(0);

    // Validate pattern details
    const skipPattern = immediateSkipPatterns[0];
    expect(skipPattern.occurrences).toBeGreaterThan(5);
    expect(skipPattern.confidence).toBeGreaterThan(0.5);
  });

  it("should detect context-specific patterns", async () => {
    const result = await detectSkipPatterns();

    // Find context specific patterns
    const contextPatterns = result.data.filter(
      (pattern) => pattern.type === PatternType.CONTEXT_SPECIFIC,
    );

    expect(contextPatterns.length).toBeGreaterThan(0);

    // Check for workout playlist pattern
    const workoutPattern = contextPatterns.find(
      (pattern) =>
        pattern.description.includes("Workout") ||
        (pattern.details.context &&
          typeof pattern.details.context === "string" &&
          pattern.details.context.includes("Workout")),
    );

    expect(workoutPattern).toBeDefined();
  });

  it("should detect skip streak patterns", async () => {
    const result = await detectSkipPatterns();

    // Find skip streak patterns
    const streakPatterns = result.data.filter(
      (pattern) => pattern.type === PatternType.SKIP_STREAK,
    );

    expect(streakPatterns.length).toBeGreaterThan(0);
  });

  it("should sort patterns by confidence score", async () => {
    const result = await detectSkipPatterns();

    // Check that patterns are sorted by confidence (highest first)
    for (let i = 1; i < result.data.length; i++) {
      expect(result.data[i - 1].confidence).toBeGreaterThanOrEqual(
        result.data[i].confidence,
      );
    }
  });

  it("should handle case with not enough data", async () => {
    // Mock not enough skipped tracks
    vi.mocked(getSkippedTracks).mockResolvedValueOnce([]);

    const result = await detectSkipPatterns();

    // Should succeed but return empty array
    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);

    // Should not save patterns
    expect(fsExtra.writeJsonSync).not.toHaveBeenCalled();
  });

  it("should handle errors gracefully", async () => {
    // Force an error by making one of the dependencies throw
    vi.mocked(getSkippedTracks).mockRejectedValueOnce(new Error("Test error"));

    const result = await detectSkipPatterns();

    // Should indicate failure but not throw
    expect(result.success).toBe(false);
    expect(result.error).toBe("Test error");
    expect(result.data).toEqual([]);
  });
});
