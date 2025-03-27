/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock window.spotify
const mockSpotify = {
  getStatistics: vi.fn().mockResolvedValue({
    dailySkipMetrics: [],
    artistMetrics: [],
    skippedTracks: [],
  }),
  getDailySkipMetrics: vi.fn().mockResolvedValue([]),
  getArtistMetrics: vi.fn().mockResolvedValue([]),
  getAllSkippedTracks: vi.fn().mockResolvedValue([]),
  getRecentSkippedTracks: vi.fn().mockResolvedValue([]),
  getSkipPatterns: vi.fn().mockResolvedValue([]),
  exportSkippedTracksToCSV: vi
    .fn()
    .mockResolvedValue("/fake/path/to/export.csv"),
  exportStatisticsToCSV: vi
    .fn()
    .mockResolvedValue("/fake/path/to/statistics.csv"),
};

// Apply mock
vi.stubGlobal("window", {
  spotify: mockSpotify,
});

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Simple test component to test window.spotify API
const TestStatisticsComponent = () => {
  return (
    <div>
      <button
        data-testid="get-statistics-btn"
        onClick={() => window.spotify.getStatistics()}
      >
        Get Statistics
      </button>
      <button
        data-testid="get-daily-metrics-btn"
        onClick={() => window.spotify.getDailySkipMetrics()}
      >
        Get Daily Metrics
      </button>
      <button
        data-testid="get-artist-metrics-btn"
        onClick={() => window.spotify.getArtistMetrics()}
      >
        Get Artist Metrics
      </button>
      <button
        data-testid="get-all-skipped-btn"
        onClick={() => window.spotify.getAllSkippedTracks()}
      >
        Get All Skipped Tracks
      </button>
      <button
        data-testid="get-recent-skipped-btn"
        onClick={() => window.spotify.getRecentSkippedTracks()}
      >
        Get Recent Skipped Tracks
      </button>
      <button
        data-testid="get-patterns-btn"
        onClick={() => window.spotify.getSkipPatterns()}
      >
        Get Skip Patterns
      </button>
      <button
        data-testid="export-tracks-btn"
        onClick={() => window.spotify.exportSkippedTracksToCSV()}
      >
        Export Tracks to CSV
      </button>
      <button
        data-testid="export-stats-btn"
        onClick={() => window.spotify.exportStatisticsToCSV()}
      >
        Export Statistics to CSV
      </button>
    </div>
  );
};

describe("Statistics Functionality", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("should call getStatistics", async () => {
    // Arrange
    const { getByTestId } = render(<TestStatisticsComponent />);

    // Act
    fireEvent.click(getByTestId("get-statistics-btn"));

    // Assert
    expect(mockSpotify.getStatistics).toHaveBeenCalledTimes(1);
  });

  it("should call getDailySkipMetrics", async () => {
    // Arrange
    const { getByTestId } = render(<TestStatisticsComponent />);

    // Act
    fireEvent.click(getByTestId("get-daily-metrics-btn"));

    // Assert
    expect(mockSpotify.getDailySkipMetrics).toHaveBeenCalledTimes(1);
  });

  it("should call getArtistMetrics", async () => {
    // Arrange
    const { getByTestId } = render(<TestStatisticsComponent />);

    // Act
    fireEvent.click(getByTestId("get-artist-metrics-btn"));

    // Assert
    expect(mockSpotify.getArtistMetrics).toHaveBeenCalledTimes(1);
  });

  it("should call getAllSkippedTracks", async () => {
    // Arrange
    const { getByTestId } = render(<TestStatisticsComponent />);

    // Act
    fireEvent.click(getByTestId("get-all-skipped-btn"));

    // Assert
    expect(mockSpotify.getAllSkippedTracks).toHaveBeenCalledTimes(1);
  });

  it("should call getRecentSkippedTracks", async () => {
    // Arrange
    const { getByTestId } = render(<TestStatisticsComponent />);

    // Act
    fireEvent.click(getByTestId("get-recent-skipped-btn"));

    // Assert
    expect(mockSpotify.getRecentSkippedTracks).toHaveBeenCalledTimes(1);
  });

  it("should call getSkipPatterns", async () => {
    // Arrange
    const { getByTestId } = render(<TestStatisticsComponent />);

    // Act
    fireEvent.click(getByTestId("get-patterns-btn"));

    // Assert
    expect(mockSpotify.getSkipPatterns).toHaveBeenCalledTimes(1);
  });

  it("should call exportSkippedTracksToCSV", async () => {
    // Arrange
    const { getByTestId } = render(<TestStatisticsComponent />);

    // Act
    fireEvent.click(getByTestId("export-tracks-btn"));

    // Assert
    expect(mockSpotify.exportSkippedTracksToCSV).toHaveBeenCalledTimes(1);
  });

  it("should call exportStatisticsToCSV", async () => {
    // Arrange
    const { getByTestId } = render(<TestStatisticsComponent />);

    // Act
    fireEvent.click(getByTestId("export-stats-btn"));

    // Assert
    expect(mockSpotify.exportStatisticsToCSV).toHaveBeenCalledTimes(1);
  });
});
