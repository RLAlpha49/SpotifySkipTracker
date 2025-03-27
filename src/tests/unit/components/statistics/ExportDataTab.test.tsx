import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";
import { ExportDataTab } from "../../../../components/statistics/ExportDataTab";

// Mock the toast from sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the NoDataMessage component
vi.mock("../../../../components/statistics/NoDataMessage", () => ({
  NoDataMessage: ({ message }: { message: string }) => (
    <div data-testid="no-data-message">{message}</div>
  ),
}));

// Mock the statisticsAPI
const mockExportToCSV = vi.fn();
const mockExportArtistMetrics = vi.fn();
const mockExportDailyMetrics = vi.fn();
const mockExportWeeklyMetrics = vi.fn();
const mockExportLibraryStatistics = vi.fn();
const mockExportTimePatterns = vi.fn();
const mockExportDetectedPatterns = vi.fn();
const mockExportAllToJSON = vi.fn();
const mockCopyToClipboard = vi.fn();

vi.stubGlobal("window", {
  ...window,
  statisticsAPI: {
    exportSkippedTracksToCSV: mockExportToCSV,
    exportArtistMetricsToCSV: mockExportArtistMetrics,
    exportDailyMetricsToCSV: mockExportDailyMetrics,
    exportWeeklyMetricsToCSV: mockExportWeeklyMetrics,
    exportLibraryStatisticsToCSV: mockExportLibraryStatistics,
    exportTimePatternsToCSV: mockExportTimePatterns,
    exportDetectedPatternsToCSV: mockExportDetectedPatterns,
    exportAllToJSON: mockExportAllToJSON,
    copyToClipboard: mockCopyToClipboard,
  },
});

// Sample statistics data for testing
const mockStatistics = {
  skippedTracks: {
    total: 100,
    unique: 50,
    byType: { manual: 70, auto: 30 },
  },
  artists: {
    total: 25,
    withSkips: 15,
  },
  daily: {
    avgSkips: 5,
  },
  // Add other necessary properties to make the component render successfully
};

describe("ExportDataTab Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render loading state", () => {
    render(<ExportDataTab loading={true} statistics={null} />);

    // Check for loading indicator
    expect(screen.getByText("Loading statistics data...")).toBeInTheDocument();
    expect(screen.getByRole("img", { hidden: true })).toHaveClass(
      "animate-spin",
    );
  });

  it("should render no data message when no statistics available", () => {
    render(<ExportDataTab loading={false} statistics={null} />);

    // Check for no data message
    expect(screen.getByTestId("no-data-message")).toBeInTheDocument();
    expect(
      screen.getByText(
        "No statistics data available. Start listening to music to collect statistics.",
      ),
    ).toBeInTheDocument();
  });

  it("should render tabs and export options when statistics are available", () => {
    render(
      <ExportDataTab loading={false} statistics={mockStatistics as any} />,
    );

    // Check for tab headers
    expect(screen.getByText("CSV Export")).toBeInTheDocument();
    expect(screen.getByText("JSON Export")).toBeInTheDocument();
    expect(screen.getByText("Clipboard")).toBeInTheDocument();

    // Check for export card titles
    expect(screen.getByText("Skipped Tracks")).toBeInTheDocument();
    expect(screen.getByText("Artist Metrics")).toBeInTheDocument();
    expect(screen.getByText("Daily Metrics")).toBeInTheDocument();
    expect(screen.getByText("Weekly Metrics")).toBeInTheDocument();
  });

  it("should call export skipped tracks API and show success toast", async () => {
    mockExportToCSV.mockResolvedValue({
      success: true,
      message: "Exported successfully",
    });

    render(
      <ExportDataTab loading={false} statistics={mockStatistics as any} />,
    );

    // Find and click the first export button (skipped tracks)
    const exportButtons = screen.getAllByText("Export CSV");
    fireEvent.click(exportButtons[0]);

    // Wait for the API call to complete
    await waitFor(() => {
      expect(mockExportToCSV).toHaveBeenCalledTimes(1);
    });

    // Check that success toast was shown
    expect(toast.success).toHaveBeenCalledWith("Export Successful", {
      description: "Exported successfully",
    });
  });

  it("should show error toast when export fails", async () => {
    mockExportToCSV.mockRejectedValue(new Error("Failed to export"));

    render(
      <ExportDataTab loading={false} statistics={mockStatistics as any} />,
    );

    // Find and click the first export button (skipped tracks)
    const exportButtons = screen.getAllByText("Export CSV");
    fireEvent.click(exportButtons[0]);

    // Wait for the API call to fail
    await waitFor(() => {
      expect(mockExportToCSV).toHaveBeenCalledTimes(1);
    });

    // Check that error toast was shown
    expect(toast.error).toHaveBeenCalledWith("Export Failed", {
      description: "Error exporting skipped tracks: Failed to export",
    });
  });

  it("should call export to JSON API when JSON tab is selected", async () => {
    mockExportAllToJSON.mockResolvedValue({
      success: true,
      message: "JSON exported successfully",
    });

    render(
      <ExportDataTab loading={false} statistics={mockStatistics as any} />,
    );

    // Select the JSON tab and click export
    const jsonTabTrigger = screen.getByText("JSON Export");
    fireEvent.click(jsonTabTrigger);

    // Now click the Export JSON button
    const exportJsonButton = screen.getByText("Export JSON");
    fireEvent.click(exportJsonButton);

    // Wait for the API call
    await waitFor(() => {
      expect(mockExportAllToJSON).toHaveBeenCalledTimes(1);
    });

    // Check success toast
    expect(toast.success).toHaveBeenCalledWith("Export Successful", {
      description: "JSON exported successfully",
    });
  });

  it("should call copy to clipboard API when clipboard tab is selected", async () => {
    mockCopyToClipboard.mockResolvedValue({
      success: true,
      message: "Copied to clipboard",
    });

    render(
      <ExportDataTab loading={false} statistics={mockStatistics as any} />,
    );

    // Select the Clipboard tab
    const clipboardTabTrigger = screen.getByText("Clipboard");
    fireEvent.click(clipboardTabTrigger);

    // Click the Copy button
    const copyButton = screen.getByText("Copy to Clipboard");
    fireEvent.click(copyButton);

    // Wait for the API call
    await waitFor(() => {
      expect(mockCopyToClipboard).toHaveBeenCalledTimes(1);
    });

    // Check success toast
    expect(toast.success).toHaveBeenCalledWith("Export Successful", {
      description: "Copied to clipboard",
    });
  });

  it("should disable export buttons while exporting", async () => {
    // Make the export function take some time
    mockExportToCSV.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ success: true }), 100);
        }),
    );

    render(
      <ExportDataTab loading={false} statistics={mockStatistics as any} />,
    );

    // Find and click export button
    const exportButtons = screen.getAllByText("Export CSV");
    fireEvent.click(exportButtons[0]);

    // Check that button shows loading state
    expect(screen.getByText("Exporting...")).toBeInTheDocument();

    // Check that all CSV export buttons are disabled during export
    screen.getAllByRole("button").forEach((button) => {
      if (
        button.textContent?.includes("Export CSV") ||
        button.textContent?.includes("Exporting...")
      ) {
        expect(button).toBeDisabled();
      }
    });

    // Wait for export to complete
    await waitFor(() => {
      expect(screen.queryByText("Exporting...")).not.toBeInTheDocument();
    });
  });
});
