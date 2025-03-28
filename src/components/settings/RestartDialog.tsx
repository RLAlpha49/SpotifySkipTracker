/**
 * Application Restart Confirmation Dialog Component
 *
 * Provides a user interface for confirming application restart after settings
 * changes that require a restart to take effect. This dialog prompts users
 * to either restart immediately or defer the restart to a later time.
 *
 * Features:
 * - Clear explanation of why restart is necessary
 * - Option to restart immediately
 * - Option to defer restart to a later time
 * - Controlled visibility through parent component
 * - Visual distinction between restart and defer actions
 *
 * This component serves as a user experience enhancement for handling
 * configuration changes that affect core application functionality which
 * cannot be applied while the application is running.
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
} from "@/components/ui/alert-dialog";
import { RefreshCw } from "lucide-react";
import React from "react";

/**
 * Props for the RestartDialog component
 *
 * @property showRestartDialog - Boolean controlling dialog visibility
 * @property setShowRestartDialog - Function to toggle dialog visibility
 * @property onRestart - Callback function to trigger application restart
 */
interface RestartDialogProps {
  showRestartDialog: boolean;
  setShowRestartDialog: (show: boolean) => void;
  onRestart: () => Promise<void>;
}

/**
 * Application restart confirmation dialog
 *
 * Renders a controlled dialog that prompts the user to either restart
 * the application immediately or defer the restart until later. The dialog
 * is shown only when settings changes require an application restart.
 *
 * The dialog explains why a restart is necessary and provides clear
 * options for the user to proceed. The restart action is visually
 * emphasized as the recommended action.
 *
 * @param props - Component properties
 * @param props.showRestartDialog - Boolean controlling dialog visibility
 * @param props.setShowRestartDialog - Function to update dialog visibility
 * @param props.onRestart - Function to execute when restart is confirmed
 * @returns React component with restart confirmation dialog
 */
export function RestartDialog({
  showRestartDialog,
  setShowRestartDialog,
  onRestart,
}: RestartDialogProps) {
  return (
    <AlertDialog open={showRestartDialog} onOpenChange={setShowRestartDialog}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center text-xl">
            <RefreshCw className="text-primary mr-2 h-5 w-5" />
            Restart Required
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            The changes you made require an application restart to take effect.
            Do you want to restart now?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel className="mt-0">Later</AlertDialogCancel>
          <AlertDialogAction
            onClick={onRestart}
            className="bg-primary hover:bg-primary/90"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Restart Now
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
