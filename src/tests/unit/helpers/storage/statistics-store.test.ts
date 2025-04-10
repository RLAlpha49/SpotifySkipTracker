import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  calculateUniqueArtistCount,
  clearStatistics,
  getStatistics,
  saveStatistics,
} from "../../../../helpers/storage/statistics-store";
import { StatisticsData } from "../../../../types/statistics";

// Mock the required modules
vi.mock("fs-extra", () => {
  const mockFunctions = {
    ensureDir: vi.fn().mockResolvedValue(undefined),
    existsSync: vi.fn(),
    readJsonSync: vi.fn(),
    writeJsonSync: vi.fn(),
  };
  return {
    ...mockFunctions,
    default: mockFunctions,
  };
});

vi.mock("path", () => {
  const joinFn = vi.fn((...args) => {
    // Hardcode the paths to avoid referencing variables that get hoisted
    if (
      args[0] === "/mock/userData" &&
      args[1] === "data" &&
      args.length === 2
    ) {
      return "/mock/userData/data";
    }
    if (
      args[0] === "/mock/userData" &&
      args[1] === "data" &&
      args[2] === "statistics.json"
    ) {
      return "/mock/userData/data/statistics.json";
    }
    return args.join("/");
  });

  const mockPath = { join: joinFn };
  return {
    ...mockPath,
    default: mockPath,
  };
});

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn().mockReturnValue("/mock/userData"),
  },
}));

// Import after mocks
const fs = await import("fs-extra");

describe("Statistics Store", () => {
  // Mock console methods
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const mockConsoleLog = vi.fn();
  const mockConsoleError = vi.fn();

  // Sample statistics data for testing
  const mockStatisticsData: Partial<StatisticsData> = {
    lastUpdated: "2023-01-01T00:00:00.000Z",
    totalUniqueTracks: 2,
    totalUniqueArtists: 2,
    overallSkipRate: 0.35,
    discoveryRate: 0.25,
    totalListeningTimeMs: 360000000, // 100 hours
    hourlyDistribution: Array(24).fill(1),
    dailyDistribution: Array(7).fill(1),
    trackMetrics: {
      "track-1": {
        name: "Track 1",
        artist: "Artist 1",
        skipCount: 5,
        playCount: 10,
        skipRate: 0.5,
        averagePlayTimeMs: 120000,
        totalPlayTimeMs: 1200000,
      },
      "track-2": {
        name: "Track 2",
        artist: "Artist 2",
        skipCount: 2,
        playCount: 8,
        skipRate: 0.25,
        averagePlayTimeMs: 180000,
        totalPlayTimeMs: 1440000,
      },
    },
    artistMetrics: {
      "artist-1": {
        name: "Artist 1",
        playCount: 10,
        skipCount: 5,
        skipRate: 0.5,
        totalPlayTimeMs: 1200000,
        trackIds: ["track-1"],
      },
      "artist-2": {
        name: "Artist 2",
        playCount: 8,
        skipCount: 2,
        skipRate: 0.25,
        totalPlayTimeMs: 1440000,
        trackIds: ["track-2"],
      },
    },
    dailyMetrics: {
      "2023-01-01": {
        totalPlays: 10,
        totalSkips: 3,
        skipRate: 0.3,
        totalPlayTimeMs: 1200000,
        uniqueTracks: ["track-1", "track-2"],
        uniqueArtists: ["artist-1", "artist-2"],
      },
    },
    weeklyMetrics: {
      "2023-W01": {
        totalPlays: 15,
        totalSkips: 5,
        skipRate: 0.33,
        totalPlayTimeMs: 1800000,
        uniqueTracks: ["track-1", "track-2"],
        uniqueArtists: ["artist-1", "artist-2"],
      },
    },
    monthlyMetrics: {
      "2023-01": {
        totalPlays: 20,
        totalSkips: 7,
        skipRate: 0.35,
        totalPlayTimeMs: 2400000,
        uniqueTracks: ["track-1", "track-2"],
        uniqueArtists: ["artist-1", "artist-2"],
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Override console methods
    console.log = mockConsoleLog;
    console.error = mockConsoleError;

    // Default mock implementations
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readJsonSync).mockReturnValue(mockStatisticsData);
  });

  afterEach(() => {
    vi.resetAllMocks();

    // Restore console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  describe("calculateUniqueArtistCount", () => {
    it("should count unique artists from statistics data", () => {
      // Arrange
      const statisticsData = {
        ...mockStatisticsData,
        artistMetrics: {
          "artist-1": { name: "Artist 1", trackIds: ["track-1"] },
          "artist-2": { name: "Artist 2", trackIds: ["track-2"] },
          "artist-3": { name: "Artist 3", trackIds: ["track-3"] },
        },
      } as StatisticsData;

      // Act
      const count = calculateUniqueArtistCount(statisticsData);

      // Assert
      expect(count).toBe(3);
    });

    it("should return 0 for empty artist metrics", () => {
      // Create a completely new object without reference to the mock data
      const emptyStatisticsData: StatisticsData = {
        lastUpdated: "2023-01-01T00:00:00.000Z",
        totalUniqueTracks: 0,
        totalUniqueArtists: 0,
        overallSkipRate: 0,
        hourlyDistribution: Array(24).fill(0),
        dailyDistribution: Array(7).fill(0),
        artistMetrics: {}, // Empty artist metrics
        trackMetrics: {},
        dailyMetrics: {},
        weeklyMetrics: {},
        monthlyMetrics: {},
        sessions: [],
        discoveryRate: 0,
        totalListeningTimeMs: 0,
        topArtistIds: [],
        deviceMetrics: {},
        skipPatterns: {},
        recentDiscoveries: [],
        avgSessionDurationMs: 0,
        hourlyListeningTime: Array(24).fill(0),
        repeatListeningRate: 0,
        recentSkipRateTrend: Array(14).fill(0),
        recentListeningTimeTrend: Array(14).fill(0),
      };

      // Act
      const count = calculateUniqueArtistCount(emptyStatisticsData);

      // Assert
      expect(count).toBe(0);
    });
  });

  describe("getStatistics", () => {
    it("should retrieve statistics data from storage", async () => {
      // Act
      const statistics = await getStatistics();

      // Assert
      expect(fs.ensureDir).toHaveBeenCalled();
      expect(fs.readJsonSync).toHaveBeenCalled();
      expect(statistics).toEqual(
        expect.objectContaining({
          lastUpdated: "2023-01-01T00:00:00.000Z",
          totalUniqueTracks: 2,
          totalUniqueArtists: 2,
        }),
      );
    });

    it("should create default statistics if file doesn't exist", async () => {
      // Arrange
      vi.mocked(fs.existsSync).mockReturnValueOnce(false);

      // Act
      const statistics = await getStatistics();

      // Assert
      expect(fs.writeJsonSync).toHaveBeenCalled();
      expect(statistics).toHaveProperty("lastUpdated");
      expect(statistics).toHaveProperty("totalUniqueTracks", 0);
      expect(statistics.hourlyDistribution).toHaveLength(24);
    });

    it("should handle errors gracefully", async () => {
      // Arrange
      vi.mocked(fs.readJsonSync).mockImplementationOnce(() => {
        throw new Error("Mock read error");
      });

      // Act & Assert
      await expect(getStatistics()).rejects.toThrow("Mock read error");
      expect(mockConsoleError).toHaveBeenCalledWith(
        "Error reading statistics:",
        expect.any(Error),
      );
    });
  });

  describe("saveStatistics", () => {
    it("should save statistics data to storage", async () => {
      // Arrange
      const statisticsToSave = { ...mockStatisticsData } as StatisticsData;

      // Act
      const result = await saveStatistics(statisticsToSave);

      // Assert
      expect(result).toBe(true);
      expect(fs.ensureDir).toHaveBeenCalled();
      expect(fs.writeJsonSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        { spaces: 2 },
      );

      // Verify lastUpdated was updated
      const savedData = vi.mocked(fs.writeJsonSync).mock
        .calls[0][1] as StatisticsData;
      expect(savedData.lastUpdated).not.toBe("2023-01-01T00:00:00.000Z");
    });

    it("should convert Set objects to arrays before saving", async () => {
      // Arrange
      const statisticsWithSets = {
        ...mockStatisticsData,
        dailyMetrics: {
          "2023-01-01": {
            ...mockStatisticsData.dailyMetrics?.["2023-01-01"],
            uniqueTracks: new Set(["track-1", "track-2"]),
            uniqueArtists: new Set(["artist-1", "artist-2"]),
          },
        },
      } as unknown as StatisticsData;

      // Act
      const result = await saveStatistics(statisticsWithSets);

      // Assert
      expect(result).toBe(true);

      // Verify that Sets were converted to arrays
      expect(fs.writeJsonSync).toHaveBeenCalled();
      const savedData = vi.mocked(fs.writeJsonSync).mock
        .calls[0][1] as StatisticsData;
      expect(
        Array.isArray(savedData.dailyMetrics["2023-01-01"].uniqueTracks),
      ).toBe(true);
      expect(
        Array.isArray(savedData.dailyMetrics["2023-01-01"].uniqueArtists),
      ).toBe(true);
    });

    it("should handle errors gracefully", async () => {
      // Arrange
      vi.mocked(fs.writeJsonSync).mockImplementationOnce(() => {
        throw new Error("Mock write error");
      });

      // Act
      const result = await saveStatistics(mockStatisticsData as StatisticsData);

      // Assert
      expect(result).toBe(false);
      expect(mockConsoleError).toHaveBeenCalledWith(
        "Error saving statistics:",
        expect.any(Error),
      );
    });
  });

  describe("clearStatistics", () => {
    it("should reset statistics to default values", async () => {
      // Act
      const result = await clearStatistics();

      // Assert
      expect(result).toBe(true);
      expect(fs.writeJsonSync).toHaveBeenCalled();

      // Verify default values in the saved data
      const savedData = vi.mocked(fs.writeJsonSync).mock
        .calls[0][1] as StatisticsData;
      expect(savedData.totalUniqueTracks).toBe(0);
      expect(savedData.totalUniqueArtists).toBe(0);
      expect(savedData.overallSkipRate).toBe(0);
      expect(savedData.hourlyDistribution).toHaveLength(24);
      expect(savedData.hourlyDistribution.every((val) => val === 0)).toBe(true);
    });

    it("should handle errors gracefully", async () => {
      // Arrange
      vi.mocked(fs.writeJsonSync).mockImplementationOnce(() => {
        throw new Error("Mock write error");
      });

      // Act
      const result = await clearStatistics();

      // Assert
      expect(result).toBe(false);
      expect(mockConsoleError).toHaveBeenCalledWith(
        "Error clearing statistics:",
        expect.any(Error),
      );
    });
  });
});
