import { describe, expect, it, vi } from "vitest";
import * as playbackModule from "../../../../services/playback";

// Mock Electron's app
vi.mock("electron", () => ({
  app: {
    getPath: vi.fn().mockReturnValue("/mock/user/data"),
  },
}));

describe("Playback Service Index", () => {
  describe("exports", () => {
    it("should export the main playback monitoring functions", () => {
      expect(playbackModule).toHaveProperty("startPlaybackMonitoring");
      expect(typeof playbackModule.startPlaybackMonitoring).toBe("function");

      expect(playbackModule).toHaveProperty("stopPlaybackMonitoring");
      expect(typeof playbackModule.stopPlaybackMonitoring).toBe("function");

      expect(playbackModule).toHaveProperty("isMonitoringActive");
      expect(typeof playbackModule.isMonitoringActive).toBe("function");
    });

    it("should not export internal implementation details", () => {
      // These are meant to be internal, so they shouldn't be exported
      expect(playbackModule).not.toHaveProperty("updatePlaybackState");
      expect(playbackModule).not.toHaveProperty("handleTrackChange");
      expect(playbackModule).not.toHaveProperty("logSkippedTrack");
      expect(playbackModule).not.toHaveProperty("getPlaybackHistory");
    });
  });
});
