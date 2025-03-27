import { BrowserWindow } from "electron";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getMonitoringConfig,
  isMonitoringActive,
  setMonitoringConfig,
  startPlaybackMonitoring,
  stopPlaybackMonitoring,
} from "../../../../services/playback/monitor";

// Mock Electron app for userData path
vi.mock("electron", () => ({
  app: {
    getPath: vi.fn().mockReturnValue("/mock/user/data"),
  },
  BrowserWindow: vi.fn(() => ({
    webContents: {
      send: vi.fn(),
    },
  })),
}));

// Mock store with settings directly in the mock
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

// Mock setTimeout and clearTimeout
vi.mock(
  "global",
  () => ({
    setTimeout: vi.fn().mockReturnValue(123),
    clearTimeout: vi.fn(),
  }),
  { virtual: true },
);

describe("Playback Monitoring Service", () => {
  let mainWindow: BrowserWindow;

  // Mock the globals directly
  const originalSetTimeout = global.setTimeout;
  const originalClearTimeout = global.clearTimeout;

  beforeEach(() => {
    vi.clearAllMocks();
    mainWindow = new BrowserWindow();

    // Create mock functions for the timers
    global.setTimeout = vi.fn().mockReturnValue(123);
    global.clearTimeout = vi.fn();

    // Reset any custom configs
    setMonitoringConfig({ pollingInterval: 5000 }); // Reset to default
  });

  afterEach(() => {
    vi.resetAllMocks();

    // Restore originals
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;

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
      // Basic verification that setTimeout is called (even though our mock may not work perfectly)
      expect(global.setTimeout).toHaveBeenCalled();
    });

    it("should apply config if provided", () => {
      // Arrange
      const config = { pollingInterval: 8000 };

      // Act
      startPlaybackMonitoring(
        mainWindow,
        "test-client-id",
        "test-client-secret",
        config,
      );

      // Assert - verify the config was updated
      expect(getMonitoringConfig().pollingInterval).toBe(8000);
    });
  });

  describe("isMonitoringActive", () => {
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
  });
});
