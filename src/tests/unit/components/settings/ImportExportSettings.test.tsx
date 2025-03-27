import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ImportExportSettings } from "../../../../components/settings/ImportExportSettings";
import { SettingsSchema } from "../../../../types/settings";

// Mock toast notifications
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("ImportExportSettings Component", () => {
  // Sample settings for testing
  const mockSettings: SettingsSchema = {
    clientId: "test-client-id",
    clientSecret: "test-client-secret",
    redirectUri: "http://localhost:3000/callback",
    fileLogLevel: "INFO",
    logLineCount: 100,
    maxLogFiles: 5,
    logRetentionDays: 30,
    skipThreshold: 3,
    timeframeInDays: 30,
    skipProgress: 70,
    autoStartMonitoring: true,
    autoUnlike: false,
  };

  // Mock function for onImport
  const mockOnImport = vi.fn();

  // Mock URL and Blob functionality
  const mockUrl = "blob:http://localhost:3000/mock-blob-url";

  // Setup URL.createObjectURL and URL.revokeObjectURL mocks
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock URL.createObjectURL
    URL.createObjectURL = vi.fn().mockReturnValue(mockUrl);
    URL.revokeObjectURL = vi.fn();

    // Mock document.createElement and related DOM manipulations
    global.document.createElement = vi.fn().mockImplementation((tagName) => {
      if (tagName === "a") {
        return {
          href: "",
          download: "",
          click: vi.fn(),
        };
      }
      return document.createElement(tagName);
    });

    document.body.appendChild = vi.fn();
    document.body.removeChild = vi.fn();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should render export and import buttons", () => {
    render(
      <ImportExportSettings
        currentSettings={mockSettings}
        onImport={mockOnImport}
      />,
    );

    // Verify export button is rendered
    expect(screen.getByText("Export Settings")).toBeInTheDocument();

    // Verify import button is rendered
    expect(screen.getByText("Import Settings")).toBeInTheDocument();
  });

  it("should export settings when export button is clicked", () => {
    const { toast } = require("sonner");

    render(
      <ImportExportSettings
        currentSettings={mockSettings}
        onImport={mockOnImport}
      />,
    );

    // Click export button
    const exportButton = screen.getByText("Export Settings");
    fireEvent.click(exportButton);

    // Verify URL.createObjectURL was called with a Blob containing the settings
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);

    // Verify document.createElement was called to create an anchor element
    expect(document.createElement).toHaveBeenCalledWith("a");

    // Verify document manipulation functions were called
    expect(document.body.appendChild).toHaveBeenCalled();
    expect(document.body.removeChild).toHaveBeenCalled();

    // Verify URL.revokeObjectURL was called to clean up
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl);

    // Verify success toast was displayed
    expect(toast.success).toHaveBeenCalledWith(
      "Settings exported",
      expect.any(Object),
    );
  });

  it("should trigger file input when import button is clicked", () => {
    render(
      <ImportExportSettings
        currentSettings={mockSettings}
        onImport={mockOnImport}
      />,
    );

    // Mock the file input reference
    const fileInput = screen.getByAcceptingFilesOfType(
      ".json",
    ) as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, "click");

    // Click import button
    const importButton = screen.getByText("Import Settings");
    fireEvent.click(importButton);

    // Verify that click was called on the file input
    expect(clickSpy).toHaveBeenCalled();
  });

  it("should import settings from selected file", () => {
    const { toast } = require("sonner");

    render(
      <ImportExportSettings
        currentSettings={mockSettings}
        onImport={mockOnImport}
      />,
    );

    // Get file input
    const fileInput = screen.getByAcceptingFilesOfType(
      ".json",
    ) as HTMLInputElement;

    // Create a mock file and event
    const mockFile = new File(
      [JSON.stringify(mockSettings)],
      "test-settings.json",
      { type: "application/json" },
    );

    // Mock FileReader
    const mockFileReader = {
      onload: null as any,
      onerror: null as any,
      readAsText: vi.fn().mockImplementation(function (this: any) {
        // Call onload with mock result
        setTimeout(() => {
          this.onload({
            target: {
              result: JSON.stringify(mockSettings),
            },
          });
        }, 0);
      }),
    };

    global.FileReader = vi.fn().mockImplementation(() => mockFileReader) as any;

    // Trigger file change event
    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    // Check that readAsText was called with the file
    expect(mockFileReader.readAsText).toHaveBeenCalledWith(mockFile);

    // Use setTimeout to wait for FileReader.onload to be called
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        // Verify onImport was called with the parsed settings
        expect(mockOnImport).toHaveBeenCalledWith(mockSettings);

        // Verify success toast was displayed
        expect(toast.success).toHaveBeenCalledWith(
          "Settings imported",
          expect.any(Object),
        );

        resolve();
      }, 10);
    });
  });

  it("should handle import errors", () => {
    const { toast } = require("sonner");

    render(
      <ImportExportSettings
        currentSettings={mockSettings}
        onImport={mockOnImport}
      />,
    );

    // Get file input
    const fileInput = screen.getByAcceptingFilesOfType(
      ".json",
    ) as HTMLInputElement;

    // Create a mock file with invalid JSON
    const mockFile = new File(["invalid-json"], "invalid-settings.json", {
      type: "application/json",
    });

    // Mock FileReader
    const mockFileReader = {
      onload: null as any,
      onerror: null as any,
      readAsText: vi.fn().mockImplementation(function (this: any) {
        // Call onload with mock result
        setTimeout(() => {
          this.onload({
            target: {
              result: "invalid-json",
            },
          });
        }, 0);
      }),
    };

    global.FileReader = vi.fn().mockImplementation(() => mockFileReader) as any;

    // Trigger file change event
    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    // Use setTimeout to wait for FileReader.onload to be called
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        // Verify onImport was not called
        expect(mockOnImport).not.toHaveBeenCalled();

        // Verify error toast was displayed
        expect(toast.error).toHaveBeenCalledWith(
          "Import failed",
          expect.any(Object),
        );

        resolve();
      }, 10);
    });
  });

  it("should handle FileReader error events", () => {
    const { toast } = require("sonner");

    render(
      <ImportExportSettings
        currentSettings={mockSettings}
        onImport={mockOnImport}
      />,
    );

    // Get file input
    const fileInput = screen.getByAcceptingFilesOfType(
      ".json",
    ) as HTMLInputElement;

    // Create a mock file
    const mockFile = new File(
      [JSON.stringify(mockSettings)],
      "test-settings.json",
      { type: "application/json" },
    );

    // Mock FileReader with error
    const mockFileReader = {
      onload: null as any,
      onerror: null as any,
      readAsText: vi.fn().mockImplementation(function (this: any) {
        // Trigger onerror instead of onload
        setTimeout(() => {
          this.onerror();
        }, 0);
      }),
    };

    global.FileReader = vi.fn().mockImplementation(() => mockFileReader) as any;

    // Trigger file change event
    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    // Use setTimeout to wait for FileReader.onerror to be called
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        // Verify error toast was displayed
        expect(toast.error).toHaveBeenCalledWith(
          "Read error",
          expect.any(Object),
        );

        resolve();
      }, 10);
    });
  });
});
