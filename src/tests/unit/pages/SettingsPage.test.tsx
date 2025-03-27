/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock window.spotify
const mockSpotify = {
  getSettings: vi.fn().mockResolvedValue({
    skipThreshold: 3,
    timeframeInDays: 30,
    skipProgress: 70,
    displayLogLevel: "INFO",
    logAutoRefresh: true,
    autoStartMonitoring: true,
  }),
  saveSettings: vi.fn().mockResolvedValue(true),
  resetSettings: vi.fn().mockResolvedValue(true),
  clearStatistics: vi.fn().mockResolvedValue(true),
  clearLogs: vi.fn().mockResolvedValue(true),
  restartApp: vi.fn().mockResolvedValue(true),
  authenticate: vi.fn().mockResolvedValue(true),
  isAuthenticated: vi.fn().mockResolvedValue(true),
  logout: vi.fn().mockResolvedValue(true),
};

const mockElectron = {
  openLogsDirectory: vi.fn().mockResolvedValue(true),
};

// Apply mock
vi.stubGlobal("window", {
  spotify: mockSpotify,
  electron: mockElectron,
});

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Simple test component to test window.spotify API
const TestSettingsComponent = () => {
  return (
    <div>
      <button
        data-testid="get-settings-btn"
        onClick={() => window.spotify.getSettings()}
      >
        Get Settings
      </button>
      <button
        data-testid="save-settings-btn"
        onClick={() =>
          window.spotify.saveSettings({
            skipThreshold: 3,
            timeframeInDays: 30,
            skipProgress: 70,
            displayLogLevel: "INFO",
            logAutoRefresh: true,
            autoStartMonitoring: true,
          } as any)
        }
      >
        Save Settings
      </button>
      <button
        data-testid="reset-settings-btn"
        onClick={() => (window.spotify as any).resetSettings()}
      >
        Reset Settings
      </button>
      <button
        data-testid="clear-stats-btn"
        onClick={() => window.spotify.clearStatistics()}
      >
        Clear Statistics
      </button>
      <button
        data-testid="clear-logs-btn"
        onClick={() => window.spotify.clearLogs()}
      >
        Clear Logs
      </button>
      <button
        data-testid="restart-app-btn"
        onClick={() => window.spotify.restartApp()}
      >
        Restart App
      </button>
    </div>
  );
};

describe("Settings Functionality", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("should call getSettings", async () => {
    // Arrange
    const { getByTestId } = render(<TestSettingsComponent />);

    // Act
    fireEvent.click(getByTestId("get-settings-btn"));

    // Assert
    expect(mockSpotify.getSettings).toHaveBeenCalledTimes(1);
  });

  it("should call saveSettings with correct parameters", async () => {
    // Arrange
    const { getByTestId } = render(<TestSettingsComponent />);

    // Act
    fireEvent.click(getByTestId("save-settings-btn"));

    // Assert
    expect(mockSpotify.saveSettings).toHaveBeenCalledTimes(1);
    expect(mockSpotify.saveSettings).toHaveBeenCalledWith({
      skipThreshold: 3,
      timeframeInDays: 30,
      skipProgress: 70,
      displayLogLevel: "INFO",
      logAutoRefresh: true,
      autoStartMonitoring: true,
    });
  });

  it("should call resetSettings", async () => {
    // Arrange
    const { getByTestId } = render(<TestSettingsComponent />);

    // Act
    fireEvent.click(getByTestId("reset-settings-btn"));

    // Assert
    expect(mockSpotify.resetSettings).toHaveBeenCalledTimes(1);
  });

  it("should call clearStatistics", async () => {
    // Arrange
    const { getByTestId } = render(<TestSettingsComponent />);

    // Act
    fireEvent.click(getByTestId("clear-stats-btn"));

    // Assert
    expect(mockSpotify.clearStatistics).toHaveBeenCalledTimes(1);
  });

  it("should call clearLogs", async () => {
    // Arrange
    const { getByTestId } = render(<TestSettingsComponent />);

    // Act
    fireEvent.click(getByTestId("clear-logs-btn"));

    // Assert
    expect(mockSpotify.clearLogs).toHaveBeenCalledTimes(1);
  });

  it("should call restartApp", async () => {
    // Arrange
    const { getByTestId } = render(<TestSettingsComponent />);

    // Act
    fireEvent.click(getByTestId("restart-app-btn"));

    // Assert
    expect(mockSpotify.restartApp).toHaveBeenCalledTimes(1);
  });
});
