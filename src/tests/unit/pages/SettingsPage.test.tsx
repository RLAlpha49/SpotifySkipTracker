/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Define the Settings type
interface SpotifySettings {
  skipThreshold: number;
  timeframeInDays: number;
  skipProgress: number;
  displayLogLevel: string;
  logAutoRefresh: boolean;
  autoStartMonitoring: boolean;
}

// Define the Spotify API interface
interface SpotifyAPI {
  getSettings: () => Promise<SpotifySettings>;
  saveSettings: (settings: SpotifySettings) => Promise<boolean>;
  resetSettings: () => Promise<boolean>;
  clearStatistics: () => Promise<boolean>;
  clearLogs: () => Promise<boolean>;
  restartApp: () => Promise<boolean>;
  authenticate: () => Promise<boolean>;
  isAuthenticated: () => Promise<boolean>;
  logout: () => Promise<boolean>;
}

// Define the Electron API interface
interface ElectronAPI {
  openLogsDirectory: () => Promise<boolean>;
}

// Extend Window interface
declare global {
  interface Window {
    spotify: SpotifyAPI;
    electron: ElectronAPI;
  }
}

// Mock window.spotify
const mockSpotify: SpotifyAPI = {
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

const mockElectron: ElectronAPI = {
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
          })
        }
      >
        Save Settings
      </button>
      <button
        data-testid="reset-settings-btn"
        onClick={() => window.spotify.resetSettings()}
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
