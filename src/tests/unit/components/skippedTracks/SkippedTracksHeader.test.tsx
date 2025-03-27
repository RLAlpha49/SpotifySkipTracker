import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { SkippedTracksHeader } from "../../../../components/skippedTracks/SkippedTracksHeader";

// Mock Lucide icons
vi.mock("lucide-react", async () => {
  const actual = await vi.importActual("lucide-react");
  return {
    ...actual,
    SkipForward: () => <div data-testid="skip-forward-icon" />,
    Calendar: () => <div data-testid="calendar-icon" />,
    AlertCircle: () => <div data-testid="alert-circle-icon" />,
    FolderOpen: () => <div data-testid="folder-open-icon" />,
    RefreshCw: () => <div data-testid="refresh-cw-icon" />,
  };
});

// Mock UI components
vi.mock("../../../../components/ui/button", () => ({
  Button: ({ children, onClick, disabled, className, variant, size }) => (
    <button
      data-testid="button"
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-variant={variant}
      data-size={size}
    >
      {children}
    </button>
  ),
}));

vi.mock("../../../../components/ui/badge", () => ({
  Badge: ({ children, className, variant }) => (
    <span data-testid="badge" className={className} data-variant={variant}>
      {children}
    </span>
  ),
}));

// Mock the Tooltip component
vi.mock("../../../../components/ui/tooltip", () => ({
  Tooltip: ({ children }) => <div data-testid="tooltip">{children}</div>,
  TooltipProvider: ({ children }) => (
    <div data-testid="tooltip-provider">{children}</div>
  ),
  TooltipContent: ({ children }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
  TooltipTrigger: ({ children, asChild }) => (
    <div data-testid="tooltip-trigger">{children}</div>
  ),
}));

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
    const badges = screen.getAllByTestId("badge");
    expect(badges[0]).toHaveTextContent("30");

    // Get the parent text element for calendar info
    const calendarInfoElement = screen.getByText((content, element) => {
      return (
        content.includes("Tracks you've skipped within the last") &&
        content.includes("days")
      );
    });
    expect(calendarInfoElement).toBeInTheDocument();

    // Verify description contains the skip threshold
    expect(badges[1]).toHaveTextContent("3+");
    expect(
      screen.getByText(/times are highlighted for removal/i),
    ).toBeInTheDocument();
  });

  it("should display buttons with correct text", () => {
    render(<SkippedTracksHeader {...defaultProps} />);

    // Verify buttons are rendered
    expect(screen.getByText("Open Skips")).toBeInTheDocument();
    expect(screen.getByText("Refresh")).toBeInTheDocument();
  });

  it("should call onRefresh when refresh button is clicked", () => {
    render(<SkippedTracksHeader {...defaultProps} />);

    // Find buttons by their text content
    const buttons = screen.getAllByTestId("button");
    const refreshButton = buttons.find((btn) =>
      btn.textContent.includes("Refresh"),
    );

    // Click the refresh button
    fireEvent.click(refreshButton);

    // Verify onRefresh was called
    expect(defaultProps.onRefresh).toHaveBeenCalledTimes(1);
  });

  it("should call onOpenSkipsDirectory when open skips button is clicked", () => {
    render(<SkippedTracksHeader {...defaultProps} />);

    // Find buttons by their text content
    const buttons = screen.getAllByTestId("button");
    const openSkipsButton = buttons.find((btn) =>
      btn.textContent.includes("Open Skips"),
    );

    // Click the open skips button
    fireEvent.click(openSkipsButton);

    // Verify onOpenSkipsDirectory was called
    expect(defaultProps.onOpenSkipsDirectory).toHaveBeenCalledTimes(1);
  });

  it("should show loading state when loading is true", () => {
    render(<SkippedTracksHeader {...defaultProps} loading={true} />);

    // Verify loading text is displayed
    expect(screen.getByText("Loading...")).toBeInTheDocument();

    // Get all buttons and find the disabled one
    const buttons = screen.getAllByTestId("button");
    const loadingButton = buttons.find((btn) =>
      btn.textContent.includes("Loading"),
    );

    // Verify refresh button is disabled
    expect(loadingButton).toBeDisabled();
  });

  it("should display different timeframeInDays values", () => {
    render(<SkippedTracksHeader {...defaultProps} timeframeInDays={14} />);

    // Verify the updated timeframe is shown in the first badge
    const badges = screen.getAllByTestId("badge");
    expect(badges[0]).toHaveTextContent("14");
  });

  it("should display different skipThreshold values", () => {
    render(<SkippedTracksHeader {...defaultProps} skipThreshold={5} />);

    // Verify the updated threshold is shown in the second badge
    const badges = screen.getAllByTestId("badge");
    expect(badges[1]).toHaveTextContent("5+");
  });

  it("should have tooltips for buttons", () => {
    render(<SkippedTracksHeader {...defaultProps} />);

    // Check for tooltips
    const tooltipContents = screen.getAllByTestId("tooltip-content");

    // Check for tooltip text
    expect(tooltipContents[0]).toHaveTextContent(
      "Open the folder containing skip tracking data files",
    );
    expect(tooltipContents[1]).toHaveTextContent(
      "Reload skip data to get the latest skip statistics",
    );
  });
});
