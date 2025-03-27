import { BrowserWindow } from "electron";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getMonitoringConfig,
  isMonitoringActive,
  setMonitoringConfig,
  startPlaybackMonitoring,
  stopPlaybackMonitoring,
} from "../../../../services/playback/monitor";

// Mock dependencies
vi.mock("electron", () => ({
  BrowserWindow: vi.fn(() => ({
    webContents: {
      send: vi.fn(),
    },
  })),
}));

vi.mock("../../../../helpers/storage/store", () => ({
  saveLog: vi.fn(),
  getSettings: vi.fn().mockReturnValue({ pollingInterval: 3000 }),
}));

vi.mock("../../../../services/spotify", () => ({
  setCredentials: vi.fn(),
  hasCredentials: vi.fn().mockReturnValue(true),
  getCurrentPlayback: vi.fn(),
}));

// Mock internal playback modules
vi.mock("../../../../services/playback/state", () => ({
  getCredentials: vi.fn().mockReturnValue({
    clientId: "mocked-client-id",
    clientSecret: "mocked-client-secret",
  }),
  getPlaybackState: vi.fn().mockReturnValue({
    isPlaying: true,
    currentTrackId: "track-123",
  }),
  resetPlaybackState: vi.fn(),
  setCredentials: vi.fn(),
  updatePlaybackState: vi.fn(),
}));

vi.mock("../../../../services/playback/track-change", () => ({
  handleTrackChange: vi.fn(),
  logNowPlaying: vi.fn(),
}));

vi.mock("../../../../services/playback/history", () => ({
  updateRecentTracks: vi.fn(),
}));

// Mock setInterval and clearInterval
const originalSetInterval = global.setInterval;
const originalClearTimeout = global.clearTimeout;
const originalClearInterval = global.clearInterval;

describe("Playback Monitoring Service", () => {
  let mainWindow: BrowserWindow;
  let mockSetInterval: any;
  let mockClearTimeout: any;
  let mockClearInterval: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mainWindow = new BrowserWindow();

    // Mock the timers
    mockSetInterval = vi.fn().mockReturnValue(123); // Return a fake interval ID
    mockClearTimeout = vi.fn();
    mockClearInterval = vi.fn();

    global.setInterval = mockSetInterval as any;
    global.clearTimeout = mockClearTimeout as any;
    global.clearInterval = mockClearInterval as any;
  });

  afterEach(() => {
    vi.resetAllMocks();

    // Restore the original timer functions
    global.setInterval = originalSetInterval;
    global.clearTimeout = originalClearTimeout;
    global.clearInterval = originalClearInterval;

    // Make sure monitoring is stopped
    stopPlaybackMonitoring();
  });

  describe("startPlaybackMonitoring", () => {
    it("should initialize monitoring with correct parameters", () => {
      // Act
      const result = startPlaybackMonitoring(
        mainWindow,
        "test-client-id",
        "test-client-secret",
      );

      // Assert
      expect(result).toBe(true);
      expect(mockSetInterval).toHaveBeenCalled();
    });

    it("should apply config if provided", () => {
      // Arrange
      const config = { pollingInterval: 5000 };

      // Act
      startPlaybackMonitoring(
        mainWindow,
        "test-client-id",
        "test-client-secret",
        config,
      );

      // Assert
      expect(getMonitoringConfig().pollingInterval).toBe(5000);
    });

    it("should use settings from store if available", () => {
      // Act
      startPlaybackMonitoring(
        mainWindow,
        "test-client-id",
        "test-client-secret",
      );

      // Assert - should use the 3000ms from the mocked getSettings
      expect(getMonitoringConfig().pollingInterval).toBe(3000);
    });
  });

  describe("stopPlaybackMonitoring", () => {
    it("should stop an active monitoring session", () => {
      // Arrange - start monitoring first
      startPlaybackMonitoring(
        mainWindow,
        "test-client-id",
        "test-client-secret",
      );

      // Act
      const result = stopPlaybackMonitoring();

      // Assert
      expect(result).toBe(true);
      expect(mockClearTimeout).toHaveBeenCalled();
    });
  });

  describe("isMonitoringActive", () => {
    it("should return true when monitoring is active", () => {
      // Arrange - start monitoring
      startPlaybackMonitoring(
        mainWindow,
        "test-client-id",
        "test-client-secret",
      );

      // Act & Assert
      expect(isMonitoringActive()).toBe(true);
    });

    it("should return false when monitoring is not active", () => {
      // Arrange - ensure monitoring is stopped
      stopPlaybackMonitoring();

      // Act & Assert
      expect(isMonitoringActive()).toBe(false);
    });
  });

  describe("setMonitoringConfig", () => {
    it("should update config with new values", () => {
      // Arrange - get default config
      const defaultConfig = getMonitoringConfig();

      // Act - update polling interval
      setMonitoringConfig({ pollingInterval: 10000 });

      // Assert
      const updatedConfig = getMonitoringConfig();
      expect(updatedConfig.pollingInterval).toBe(10000);
      // Other values should be unchanged
      expect(updatedConfig.progressUpdateInterval).toBe(
        defaultConfig.progressUpdateInterval,
      );
    });

    it("should restart monitoring if active when config changes", () => {
      // Arrange - start monitoring
      startPlaybackMonitoring(
        mainWindow,
        "test-client-id",
        "test-client-secret",
      );

      // Reset mocks to track new calls
      mockClearTimeout.mockReset();
      mockSetInterval.mockReset();

      // Act - change config
      setMonitoringConfig({ pollingInterval: 7500 });

      // Assert - should have stopped and restarted
      expect(mockClearTimeout).toHaveBeenCalled();
      expect(mockSetInterval).toHaveBeenCalled();
    });
  });
});
