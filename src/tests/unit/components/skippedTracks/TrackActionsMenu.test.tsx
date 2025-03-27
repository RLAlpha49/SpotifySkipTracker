import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import TrackActionsMenu from "../../../../components/skippedTracks/TrackActionsMenu";

// Mock the Radix UI Dropdown Menu components with working click handlers
vi.mock("@radix-ui/react-dropdown-menu", () => {
  return {
    Root: ({ children }) => <div data-testid="dropdown-root">{children}</div>,
    Trigger: ({ children }) => <div data-testid="dropdown-trigger">{children}</div>,
    Portal: ({ children }) => <div data-testid="dropdown-portal">{children}</div>,
    Content: ({ children }) => <div data-testid="dropdown-content">{children}</div>,
    Item: ({ children, className, onSelect, onClick }) => (
      <div 
        data-testid="dropdown-item" 
        className={className}
        onClick={(e) => {
          if (onClick) onClick(e);
          if (onSelect) onSelect();
        }}
      >
        {children}
      </div>
    ),
    Separator: () => <div data-testid="dropdown-separator" />,
  };
});

// Mock the window.spotify object
const mockOpenURL = vi.fn();
vi.stubGlobal("window", {
  ...window,
  spotify: {
    openURL: mockOpenURL,
  },
});

// Mock the Lucide icons
vi.mock("lucide-react", async () => {
  const actual = await vi.importActual("lucide-react");
  return {
    ...actual,
    ExternalLink: () => <span data-testid="external-link-icon">External Link Icon</span>,
    Trash2: () => <span data-testid="trash-icon">Trash Icon</span>,
    XCircle: () => <span data-testid="xcircle-icon">XCircle Icon</span>,
  };
});

// Mock the UI dropdown-menu components
vi.mock("../../../../components/ui/dropdown-menu", () => ({
  DropdownMenuContent: ({ children, align }) => (
    <div data-testid="dropdown-menu-content" data-align={align}>
      {children}
    </div>
  ),
  DropdownMenuItem: ({ children, className, onClick }) => (
    <button 
      data-testid="dropdown-menu-item" 
      className={className}
      onClick={onClick}
    >
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr data-testid="dropdown-menu-separator" />,
}));

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
      <TrackActionsMenu
        track={mockTrack}
        onUnlikeTrack={mockOnUnlikeTrack}
        onRemoveTrackData={mockOnRemoveTrackData}
      />,
    );

    // Check for menu items
    expect(screen.getByText("Open in Spotify")).toBeInTheDocument();
    expect(screen.getByText("Remove from library")).toBeInTheDocument();
    expect(screen.getByText("Remove tracking data")).toBeInTheDocument();
  });

  it("should call window.spotify.openURL when Open in Spotify is clicked", () => {
    render(
      <TrackActionsMenu
        track={mockTrack}
        onUnlikeTrack={mockOnUnlikeTrack}
        onRemoveTrackData={mockOnRemoveTrackData}
      />,
    );

    // Find and click the Open in Spotify menu item
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
      <TrackActionsMenu
        track={mockTrack}
        onUnlikeTrack={mockOnUnlikeTrack}
        onRemoveTrackData={mockOnRemoveTrackData}
      />,
    );

    // Find and click the Remove from library menu item
    const removeFromLibraryButton = screen.getByText("Remove from library");
    fireEvent.click(removeFromLibraryButton);

    // Verify onUnlikeTrack was called with the track
    expect(mockOnUnlikeTrack).toHaveBeenCalledTimes(1);
    expect(mockOnUnlikeTrack).toHaveBeenCalledWith(mockTrack);
  });

  it("should call onRemoveTrackData when Remove tracking data is clicked", () => {
    render(
      <TrackActionsMenu
        track={mockTrack}
        onUnlikeTrack={mockOnUnlikeTrack}
        onRemoveTrackData={mockOnRemoveTrackData}
      />,
    );

    // Find and click the Remove tracking data menu item
    const removeTrackingDataButton = screen.getByText("Remove tracking data");
    fireEvent.click(removeTrackingDataButton);

    // Verify onRemoveTrackData was called with the track
    expect(mockOnRemoveTrackData).toHaveBeenCalledTimes(1);
    expect(mockOnRemoveTrackData).toHaveBeenCalledWith(mockTrack);
  });

  it("should have the correct styling classes for menu items", () => {
    render(
      <TrackActionsMenu
        track={mockTrack}
        onUnlikeTrack={mockOnUnlikeTrack}
        onRemoveTrackData={mockOnRemoveTrackData}
      />,
    );

    // Check for styling on the menu items
    const menuItems = screen.getAllByTestId("dropdown-menu-item");
    
    // Open in Spotify item
    expect(menuItems[0]).toHaveClass("text-primary");
    
    // Remove from library item
    expect(menuItems[1]).toHaveClass("text-rose-600");
    
    // Remove tracking data item
    expect(menuItems[2]).toHaveClass("text-amber-600");
  });
});
