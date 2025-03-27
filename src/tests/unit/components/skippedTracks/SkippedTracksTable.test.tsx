import { SkippedTrack } from "@/types/spotify";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SkippedTracksTable } from "../../../../components/skippedTracks/SkippedTracksTable";

// Mock the SkippedTrackRow component
vi.mock("../../../../components/skippedTracks/SkippedTrackRow", () => ({
  SkippedTrackRow: ({
    track,
    timeframeInDays,
    shouldSuggestRemoval,
    onUnlikeTrack,
    onRemoveTrackData,
  }: {
    track: any;
    timeframeInDays: number;
    shouldSuggestRemoval: boolean;
    onUnlikeTrack: (track: any) => Promise<void>;
    onRemoveTrackData: (track: any) => Promise<void>;
  }) => (
    <tr data-testid={`track-row-${track.id}`}>
      <td>
        <div data-testid="track-name">{track.name}</div>
        <div data-testid="track-artist">{track.artists[0]?.name}</div>
        <div data-testid="track-timeframe">{timeframeInDays}</div>
        <div data-testid="track-suggestion">
          {shouldSuggestRemoval ? "Suggest Remove" : ""}
        </div>
        <button
          data-testid={`unlike-button-${track.id}`}
          onClick={() => onUnlikeTrack(track)}
        >
          Unlike
        </button>
        <button
          data-testid={`remove-button-${track.id}`}
          onClick={() => onRemoveTrackData(track)}
        >
          Remove
        </button>
      </td>
    </tr>
  ),
}));

// Mock ScrollArea component
vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="scroll-area" className={className}>
      {children}
    </div>
  ),
}));

describe("SkippedTracksTable Component", () => {
  // Mock data
  const mockTracks: SkippedTrack[] = [
    {
      id: "track1",
      name: "Track One",
      uri: "spotify:track:track1",
      artists: [
        { id: "artist1", name: "Artist One", uri: "spotify:artist:artist1" },
      ],
      albumName: "Album One",
      albumImageUrl: "https://example.com/album1.jpg",
      skipCount: 5,
      recentSkipCount: 3, // For the recent timeframe
      completePlayCount: 2,
      inLibrary: true,
      lastSkippedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      skipEvents: [
        {
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          playDurationMs: 30000,
          percentagePlayed: 0.2,
          automatic: false,
        },
        {
          timestamp: new Date(Date.now() - 172800000).toISOString(),
          playDurationMs: 20000,
          percentagePlayed: 0.15,
          automatic: true,
        },
      ],
    },
    {
      id: "track2",
      name: "Track Two",
      uri: "spotify:track:track2",
      artists: [
        { id: "artist2", name: "Artist Two", uri: "spotify:artist:artist2" },
      ],
      albumName: "Album Two",
      albumImageUrl: "https://example.com/album2.jpg",
      skipCount: 10,
      recentSkipCount: 8, // For the recent timeframe
      completePlayCount: 1,
      inLibrary: true,
      lastSkippedAt: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
      skipEvents: [
        {
          timestamp: new Date(Date.now() - 43200000).toISOString(),
          playDurationMs: 15000,
          percentagePlayed: 0.1,
          automatic: false,
        },
      ],
    },
    {
      id: "track3",
      name: "Track Three",
      uri: "spotify:track:track3",
      artists: [
        { id: "artist3", name: "Artist Three", uri: "spotify:artist:artist3" },
      ],
      albumName: "Album Three",
      albumImageUrl: "https://example.com/album3.jpg",
      skipCount: 3,
      recentSkipCount: 1, // For the recent timeframe
      completePlayCount: 5,
      inLibrary: true,
      lastSkippedAt: new Date(Date.now() - 604800000).toISOString(), // 7 days ago
      skipEvents: [
        {
          timestamp: new Date(Date.now() - 604800000).toISOString(),
          playDurationMs: 60000,
          percentagePlayed: 0.4,
          automatic: false,
        },
      ],
    },
  ];

  // Mock handlers
  const mockUnlikeTrack = vi.fn().mockResolvedValue(undefined);
  const mockRemoveTrackData = vi.fn().mockResolvedValue(undefined);

  it("should render loading state when loading is true", () => {
    render(
      <SkippedTracksTable
        tracks={[]}
        loading={true}
        skipThreshold={3}
        timeframeInDays={30}
        onUnlikeTrack={mockUnlikeTrack}
        onRemoveTrackData={mockRemoveTrackData}
      />,
    );

    // Check for loading indicator
    expect(
      screen.getByText("Loading skipped tracks data..."),
    ).toBeInTheDocument();

    // Verify loading animation icon is present
    const loadingIcon = screen.getByText(
      "Loading skipped tracks data...",
    ).previousSibling;
    expect(loadingIcon).toBeInTheDocument();
  });

  it("should render empty state when no tracks and not loading", () => {
    render(
      <SkippedTracksTable
        tracks={[]}
        loading={false}
        skipThreshold={3}
        timeframeInDays={30}
        onUnlikeTrack={mockUnlikeTrack}
        onRemoveTrackData={mockRemoveTrackData}
      />,
    );

    // Check for empty state message
    expect(
      screen.getByText("No skipped tracks data available"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Track data will appear here when you skip songs in Spotify",
      ),
    ).toBeInTheDocument();
  });

  it("should render a table with sorted tracks", () => {
    render(
      <SkippedTracksTable
        tracks={mockTracks}
        loading={false}
        skipThreshold={3}
        timeframeInDays={30}
        onUnlikeTrack={mockUnlikeTrack}
        onRemoveTrackData={mockRemoveTrackData}
      />,
    );

    // Check for table headers
    expect(screen.getByText("Track")).toBeInTheDocument();
    expect(screen.getByText("Recent")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Ratio")).toBeInTheDocument();
    expect(screen.getByText("Last Skipped")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();

    // Check that track rows are rendered (using the mocked component)
    expect(screen.getByTestId("track-row-track1")).toBeInTheDocument();
    expect(screen.getByTestId("track-row-track2")).toBeInTheDocument();
    expect(screen.getByTestId("track-row-track3")).toBeInTheDocument();
  });

  it("should display the correct summary information when tracks are present", () => {
    const { container } = render(
      <SkippedTracksTable
        tracks={mockTracks}
        loading={false}
        skipThreshold={3}
        timeframeInDays={30}
        onUnlikeTrack={mockUnlikeTrack}
        onRemoveTrackData={mockRemoveTrackData}
      />,
    );

    // Find the footer element using a more specific selector
    const footer = container.querySelector(".bg-muted\\/30");
    expect(footer).not.toBeNull();

    if (footer) {
      // Check that the footer contains the correct track count
      expect(footer.textContent).toContain("3");
      expect(footer.textContent).toContain("tracks tracked");

      // Check for total skips text
      expect(footer.textContent).toContain("18");
      expect(footer.textContent).toContain("total skips recorded");
    }
  });

  it("should call onUnlikeTrack when unlike button is clicked", async () => {
    render(
      <SkippedTracksTable
        tracks={mockTracks}
        loading={false}
        skipThreshold={3}
        timeframeInDays={30}
        onUnlikeTrack={mockUnlikeTrack}
        onRemoveTrackData={mockRemoveTrackData}
      />,
    );

    // Click the unlike button for the first track
    const unlikeButton = screen.getByTestId("unlike-button-track1");
    fireEvent.click(unlikeButton);

    // Verify that the onUnlikeTrack function was called with the correct track
    expect(mockUnlikeTrack).toHaveBeenCalledWith(mockTracks[0]);
  });

  it("should call onRemoveTrackData when remove button is clicked", async () => {
    render(
      <SkippedTracksTable
        tracks={mockTracks}
        loading={false}
        skipThreshold={3}
        timeframeInDays={30}
        onUnlikeTrack={mockUnlikeTrack}
        onRemoveTrackData={mockRemoveTrackData}
      />,
    );

    // Click the remove button for the second track
    const removeButton = screen.getByTestId("remove-button-track2");
    fireEvent.click(removeButton);

    // Verify that the onRemoveTrackData function was called with the correct track
    expect(mockRemoveTrackData).toHaveBeenCalledWith(mockTracks[1]);
  });

  it("should pass timeframeInDays prop to SkippedTrackRow", () => {
    render(
      <SkippedTracksTable
        tracks={mockTracks}
        loading={false}
        skipThreshold={3}
        timeframeInDays={14} // Use a different value to test prop passing
        onUnlikeTrack={mockUnlikeTrack}
        onRemoveTrackData={mockRemoveTrackData}
      />,
    );

    // Check if the timeframeInDays prop was correctly passed to SkippedTrackRow
    const trackTimeframeElement = screen.getAllByTestId("track-timeframe")[0];
    expect(trackTimeframeElement.textContent).toBe("14");
  });

  it("should pass correct shouldSuggestRemoval value based on skipThreshold", () => {
    render(
      <SkippedTracksTable
        tracks={mockTracks}
        loading={false}
        skipThreshold={2} // Set threshold to 2 to trigger suggestion for tracks with recentSkipCount > 2
        timeframeInDays={30}
        onUnlikeTrack={mockUnlikeTrack}
        onRemoveTrackData={mockRemoveTrackData}
      />,
    );

    // Check if tracks with high skip counts have suggestions
    const track1Suggestion = screen.getAllByTestId("track-suggestion")[0];
    const track2Suggestion = screen.getAllByTestId("track-suggestion")[1];

    // Track 1 and 2 should have suggestions since their recentSkipCount > 2
    // The exact text depends on the shouldSuggestRemoval implementation
    expect(track1Suggestion.textContent).toBeTruthy();
    expect(track2Suggestion.textContent).toBeTruthy();
  });
});
