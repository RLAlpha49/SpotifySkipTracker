import { LogSettings } from "@/types/spotify";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { LogsCard } from "../../../../components/spotify/LogsCard";

// Mock window.spotify object
const mockGetAvailableLogFiles = vi.fn();
const mockGetLogs = vi.fn();
const mockGetLogsFromFile = vi.fn();
const mockSaveLog = vi.fn();

vi.stubGlobal("window", {
  ...window,
  spotify: {
    getAvailableLogFiles: mockGetAvailableLogFiles,
    getLogs: mockGetLogs,
    getLogsFromFile: mockGetLogsFromFile,
    saveLog: mockSaveLog,
  },
});

describe("LogsCard Component", () => {
  const mockLogs = [
    "[10:15:30 AM.123] [INFO] Application started",
    "[10:16:45 AM.456] [DEBUG] Connecting to Spotify API",
    "[10:17:20 AM.789] [WARNING] Rate limit approaching",
    "[10:18:05 AM.012] [ERROR] Failed to fetch user profile",
    "[10:19:30 AM.345] [CRITICAL] Connection lost",
  ];

  const mockLogFiles = [
    {
      name: "latest.log",
      mtime: Date.now(),
      displayName: "Current Session",
    },
    {
      name: "spotify-skip-tracker-2023-04-20.log",
      mtime: Date.now() - 86400000,
      displayName: "April 20, 2023",
    },
  ];

  const defaultSettings: LogSettings = {
    displayLogLevel: "INFO",
    logAutoRefresh: true,
  };

  const defaultProps = {
    logs: mockLogs,
    settings: defaultSettings,
    logSearchTerm: "",
    onDisplayLogLevelChange: vi.fn().mockResolvedValue(undefined),
    onToggleLogAutoRefresh: vi.fn().mockResolvedValue(undefined),
    onLogSearch: vi.fn(),
    onClearLogs: vi.fn().mockResolvedValue(true),
    onOpenLogsDirectory: vi.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAvailableLogFiles.mockResolvedValue(mockLogFiles);
    mockGetLogs.mockResolvedValue(mockLogs);
    mockGetLogsFromFile.mockResolvedValue(mockLogs);
  });

  it("should render the component with title and logs", async () => {
    render(<LogsCard {...defaultProps} />);

    // Check that the title is rendered
    expect(screen.getByText("Activity Logs")).toBeInTheDocument();

    // Wait for log files to be loaded and rendered
    await waitFor(() => {
      expect(mockGetAvailableLogFiles).toHaveBeenCalledTimes(1);
    });

    // Check that logs are displayed
    expect(
      screen.getByText(/\[INFO\] Application started/),
    ).toBeInTheDocument();

    // Check that ERROR and CRITICAL logs are displayed (should show all logs with level >= INFO)
    expect(
      screen.getByText(/\[ERROR\] Failed to fetch user profile/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/\[CRITICAL\] Connection lost/),
    ).toBeInTheDocument();

    // DEBUG logs should not be displayed since default level is INFO
    expect(
      screen.queryByText(/\[DEBUG\] Connecting to Spotify API/),
    ).not.toBeInTheDocument();
  });

  it("should call onOpenLogsDirectory when 'Open Logs' button is clicked", async () => {
    render(<LogsCard {...defaultProps} />);

    // Click the Open Logs button
    const openLogsButton = screen.getByText("Open Logs");
    fireEvent.click(openLogsButton);

    // Verify the function was called
    expect(defaultProps.onOpenLogsDirectory).toHaveBeenCalledTimes(1);
  });

  it("should call onClearLogs when 'Clear' button is clicked", async () => {
    render(<LogsCard {...defaultProps} />);

    // Click the Clear button
    const clearButton = screen.getByText("Clear");
    fireEvent.click(clearButton);

    // Verify the function was called
    expect(defaultProps.onClearLogs).toHaveBeenCalledTimes(1);
  });

  it("should call onDisplayLogLevelChange when log level is changed", async () => {
    render(<LogsCard {...defaultProps} />);

    // Open the select dropdown for display level
    const selectTrigger = screen.getAllByRole("combobox")[1]; // Second select is for display level
    fireEvent.click(selectTrigger);

    // Click on the DEBUG option
    const debugOption = screen.getByText("DEBUG");
    fireEvent.click(debugOption);

    // Verify the function was called with the correct level
    expect(defaultProps.onDisplayLogLevelChange).toHaveBeenCalledWith("DEBUG");
  });

  it("should call onToggleLogAutoRefresh when auto-refresh switch is toggled", async () => {
    render(<LogsCard {...defaultProps} />);

    // Find and click the auto-refresh switch
    const autoRefreshSwitch = screen.getByRole("switch");
    fireEvent.click(autoRefreshSwitch);

    // Verify the function was called
    expect(defaultProps.onToggleLogAutoRefresh).toHaveBeenCalledTimes(1);
  });

  it("should call onLogSearch when search input is changed", async () => {
    render(<LogsCard {...defaultProps} />);

    // Find the search input and type in it
    const searchInput = screen.getByPlaceholderText("Search logs...");
    fireEvent.change(searchInput, { target: { value: "error" } });

    // Verify the function was called
    expect(defaultProps.onLogSearch).toHaveBeenCalledTimes(1);
  });

  it("should display count badges for log levels", async () => {
    render(<LogsCard {...defaultProps} />);

    // Check that log level count badges are displayed
    await waitFor(() => {
      expect(screen.getByText("DEBUG: 1")).toBeInTheDocument();
      expect(screen.getByText("INFO: 1")).toBeInTheDocument();
      expect(screen.getByText("WARNING: 1")).toBeInTheDocument();
      expect(screen.getByText("ERROR: 1")).toBeInTheDocument();
      expect(screen.getByText("CRITICAL: 1")).toBeInTheDocument();
    });
  });

  it("should load logs from selected file when file selection changes", async () => {
    render(<LogsCard {...defaultProps} />);

    // Wait for log files to be loaded
    await waitFor(() => {
      expect(mockGetAvailableLogFiles).toHaveBeenCalledTimes(1);
    });

    // Open the select dropdown for log file
    const selectTrigger = screen.getAllByRole("combobox")[0]; // First select is for log file
    fireEvent.click(selectTrigger);

    // Click on a different log file
    const oldLogFile = screen.getByText("April 20, 2023");
    fireEvent.click(oldLogFile);

    // Verify getLogsFromFile was called with the correct file name
    expect(mockGetLogsFromFile).toHaveBeenCalledWith(
      "spotify-skip-tracker-2023-04-20.log",
    );

    // Verify saveLog was called to log the file change
    expect(mockSaveLog).toHaveBeenCalled();
  });

  it("should show 'No logs to display' when logs array is empty", async () => {
    render(<LogsCard {...defaultProps} logs={[]} />);

    // Verify the empty state message is shown
    await waitFor(() => {
      expect(screen.getByText("No logs to display")).toBeInTheDocument();
    });
  });

  it("should apply correct styling to logs based on their level", async () => {
    render(
      <LogsCard
        {...defaultProps}
        settings={{ ...defaultSettings, displayLogLevel: "DEBUG" }}
      />,
    );

    await waitFor(() => {
      // Check for logs with different styling classes
      const errorLog = screen.getByText(
        /\[ERROR\] Failed to fetch user profile/,
      );
      expect(errorLog.className).toContain("text-red-600");

      const criticalLog = screen.getByText(/\[CRITICAL\] Connection lost/);
      expect(criticalLog.className).toContain("text-red-700");

      const infoLog = screen.getByText(/\[INFO\] Application started/);
      expect(infoLog.className).toContain("text-primary");

      const debugLog = screen.getByText(/\[DEBUG\] Connecting to Spotify API/);
      expect(debugLog.className).toContain("text-muted-foreground");
    });
  });
});
