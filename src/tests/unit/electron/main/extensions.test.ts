import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installExtensions } from "../../../../electron/main/extensions";
import { saveLog } from "../../../../helpers/storage/store";

// Mock dependencies
vi.mock("../../../../helpers/storage/store", () => ({
  saveLog: vi.fn(),
}));

vi.mock("electron-devtools-installer", () => ({
  installExtension: vi.fn().mockResolvedValue("react-devtools"),
  REACT_DEVELOPER_TOOLS: "react-devtools-extension-id",
}));

describe("Development Extensions Module", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;

  beforeEach(() => {
    vi.clearAllMocks();
    console.log = vi.fn();
    console.error = vi.fn();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  it("should install extensions in development mode", async () => {
    // Set development environment
    process.env.NODE_ENV = "development";

    await installExtensions();

    // Import dependency to verify it was called with the right arguments
    const { installExtension, REACT_DEVELOPER_TOOLS } = await import(
      "electron-devtools-installer"
    );

    expect(installExtension).toHaveBeenCalledWith(REACT_DEVELOPER_TOOLS);
    expect(console.log).toHaveBeenCalledWith(
      "Extensions installed successfully: react-devtools",
    );
    expect(saveLog).toHaveBeenCalledWith(
      "Installed developer extensions: react-devtools",
      "DEBUG",
    );
  });

  it("should skip installing extensions in production mode", async () => {
    // Set production environment
    process.env.NODE_ENV = "production";

    await installExtensions();

    // Import dependency to verify it was not called
    const { installExtension } = await import("electron-devtools-installer");

    expect(installExtension).not.toHaveBeenCalled();
    expect(console.log).not.toHaveBeenCalled();
  });

  it("should handle errors when installing extensions", async () => {
    // Set development environment
    process.env.NODE_ENV = "development";

    // Mock the installExtension function to throw an error
    const { installExtension } = await import("electron-devtools-installer");
    vi.mocked(installExtension).mockRejectedValueOnce(
      new Error("Mock installation error"),
    );

    await installExtensions();

    expect(console.error).toHaveBeenCalledWith(
      "Error installing extensions:",
      expect.any(Error),
    );
    expect(saveLog).toHaveBeenCalledWith(
      "Error installing extensions: Error: Mock installation error",
      "ERROR",
    );
  });
});
