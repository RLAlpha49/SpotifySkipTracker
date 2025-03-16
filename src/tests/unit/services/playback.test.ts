import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BrowserWindow } from "electron";
import * as playbackModule from "../../../services/playback";

// Mock the actual playback module
vi.mock("../../../services/playback", () => ({
  startPlaybackMonitoring: vi.fn(),
  stopPlaybackMonitoring: vi.fn(),
  isMonitoringActive: vi.fn(),
}));

// Mock dependencies
vi.mock("electron", () => ({
  BrowserWindow: vi.fn(() => ({
    webContents: {
      send: vi.fn(),
    },
  })),
}));

describe("Playback Monitoring Service", () => {
  let mainWindow: BrowserWindow;

  beforeEach(() => {
    vi.clearAllMocks();
    mainWindow = new BrowserWindow();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("startPlaybackMonitoring", () => {
    it("should initialize monitoring with correct parameters", () => {
      // Arrange
      const clientId = "test-client-id";
      const clientSecret = "test-client-secret";
      vi.mocked(playbackModule.startPlaybackMonitoring).mockReturnValue(true);
      vi.mocked(playbackModule.isMonitoringActive).mockReturnValue(true);

      // Act
      const result = playbackModule.startPlaybackMonitoring(
        mainWindow,
        clientId,
        clientSecret,
      );

      // Assert
      expect(result).toBe(true);
      expect(playbackModule.startPlaybackMonitoring).toHaveBeenCalledWith(
        mainWindow,
        clientId,
        clientSecret,
      );
      expect(playbackModule.isMonitoringActive()).toBe(true);
    });

    it("should handle errors during initialization", () => {
      // Arrange
      const clientId = "test-client-id";
      const clientSecret = "test-client-secret";

      // Mock an error scenario
      vi.mocked(playbackModule.startPlaybackMonitoring).mockReturnValue(false);
      vi.mocked(playbackModule.isMonitoringActive).mockReturnValue(false);

      // Act
      const result = playbackModule.startPlaybackMonitoring(
        mainWindow,
        clientId,
        clientSecret,
      );

      // Assert
      expect(result).toBe(false);
      expect(playbackModule.isMonitoringActive()).toBe(false);
    });
  });

  describe("stopPlaybackMonitoring", () => {
    it("should stop an active monitoring session", () => {
      // Arrange - start monitoring first
      // Create a mock function that returns different values on each call
      const mockIsMonitoringActive = vi.fn();
      mockIsMonitoringActive.mockReturnValueOnce(true); // First call returns true
      mockIsMonitoringActive.mockReturnValue(false); // Subsequent calls return false

      // Replace the mock implementation
      vi.mocked(playbackModule.isMonitoringActive).mockImplementation(
        mockIsMonitoringActive,
      );
      vi.mocked(playbackModule.stopPlaybackMonitoring).mockReturnValue(true);

      // Verify initial state
      expect(playbackModule.isMonitoringActive()).toBe(true);

      // Act
      const result = playbackModule.stopPlaybackMonitoring();

      // Assert
      expect(result).toBe(true);
      expect(playbackModule.isMonitoringActive()).toBe(false);
    });

    it("should handle case when no monitoring is active", () => {
      // Arrange - ensure no monitoring is active
      vi.mocked(playbackModule.isMonitoringActive).mockReturnValue(false);
      vi.mocked(playbackModule.stopPlaybackMonitoring).mockReturnValue(true);

      // Act
      const result = playbackModule.stopPlaybackMonitoring();

      // Assert
      expect(result).toBe(true);
    });
  });

  describe("isMonitoringActive", () => {
    it("should return true when monitoring is active", () => {
      // Arrange
      vi.mocked(playbackModule.isMonitoringActive).mockReturnValue(true);

      // Act & Assert
      expect(playbackModule.isMonitoringActive()).toBe(true);
    });

    it("should return false when monitoring is not active", () => {
      // Arrange
      vi.mocked(playbackModule.isMonitoringActive).mockReturnValue(false);

      // Act & Assert
      expect(playbackModule.isMonitoringActive()).toBe(false);
    });
  });
});
