import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  THEME_MODE_CURRENT_CHANNEL,
  THEME_MODE_DARK_CHANNEL,
  THEME_MODE_LIGHT_CHANNEL,
  THEME_MODE_SYSTEM_CHANNEL,
  THEME_MODE_TOGGLE_CHANNEL,
} from "../../../../../helpers/ipc/theme/theme-channels";
import { exposeThemeContext } from "../../../../../helpers/ipc/theme/theme-context";

// Mock Electron modules
const mockIpcRenderer = {
  invoke: vi.fn(),
};

const mockContextBridge = {
  exposeInMainWorld: vi.fn(),
};

// Mock window.require to return mocked electron modules
// The problem is that vi.stubGlobal doesn't properly set up the require function 
// Let's make sure the require function is correctly mocked
vi.stubGlobal("window", {
  require: vi.fn(() => ({
    contextBridge: mockContextBridge,
    ipcRenderer: mockIpcRenderer,
  })),
});

describe("Theme Context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should expose theme control methods to the renderer process", () => {
    // Act
    exposeThemeContext();

    // Assert
    expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalledTimes(1);
    expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalledWith(
      "themeMode",
      expect.objectContaining({
        current: expect.any(Function),
        toggle: expect.any(Function),
        dark: expect.any(Function),
        light: expect.any(Function),
        system: expect.any(Function),
      }),
    );
  });

  it("should invoke the correct IPC channels when theme methods are called", () => {
    // Arrange
    exposeThemeContext();

    // Get the exposed methods
    const exposedMethods = mockContextBridge.exposeInMainWorld.mock.calls[0][1];

    // Act - call each theme method
    exposedMethods.current();
    exposedMethods.toggle();
    exposedMethods.dark();
    exposedMethods.light();
    exposedMethods.system();

    // Assert
    expect(mockIpcRenderer.invoke).toHaveBeenCalledTimes(5);
    expect(mockIpcRenderer.invoke).toHaveBeenNthCalledWith(
      1,
      THEME_MODE_CURRENT_CHANNEL,
    );
    expect(mockIpcRenderer.invoke).toHaveBeenNthCalledWith(
      2,
      THEME_MODE_TOGGLE_CHANNEL,
    );
    expect(mockIpcRenderer.invoke).toHaveBeenNthCalledWith(
      3,
      THEME_MODE_DARK_CHANNEL,
    );
    expect(mockIpcRenderer.invoke).toHaveBeenNthCalledWith(
      4,
      THEME_MODE_LIGHT_CHANNEL,
    );
    expect(mockIpcRenderer.invoke).toHaveBeenNthCalledWith(
      5,
      THEME_MODE_SYSTEM_CHANNEL,
    );
  });
});
