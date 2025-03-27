import { contextBridge, ipcRenderer } from "electron";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import exposeContexts from "../../../../helpers/ipc/context-exposer";
import { exposeThemeContext } from "../../../../helpers/ipc/theme/theme-context";
import { exposeWindowContext } from "../../../../helpers/ipc/window/window-context";

// Mock dependencies
vi.mock("electron", () => ({
  contextBridge: {
    exposeInMainWorld: vi.fn(),
  },
  ipcRenderer: {
    invoke: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
  },
}));

vi.mock("../../../../helpers/ipc/window/window-context", () => ({
  exposeWindowContext: vi.fn(),
}));

vi.mock("../../../../helpers/ipc/theme/theme-context", () => ({
  exposeThemeContext: vi.fn(),
}));

describe("Context Exposer", () => {
  let statisticsAPI: any;
  let spotifyAPI: any;
  let fileAccessAPI: any;

  beforeEach(() => {
    vi.clearAllMocks();
    statisticsAPI = undefined;
    spotifyAPI = undefined;
    fileAccessAPI = undefined;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("exposeContexts", () => {
    it("should expose window context", () => {
      // Act
      exposeContexts();

      // Assert
      expect(exposeWindowContext).toHaveBeenCalledTimes(1);
    });

    it("should expose theme context", () => {
      // Act
      exposeContexts();

      // Assert
      expect(exposeThemeContext).toHaveBeenCalledTimes(1);
    });

    it("should expose statistics API to renderer", () => {
      // Act
      exposeContexts();

      // Assert
      expect(contextBridge.exposeInMainWorld).toHaveBeenCalledWith(
        "statisticsAPI",
        expect.any(Object),
      );
    });

    it("should expose spotify API to renderer", () => {
      // Act
      exposeContexts();

      // Assert
      expect(contextBridge.exposeInMainWorld).toHaveBeenCalledWith(
        "spotify",
        expect.any(Object),
      );
    });

    it("should expose file access API to renderer", () => {
      // Arrange - Mock implementation to check for all calls
      vi.mocked(contextBridge.exposeInMainWorld).mockImplementation(
        (channel, api) => {
          if (channel === "fileAccess") {
            fileAccessAPI = api;
          }
        },
      );

      // Act
      exposeContexts();

      // Assert - check that fileAccess is defined after exposing contexts
      expect(fileAccessAPI).toBeDefined();
    });
  });

  describe("StatisticsAPI", () => {
    it("should correctly map statistics API methods to IPC calls", () => {
      // Arrange
      vi.mocked(contextBridge.exposeInMainWorld).mockImplementation(
        (channel, api) => {
          if (channel === "statisticsAPI") {
            statisticsAPI = api;
          }
        },
      );

      // Act
      exposeContexts();

      // Verify the API is exposed and has expected methods
      expect(statisticsAPI).toBeDefined();

      // Test a sampling of methods
      statisticsAPI.getAll();
      expect(ipcRenderer.invoke).toHaveBeenCalledWith("statistics:getAll");

      statisticsAPI.getDailySkipMetrics();
      expect(ipcRenderer.invoke).toHaveBeenCalledWith(
        "statistics:getDailySkipMetrics",
      );

      statisticsAPI.exportSkippedTracksToCSV();
      expect(ipcRenderer.invoke).toHaveBeenCalledWith(
        "statistics:exportSkippedTracksToCSV",
      );

      statisticsAPI.getUniqueArtistCount();
      expect(ipcRenderer.invoke).toHaveBeenCalledWith(
        "statistics:getUniqueArtistCount",
      );
    });
  });

  describe("SpotifyAPI", () => {
    it("should correctly map spotify API methods to IPC calls", () => {
      // Arrange
      vi.mocked(contextBridge.exposeInMainWorld).mockImplementation(
        (channel, api) => {
          if (channel === "spotify") {
            spotifyAPI = api;
          }
        },
      );

      // Act
      exposeContexts();

      // Verify the API is exposed and has expected methods
      expect(spotifyAPI).toBeDefined();

      // Test a sampling of methods
      spotifyAPI.authenticate();
      expect(ipcRenderer.invoke).toHaveBeenCalledWith(
        "spotify:authenticate",
        undefined,
        undefined,
      );

      spotifyAPI.getStatistics();
      expect(ipcRenderer.invoke).toHaveBeenCalledWith("spotify:getStatistics");

      spotifyAPI.clearLogs();
      expect(ipcRenderer.invoke).toHaveBeenCalledWith("spotify:clearLogs");

      spotifyAPI.startMonitoring();
      expect(ipcRenderer.invoke).toHaveBeenCalledWith(
        "spotify:startMonitoring",
      );
    });

    it("should register event listeners for callbacks", () => {
      // Arrange
      const mockCallback = vi.fn();
      vi.mocked(contextBridge.exposeInMainWorld).mockImplementation(
        (channel, api) => {
          if (channel === "spotify") {
            spotifyAPI = api;
          }
        },
      );

      // Mock ipcRenderer.on to simulate the event callback
      vi.mocked(ipcRenderer.on).mockImplementation((_channel, callback) => {
        // Simulate a call to the callback
        callback({} as any, { status: "test" });
        return ipcRenderer;
      });

      // Act
      exposeContexts();

      // Test event subscription
      expect(spotifyAPI).toBeDefined();
      const unsubscribe = spotifyAPI.onMonitoringStatusChange(mockCallback);

      // Assert
      expect(ipcRenderer.on).toHaveBeenCalledWith(
        "spotify:monitoringStatusChange",
        expect.any(Function),
      );
      expect(mockCallback).toHaveBeenCalledWith({ status: "test" });

      // Test unsubscribe
      unsubscribe();
      expect(ipcRenderer.removeListener).toHaveBeenCalledWith(
        "spotify:monitoringStatusChange",
        expect.any(Function),
      );
    });
  });

  describe("FileAccessAPI", () => {
    it("should correctly map file access API methods to IPC calls", () => {
      // Arrange
      vi.mocked(contextBridge.exposeInMainWorld).mockImplementation(
        (channel, api) => {
          if (channel === "fileAccess") {
            fileAccessAPI = api;
          }
        },
      );

      // Act
      exposeContexts();

      // Verify the API is exposed and has expected methods
      expect(fileAccessAPI).toBeDefined();

      // Test methods
      fileAccessAPI.saveFile("test.txt", "content");
      expect(ipcRenderer.invoke).toHaveBeenCalledWith(
        "fileAccess:saveFile",
        "test.txt",
        "content",
      );

      fileAccessAPI.readFile("test.txt");
      expect(ipcRenderer.invoke).toHaveBeenCalledWith(
        "fileAccess:readFile",
        "test.txt",
      );

      fileAccessAPI.showSaveDialog({ defaultPath: "test.txt" });
      expect(ipcRenderer.invoke).toHaveBeenCalledWith(
        "fileAccess:showSaveDialog",
        { defaultPath: "test.txt" },
      );
    });
  });
});
