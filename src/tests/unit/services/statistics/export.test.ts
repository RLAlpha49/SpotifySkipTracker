import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("electron", () => ({
  app: {
    getPath: vi.fn().mockReturnValue("/mock/path"),
  },
  clipboard: {
    writeText: vi.fn(),
  },
  dialog: {
    showSaveDialog: vi.fn(),
  },
  BrowserWindow: vi.fn(),
}));

vi.mock("fs-extra", () => ({
  ensureDirSync: vi.fn(),
  existsSync: vi.fn().mockReturnValue(true),
  readFileSync: vi.fn().mockReturnValue(JSON.stringify({ test: "data" })),
  writeFileSync: vi.fn(),
}));

vi.mock("path", () => ({
  join: (...args: string[]) => args.join("/"),
}));

// Mock storage functions
vi.mock("../../../../helpers/storage/store", () => ({
  getSkippedTracks: vi.fn(),
  getStatistics: vi.fn(),
}));

// Mock aggregator and pattern detector
vi.mock("../../../../services/statistics/aggregator", () => ({
  aggregateArtistSkipMetrics: vi.fn(),
  aggregateDailySkipMetrics: vi.fn(),
  analyzeTimeBasedPatterns: vi.fn(),
  calculateLibrarySkipStatistics: vi.fn(),
}));

vi.mock("../../../../services/statistics/pattern-detector", () => ({
  detectSkipPatterns: vi.fn(),
}));

// Import after mocks are defined
import * as electron from "electron";
import * as fsExtra from "fs-extra";
import {
  getSkippedTracks,
  getStatistics,
} from "../../../../helpers/storage/store";
import {
  aggregateArtistSkipMetrics,
  aggregateDailySkipMetrics,
  analyzeTimeBasedPatterns,
  calculateLibrarySkipStatistics,
} from "../../../../services/statistics/aggregator";
import {
  copyStatisticsToClipboard,
  exportAllStatisticsToJSON,
  exportArtistMetricsToCSV,
  exportDailyMetricsToCSV,
  exportDetectedPatternsToCSV,
  exportLibraryStatisticsToCSV,
  exportSkippedTracksToCSV,
  exportTimePatternsToCSV,
  exportWeeklyMetricsToCSV,
  promptForExportLocation,
} from "../../../../services/statistics/export";
import { detectSkipPatterns } from "../../../../services/statistics/pattern-detector";

describe("Statistics Export Service", () => {
  // Sample data for tests
  const mockMainWindow = {} as electron.BrowserWindow;

  const mockSkippedTracks = [
    {
      id: "track1",
      name: "Track One",
      artist: "Artist One",
      albumName: "Album One",
      skipCount: 5,
      lastSkipped: "2023-03-20T15:30:00Z",
      skipEvents: [
        {
          timestamp: "2023-03-18T10:15:00Z",
          progress: 0.3,
          playDuration: 35000,
          isManualSkip: true,
        },
        {
          timestamp: "2023-03-20T15:30:00Z",
          progress: 0.2,
          playDuration: 25000,
          isManualSkip: false,
        },
      ],
      manualSkipCount: 1,
      autoSkipCount: 1,
    },
    {
      id: "track2",
      name: "Track Two",
      artist: "Artist Two",
      albumName: "Album Two",
      skipCount: 3,
      lastSkipped: "2023-03-19T18:45:00Z",
      skipEvents: [
        {
          timestamp: "2023-03-19T18:45:00Z",
          progress: 0.5,
          playDuration: 45000,
          isManualSkip: true,
        },
      ],
      manualSkipCount: 3,
      autoSkipCount: 0,
    },
  ];

  const mockArtistMetrics = {
    artist1: {
      artistName: "Artist One",
      totalSkips: 10,
      uniqueTracksSkipped: ["track1", "track3", "track4"],
      skipRatio: 0.6,
      manualSkips: 7,
      autoSkips: 3,
      averagePlayPercentage: 0.3,
      mostSkippedTrack: {
        id: "track1",
        name: "Track One",
        skipCount: 5,
      },
    },
    artist2: {
      artistName: "Artist Two",
      totalSkips: 8,
      uniqueTracksSkipped: ["track2", "track5"],
      skipRatio: 0.4,
      manualSkips: 6,
      autoSkips: 2,
      averagePlayPercentage: 0.5,
      mostSkippedTrack: {
        id: "track2",
        name: "Track Two",
        skipCount: 3,
      },
    },
  };

  const mockDailyMetrics = {
    "2023-03-18": {
      date: "2023-03-18",
      tracksPlayed: 20,
      tracksSkipped: 5,
      listeningTimeMs: 3600000,
      uniqueArtists: ["Artist One", "Artist Two"],
      uniqueTracks: ["track1", "track2", "track3"],
      skipsByType: {
        preview: 2,
        standard: 2,
        near_end: 1,
        auto: 2,
        manual: 3,
      },
    },
    "2023-03-19": {
      date: "2023-03-19",
      tracksPlayed: 15,
      tracksSkipped: 3,
      listeningTimeMs: 2700000,
      uniqueArtists: ["Artist Two", "Artist Three"],
      uniqueTracks: ["track2", "track5", "track6"],
      skipsByType: {
        preview: 1,
        standard: 1,
        near_end: 1,
        auto: 0,
        manual: 3,
      },
    },
  };

  const mockWeeklyMetrics = {
    "2023-W11": {
      weekId: "2023-W11",
      startDate: "2023-03-13",
      endDate: "2023-03-19",
      totalSkips: 15,
      uniqueTracksSkipped: ["track1", "track2", "track3", "track4", "track5"],
      skipsByType: {
        preview: 5,
        standard: 7,
        near_end: 3,
        auto: 6,
        manual: 9,
      },
      skipsByDay: [2, 1, 3, 2, 2, 3, 2],
      manualSkips: 9,
      autoSkips: 6,
      topSkipHour: 18,
    },
  };

  const mockLibraryStats = {
    totalSkips: 32,
    totalTracks: 100,
    uniqueTracksSkipped: 15,
    overallSkipRate: 0.32,
    skipsByType: {
      preview: 10,
      standard: 15,
      near_end: 7,
      auto: 12,
      manual: 20,
    },
    artistsWithHighestSkipRates: [
      { artistName: "Artist One", skipRate: 0.6, totalSkips: 10 },
      { artistName: "Artist Two", skipRate: 0.4, totalSkips: 8 },
    ],
    mostSkippedTracks: [
      {
        trackId: "track1",
        trackName: "Track One",
        artistName: "Artist One",
        skipCount: 5,
      },
      {
        trackId: "track2",
        trackName: "Track Two",
        artistName: "Artist Two",
        skipCount: 3,
      },
    ],
    averageSkipPercentage: 0.4,
    skipTrends: {
      daily: { "2023-03-18": 5, "2023-03-19": 3 },
      weekly: { "2023-W11": 15 },
    },
    lastUpdated: new Date().toISOString(),
  };

  const mockTimePatterns = {
    hourlyDistribution: Array(24)
      .fill(1)
      .map((_, i) => (i % 3 === 0 ? 5 : 2)),
    peakSkipHours: [0, 3, 6, 9, 12, 15, 18, 21],
    dayOfWeekDistribution: [3, 4, 2, 3, 5, 8, 7],
    timeOfDayDistribution: {
      morning: 10,
      afternoon: 8,
      evening: 12,
      night: 6,
    },
    patternsByArtist: {
      "Artist One": {
        hourlyDistribution: Array(24)
          .fill(0)
          .map((_, i) => (i % 6 === 0 ? 3 : 1)),
        peakHours: [0, 6, 12, 18],
      },
    },
    lastUpdated: new Date().toISOString(),
  };

  const mockPatterns = [
    {
      type: "artist_aversion",
      confidence: 0.85,
      description: "Frequently skips tracks by Artist One",
      occurrences: 10,
      relatedItems: ["Artist One"],
      details: {
        skipRatio: 0.6,
        uniqueTracksSkipped: 3,
        averagePlayPercentage: 0.3,
      },
      firstDetected: "2023-03-01T00:00:00Z",
      lastDetected: "2023-03-20T00:00:00Z",
    },
    {
      type: "time_of_day",
      confidence: 0.75,
      description: "High skip rate at 6 PM",
      occurrences: 12,
      relatedItems: ["18:00"],
      details: {
        hourOfDay: 18,
        skipCount: 12,
        averageForOtherHours: 2.5,
      },
      firstDetected: "2023-03-05T00:00:00Z",
      lastDetected: "2023-03-20T00:00:00Z",
    },
  ];

  const mockStatistics = {
    dailyMetrics: mockDailyMetrics,
    weeklyMetrics: mockWeeklyMetrics,
    artistMetrics: {},
    libraryStats: mockLibraryStats,
    timePatterns: mockTimePatterns,
    detectedPatterns: mockPatterns,
    lastUpdated: new Date().toISOString(),
  };

  beforeEach(() => {
    // Reset all mocks
    vi.resetAllMocks();

    // Setup default mock implementations
    vi.mocked(getSkippedTracks).mockResolvedValue(mockSkippedTracks);
    vi.mocked(getStatistics).mockResolvedValue(mockStatistics);
    vi.mocked(aggregateArtistSkipMetrics).mockResolvedValue(mockArtistMetrics);
    vi.mocked(aggregateDailySkipMetrics).mockResolvedValue(mockDailyMetrics);
    vi.mocked(analyzeTimeBasedPatterns).mockResolvedValue(mockTimePatterns);
    vi.mocked(calculateLibrarySkipStatistics).mockResolvedValue(
      mockLibraryStats,
    );
    vi.mocked(detectSkipPatterns).mockResolvedValue({
      success: true,
      data: mockPatterns,
    });

    // Mock dialog.showSaveDialog to simulate user selecting a file location
    vi.mocked(electron.dialog.showSaveDialog).mockResolvedValue({
      canceled: false,
      filePath: "/mock/path/exports/export_file.csv",
    });
  });

  it("should prompt for export location", async () => {
    // Call the function
    const filePath = await promptForExportLocation(
      mockMainWindow,
      "/mock/path/exports/default.csv",
      [{ name: "CSV Files", extensions: ["csv"] }],
    );

    // Verify dialog was called with correct parameters
    expect(electron.dialog.showSaveDialog).toHaveBeenCalledWith(
      mockMainWindow,
      expect.objectContaining({
        defaultPath: "/mock/path/exports/default.csv",
        filters: [{ name: "CSV Files", extensions: ["csv"] }],
        properties: ["createDirectory"],
      }),
    );

    // Verify the correct path is returned
    expect(filePath).toBe("/mock/path/exports/export_file.csv");
  });

  it("should cancel export when dialog is canceled", async () => {
    // Mock dialog cancellation
    vi.mocked(electron.dialog.showSaveDialog).mockResolvedValueOnce({
      canceled: true,
      filePath: undefined,
    });

    // Call the function
    const filePath = await promptForExportLocation(
      mockMainWindow,
      "/mock/path/exports/default.csv",
      [{ name: "CSV Files", extensions: ["csv"] }],
    );

    // Verify undefined is returned
    expect(filePath).toBeUndefined();
  });

  it("should export skipped tracks to CSV", async () => {
    // Call the function
    const result = await exportSkippedTracksToCSV(mockMainWindow);

    // Verify success
    expect(result.success).toBe(true);
    expect(result.message).toBe("Skipped tracks data exported successfully");
    expect(result.filePath).toBe("/mock/path/exports/export_file.csv");

    // Verify file was written
    expect(fsExtra.writeFileSync).toHaveBeenCalledWith(
      "/mock/path/exports/export_file.csv",
      expect.any(String),
    );

    // Verify CSV content contains headers
    const csvContent = vi.mocked(fsExtra.writeFileSync).mock
      .calls[0][1] as string;
    expect(csvContent).toContain("Track ID,Track Name,Artist,Album,Skip Count");

    // Verify CSV content includes data
    expect(csvContent).toContain("track1");
    expect(csvContent).toContain("Track One");
    expect(csvContent).toContain("Artist One");
  });

  it("should handle no skipped tracks data", async () => {
    // Mock empty skipped tracks
    vi.mocked(getSkippedTracks).mockResolvedValueOnce([]);

    // Call the function
    const result = await exportSkippedTracksToCSV(mockMainWindow);

    // Verify result
    expect(result.success).toBe(false);
    expect(result.message).toBe("No skipped tracks data available to export");

    // Verify file was not written
    expect(fsExtra.writeFileSync).not.toHaveBeenCalled();
  });

  it("should export artist metrics to CSV", async () => {
    // Call the function
    const result = await exportArtistMetricsToCSV(mockMainWindow);

    // Verify success
    expect(result.success).toBe(true);
    expect(result.message).toContain("Artist metrics exported successfully");

    // Verify file was written
    expect(fsExtra.writeFileSync).toHaveBeenCalled();

    // Check if the data is in the CSV
    const csvContent = vi.mocked(fsExtra.writeFileSync).mock
      .calls[0][1] as string;
    expect(csvContent).toContain(
      "Artist Name,Total Skips,Unique Tracks Skipped",
    );
    expect(csvContent).toContain("Artist One");
    expect(csvContent).toContain("Artist Two");
  });

  it("should export daily metrics to CSV", async () => {
    // Call the function
    const result = await exportDailyMetricsToCSV(mockMainWindow);

    // Verify success
    expect(result.success).toBe(true);

    // Verify file was written
    expect(fsExtra.writeFileSync).toHaveBeenCalled();

    // Check if the data is in the CSV
    const csvContent = vi.mocked(fsExtra.writeFileSync).mock
      .calls[0][1] as string;
    expect(csvContent).toContain("Date,Tracks Played,Tracks Skipped");
    expect(csvContent).toContain("2023-03-18");
    expect(csvContent).toContain("2023-03-19");
  });

  it("should export all statistics to JSON", async () => {
    // Call the function
    const result = await exportAllStatisticsToJSON(mockMainWindow);

    // Verify success
    expect(result.success).toBe(true);

    // Verify file was written
    expect(fsExtra.writeFileSync).toHaveBeenCalled();
  });

  it("should copy statistics to clipboard", () => {
    // Call the function
    const result = copyStatisticsToClipboard(mockStatistics);

    // Verify success
    expect(result.success).toBe(true);

    // Verify clipboard was written to
    expect(electron.clipboard.writeText).toHaveBeenCalled();
  });

  it("should export weekly metrics to CSV", async () => {
    // Call the function
    const result = await exportWeeklyMetricsToCSV(mockMainWindow);

    // Verify success
    expect(result.success).toBe(true);

    // Verify file was written
    expect(fsExtra.writeFileSync).toHaveBeenCalled();

    // Check if the data is in the CSV
    const csvContent = vi.mocked(fsExtra.writeFileSync).mock
      .calls[0][1] as string;
    expect(csvContent).toContain("Week ID,Start Date,End Date,Total Skips");
    expect(csvContent).toContain("2023-W11");
  });

  it("should export library statistics to CSV", async () => {
    // Call the function
    const result = await exportLibraryStatisticsToCSV(mockMainWindow);

    // Verify success
    expect(result.success).toBe(true);

    // Verify file was written
    expect(fsExtra.writeFileSync).toHaveBeenCalled();
  });

  it("should export time patterns to CSV", async () => {
    // Call the function
    const result = await exportTimePatternsToCSV(mockMainWindow);

    // Verify success
    expect(result.success).toBe(true);

    // Verify file was written
    expect(fsExtra.writeFileSync).toHaveBeenCalled();
  });

  it("should export detected patterns to CSV", async () => {
    // Call the function
    const result = await exportDetectedPatternsToCSV(mockMainWindow);

    // Verify success
    expect(result.success).toBe(true);

    // Verify file was written
    expect(fsExtra.writeFileSync).toHaveBeenCalled();

    // Check if the data is in the CSV
    const csvContent = vi.mocked(fsExtra.writeFileSync).mock
      .calls[0][1] as string;
    expect(csvContent).toContain(
      "Pattern Type,Confidence,Description,Occurrences",
    );
    expect(csvContent).toContain("artist_aversion");
    expect(csvContent).toContain("time_of_day");
  });

  it("should handle errors during export operations", async () => {
    // Mock an error in writeFileSync
    vi.mocked(fsExtra.writeFileSync).mockImplementationOnce(() => {
      throw new Error("Write error");
    });

    // Call the function
    const result = await exportSkippedTracksToCSV(mockMainWindow);

    // Verify failure
    expect(result.success).toBe(false);
    expect(result.message).toContain("Error exporting data: Write error");
  });
});
