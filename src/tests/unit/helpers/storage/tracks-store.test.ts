import fs from "fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  filterSkippedTracksByTimeframe,
  getSkippedTracks,
  parseTimestamp,
  removeSkippedTrack,
  saveSkippedTracks,
  updateNotSkippedTrack,
  updateSkippedTrack,
} from "../../../../helpers/storage/tracks-store";
import { SkippedTrack } from "../../../../types/spotify";

// Mock modules
vi.mock("fs", () => {
  const mockFs = {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
  };
  return {
    default: mockFs,
    ...mockFs,
  };
});

vi.mock("path", () => {
  const dirname = vi.fn().mockReturnValue("/mock/userData/data");
  const join = vi.fn((...args) => {
    if (args[0] === "/mock/userData" && args[1] === "data") {
      return "/mock/userData/data";
    }
    return args.join("/");
  });

  const mockPath = { dirname, join };
  return {
    default: mockPath,
    ...mockPath,
  };
});

vi.mock(
  "../../../../helpers/storage/utils",
  () => ({
    skipsPath: "/mock/userData/data/skipped-tracks.json",
  }),
  { virtual: true },
);

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const mockConsoleLog = vi.fn();
const mockConsoleError = vi.fn();

describe("Tracks Storage", () => {
  // Sample skipped tracks for testing
  const testTracks: SkippedTrack[] = [
    {
      id: "track1",
      name: "Track 1",
      artist: "Artist 1",
      skipCount: 3,
      notSkippedCount: 1,
      lastSkipped: "2023-01-15T12:00:00.000Z",
      skipTimestamps: [
        "2023-01-10T10:00:00.000Z",
        "2023-01-12T11:00:00.000Z",
        "2023-01-15T12:00:00.000Z",
      ],
    },
    {
      id: "track2",
      name: "Track 2",
      artist: "Artist 2",
      skipCount: 1,
      notSkippedCount: 2,
      lastSkipped: "2023-01-05T09:00:00.000Z",
      skipTimestamps: ["2023-01-05T09:00:00.000Z"],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock console methods
    console.log = mockConsoleLog;
    console.error = mockConsoleError;

    // Default mock implementations
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(testTracks));
  });

  afterEach(() => {
    vi.resetAllMocks();

    // Restore console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  describe("saveSkippedTracks", () => {
    it("should save tracks to file successfully", () => {
      // Act
      const result = saveSkippedTracks(testTracks);

      // Assert
      expect(result).toBe(true);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining("skipped-tracks.json"),
        expect.any(String),
        "utf-8",
      );

      // Verify the tracks JSON was formatted correctly
      const savedJson = vi.mocked(fs.writeFileSync).mock.calls[0][1] as string;
      expect(JSON.parse(savedJson)).toEqual(testTracks);
    });

    it("should create directory if it doesn't exist", () => {
      // Arrange
      vi.mocked(fs.existsSync).mockReturnValue(false);

      // Act
      saveSkippedTracks(testTracks);

      // Assert
      expect(fs.mkdirSync).toHaveBeenCalled();
    });

    it("should handle errors when saving fails", () => {
      // Arrange
      vi.mocked(fs.writeFileSync).mockImplementationOnce(() => {
        throw new Error("Mock write error");
      });

      // Act
      const result = saveSkippedTracks(testTracks);

      // Assert
      expect(result).toBe(false);
      expect(mockConsoleError).toHaveBeenCalledWith(
        "Failed to save skipped tracks:",
        expect.any(Error),
      );
    });
  });

  describe("getSkippedTracks", () => {
    it("should return tracks from file when it exists", () => {
      // Act
      const tracks = getSkippedTracks();

      // Assert
      expect(tracks).toEqual(testTracks);
      expect(fs.readFileSync).toHaveBeenCalledWith(
        expect.stringContaining("skipped-tracks.json"),
        "utf-8",
      );
    });

    it("should handle legacy skipHistory field", () => {
      // Arrange - tracks with legacy skipHistory instead of skipTimestamps
      const legacyTracks = [
        {
          id: "track1",
          name: "Track 1",
          artist: "Artist 1",
          skipCount: 2,
          lastSkipped: "2023-01-15T12:00:00.000Z",
          skipHistory: ["2023-01-10T10:00:00.000Z", "2023-01-15T12:00:00.000Z"],
        },
      ];

      vi.mocked(fs.readFileSync).mockReturnValueOnce(
        JSON.stringify(legacyTracks),
      );

      // Act
      const tracks = getSkippedTracks();

      // Assert
      expect(tracks[0].skipTimestamps).toEqual(legacyTracks[0].skipHistory);
    });

    it("should return empty array if file doesn't exist", () => {
      // Arrange
      vi.mocked(fs.existsSync).mockReturnValue(false);

      // Act
      const tracks = getSkippedTracks();

      // Assert
      expect(tracks).toEqual([]);
    });

    it("should handle errors reading the file", () => {
      // Arrange
      vi.mocked(fs.readFileSync).mockImplementationOnce(() => {
        throw new Error("Mock read error");
      });

      // Act
      const tracks = getSkippedTracks();

      // Assert
      expect(tracks).toEqual([]);
      expect(mockConsoleError).toHaveBeenCalledWith(
        "Error reading skipped tracks file:",
        expect.any(Error),
      );
    });
  });

  describe("updateSkippedTrack", () => {
    it("should increment skip count for existing track", () => {
      // Arrange
      const mockDate = new Date("2023-01-20T12:00:00.000Z");
      vi.setSystemTime(mockDate);

      const trackToUpdate: SkippedTrack = {
        id: "track1",
        name: "Track 1 Updated",
        artist: "Artist 1",
      };

      // Act
      const result = updateSkippedTrack(trackToUpdate);

      // Assert
      expect(result).toBe(true);

      // Check the updated track in the saved data
      const savedJson = vi.mocked(fs.writeFileSync).mock.calls[0][1] as string;
      const savedTracks = JSON.parse(savedJson) as SkippedTrack[];
      const updatedTrack = savedTracks.find((t) => t.id === "track1");

      expect(updatedTrack).toBeDefined();
      expect(updatedTrack?.skipCount).toBe(4); // Incremented from 3
      expect(updatedTrack?.name).toBe("Track 1 Updated"); // Updated name
      expect(updatedTrack?.skipTimestamps).toHaveLength(4); // One more timestamp
      expect(updatedTrack?.skipTimestamps).toContain(mockDate.toISOString());
    });

    it("should add new track if it doesn't exist", () => {
      // Arrange
      const mockDate = new Date("2023-01-20T12:00:00.000Z");
      vi.setSystemTime(mockDate);

      const newTrack: SkippedTrack = {
        id: "track3",
        name: "Track 3",
        artist: "Artist 3",
      };

      // Act
      const result = updateSkippedTrack(newTrack);

      // Assert
      expect(result).toBe(true);

      // Check the new track in the saved data
      const savedJson = vi.mocked(fs.writeFileSync).mock.calls[0][1] as string;
      const savedTracks = JSON.parse(savedJson) as SkippedTrack[];
      const addedTrack = savedTracks.find((t) => t.id === "track3");

      expect(addedTrack).toBeDefined();
      expect(addedTrack?.skipCount).toBe(1);
      expect(addedTrack?.notSkippedCount).toBe(0);
      expect(addedTrack?.skipTimestamps).toEqual([mockDate.toISOString()]);
    });

    it("should handle errors", () => {
      // Arrange
      vi.mocked(fs.readFileSync).mockImplementationOnce(() => {
        throw new Error("Mock read error");
      });

      // Disable fs.writeFileSync to ensure it's not called when an error occurs earlier
      vi.mocked(fs.writeFileSync).mockImplementationOnce(() => {
        throw new Error("This should not be called");
      });

      // Act
      const result = updateSkippedTrack({
        id: "track1",
        name: "Test Track",
        artist: "Test Artist",
      });

      // Assert
      expect(result).toBe(false);
      expect(mockConsoleError).toHaveBeenCalled();
    });
  });

  describe("updateNotSkippedTrack", () => {
    it("should increment not-skipped count for existing track", () => {
      // Arrange
      const trackToUpdate: SkippedTrack = {
        id: "track1",
        name: "Track 1 Updated",
        artist: "Artist 1",
      };

      // Act
      const result = updateNotSkippedTrack(trackToUpdate);

      // Assert
      expect(result).toBe(true);

      // Check the updated track in the saved data
      const savedJson = vi.mocked(fs.writeFileSync).mock.calls[0][1] as string;
      const savedTracks = JSON.parse(savedJson) as SkippedTrack[];
      const updatedTrack = savedTracks.find((t) => t.id === "track1");

      expect(updatedTrack).toBeDefined();
      expect(updatedTrack?.notSkippedCount).toBe(2); // Incremented from 1
      expect(updatedTrack?.skipCount).toBe(3); // Unchanged
      expect(updatedTrack?.name).toBe("Track 1 Updated"); // Updated name
    });

    it("should add new track if it doesn't exist", () => {
      // Arrange
      const newTrack: SkippedTrack = {
        id: "track3",
        name: "Track 3",
        artist: "Artist 3",
      };

      // Act
      const result = updateNotSkippedTrack(newTrack);

      // Assert
      expect(result).toBe(true);

      // Check the new track in the saved data
      const savedJson = vi.mocked(fs.writeFileSync).mock.calls[0][1] as string;
      const savedTracks = JSON.parse(savedJson) as SkippedTrack[];
      const addedTrack = savedTracks.find((t) => t.id === "track3");

      expect(addedTrack).toBeDefined();
      expect(addedTrack?.notSkippedCount).toBe(1);
      expect(addedTrack?.skipCount).toBe(0);
      expect(addedTrack?.skipTimestamps).toEqual([]);
    });

    it("should handle errors", () => {
      // Arrange
      vi.mocked(fs.readFileSync).mockImplementationOnce(() => {
        throw new Error("Mock read error");
      });

      // Disable fs.writeFileSync to ensure it's not called when an error occurs earlier
      vi.mocked(fs.writeFileSync).mockImplementationOnce(() => {
        throw new Error("This should not be called");
      });

      // Act
      const result = updateNotSkippedTrack({
        id: "track1",
        name: "Test Track",
        artist: "Test Artist",
      });

      // Assert
      expect(result).toBe(false);
      expect(mockConsoleError).toHaveBeenCalled();
    });
  });

  describe("removeSkippedTrack", () => {
    it("should remove a track from the list", () => {
      // Act
      const result = removeSkippedTrack("track1");

      // Assert
      expect(result).toBe(true);

      // Check the track was removed
      const savedJson = vi.mocked(fs.writeFileSync).mock.calls[0][1] as string;
      const savedTracks = JSON.parse(savedJson) as SkippedTrack[];

      expect(savedTracks).toHaveLength(1);
      expect(savedTracks.find((t) => t.id === "track1")).toBeUndefined();
      expect(savedTracks.find((t) => t.id === "track2")).toBeDefined();
    });

    it("should return true if track doesn't exist", () => {
      // Act
      const result = removeSkippedTrack("non-existent-track");

      // Assert
      expect(result).toBe(true);
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it("should handle errors", () => {
      // Arrange
      vi.mocked(fs.readFileSync).mockImplementationOnce(() => {
        throw new Error("Mock read error");
      });

      // Act
      removeSkippedTrack("track1");

      // Assert
      expect(mockConsoleError).toHaveBeenCalled();
    });
  });

  describe("parseTimestamp", () => {
    it("should parse ISO string timestamps", () => {
      // Act
      const result = parseTimestamp("2023-01-15T12:00:00.000Z");

      // Assert
      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString()).toBe("2023-01-15T12:00:00.000Z");
    });

    it("should parse numeric timestamps", () => {
      // Act
      const timestamp = new Date("2023-01-15T12:00:00.000Z")
        .getTime()
        .toString();
      const result = parseTimestamp(timestamp);

      // Assert
      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString()).toBe("2023-01-15T12:00:00.000Z");
    });

    it("should return null for empty timestamps", () => {
      // Act & Assert
      expect(parseTimestamp("")).toBeNull();
    });

    it("should handle invalid timestamps", () => {
      // Act
      const result = parseTimestamp("invalid-date");

      // Assert
      expect(result?.toString()).toBe("Invalid Date");
    });
  });

  describe("filterSkippedTracksByTimeframe", () => {
    beforeEach(() => {
      // Fix the current date for consistent testing
      vi.setSystemTime(new Date("2023-01-20T12:00:00.000Z"));
    });

    it("should filter tracks within the specified timeframe", () => {
      // Act - filter to last 10 days
      const filteredTracks = filterSkippedTracksByTimeframe(10);

      // Assert
      expect(filteredTracks).toHaveLength(1);
      expect(filteredTracks[0].id).toBe("track1"); // Track1 has recent skips
      // Track2's last skip was more than 10 days ago
    });

    it("should include tracks with no skip timestamps", () => {
      // Arrange - add a track with no skip timestamps
      const tracksWithNoSkips = [
        ...testTracks,
        {
          id: "track3",
          name: "Track 3",
          artist: "Artist 3",
          skipCount: 0,
          notSkippedCount: 5,
          lastSkipped: "",
          skipTimestamps: [],
        },
      ];

      vi.mocked(fs.readFileSync).mockReturnValueOnce(
        JSON.stringify(tracksWithNoSkips),
      );

      // Act - filter to last 10 days
      const filteredTracks = filterSkippedTracksByTimeframe(10);

      // Assert
      expect(filteredTracks).toHaveLength(2);
      expect(filteredTracks.some((t) => t.id === "track3")).toBe(true);
    });

    it("should return all tracks with default 30 days timeframe", () => {
      // Act - use default timeframe (30 days)
      const filteredTracks = filterSkippedTracksByTimeframe();

      // Assert - both tracks are within 30 days
      expect(filteredTracks).toHaveLength(2);
    });

    it("should return empty array if no tracks exist", () => {
      // Arrange
      vi.mocked(fs.readFileSync).mockReturnValueOnce(JSON.stringify([]));

      // Act
      const filteredTracks = filterSkippedTracksByTimeframe(10);

      // Assert
      expect(filteredTracks).toEqual([]);
    });
  });
});
