import { describe, expect, it, vi } from "vitest";
import * as playbackModule from "../../../../services/playback";
import { skipInCI } from "../../setup";

// Mock Electron's app
vi.mock("electron", () => ({
  app: {
    getPath: vi.fn().mockReturnValue("/mock/user/data"),
  },
}));

// Skip all tests in CI environment due to file system permission issues
skipInCI.describe("Playback Service Tests", () => {
  describe("Playback Service Index", () => {
    describe("exports", () => {
      it("should export the correct functions", () => {
        expect(playbackModule).toHaveProperty("startPlaybackMonitoring");
        expect(playbackModule).toHaveProperty("stopPlaybackMonitoring");
        expect(playbackModule).toHaveProperty("isMonitoringActive");
        expect(playbackModule).not.toHaveProperty("logSkippedTrack");
        expect(playbackModule).not.toHaveProperty("getPlaybackHistory");
      });
    });
  });
});
