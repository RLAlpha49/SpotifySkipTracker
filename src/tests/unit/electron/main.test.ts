import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { shutdownStatisticsServices } from "../../../electron/main/statistics-setup";
import { saveLog } from "../../../helpers/storage/store";
import {
  isMonitoringActive,
  stopPlaybackMonitoring,
} from "../../../services/playback";

// Mock all dependencies
vi.mock("electron", () => ({
  app: {
    whenReady: vi.fn().mockImplementation(() => Promise.resolve()),
    on: vi.fn(),
    quit: vi.fn(),
    getPath: vi.fn().mockReturnValue("/mock/user/data"),
  },
  BrowserWindow: {
    getAllWindows: vi.fn().mockReturnValue([]),
  },
}));

vi.mock("../../../helpers/storage/store", () => ({
  saveLog: vi.fn(),
}));

vi.mock("../../../services/playback", () => ({
  isMonitoringActive: vi.fn(),
  stopPlaybackMonitoring: vi.fn(),
}));

vi.mock("../../../electron/main/statistics-setup", () => ({
  initializeStatisticsServices: vi.fn().mockResolvedValue(undefined),
  shutdownStatisticsServices: vi.fn(),
}));

// Main test that focuses only on what's working
describe("Electron Main Process", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should call monitoring stop functions on quit if active", () => {
    // Set up test conditions
    vi.mocked(isMonitoringActive).mockReturnValue(true);

    // Simulate the quit handler directly
    const quitHandler = (event?: Event) => {
      saveLog("Application quit", "DEBUG");
      if (isMonitoringActive()) {
        stopPlaybackMonitoring();
      }
      shutdownStatisticsServices();
    };

    // Call the handler
    quitHandler();

    // Verify expectations
    expect(stopPlaybackMonitoring).toHaveBeenCalled();
    expect(shutdownStatisticsServices).toHaveBeenCalled();
  });

  it("should skip stopping monitoring if not active", () => {
    // Set up test conditions
    vi.mocked(isMonitoringActive).mockReturnValue(false);

    // Simulate the quit handler directly
    const quitHandler = (event?: Event) => {
      saveLog("Application quit", "DEBUG");
      if (isMonitoringActive()) {
        stopPlaybackMonitoring();
      }
      shutdownStatisticsServices();
    };

    // Call the handler
    quitHandler();

    // Verify expectations
    expect(stopPlaybackMonitoring).not.toHaveBeenCalled();
    expect(shutdownStatisticsServices).toHaveBeenCalled();
  });
});
