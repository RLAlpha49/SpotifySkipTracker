import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { SkippedTrackRow } from "../../../../components/skippedTracks/SkippedTrackRow";
import {
  calculateSkipRatio,
  formatDate,
  getRecentSkipCount,
} from "../../../../components/skippedTracks/utils";

// Mock the TrackActionsMenu component and window.spotify
vi.mock("../../../../components/skippedTracks/TrackActionsMenu", () => ({
  default: vi
    .fn()
    .mockImplementation(({ track, onUnlikeTrack, onRemoveTrackData }) => (
      <div data-testid="track-actions-menu">
        <button data-testid="mock-unlike" onClick={() => onUnlikeTrack(track)}>
          Mock Unlike
        </button>
        <button
          data-testid="mock-remove-data"
          onClick={() => onRemoveTrackData(track)}
        >
          Mock Remove Data
        </button>
      </div>
    )),
}));

// Mock the utility functions
vi.mock("../../../../components/skippedTracks/utils", () => ({
  calculateSkipRatio: vi.fn().mockReturnValue("75%"),
  formatDate: vi.fn().mockReturnValue("2023-04-15"),
  getRecentSkipCount: vi.fn().mockReturnValue(3),
}));

// Mock window.spotify
const mockOpenURL = vi.fn();
vi.stubGlobal("window", {
  ...window,
  spotify: {
    openURL: mockOpenURL,
  },
});

describe("SkippedTrackRow Component", () => {
  const mockTrack = {
    id: "track123",
    name: "Test Track",
    artist: "Test Artist",
    album: "Test Album",
    uri: "spotify:track:track123",
    skipCount: 6,
    notSkippedCount: 2,
    lastSkipped: "2023-04-15T12:34:56Z",
  };

  const defaultProps = {
    track: mockTrack,
    timeframeInDays: 14,
    shouldSuggestRemoval: false,
    onUnlikeTrack: vi.fn().mockResolvedValue(undefined),
    onRemoveTrackData: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render track information correctly", () => {
    render(<SkippedTrackRow {...defaultProps} />);

    // Check track name and artist are displayed
    expect(screen.getByText("Test Track")).toBeInTheDocument();
    expect(screen.getByText("Test Artist")).toBeInTheDocument();

    // Check skip statistics are displayed
    expect(screen.getByText("6")).toBeInTheDocument(); // skipCount
    expect(screen.getByText("2")).toBeInTheDocument(); // notSkippedCount
    expect(screen.getByText("75%")).toBeInTheDocument(); // skipRatio

    // Check utility functions were called correctly
    expect(calculateSkipRatio).toHaveBeenCalledWith(mockTrack);
    expect(formatDate).toHaveBeenCalledWith(mockTrack);
    expect(getRecentSkipCount).toHaveBeenCalledWith(mockTrack, 14);
  });

  it("should display removal warning icon when shouldSuggestRemoval is true", () => {
    render(<SkippedTrackRow {...defaultProps} shouldSuggestRemoval={true} />);

    // Check for the warning icon tooltip
    expect(
      screen.getByText("Frequently skipped track, suggested for removal"),
    ).toBeInTheDocument();
  });

  it("should not display removal warning icon when shouldSuggestRemoval is false", () => {
    render(<SkippedTrackRow {...defaultProps} />);

    // Check that warning tooltip is not present
    expect(
      screen.queryByText("Frequently skipped track, suggested for removal"),
    ).not.toBeInTheDocument();
  });

  it("should apply highlight styling when shouldSuggestRemoval is true", () => {
    render(<SkippedTrackRow {...defaultProps} shouldSuggestRemoval={true} />);

    // Check that row has the highlight background class
    const row = screen.getByRole("row");
    expect(row).toHaveClass("bg-rose-50");
    expect(row).toHaveClass("hover:bg-rose-100/70");
  });

  it("should open track in Spotify when track name is clicked", () => {
    render(<SkippedTrackRow {...defaultProps} />);

    // Click the track name
    const trackNameButton = screen.getByText("Test Track");
    fireEvent.click(trackNameButton);

    // Verify openURL was called with the correct URL
    expect(mockOpenURL).toHaveBeenCalledWith(
      "https://open.spotify.com/track/track123",
    );
  });

  it("should call onUnlikeTrack when unlike action is triggered", () => {
    render(<SkippedTrackRow {...defaultProps} />);

    // Open the dropdown menu (we're checking the mocked TrackActionsMenu)
    const unlikeButton = screen.getByTestId("mock-unlike");
    fireEvent.click(unlikeButton);

    // Verify onUnlikeTrack was called with the track
    expect(defaultProps.onUnlikeTrack).toHaveBeenCalledWith(mockTrack);
  });

  it("should call onRemoveTrackData when remove data action is triggered", () => {
    render(<SkippedTrackRow {...defaultProps} />);

    // Open the dropdown menu (we're checking the mocked TrackActionsMenu)
    const removeDataButton = screen.getByTestId("mock-remove-data");
    fireEvent.click(removeDataButton);

    // Verify onRemoveTrackData was called with the track
    expect(defaultProps.onRemoveTrackData).toHaveBeenCalledWith(mockTrack);
  });

  it("should display recent skips count and timeframe", () => {
    render(<SkippedTrackRow {...defaultProps} />);

    // The getRecentSkipCount mock returns 3
    expect(screen.getByText("3")).toBeInTheDocument();

    // The timeframe should be displayed
    expect(screen.getByText("(14d)")).toBeInTheDocument();
  });

  it("should change recent skips display with different timeframe", () => {
    // Update the mock for this test
    (getRecentSkipCount as jest.Mock).mockReturnValueOnce(5);

    render(<SkippedTrackRow {...defaultProps} timeframeInDays={30} />);

    // Check for updated values
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("(30d)")).toBeInTheDocument();

    // Verify getRecentSkipCount was called with the updated timeframe
    expect(getRecentSkipCount).toHaveBeenCalledWith(mockTrack, 30);
  });
});
