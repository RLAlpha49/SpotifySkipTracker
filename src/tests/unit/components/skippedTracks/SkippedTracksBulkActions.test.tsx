import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { SkippedTracksBulkActions } from "../../../../components/skippedTracks/SkippedTracksBulkActions";
import { shouldSuggestRemoval } from "../../../../components/skippedTracks/utils";

// Mock the shouldSuggestRemoval function
vi.mock("../../../../components/skippedTracks/utils", () => ({
  shouldSuggestRemoval: vi
    .fn()
    .mockImplementation((track, skipThreshold, timeframeInDays) => {
      return track.skipCount >= skipThreshold;
    }),
}));

// Mock lazy-loaded dialogs
vi.mock("../../../../components/skippedTracks/dialogs/ClearDataDialog", () => ({
  default: ({ open, onOpenChange, onConfirm }) =>
    open ? (
      <div data-testid="clear-data-dialog">
        <button onClick={() => onConfirm()}>Mock Confirm Clear</button>
        <button onClick={() => onOpenChange(false)}>Mock Cancel Clear</button>
      </div>
    ) : null,
}));

vi.mock(
  "../../../../components/skippedTracks/dialogs/RemoveHighlightedDialog",
  () => ({
    default: ({ open, onOpenChange, onConfirm }) =>
      open ? (
        <div data-testid="remove-highlighted-dialog">
          <button onClick={() => onConfirm()}>Mock Confirm Remove</button>
          <button onClick={() => onOpenChange(false)}>
            Mock Cancel Remove
          </button>
        </div>
      ) : null,
  }),
);

describe("SkippedTracksBulkActions Component", () => {
  const mockTracks = [
    {
      id: "track1",
      name: "Track 1",
      artist: "Artist 1",
      album: "Album 1",
      uri: "spotify:track:track1",
      skipCount: 5,
      notSkippedCount: 2,
      lastSkipped: new Date().toISOString(),
    },
    {
      id: "track2",
      name: "Track 2",
      artist: "Artist 2",
      album: "Album 2",
      uri: "spotify:track:track2",
      skipCount: 2,
      notSkippedCount: 3,
      lastSkipped: new Date().toISOString(),
    },
    {
      id: "track3",
      name: "Track 3",
      artist: "Artist 3",
      album: "Album 3",
      uri: "spotify:track:track3",
      skipCount: 4,
      notSkippedCount: 1,
      lastSkipped: new Date().toISOString(),
    },
  ];

  const defaultProps = {
    loading: false,
    tracks: mockTracks,
    skipThreshold: 3,
    timeframeInDays: 14,
    showClearDataDialog: false,
    setShowClearDataDialog: vi.fn(),
    showRemoveHighlightedDialog: false,
    setShowRemoveHighlightedDialog: vi.fn(),
    onClearSkippedData: vi.fn().mockResolvedValue(undefined),
    onRemoveAllHighlighted: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render track count information", () => {
    render(<SkippedTracksBulkActions {...defaultProps} />);

    // Total tracks count
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("tracks tracked")).toBeInTheDocument();

    // Highlighted tracks count (2 tracks have skipCount >= skipThreshold)
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("highlighted for removal")).toBeInTheDocument();
  });

  it("should render action buttons", () => {
    render(<SkippedTracksBulkActions {...defaultProps} />);

    // Check for buttons
    expect(screen.getByText("Clear Skip Data")).toBeInTheDocument();
    expect(screen.getByText("Remove Highlighted")).toBeInTheDocument();
  });

  it("should display the count badge on Remove Highlighted button", () => {
    render(<SkippedTracksBulkActions {...defaultProps} />);

    // The button should show the count of tracks to remove
    const countBadge = screen.getByText("2");
    expect(countBadge).toBeInTheDocument();
  });

  it("should call setShowClearDataDialog when Clear Skip Data button is clicked", () => {
    render(<SkippedTracksBulkActions {...defaultProps} />);

    // Click the clear data button
    const clearButton = screen.getByText("Clear Skip Data");
    fireEvent.click(clearButton);

    // Verify setShowClearDataDialog was called with true
    expect(defaultProps.setShowClearDataDialog).toHaveBeenCalledWith(true);
  });

  it("should call setShowRemoveHighlightedDialog when Remove Highlighted button is clicked", () => {
    render(<SkippedTracksBulkActions {...defaultProps} />);

    // Click the remove highlighted button
    const removeButton = screen.getByText("Remove Highlighted");
    fireEvent.click(removeButton);

    // Verify setShowRemoveHighlightedDialog was called with true
    expect(defaultProps.setShowRemoveHighlightedDialog).toHaveBeenCalledWith(
      true,
    );
  });

  it("should render ClearDataDialog when showClearDataDialog is true", () => {
    render(
      <SkippedTracksBulkActions {...defaultProps} showClearDataDialog={true} />,
    );

    // Verify dialog is rendered
    expect(screen.getByTestId("clear-data-dialog")).toBeInTheDocument();
  });

  it("should render RemoveHighlightedDialog when showRemoveHighlightedDialog is true", () => {
    render(
      <SkippedTracksBulkActions
        {...defaultProps}
        showRemoveHighlightedDialog={true}
      />,
    );

    // Verify dialog is rendered
    expect(screen.getByTestId("remove-highlighted-dialog")).toBeInTheDocument();
  });

  it("should call onClearSkippedData when dialog confirm is clicked", () => {
    render(
      <SkippedTracksBulkActions {...defaultProps} showClearDataDialog={true} />,
    );

    // Click confirm button in the dialog
    const confirmButton = screen.getByText("Mock Confirm Clear");
    fireEvent.click(confirmButton);

    // Verify onClearSkippedData was called
    expect(defaultProps.onClearSkippedData).toHaveBeenCalledTimes(1);
  });

  it("should call onRemoveAllHighlighted when dialog confirm is clicked", () => {
    render(
      <SkippedTracksBulkActions
        {...defaultProps}
        showRemoveHighlightedDialog={true}
      />,
    );

    // Click confirm button in the dialog
    const confirmButton = screen.getByText("Mock Confirm Remove");
    fireEvent.click(confirmButton);

    // Verify onRemoveAllHighlighted was called
    expect(defaultProps.onRemoveAllHighlighted).toHaveBeenCalledTimes(1);
  });

  it("should disable buttons when loading is true", () => {
    render(<SkippedTracksBulkActions {...defaultProps} loading={true} />);

    // Both buttons should be disabled
    const clearButton = screen.getByText("Clear Skip Data").closest("button");
    const removeButton = screen
      .getByText("Remove Highlighted")
      .closest("button");

    expect(clearButton).toBeDisabled();
    expect(removeButton).toBeDisabled();
  });

  it("should disable Remove Highlighted button when no tracks are highlighted", () => {
    // Mock shouldSuggestRemoval to return false for all tracks
    (shouldSuggestRemoval as jest.Mock).mockImplementation(() => false);

    render(<SkippedTracksBulkActions {...defaultProps} />);

    // Remove Highlighted button should be disabled
    const removeButton = screen
      .getByText("Remove Highlighted")
      .closest("button");
    expect(removeButton).toBeDisabled();
  });
});
