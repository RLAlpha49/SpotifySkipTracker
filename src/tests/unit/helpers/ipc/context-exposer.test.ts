import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";
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

// Define interfaces for the exposed APIs
interface StatisticsAPI {
  getAll: () => Promise<unknown>;
  getDailySkipMetrics: () => Promise<unknown>;
  exportSkippedTracksToCSV: () => Promise<unknown>;
  getUniqueArtistCount: () => Promise<unknown>;
  [key: string]: (...args: unknown[]) => Promise<unknown>;
}

interface SpotifyAPI {
  authenticate: (code?: string, isCallback?: boolean) => Promise<unknown>;
  getStatistics: () => Promise<unknown>;
  clearLogs: () => Promise<unknown>;
  startMonitoring: () => Promise<unknown>;
  onMonitoringStatusChange: (callback: (data: unknown) => void) => () => void;
  [key: string]: (...args: unknown[]) => unknown;
}

interface FileAccessAPI {
  saveFile: (filename: string, content: string) => Promise<unknown>;
  readFile: (filename: string) => Promise<unknown>;
  [key: string]: (...args: unknown[]) => Promise<unknown>;
}

describe("Context Exposer", () => {
  let statisticsAPI: StatisticsAPI;
  let spotifyAPI: SpotifyAPI;
  let fileAccessAPI: FileAccessAPI;

  beforeEach(() => {
    vi.clearAllMocks();
    statisticsAPI = undefined as unknown as StatisticsAPI;
    spotifyAPI = undefined as unknown as SpotifyAPI;
    fileAccessAPI = undefined as unknown as FileAccessAPI;
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
            fileAccessAPI = api as FileAccessAPI;
          }
        },
      );

      // Act
      exposeContexts();

      // Assert - check that fileAccess is defined after exposing contexts
      expect(contextBridge.exposeInMainWorld).toHaveBeenCalledWith(
        "fileAccess",
        expect.any(Object),
      );
    });
  });

  describe("StatisticsAPI", () => {
    it("should correctly map statistics API methods to IPC calls", () => {
      // Arrange
      vi.mocked(contextBridge.exposeInMainWorld).mockImplementation(
        (channel, api) => {
          if (channel === "statisticsAPI") {
            statisticsAPI = api as StatisticsAPI;
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
            spotifyAPI = api as SpotifyAPI;
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
        false,
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
            spotifyAPI = api as SpotifyAPI;
          }
        },
      );

      // Mock ipcRenderer.on to simulate the event callback
      vi.mocked(ipcRenderer.on).mockImplementation((_channel, callback) => {
        // Simulate a call to the callback
        callback({} as IpcRendererEvent, { status: "test" });
        return ipcRenderer;
      });

      // Act
      exposeContexts();

      // Test event subscription
      expect(spotifyAPI).toBeDefined();
      const unsubscribe = spotifyAPI.onMonitoringStatusChange(mockCallback);

      // Assert - Update the channel name to match implementation
      expect(ipcRenderer.on).toHaveBeenCalledWith(
        "spotify:monitoring-status",
        expect.any(Function),
      );
      expect(mockCallback).toHaveBeenCalledWith({ status: "test" });

      // Test unsubscribe
      unsubscribe();
      expect(ipcRenderer.removeListener).toHaveBeenCalledWith(
        "spotify:monitoring-status",
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
            fileAccessAPI = api as FileAccessAPI;
          }
        },
      );

      // Act
      exposeContexts();

      // Verify the API is exposed and has expected methods
      expect(contextBridge.exposeInMainWorld).toHaveBeenCalledWith(
        "fileAccess",
        expect.any(Object),
      );

      // After we've verified the API was exposed, check its methods
      // Test a sampling of methods that should be available
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
    });
  });
});
