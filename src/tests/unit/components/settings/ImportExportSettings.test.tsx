import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ImportExportSettings } from "../../../../components/settings/ImportExportSettings";
import type { SettingsSchema } from "../../../../types/settings";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("ImportExportSettings Component", () => {
  // Define a mock settings object
  const mockSettings: Partial<SettingsSchema> = {
    clientId: "test-client-id",
    clientSecret: "test-client-secret",
    redirectUri: "test-redirect-uri",
    logLevel: "INFO",
    logLineCount: 500,
    maxLogFiles: 10,
    logRetentionDays: 30,
    skipThreshold: 3,
    timeframeInDays: 30,
    autoStartMonitoring: true,
    autoUnlike: false,
    pollingInterval: 30,
  };

  const mockImportCallback = vi.fn();
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;

  // Setup and teardown
  beforeEach(() => {
    mockImportCallback.mockReset();
    vi.mocked(toast.success).mockReset();
    vi.mocked(toast.error).mockReset();

    // Save original URL methods
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;

    // Mock URL methods
    URL.createObjectURL = vi.fn().mockReturnValue("blob:test-url");
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.resetAllMocks();

    // Restore URL methods
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it("renders export and import buttons", () => {
    const { container } = render(
      <ImportExportSettings
        currentSettings={mockSettings as SettingsSchema}
        onImport={mockImportCallback}
      />,
    );

    // Check for export and import sections
    const exportHeading = screen.getByText("Export Settings", {
      selector: "h3",
    });
    expect(exportHeading).toBeInTheDocument();

    const importHeading = screen.getByText("Import Settings", {
      selector: "h3",
    });
    expect(importHeading).toBeInTheDocument();

    // Check for buttons using the DOM directly
    const exportButton = container.querySelector(
      'button:has([class*="lucide-download"])',
    );
    expect(exportButton).not.toBeNull();
    expect(exportButton?.textContent).toMatch(/Export Settings/);

    const importButton = container.querySelector(
      'button:has([class*="lucide-upload"])',
    );
    expect(importButton).not.toBeNull();
    expect(importButton?.textContent).toMatch(/Import Settings/);
  });

  it("shows success message when export button is clicked", () => {
    const { container } = render(
      <ImportExportSettings
        currentSettings={mockSettings as SettingsSchema}
        onImport={mockImportCallback}
      />,
    );

    // Find export button directly using a CSS selector
    const exportButton = container.querySelector(
      'button:has([class*="lucide-download"])',
    );
    expect(exportButton).not.toBeNull();

    // Click the export button using fireEvent
    if (exportButton) {
      fireEvent.click(exportButton);
    }

    // Check if toast success was called with the correct parameters
    expect(toast.success).toHaveBeenCalledWith("Settings exported", {
      description: "Your settings have been exported successfully.",
    });
  });

  it("has a hidden file input for importing settings", () => {
    const { container } = render(
      <ImportExportSettings
        currentSettings={mockSettings as SettingsSchema}
        onImport={mockImportCallback}
      />,
    );

    // Check that there is a hidden file input
    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).not.toBeNull();
    expect(fileInput?.classList.contains("hidden")).toBe(true);
  });
});
