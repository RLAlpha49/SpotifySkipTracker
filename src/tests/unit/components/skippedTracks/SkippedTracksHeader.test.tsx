import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { SkippedTracksHeader } from "../../../../components/skippedTracks/SkippedTracksHeader";

describe("SkippedTracksHeader Component", () => {
  const defaultProps = {
    timeframeInDays: 30,
    skipThreshold: 3,
    loading: false,
    onRefresh: vi.fn().mockResolvedValue(undefined),
    onOpenSkipsDirectory: vi.fn().mockResolvedValue(undefined),
  };

  it("should render with the correct title and description", () => {
    render(<SkippedTracksHeader {...defaultProps} />);

    // Verify title is rendered
    expect(screen.getByText("Skipped Tracks")).toBeInTheDocument();

    // Verify description contains the timeframe
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(
      screen.getByText(/Tracks you've skipped within the last/),
    ).toBeInTheDocument();
    expect(screen.getByText("days")).toBeInTheDocument();

    // Verify description contains the skip threshold
    expect(screen.getByText("3+")).toBeInTheDocument();
    expect(
      screen.getByText(/times are highlighted for removal/),
    ).toBeInTheDocument();
  });

  it("should display buttons with correct text", () => {
    render(<SkippedTracksHeader {...defaultProps} />);

    // Verify buttons are rendered
    const openSkipsButton = screen.getByText("Open Skips");
    expect(openSkipsButton).toBeInTheDocument();

    const refreshButton = screen.getByText("Refresh");
    expect(refreshButton).toBeInTheDocument();
  });

  it("should call onRefresh when refresh button is clicked", () => {
    render(<SkippedTracksHeader {...defaultProps} />);

    // Click the refresh button
    const refreshButton = screen.getByText("Refresh");
    fireEvent.click(refreshButton);

    // Verify onRefresh was called
    expect(defaultProps.onRefresh).toHaveBeenCalledTimes(1);
  });

  it("should call onOpenSkipsDirectory when open skips button is clicked", () => {
    render(<SkippedTracksHeader {...defaultProps} />);

    // Click the open skips button
    const openSkipsButton = screen.getByText("Open Skips");
    fireEvent.click(openSkipsButton);

    // Verify onOpenSkipsDirectory was called
    expect(defaultProps.onOpenSkipsDirectory).toHaveBeenCalledTimes(1);
  });

  it("should show loading state when loading is true", () => {
    render(<SkippedTracksHeader {...defaultProps} loading={true} />);

    // Verify loading text is displayed
    expect(screen.getByText("Loading...")).toBeInTheDocument();

    // Verify refresh button is disabled
    const loadingButton = screen.getByText("Loading...");
    expect(loadingButton.closest("button")).toBeDisabled();
  });

  it("should display different timeframeInDays values", () => {
    render(<SkippedTracksHeader {...defaultProps} timeframeInDays={14} />);

    // Verify the updated timeframe is shown
    expect(screen.getByText("14")).toBeInTheDocument();
  });

  it("should display different skipThreshold values", () => {
    render(<SkippedTracksHeader {...defaultProps} skipThreshold={5} />);

    // Verify the updated threshold is shown
    expect(screen.getByText("5+")).toBeInTheDocument();
  });

  it("should have tooltips for buttons", () => {
    render(<SkippedTracksHeader {...defaultProps} />);

    // Find the tooltip contents by their text
    expect(
      screen.getByText("Open the folder containing skip tracking data files"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Reload skip data to get the latest skip statistics"),
    ).toBeInTheDocument();
  });
});
