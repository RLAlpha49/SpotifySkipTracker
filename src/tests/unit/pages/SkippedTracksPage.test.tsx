/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock window.spotify
const mockSpotify = {
  getSkippedTracks: vi.fn().mockResolvedValue([]),
  refreshSkippedTracks: vi.fn().mockResolvedValue(true),
  unlikeTrack: vi.fn().mockResolvedValue(true),
  removeFromSkippedData: vi.fn().mockResolvedValue(true),
  updateSkippedTracks: vi.fn().mockResolvedValue(true),
  openSpotifyUrl: vi.fn().mockResolvedValue(true),
  exportToCSV: vi.fn().mockResolvedValue("/fake/path/to/export.csv"),
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

// Mock a simple track object
const mockTrack = {
  id: "track123",
  name: "Test Track",
  artists: [{ name: "Test Artist" }],
  album: { name: "Test Album" },
  duration_ms: 180000,
  skipCount: 5,
  lastSkipped: "2023-08-15T14:30:00Z",
  uri: "spotify:track:track123",
};

// Simple test component to test window.spotify API
const TestSkippedTracksComponent = () => {
  return (
    <div>
      <button
        data-testid="get-tracks-btn"
        onClick={() => window.spotify.getSkippedTracks()}
      >
        Get Skipped Tracks
      </button>
      <button
        data-testid="refresh-btn"
        onClick={() => window.spotify.refreshSkippedTracks()}
      >
        Refresh Tracks
      </button>
      <button
        data-testid="unlike-btn"
        onClick={() => window.spotify.unlikeTrack(mockTrack.id)}
      >
        Unlike Track
      </button>
      <button
        data-testid="remove-btn"
        onClick={() => window.spotify.removeFromSkippedData(mockTrack.id)}
      >
        Remove Track
      </button>
      <button
        data-testid="update-btn"
        onClick={() => window.spotify.updateSkippedTracks([mockTrack])}
      >
        Update Tracks
      </button>
      <button
        data-testid="open-url-btn"
        onClick={() => window.spotify.openSpotifyUrl(mockTrack.uri)}
      >
        Open in Spotify
      </button>
      <button
        data-testid="export-btn"
        onClick={() => window.spotify.exportToCSV([mockTrack])}
      >
        Export to CSV
      </button>
    </div>
  );
};

describe("Skipped Tracks Functionality", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("should call getSkippedTracks", async () => {
    // Arrange
    const { getByTestId } = render(<TestSkippedTracksComponent />);

    // Act
    fireEvent.click(getByTestId("get-tracks-btn"));

    // Assert
    expect(mockSpotify.getSkippedTracks).toHaveBeenCalledTimes(1);
  });

  it("should call refreshSkippedTracks", async () => {
    // Arrange
    const { getByTestId } = render(<TestSkippedTracksComponent />);

    // Act
    fireEvent.click(getByTestId("refresh-btn"));

    // Assert
    expect(mockSpotify.refreshSkippedTracks).toHaveBeenCalledTimes(1);
  });

  it("should call unlikeTrack with track ID", async () => {
    // Arrange
    const { getByTestId } = render(<TestSkippedTracksComponent />);

    // Act
    fireEvent.click(getByTestId("unlike-btn"));

    // Assert
    expect(mockSpotify.unlikeTrack).toHaveBeenCalledTimes(1);
    expect(mockSpotify.unlikeTrack).toHaveBeenCalledWith(mockTrack.id);
  });

  it("should call removeFromSkippedData with track ID", async () => {
    // Arrange
    const { getByTestId } = render(<TestSkippedTracksComponent />);

    // Act
    fireEvent.click(getByTestId("remove-btn"));

    // Assert
    expect(mockSpotify.removeFromSkippedData).toHaveBeenCalledTimes(1);
    expect(mockSpotify.removeFromSkippedData).toHaveBeenCalledWith(
      mockTrack.id,
    );
  });

  it("should call updateSkippedTracks with tracks array", async () => {
    // Arrange
    const { getByTestId } = render(<TestSkippedTracksComponent />);

    // Act
    fireEvent.click(getByTestId("update-btn"));

    // Assert
    expect(mockSpotify.updateSkippedTracks).toHaveBeenCalledTimes(1);
    expect(mockSpotify.updateSkippedTracks).toHaveBeenCalledWith([mockTrack]);
  });

  it("should call openSpotifyUrl with track URI", async () => {
    // Arrange
    const { getByTestId } = render(<TestSkippedTracksComponent />);

    // Act
    fireEvent.click(getByTestId("open-url-btn"));

    // Assert
    expect(mockSpotify.openSpotifyUrl).toHaveBeenCalledTimes(1);
    expect(mockSpotify.openSpotifyUrl).toHaveBeenCalledWith(mockTrack.uri);
  });

  it("should call exportToCSV with tracks array", async () => {
    // Arrange
    const { getByTestId } = render(<TestSkippedTracksComponent />);

    // Act
    fireEvent.click(getByTestId("export-btn"));

    // Assert
    expect(mockSpotify.exportToCSV).toHaveBeenCalledTimes(1);
    expect(mockSpotify.exportToCSV).toHaveBeenCalledWith([mockTrack]);
  });
});
