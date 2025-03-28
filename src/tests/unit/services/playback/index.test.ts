import { describe, expect, it, vi } from "vitest";
import * as playbackModule from "../../../../services/playback";

// Mock Electron's app
vi.mock("electron", () => ({
  app: {
    getPath: vi.fn().mockReturnValue("/mock/user/data"),
  },
}));

// Mock fs-extra to prevent file system permission errors
vi.mock("fs-extra", () => ({
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn().mockReturnValue(Buffer.from("{}")),
  unlinkSync: vi.fn(),
  ensureDirSync: vi.fn(),
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    readFileSync: vi.fn().mockReturnValue(Buffer.from("{}")),
    unlinkSync: vi.fn(),
    ensureDirSync: vi.fn(),
  },
}));

// Mock built-in fs module as well
vi.mock("fs", () => ({
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn().mockReturnValue(Buffer.from("{}")),
  unlinkSync: vi.fn(),
  promises: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue(Buffer.from("{}")),
  },
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    readFileSync: vi.fn().mockReturnValue(Buffer.from("{}")),
    unlinkSync: vi.fn(),
  },
}));

describe("Playback Service Tests", () => {
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
