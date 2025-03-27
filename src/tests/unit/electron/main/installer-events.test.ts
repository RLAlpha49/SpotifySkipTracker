import { exec } from "child_process";
import { app } from "electron";
import path from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkForSquirrelEvents,
  handleSquirrelEvent,
} from "../../../../electron/main/installer-events";

// Mock dependencies
vi.mock("electron", () => ({
  app: {
    quit: vi.fn(),
  },
}));

vi.mock("path", () => ({
  basename: vi.fn().mockReturnValue("app.exe"),
  dirname: vi.fn().mockReturnValue("C:\\Program Files\\App"),
  resolve: vi.fn().mockReturnValue("C:\\Program Files\\Update.exe"),
}));

vi.mock("child_process", () => ({
  exec: vi.fn(),
}));

describe("Windows Installer Event Handling", () => {
  const originalPlatform = process.platform;
  const originalArgv = process.argv;
  const originalExecPath = process.execPath;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock setTimeout
    vi.useFakeTimers();

    // Define getters/setters to allow overriding readonly properties
    Object.defineProperty(process, "platform", {
      get: vi.fn().mockReturnValue("win32"),
      configurable: true,
    });

    Object.defineProperty(process, "argv", {
      get: vi.fn().mockReturnValue(["path/to/app.exe"]),
      configurable: true,
    });

    Object.defineProperty(process, "execPath", {
      get: vi.fn().mockReturnValue("C:\\Program Files\\App\\app.exe"),
      configurable: true,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.useRealTimers();

    // Reset mocked process properties
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
      configurable: true,
      writable: false,
    });

    Object.defineProperty(process, "argv", {
      value: originalArgv,
      configurable: true,
      writable: false,
    });

    Object.defineProperty(process, "execPath", {
      value: originalExecPath,
      configurable: true,
      writable: false,
    });
  });

  describe("handleSquirrelEvent", () => {
    it("should do nothing if not on Windows", () => {
      // Override platform to non-Windows
      Object.defineProperty(process, "platform", {
        get: vi.fn().mockReturnValue("darwin"),
        configurable: true,
      });

      const result = handleSquirrelEvent("--squirrel-install");

      expect(result).toBe(false);
      expect(exec).not.toHaveBeenCalled();
    });

    it("should do nothing if no command is provided", () => {
      const result = handleSquirrelEvent();

      expect(result).toBe(false);
      expect(exec).not.toHaveBeenCalled();
    });

    it("should handle install event", () => {
      const result = handleSquirrelEvent("--squirrel-install");

      expect(result).toBe(true);
      expect(path.basename).toHaveBeenCalledWith(process.execPath);
      expect(exec).toHaveBeenCalledWith(
        expect.stringContaining("--createShortcut"),
      );

      // Advance timers to verify app.quit is called
      vi.advanceTimersByTime(1000);
      expect(app.quit).toHaveBeenCalled();
    });

    it("should handle update event", () => {
      const result = handleSquirrelEvent("--squirrel-updated");

      expect(result).toBe(true);
      expect(exec).toHaveBeenCalledWith(
        expect.stringContaining("--createShortcut"),
      );

      // Advance timers to verify app.quit is called
      vi.advanceTimersByTime(1000);
      expect(app.quit).toHaveBeenCalled();
    });

    it("should handle uninstall event", () => {
      const result = handleSquirrelEvent("--squirrel-uninstall");

      expect(result).toBe(true);
      expect(exec).toHaveBeenCalledWith(
        expect.stringContaining("--removeShortcut"),
      );

      // Advance timers to verify app.quit is called
      vi.advanceTimersByTime(500);
      expect(app.quit).toHaveBeenCalled();
    });

    it("should handle obsolete event", () => {
      const result = handleSquirrelEvent("--squirrel-obsolete");

      expect(result).toBe(true);
      expect(app.quit).toHaveBeenCalled();
    });

    it("should return false for unknown commands", () => {
      const result = handleSquirrelEvent("--unknown-command");

      expect(result).toBe(false);
      expect(exec).not.toHaveBeenCalled();
      expect(app.quit).not.toHaveBeenCalled();
    });
  });

  describe("checkForSquirrelEvents", () => {
    it("should return false if not on Windows", () => {
      // Override platform to non-Windows
      Object.defineProperty(process, "platform", {
        get: vi.fn().mockReturnValue("darwin"),
        configurable: true,
      });

      const result = checkForSquirrelEvents();

      expect(result).toBe(false);
    });

    it("should call handleSquirrelEvent with command from argv", () => {
      // Mock process.argv to include a Squirrel command
      Object.defineProperty(process, "argv", {
        get: vi.fn().mockReturnValue(["path/to/app.exe", "--squirrel-install"]),
        configurable: true,
      });

      const result = checkForSquirrelEvents();

      expect(result).toBe(true);
    });

    it("should return false if no Squirrel command in argv", () => {
      // Mock process.argv without a Squirrel command
      Object.defineProperty(process, "argv", {
        get: vi.fn().mockReturnValue(["path/to/app.exe"]),
        configurable: true,
      });

      const result = checkForSquirrelEvents();

      expect(result).toBe(false);
    });
  });
});
