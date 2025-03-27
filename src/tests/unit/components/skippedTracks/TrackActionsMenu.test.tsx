import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import TrackActionsMenu from "../../../../components/skippedTracks/TrackActionsMenu";

// Mock the window.spotify object
const mockOpenURL = vi.fn();
vi.stubGlobal("window", {
  ...window,
  spotify: {
    openURL: mockOpenURL,
  },
});

// Using a wrapper component to provide the DropdownMenuContent context
const MenuWrapper = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="dropdown-wrapper">{children}</div>
);

describe("TrackActionsMenu Component", () => {
  const mockTrack = {
    id: "test123",
    name: "Test Track",
    artist: "Test Artist",
    album: "Test Album",
    uri: "spotify:track:test123",
    skipCount: 5,
    notSkippedCount: 2,
    lastSkipped: new Date().toISOString(),
    skipRatio: 0.7,
  };

  const mockOnUnlikeTrack = vi.fn().mockResolvedValue(undefined);
  const mockOnRemoveTrackData = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render menu items correctly", () => {
    render(
      <MenuWrapper>
        <TrackActionsMenu
          track={mockTrack}
          onUnlikeTrack={mockOnUnlikeTrack}
          onRemoveTrackData={mockOnRemoveTrackData}
        />
      </MenuWrapper>,
    );

    // Check for menu items
    expect(screen.getByText("Open in Spotify")).toBeInTheDocument();
    expect(screen.getByText("Remove from library")).toBeInTheDocument();
    expect(screen.getByText("Remove tracking data")).toBeInTheDocument();
  });

  it("should call window.spotify.openURL when Open in Spotify is clicked", () => {
    render(
      <MenuWrapper>
        <TrackActionsMenu
          track={mockTrack}
          onUnlikeTrack={mockOnUnlikeTrack}
          onRemoveTrackData={mockOnRemoveTrackData}
        />
      </MenuWrapper>,
    );

    // Click the Open in Spotify menu item
    const openInSpotifyButton = screen.getByText("Open in Spotify");
    fireEvent.click(openInSpotifyButton);

    // Verify the function was called with the correct URL
    expect(mockOpenURL).toHaveBeenCalledTimes(1);
    expect(mockOpenURL).toHaveBeenCalledWith(
      `https://open.spotify.com/track/${mockTrack.id}`,
    );
  });

  it("should call onUnlikeTrack when Remove from library is clicked", () => {
    render(
      <MenuWrapper>
        <TrackActionsMenu
          track={mockTrack}
          onUnlikeTrack={mockOnUnlikeTrack}
          onRemoveTrackData={mockOnRemoveTrackData}
        />
      </MenuWrapper>,
    );

    // Click the Remove from library menu item
    const removeFromLibraryButton = screen.getByText("Remove from library");
    fireEvent.click(removeFromLibraryButton);

    // Verify onUnlikeTrack was called with the track
    expect(mockOnUnlikeTrack).toHaveBeenCalledTimes(1);
    expect(mockOnUnlikeTrack).toHaveBeenCalledWith(mockTrack);
  });

  it("should call onRemoveTrackData when Remove tracking data is clicked", () => {
    render(
      <MenuWrapper>
        <TrackActionsMenu
          track={mockTrack}
          onUnlikeTrack={mockOnUnlikeTrack}
          onRemoveTrackData={mockOnRemoveTrackData}
        />
      </MenuWrapper>,
    );

    // Click the Remove tracking data menu item
    const removeTrackingDataButton = screen.getByText("Remove tracking data");
    fireEvent.click(removeTrackingDataButton);

    // Verify onRemoveTrackData was called with the track
    expect(mockOnRemoveTrackData).toHaveBeenCalledTimes(1);
    expect(mockOnRemoveTrackData).toHaveBeenCalledWith(mockTrack);
  });

  it("should have the correct styling classes for menu items", () => {
    render(
      <MenuWrapper>
        <TrackActionsMenu
          track={mockTrack}
          onUnlikeTrack={mockOnUnlikeTrack}
          onRemoveTrackData={mockOnRemoveTrackData}
        />
      </MenuWrapper>,
    );

    // Check for styling on the menu items
    const openInSpotifyItem = screen
      .getByText("Open in Spotify")
      .closest("div");
    expect(openInSpotifyItem).toHaveClass("text-primary");

    const removeFromLibraryItem = screen
      .getByText("Remove from library")
      .closest("div");
    expect(removeFromLibraryItem).toHaveClass("text-rose-600");

    const removeTrackingDataItem = screen
      .getByText("Remove tracking data")
      .closest("div");
    expect(removeTrackingDataItem).toHaveClass("text-amber-600");
  });
});
