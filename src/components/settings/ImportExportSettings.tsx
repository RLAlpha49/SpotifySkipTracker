/**
 * @packageDocumentation
 * @module ImportExportSettings
 * @description Settings Import/Export Management Component
 *
 * Provides functionality for backing up and restoring application settings
 * through JSON file export and import. This component enables users to save
 * their configuration, transfer it between devices, or restore from backups.
 *
 * Features:
 * - Export current settings to a timestamped JSON file
 * - Import settings from previously exported JSON files
 * - Validation of imported settings data structure
 * - User feedback through toast notifications
 * - Descriptive tooltips explaining each action's purpose
 *
 * This component serves as a data management utility, allowing users to
 * preserve their configuration across devices or application reinstalls.
 * It handles file operations safely with appropriate error handling and
 * user feedback.
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SettingsSchema } from "@/types/settings";
import { Download, FileJson, HelpCircle, Upload } from "lucide-react";
import React from "react";
import { toast } from "sonner";

/**
 * Props for the ImportExportSettings component
 *
 * @property currentSettings - Current application settings object to export
 * @property onImport - Callback triggered when settings are successfully imported
 */
interface ImportExportSettingsProps {
  currentSettings: SettingsSchema;
  onImport: (settings: SettingsSchema) => void;
}

/**
 * Settings backup and restore component
 *
 * Renders a card with two main actions: exporting current settings to a file
 * and importing settings from a previously exported file. Handles all the file
 * operations, validation, and user feedback for these processes.
 *
 * The export function creates a timestamped JSON file with properly formatted
 * settings data. The import function validates incoming settings before applying
 * them to ensure data integrity.
 *
 * @param props - Component properties
 * @param props.currentSettings - Current settings configuration to export
 * @param props.onImport - Callback function invoked when settings are imported
 * @returns React component for settings backup and restore
 * @source
 */
export function ImportExportSettings({
  currentSettings,
  onImport,
}: ImportExportSettingsProps) {
  // Reference to hidden file input element
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  /**
   * Exports current settings to a JSON file
   *
   * Creates a formatted JSON file with the current settings and initiates
   * a download through the browser. The file includes a timestamp to prevent
   * accidental overwrites when exporting multiple times.
   */
  const handleExport = () => {
    try {
      // Create a JSON blob with formatted settings
      const settingsBlob = new Blob(
        [JSON.stringify(currentSettings, null, 2)],
        { type: "application/json" },
      );

      // Create download link
      const url = URL.createObjectURL(settingsBlob);
      const link = document.createElement("a");

      // Set filename with timestamp to prevent overwrites
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      link.download = `spotify-skip-tracker-settings-${timestamp}.json`;
      link.href = url;

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up URL object
      URL.revokeObjectURL(url);

      toast.success("Settings exported", {
        description: "Your settings have been exported successfully.",
      });
    } catch (error) {
      console.error("Failed to export settings:", error);
      toast.error("Export failed", {
        description: "Could not export settings. Please try again.",
      });
    }
  };

  /**
   * Handles the file selection for import
   *
   * Processes the selected JSON file, validates its structure as valid
   * settings data, and passes it to the parent component if valid.
   * Provides user feedback via toast notifications for both success
   * and failure cases.
   *
   * @param event - File input change event containing the selected file
   */
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedSettings = JSON.parse(content) as SettingsSchema;

        // Validate required fields
        if (!importedSettings) {
          throw new Error("Invalid settings file format");
        }

        // Apply imported settings
        onImport(importedSettings);

        toast.success("Settings imported", {
          description: "Your settings have been imported successfully.",
        });
      } catch (error) {
        console.error("Failed to import settings:", error);
        toast.error("Import failed", {
          description: "The selected file contains invalid settings data.",
        });
      }

      // Reset the file input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };

    reader.onerror = () => {
      toast.error("Read error", {
        description: "Failed to read the selected file.",
      });
    };

    reader.readAsText(file);
  };

  /**
   * Triggers file selection dialog
   *
   * Programmatically clicks the hidden file input element to open
   * the system file browser for selecting a settings file to import.
   */
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
      <CardHeader className="px-0 pt-0">
        <CardTitle className="mb-1 flex items-center text-xl font-semibold">
          <FileJson className="text-primary mr-2 h-5 w-5" />
          Settings Backup & Restore
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          Import and export your application settings
        </p>
      </CardHeader>

      <Card className="border-muted-foreground/20 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-medium">Export Settings</h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="text-muted-foreground h-4 w-4" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-md">
                      <p>
                        Save your current settings to a file that can be backed
                        up or transferred to another installation.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-muted-foreground mt-1 text-sm">
                Save your current configuration to a JSON file
              </p>
              <Button
                onClick={handleExport}
                variant="outline"
                className="mt-2 w-full"
              >
                <Download className="mr-2 h-4 w-4" />
                Export Settings
              </Button>
            </div>

            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-medium">Import Settings</h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="text-muted-foreground h-4 w-4" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-md">
                      <p>
                        Load settings from a previously exported file. This will
                        replace your current settings.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-muted-foreground mt-1 text-sm">
                Load a previously exported settings file
              </p>
              <Button
                onClick={handleImportClick}
                variant="outline"
                className="mt-2 w-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                Import Settings
              </Button>

              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                className="hidden"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
