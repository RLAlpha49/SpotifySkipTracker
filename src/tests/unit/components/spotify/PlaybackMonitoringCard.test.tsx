import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import type { MonitoringStatus } from "../../../../components/spotify/PlaybackMonitoringCard";
import { PlaybackMonitoringCard } from "../../../../components/spotify/PlaybackMonitoringCard";

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("PlaybackMonitoringCard Component", () => {
  const defaultProps = {
    isAuthenticated: true,
    isMonitoring: false,
    onStartMonitoring: vi.fn().mockResolvedValue(undefined),
    onStopMonitoring: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render with inactive status when not monitoring", () => {
    render(<PlaybackMonitoringCard {...defaultProps} />);

    // Check title is rendered
    expect(screen.getByText("Playback Monitoring")).toBeInTheDocument();

    // Check status text is displayed
    expect(screen.getByText("Monitoring Inactive")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Monitoring is inactive. Start monitoring to detect skipped tracks.",
      ),
    ).toBeInTheDocument();

    // Check start button is displayed
    expect(screen.getByText("Start Monitoring")).toBeInTheDocument();
  });

  it("should render with active status when monitoring", () => {
    render(
      <PlaybackMonitoringCard
        {...defaultProps}
        isMonitoring={true}
        monitoringStatus="active"
      />,
    );

    // Check status text is displayed
    expect(screen.getByText("Monitoring Active")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Monitoring is active. Skipped tracks are being detected and recorded.",
      ),
    ).toBeInTheDocument();

    // Check stop button is displayed
    expect(screen.getByText("Stop Monitoring")).toBeInTheDocument();
  });

  it("should render with initializing status", () => {
    render(
      <PlaybackMonitoringCard
        {...defaultProps}
        monitoringStatus="initializing"
      />,
    );

    // Check status text is displayed
    expect(screen.getByText("Initializing")).toBeInTheDocument();
    expect(screen.getByText("Starting")).toBeInTheDocument();
    expect(
      screen.getByText("Starting monitoring service. Please wait..."),
    ).toBeInTheDocument();

    // Check initializing button is displayed
    expect(screen.getByText("Initializing...")).toBeInTheDocument();

    // Button should be disabled
    const button = screen.getByText("Initializing...");
    expect(button.closest("button")).toBeDisabled();
  });

  it("should render with error status", () => {
    const errorMessage = "Failed to connect to Spotify API";
    render(
      <PlaybackMonitoringCard
        {...defaultProps}
        monitoringStatus="error"
        statusMessage={errorMessage}
      />,
    );

    // Check status text is displayed
    expect(screen.getByText("Monitoring Error")).toBeInTheDocument();
    expect(screen.getByText("Error")).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();

    // Check stop button is displayed (to allow user to reset)
    expect(screen.getByText("Stop Monitoring")).toBeInTheDocument();
  });

  it("should render disabled state when not authenticated", () => {
    render(
      <PlaybackMonitoringCard {...defaultProps} isAuthenticated={false} />,
    );

    // Check disabled status is displayed
    expect(screen.getByText("Monitoring Unavailable")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Please authenticate with Spotify to enable monitoring features.",
      ),
    ).toBeInTheDocument();

    // Button should be disabled
    const button = screen.getByText("Authenticate First");
    expect(button.closest("button")).toBeDisabled();
  });

  it("should call onStartMonitoring when start button is clicked", async () => {
    // Get the actual toast function to spy on
    const { toast } = await import("sonner");

    render(<PlaybackMonitoringCard {...defaultProps} />);

    // Click the start button
    const startButton = screen.getByText("Start Monitoring");
    fireEvent.click(startButton);

    // Button should show loading state
    expect(screen.getByText("Starting...")).toBeInTheDocument();

    // Verify function was called
    expect(defaultProps.onStartMonitoring).toHaveBeenCalledTimes(1);

    // Wait for the async operation to complete
    await waitFor(() => {
      // Toast success should have been called
      expect(toast.success).toHaveBeenCalledWith(
        "Monitoring Started",
        expect.anything(),
      );
    });
  });

  it("should call onStopMonitoring when stop button is clicked", async () => {
    // Get the actual toast function to spy on
    const { toast } = await import("sonner");

    render(
      <PlaybackMonitoringCard
        {...defaultProps}
        isMonitoring={true}
        monitoringStatus="active"
      />,
    );

    // Click the stop button
    const stopButton = screen.getByText("Stop Monitoring");
    fireEvent.click(stopButton);

    // Button should show loading state
    expect(screen.getByText("Stopping...")).toBeInTheDocument();

    // Verify function was called
    expect(defaultProps.onStopMonitoring).toHaveBeenCalledTimes(1);

    // Wait for the async operation to complete
    await waitFor(() => {
      // Toast success should have been called
      expect(toast.success).toHaveBeenCalledWith(
        "Monitoring Stopped",
        expect.anything(),
      );
    });
  });

  it("should show error toast when start monitoring fails", async () => {
    // Get the actual toast function to spy on
    const { toast } = await import("sonner");

    const mockError = new Error("API connection failed");
    const failingProps = {
      ...defaultProps,
      onStartMonitoring: vi.fn().mockRejectedValue(mockError),
    };

    render(<PlaybackMonitoringCard {...failingProps} />);

    // Click the start button
    const startButton = screen.getByText("Start Monitoring");
    fireEvent.click(startButton);

    // Wait for the async operation to complete
    await waitFor(() => {
      // Toast error should have been called
      expect(toast.error).toHaveBeenCalledWith(
        "Monitoring Error",
        expect.objectContaining({
          description: expect.stringContaining("Failed to start monitoring"),
        }),
      );
    });
  });

  it("should show error toast when stop monitoring fails", async () => {
    // Get the actual toast function to spy on
    const { toast } = await import("sonner");

    const mockError = new Error("Failed to stop service");
    const failingProps = {
      ...defaultProps,
      isMonitoring: true,
      monitoringStatus: "active" as MonitoringStatus,
      onStopMonitoring: vi.fn().mockRejectedValue(mockError),
    };

    render(<PlaybackMonitoringCard {...failingProps} />);

    // Click the stop button
    const stopButton = screen.getByText("Stop Monitoring");
    fireEvent.click(stopButton);

    // Wait for the async operation to complete
    await waitFor(() => {
      // Toast error should have been called
      expect(toast.error).toHaveBeenCalledWith(
        "Monitoring Error",
        expect.objectContaining({
          description: expect.stringContaining("Failed to stop monitoring"),
        }),
      );
    });
  });

  it("should display status message and error details when provided", () => {
    const statusMessage = "Monitoring service is in recovery mode";
    const errorDetails = "Spotify API rate limit exceeded";

    render(
      <PlaybackMonitoringCard
        {...defaultProps}
        monitoringStatus="error"
        statusMessage={statusMessage}
        errorDetails={errorDetails}
      />,
    );

    // Status message should be displayed
    expect(screen.getByText(statusMessage)).toBeInTheDocument();
  });
});
