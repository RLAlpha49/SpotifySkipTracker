import { ipcMain } from "electron";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  initializeStatisticsServices,
  setupStatisticsIPC,
  shutdownStatisticsServices,
} from "../../../../electron/main/statistics-setup";
import { saveLog } from "../../../../helpers/storage/store";
import {
  isSkipMetricsCollectionActive,
  startSkipMetricsCollection,
  stopSkipMetricsCollection,
  triggerManualAggregation,
} from "../../../../services/statistics/collector";

// Mock dependencies
vi.mock("electron", () => ({
  app: {
    getPath: vi.fn().mockReturnValue("/mock/user/data"),
  },
  ipcMain: {
    handle: vi.fn(),
  },
  BrowserWindow: vi.fn(),
}));

vi.mock("fs-extra", () => ({
  existsSync: vi.fn().mockReturnValue(true),
  readJsonSync: vi.fn().mockReturnValue({}),
  readFileSync: vi.fn(),
}));

vi.mock("path", () => ({
  join: vi.fn().mockImplementation((...args) => args.join("/")),
}));

vi.mock("../../../../helpers/storage/store", () => ({
  saveLog: vi.fn(),
  getSkippedTracks: vi.fn().mockResolvedValue([]),
}));

vi.mock("../../../../services/statistics/collector", () => ({
  isSkipMetricsCollectionActive: vi.fn().mockReturnValue(false),
  startSkipMetricsCollection: vi.fn().mockResolvedValue(undefined),
  stopSkipMetricsCollection: vi.fn(),
  triggerManualAggregation: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../../helpers/storage/statistics-store", () => ({
  getStatistics: vi.fn().mockResolvedValue({}),
  calculateUniqueArtistCount: vi.fn().mockResolvedValue(10),
}));

vi.mock("../../../../services/statistics/aggregator", () => ({
  aggregateArtistSkipMetrics: vi.fn().mockResolvedValue({}),
  aggregateDailySkipMetrics: vi.fn().mockResolvedValue({}),
  aggregateWeeklySkipMetrics: vi.fn().mockResolvedValue({}),
  calculateLibrarySkipStatistics: vi.fn().mockResolvedValue({}),
  analyzeTimeBasedPatterns: vi.fn().mockResolvedValue({}),
  calculateArtistInsights: vi.fn().mockResolvedValue({}),
}));

vi.mock("../../../../services/statistics/export", () => ({
  exportSkippedTracksToCSV: vi.fn().mockResolvedValue("/mock/path/export.csv"),
  exportDailyMetricsToCSV: vi.fn().mockResolvedValue("/mock/path/daily.csv"),
  exportWeeklyMetricsToCSV: vi.fn().mockResolvedValue("/mock/path/weekly.csv"),
  exportArtistMetricsToCSV: vi.fn().mockResolvedValue("/mock/path/artists.csv"),
  exportLibraryStatisticsToCSV: vi
    .fn()
    .mockResolvedValue("/mock/path/library.csv"),
  exportTimePatternsToCSV: vi.fn().mockResolvedValue("/mock/path/patterns.csv"),
  exportDetectedPatternsToCSV: vi
    .fn()
    .mockResolvedValue("/mock/path/detected.csv"),
  exportAllStatisticsToJSON: vi.fn().mockResolvedValue("/mock/path/all.json"),
  copyStatisticsToClipboard: vi.fn().mockResolvedValue(true),
}));

vi.mock("../../../../services/statistics/pattern-detector", () => ({
  detectSkipPatterns: vi.fn().mockResolvedValue([]),
}));

describe("Statistics Services Module", () => {
  let mockMainWindow: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a mock main window
    mockMainWindow = {
      webContents: {
        send: vi.fn(),
      },
      isDestroyed: vi.fn().mockReturnValue(false),
    };
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("initializeStatisticsServices", () => {
    it("should initialize statistics services successfully", async () => {
      await initializeStatisticsServices(mockMainWindow);

      expect(saveLog).toHaveBeenCalledWith(
        "Initializing statistics services",
        "INFO",
      );
      expect(startSkipMetricsCollection).toHaveBeenCalled();
      expect(saveLog).toHaveBeenCalledWith(
        "Statistics services initialized successfully",
        "INFO",
      );
    });

    it("should handle initialization errors", async () => {
      // Mock an error during initialization
      vi.mocked(startSkipMetricsCollection).mockRejectedValueOnce(
        new Error("Mock initialization error"),
      );

      await initializeStatisticsServices(mockMainWindow);

      expect(saveLog).toHaveBeenCalledWith(
        "Error initializing statistics services: Error: Mock initialization error",
        "ERROR",
      );
    });
  });

  describe("shutdownStatisticsServices", () => {
    it("should shut down statistics services successfully", () => {
      shutdownStatisticsServices();

      expect(saveLog).toHaveBeenCalledWith(
        "Shutting down statistics services",
        "INFO",
      );
      expect(stopSkipMetricsCollection).toHaveBeenCalled();
    });

    it("should handle shutdown errors", () => {
      // Mock an error during shutdown
      vi.mocked(stopSkipMetricsCollection).mockImplementationOnce(() => {
        throw new Error("Mock shutdown error");
      });

      shutdownStatisticsServices();

      expect(saveLog).toHaveBeenCalledWith(
        "Error shutting down statistics services: Error: Mock shutdown error",
        "ERROR",
      );
    });
  });

  describe("setupStatisticsIPC", () => {
    it("should register all IPC handlers", () => {
      setupStatisticsIPC(mockMainWindow);

      // Verify all expected handlers are registered
      expect(ipcMain.handle).toHaveBeenCalledWith(
        "statistics:isCollectionActive",
        expect.any(Function),
      );
      expect(ipcMain.handle).toHaveBeenCalledWith(
        "statistics:startCollection",
        expect.any(Function),
      );
      expect(ipcMain.handle).toHaveBeenCalledWith(
        "statistics:stopCollection",
        expect.any(Function),
      );
      expect(ipcMain.handle).toHaveBeenCalledWith(
        "statistics:triggerAggregation",
        expect.any(Function),
      );
      expect(ipcMain.handle).toHaveBeenCalledWith(
        "statistics:getDailySkipMetrics",
        expect.any(Function),
      );
      expect(ipcMain.handle).toHaveBeenCalledWith(
        "statistics:getWeeklySkipMetrics",
        expect.any(Function),
      );
      expect(ipcMain.handle).toHaveBeenCalledWith(
        "statistics:getArtistSkipMetrics",
        expect.any(Function),
      );
      expect(ipcMain.handle).toHaveBeenCalledWith(
        "statistics:getAll",
        expect.any(Function),
      );
    });

    it("should call the correct collector functions when handlers are invoked", async () => {
      setupStatisticsIPC(mockMainWindow);

      // Get the registered handlers
      const collectionActiveHandler = vi
        .mocked(ipcMain.handle)
        .mock.calls.find(
          (call) => call[0] === "statistics:isCollectionActive",
        )?.[1];

      const startCollectionHandler = vi
        .mocked(ipcMain.handle)
        .mock.calls.find(
          (call) => call[0] === "statistics:startCollection",
        )?.[1];

      const stopCollectionHandler = vi
        .mocked(ipcMain.handle)
        .mock.calls.find(
          (call) => call[0] === "statistics:stopCollection",
        )?.[1];

      const triggerAggregationHandler = vi
        .mocked(ipcMain.handle)
        .mock.calls.find(
          (call) => call[0] === "statistics:triggerAggregation",
        )?.[1];

      // Call each handler and verify the underlying function is called
      if (collectionActiveHandler) {
        await collectionActiveHandler({} as any);
        expect(isSkipMetricsCollectionActive).toHaveBeenCalled();
      }

      if (startCollectionHandler) {
        await startCollectionHandler({} as any, 30);
        expect(startSkipMetricsCollection).toHaveBeenCalledWith(30);
      }

      if (stopCollectionHandler) {
        await stopCollectionHandler({} as any);
        expect(stopSkipMetricsCollection).toHaveBeenCalled();
      }

      if (triggerAggregationHandler) {
        await triggerAggregationHandler({} as any);
        expect(triggerManualAggregation).toHaveBeenCalled();
      }
    });

    it("should handle errors in IPC handlers", async () => {
      // Mock an error in one of the collector functions
      vi.mocked(startSkipMetricsCollection).mockRejectedValueOnce(
        new Error("Mock collector error"),
      );

      setupStatisticsIPC(mockMainWindow);

      // Get the handler that should now throw an error
      const startCollectionHandler = vi
        .mocked(ipcMain.handle)
        .mock.calls.find(
          (call) => call[0] === "statistics:startCollection",
        )?.[1];

      if (startCollectionHandler) {
        const result = await startCollectionHandler({} as any);
        expect(result).toEqual({
          success: false,
          error: "Error: Mock collector error",
        });
        expect(saveLog).toHaveBeenCalledWith(
          "Error starting metrics collection: Error: Mock collector error",
          "ERROR",
        );
      }
    });
  });
});
