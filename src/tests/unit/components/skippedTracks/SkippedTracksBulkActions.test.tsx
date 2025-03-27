import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { SkippedTracksBulkActions } from "../../../../components/skippedTracks/SkippedTracksBulkActions";
import { shouldSuggestRemoval } from "../../../../components/skippedTracks/utils";

// Mock React's Suspense component before imports
vi.mock("react", async () => {
  const actual = await vi.importActual("react");
  return {
    ...actual,
    Suspense: ({ children }) => children,
  };
});

// Mock shouldSuggestRemoval utility function
vi.mock("../../../../components/skippedTracks/utils", () => ({
  shouldSuggestRemoval: vi.fn(),
}));

// Mock UI components
vi.mock("../../../../components/ui/button", () => ({
  Button: ({ children, onClick, disabled, variant, size, className }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      data-size={size}
      className={className}
      data-testid="button"
    >
      {children}
    </button>
  ),
}));

vi.mock("../../../../components/ui/card", () => ({
  Card: ({ children, className }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardContent: ({ children, className }) => (
    <div data-testid="card-content" className={className}>
      {children}
    </div>
  ),
  CardFooter: ({ children, className }) => (
    <div data-testid="card-footer" className={className}>
      {children}
    </div>
  ),
  CardHeader: ({ children, className }) => (
    <div data-testid="card-header" className={className}>
      {children}
    </div>
  ),
  CardTitle: ({ children, className }) => (
    <h3 data-testid="card-title" className={className}>
      {children}
    </h3>
  ),
}));

// Mock Tooltip component
vi.mock("../../../../components/ui/tooltip", () => ({
  Tooltip: ({ children }) => <div data-testid="tooltip">{children}</div>,
  TooltipContent: ({ children }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
  TooltipProvider: ({ children }) => (
    <div data-testid="tooltip-provider">{children}</div>
  ),
  TooltipTrigger: ({ children }) => (
    <div data-testid="tooltip-trigger">{children}</div>
  ),
}));

// Mock dialog components - keep these simple, we're not testing their internal functionality
vi.mock("../../../../components/skippedTracks/dialogs/ClearDataDialog", () => ({
  __esModule: true,
  default: () => <div data-testid="clear-data-dialog">Clear Data Dialog</div>,
}));

vi.mock(
  "../../../../components/skippedTracks/dialogs/RemoveHighlightedDialog",
  () => ({
    __esModule: true,
    default: () => (
      <div data-testid="remove-highlighted-dialog">
        Remove Highlighted Dialog
      </div>
    ),
  }),
);

// Mock Lucide icons
vi.mock("lucide-react", async () => {
  const actual = await vi.importActual("lucide-react");
  return {
    ...actual,
    XCircle: () => <div data-testid="x-circle-icon" />,
    AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  };
});

describe("SkippedTracksBulkActions Component", () => {
  const mockTracks = [
    { id: "1", name: "Track 1", artist: "Artist 1", skipCount: 2 },
    { id: "2", name: "Track 2", artist: "Artist 2", skipCount: 3 },
    { id: "3", name: "Track 3", artist: "Artist 3", skipCount: 5 },
  ];

  const mockSetShowClearDataDialog = vi.fn();
  const mockSetShowRemoveHighlightedDialog = vi.fn();

  const defaultProps = {
    loading: false,
    tracks: mockTracks,
    skipThreshold: 3,
    timeframeInDays: 30,
    showClearDataDialog: false,
    setShowClearDataDialog: mockSetShowClearDataDialog,
    showRemoveHighlightedDialog: false,
    setShowRemoveHighlightedDialog: mockSetShowRemoveHighlightedDialog,
    onClearSkippedData: vi.fn(),
    onRemoveAllHighlighted: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (shouldSuggestRemoval as any).mockImplementation(
      (track, threshold) => track.skipCount >= threshold,
    );
  });

  it("should render buttons and call action handlers when clicked", () => {
    render(<SkippedTracksBulkActions {...defaultProps} />);

    // Check for action buttons
    const clearButton = screen.getByText("Clear Skip Data").closest("button");
    const removeButton = screen
      .getByText("Remove Highlighted")
      .closest("button");

    expect(clearButton).toBeInTheDocument();
    expect(removeButton).toBeInTheDocument();

    // Click the buttons and verify handlers are called
    fireEvent.click(clearButton);
    fireEvent.click(removeButton);

    expect(mockSetShowClearDataDialog).toHaveBeenCalledWith(true);
    expect(mockSetShowRemoveHighlightedDialog).toHaveBeenCalledWith(true);
  });

  it("should disable buttons when loading is true", () => {
    render(<SkippedTracksBulkActions {...defaultProps} loading={true} />);

    // Get all buttons and check they're disabled
    const buttons = screen.getAllByTestId("button");
    buttons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it("should disable Remove Highlighted button when no tracks are highlighted", () => {
    (shouldSuggestRemoval as any).mockImplementation(() => false);
    render(<SkippedTracksBulkActions {...defaultProps} />);

    const removeButton = screen
      .getByText("Remove Highlighted")
      .closest("button");
    expect(removeButton).toBeDisabled();
  });

  it("should display a badge with the count of highlighted tracks", () => {
    const { container } = render(
      <SkippedTracksBulkActions {...defaultProps} />,
    );

    // Find the badge element by its unique class combination
    const badgeElement = container.querySelector(".rounded-full.bg-rose-200");
    expect(badgeElement).toBeInTheDocument();
    expect(badgeElement.textContent).toBe("2");
  });
});
