import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  WINDOW_CLOSE_CHANNEL,
  WINDOW_MAXIMIZE_CHANNEL,
  WINDOW_MINIMIZE_CHANNEL,
} from "../../../../../helpers/ipc/window/window-channels";
import { exposeWindowContext } from "../../../../../helpers/ipc/window/window-context";

// Mock Electron modules
const mockContextBridge = {
  exposeInMainWorld: vi.fn(),
};

const mockIpcRenderer = {
  invoke: vi.fn(),
};

describe("Window Context", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock window.require
    global.window = {
      ...global.window,
      require: vi.fn().mockReturnValue({
        contextBridge: mockContextBridge,
        ipcRenderer: mockIpcRenderer,
      }),
    } as any;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("exposeWindowContext", () => {
    it("should expose window controls to the renderer process", () => {
      // Act
      exposeWindowContext();

      // Assert
      expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalledTimes(1);
      expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalledWith(
        "electronWindow",
        expect.any(Object),
      );

      // Verify the exposed API object
      const exposedAPI = mockContextBridge.exposeInMainWorld.mock.calls[0][1];
      expect(exposedAPI).toHaveProperty("minimize");
      expect(exposedAPI).toHaveProperty("maximize");
      expect(exposedAPI).toHaveProperty("close");

      // Ensure they're functions
      expect(typeof exposedAPI.minimize).toBe("function");
      expect(typeof exposedAPI.maximize).toBe("function");
      expect(typeof exposedAPI.close).toBe("function");
    });

    it("should call IPC invoke with correct channels when methods are called", () => {
      // Arrange
      exposeWindowContext();
      const exposedAPI = mockContextBridge.exposeInMainWorld.mock.calls[0][1];

      // Act - Call each method
      exposedAPI.minimize();
      exposedAPI.maximize();
      exposedAPI.close();

      // Assert - Verify correct IPC channels were invoked
      expect(mockIpcRenderer.invoke).toHaveBeenCalledTimes(3);
      expect(mockIpcRenderer.invoke).toHaveBeenNthCalledWith(
        1,
        WINDOW_MINIMIZE_CHANNEL,
      );
      expect(mockIpcRenderer.invoke).toHaveBeenNthCalledWith(
        2,
        WINDOW_MAXIMIZE_CHANNEL,
      );
      expect(mockIpcRenderer.invoke).toHaveBeenNthCalledWith(
        3,
        WINDOW_CLOSE_CHANNEL,
      );
    });
  });
});
