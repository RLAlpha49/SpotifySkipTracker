import { BrowserWindow, Menu } from "electron";
import fs from "fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { setupSpotifyIPC } from "../../../../electron/main/spotify-ipc";
import { createWindow } from "../../../../electron/main/window";
import registerListeners from "../../../../helpers/ipc/listeners-register";
import { getSettings, saveLog } from "../../../../helpers/storage/store";
import { cancelAuthFlow } from "../../../../services/auth";
import {
  isMonitoringActive,
  stopPlaybackMonitoring,
} from "../../../../services/playback";

// Mock all dependencies
vi.mock("electron", () => {
  const mockBrowserWindow = vi.fn(() => ({
    loadURL: vi.fn(),
    loadFile: vi.fn(),
    webContents: {
      on: vi.fn(),
      openDevTools: vi.fn(),
    },
    on: vi.fn(),
    once: vi.fn(),
    show: vi.fn(),
  }));

  return {
    app: {
      getAppPath: vi.fn().mockReturnValue("/mock/app/path"),
    },
    BrowserWindow: mockBrowserWindow,
    Menu: {
      setApplicationMenu: vi.fn(),
      buildFromTemplate: vi.fn().mockReturnValue({}),
    },
  };
});

vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn(),
  },
  existsSync: vi.fn(),
}));

vi.mock("path", () => ({
  join: vi.fn().mockReturnValue("/mock/path/preload.js"),
  resolve: vi.fn().mockImplementation((...args) => args.join("/")),
}));

vi.mock("../../../../helpers/ipc/listeners-register", () => ({
  default: vi.fn(),
}));

vi.mock("../../../../helpers/storage/store", () => ({
  getSettings: vi.fn().mockReturnValue({
    logLevel: "DEBUG",
    skipThreshold: 0.5,
  }),
  saveLog: vi.fn(),
}));

vi.mock("../../../../services/auth", () => ({
  cancelAuthFlow: vi.fn(),
}));

vi.mock("../../../../services/playback", () => ({
  isMonitoringActive: vi.fn().mockReturnValue(false),
  stopPlaybackMonitoring: vi.fn(),
}));

vi.mock("../../../../electron/main/spotify-ipc", () => ({
  setupSpotifyIPC: vi.fn(),
}));

describe("Window Management Module", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe("createWindow", () => {
    it("should set up developer menu in development mode", () => {
      // Set development environment
      process.env.NODE_ENV = "development";

      createWindow();

      expect(Menu.buildFromTemplate).toHaveBeenCalled();
      expect(Menu.setApplicationMenu).toHaveBeenCalled();
    });

    it("should set up null menu in production mode", () => {
      // Set production environment
      process.env.NODE_ENV = "production";

      createWindow();

      expect(Menu.setApplicationMenu).toHaveBeenCalledWith(null);
    });

    it("should create a browser window with correct config", () => {
      const window = createWindow();

      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 1000,
          height: 800,
          webPreferences: expect.objectContaining({
            contextIsolation: true,
            nodeIntegration: true,
            preload: "/mock/path/preload.js",
          }),
        }),
      );
      expect(window).toBeDefined();
    });

    it("should set up error event listener for renderer", () => {
      const window = createWindow();

      expect(window.webContents.on).toHaveBeenCalledWith(
        "did-fail-load",
        expect.any(Function),
      );
    });

    it("should initialize Spotify IPC", () => {
      const window = createWindow();

      expect(setupSpotifyIPC).toHaveBeenCalledWith(window);
    });

    it("should load correct URL in development mode", () => {
      // Set development environment
      process.env.NODE_ENV = "development";

      const window = createWindow();

      expect(window.loadURL).toHaveBeenCalledWith("http://localhost:5173/");
    });

    it("should attempt to load HTML file in production mode", () => {
      // Set production environment
      process.env.NODE_ENV = "production";
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const window = createWindow();

      expect(fs.existsSync).toHaveBeenCalled();
      expect(window.loadURL).toHaveBeenCalled();
    });

    it("should register IPC listeners", () => {
      const window = createWindow();

      expect(registerListeners).toHaveBeenCalledWith(window);
    });

    it("should set up ready-to-show event handler", () => {
      const window = createWindow();

      expect(window.once).toHaveBeenCalledWith(
        "ready-to-show",
        expect.any(Function),
      );

      // Get the handler and call it
      const readyHandler = vi.mocked(window.once).mock.calls[0][1] as Function;
      readyHandler();

      expect(window.show).toHaveBeenCalled();
      expect(getSettings).toHaveBeenCalled();
      expect(saveLog).toHaveBeenCalledWith("Application started", "DEBUG");
    });

    it("should set up closed event handler", () => {
      const window = createWindow();

      expect(window.on).toHaveBeenCalledWith("closed", expect.any(Function));

      // Get the handler and call it
      const closedHandler = vi.mocked(window.on).mock.calls[0][1] as Function;
      closedHandler();

      expect(saveLog).toHaveBeenCalledWith("Application closed", "DEBUG");
      expect(cancelAuthFlow).toHaveBeenCalled();
    });

    it("should stop monitoring if active on window close", () => {
      vi.mocked(isMonitoringActive).mockReturnValue(true);

      const window = createWindow();

      // Get the closed event handler and call it
      const closedHandler = vi.mocked(window.on).mock.calls[0][1] as Function;
      closedHandler();

      expect(stopPlaybackMonitoring).toHaveBeenCalled();
    });
  });
});
