import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import RemoveHighlightedDialog from "../../../../../components/skippedTracks/dialogs/RemoveHighlightedDialog";

describe("RemoveHighlightedDialog Component", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onConfirm: vi.fn().mockResolvedValue(undefined),
    tracksToRemove: 5,
    skipThreshold: 3,
    timeframeInDays: 14,
  };

  it("should render with the correct title and content when open", () => {
    render(<RemoveHighlightedDialog {...defaultProps} />);

    // Verify title is rendered
    expect(screen.getByText("Remove Highlighted Tracks")).toBeInTheDocument();

    // Verify content shows the correct number of tracks
    expect(screen.getByText("Tracks to Remove: 5")).toBeInTheDocument();

    // Verify threshold information is displayed correctly
    expect(
      screen.getByText(/These tracks have been skipped/),
    ).toBeInTheDocument();
    expect(screen.getByText("3 or more times")).toBeInTheDocument();
    expect(screen.getByText("14 days")).toBeInTheDocument();

    // Verify warning information
    expect(
      screen.getByText(
        /This will remove these tracks from your Spotify library/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("This action cannot be undone."),
    ).toBeInTheDocument();

    // Verify buttons
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Remove 5 Tracks")).toBeInTheDocument();
  });

  it("should not render when open is false", () => {
    render(<RemoveHighlightedDialog {...defaultProps} open={false} />);

    // Verify dialog content is not rendered
    expect(
      screen.queryByText("Remove Highlighted Tracks"),
    ).not.toBeInTheDocument();
  });

  it("should call onConfirm when the confirm button is clicked", () => {
    render(<RemoveHighlightedDialog {...defaultProps} />);

    // Click the confirmation button
    const confirmButton = screen.getByText("Remove 5 Tracks");
    fireEvent.click(confirmButton);

    // Verify onConfirm was called
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it("should call onOpenChange when the cancel button is clicked", () => {
    render(<RemoveHighlightedDialog {...defaultProps} />);

    // Click the cancel button
    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    // Verify onOpenChange was called
    expect(defaultProps.onOpenChange).toHaveBeenCalled();
  });

  it("should display different tracksToRemove values", () => {
    const props = { ...defaultProps, tracksToRemove: 10 };
    render(<RemoveHighlightedDialog {...props} />);

    // Verify the updated count is shown
    expect(screen.getByText("Tracks to Remove: 10")).toBeInTheDocument();
    expect(screen.getByText("Remove 10 Tracks")).toBeInTheDocument();
  });

  it("should display different threshold values", () => {
    const props = {
      ...defaultProps,
      skipThreshold: 5,
      timeframeInDays: 30,
    };
    render(<RemoveHighlightedDialog {...props} />);

    // Verify the updated thresholds are shown
    expect(screen.getByText("5 or more times")).toBeInTheDocument();
    expect(screen.getByText("30 days")).toBeInTheDocument();
  });

  it("should have the correct dialog styling classes", () => {
    render(<RemoveHighlightedDialog {...defaultProps} />);

    // Check for rose-related styles that are specific to this warning dialog
    const dialogContent = screen.getByRole("alertdialog");
    expect(dialogContent).toHaveClass("border-rose-200");

    // Check for color styling on the action button
    const actionButton = screen.getByText("Remove 5 Tracks");
    expect(actionButton).toHaveClass("bg-rose-600");
    expect(actionButton).toHaveClass("hover:bg-rose-700");
  });
});
