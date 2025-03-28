/**
 * Settings Reset Confirmation Dialog Component
 *
 * Provides a confirmation interface before resetting application settings
 * to their default values. This component ensures users do not accidentally
 * reset their configuration by requiring explicit confirmation through an
 * alert dialog.
 *
 * Features:
 * - Clear warning about the irreversible nature of the action
 * - Two-step confirmation process (button click + dialog confirmation)
 * - Visually distinctive styling for the destructive action
 * - Cancel option to safely abort the reset operation
 *
 * This component serves as a safety mechanism for the potentially destructive
 * action of resetting all user configuration to default values.
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import React from "react";

/**
 * Props for the ResetSettingsDialog component
 *
 * @property onReset - Callback function triggered when reset is confirmed
 */
interface ResetSettingsDialogProps {
  onReset: () => void;
}

/**
 * Settings reset confirmation dialog
 *
 * Renders a button that, when clicked, opens a confirmation dialog
 * warning the user about the consequences of resetting settings.
 * The dialog provides options to cancel or confirm the action.
 *
 * The primary button is styled with destructive styling to indicate
 * the potentially harmful nature of the action.
 *
 * @param props - Component properties
 * @param props.onReset - Function to call when reset is confirmed
 * @returns React component with reset button and confirmation dialog
 */
export function ResetSettingsDialog({ onReset }: ResetSettingsDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="w-full">
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset to Defaults
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset Settings</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to reset all settings to their default values?
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onReset}>
            Reset Settings
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
