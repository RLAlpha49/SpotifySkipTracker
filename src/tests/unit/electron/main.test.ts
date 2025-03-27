import { app } from "electron";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installExtensions } from "../../../electron/main/extensions";
import { checkForSquirrelEvents } from "../../../electron/main/installer-events";
import {
  initializeStatisticsServices,
  shutdownStatisticsServices,
} from "../../../electron/main/statistics-setup";
import { createWindow } from "../../../electron/main/window";
import { saveLog } from "../../../helpers/storage/store";
import {
  isMonitoringActive,
  stopPlaybackMonitoring,
} from "../../../services/playback";

// Mock all dependencies
vi.mock("electron", () => ({
  app: {
    whenReady: vi.fn().mockReturnValue({
      then: vi.fn((callback) => callback()),
    }),
    on: vi.fn(),
    quit: vi.fn(),
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

vi.mock("../../../electron/main/extensions", () => ({
  installExtensions: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../electron/main/installer-events", () => ({
  checkForSquirrelEvents: vi.fn().mockReturnValue(false),
}));

vi.mock("../../../electron/main/statistics-setup", () => ({
  initializeStatisticsServices: vi.fn().mockResolvedValue(undefined),
  shutdownStatisticsServices: vi.fn(),
}));

vi.mock("../../../electron/main/window", () => ({
  createWindow: vi.fn().mockReturnValue({ webContents: {} }),
}));

describe("Electron Main Process", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should check for Squirrel events on startup", async () => {
    // Import to trigger the code
    await import("../../../electron/main");

    expect(checkForSquirrelEvents).toHaveBeenCalled();
  });

  it("should initialize application when ready", async () => {
    await import("../../../electron/main");

    expect(app.whenReady).toHaveBeenCalled();
    expect(installExtensions).toHaveBeenCalled();
    expect(createWindow).toHaveBeenCalled();
    expect(initializeStatisticsServices).toHaveBeenCalled();
    expect(saveLog).toHaveBeenCalledWith("Application initializing", "DEBUG");
  });

  it("should set up window closed handler", async () => {
    await import("../../../electron/main");

    // Get the 'window-all-closed' event handler
    const closeHandler = vi
      .mocked(app.on)
      .mock.calls.find((call) => call[0] === "window-all-closed")?.[1];

    expect(closeHandler).toBeDefined();

    if (closeHandler) {
      // Call the handler to test it
      closeHandler();
      expect(saveLog).toHaveBeenCalledWith("All windows closed", "DEBUG");
    }
  });

  it("should set up app quit handler", async () => {
    vi.mocked(isMonitoringActive).mockReturnValue(true);

    await import("../../../electron/main");

    // Get the 'quit' event handler
    const quitHandler = vi
      .mocked(app.on)
      .mock.calls.find((call) => call[0] === "quit")?.[1];

    expect(quitHandler).toBeDefined();

    if (quitHandler) {
      // Call the handler to test it
      quitHandler();
      expect(saveLog).toHaveBeenCalledWith("Application quit", "DEBUG");
      expect(stopPlaybackMonitoring).toHaveBeenCalled();
      expect(shutdownStatisticsServices).toHaveBeenCalled();
    }
  });

  it("should stop monitoring only if active", async () => {
    vi.mocked(isMonitoringActive).mockReturnValue(false);

    await import("../../../electron/main");

    // Get the 'quit' event handler
    const quitHandler = vi
      .mocked(app.on)
      .mock.calls.find((call) => call[0] === "quit")?.[1];

    if (quitHandler) {
      // Call the handler to test it
      quitHandler();
      expect(stopPlaybackMonitoring).not.toHaveBeenCalled();
    }
  });
});
