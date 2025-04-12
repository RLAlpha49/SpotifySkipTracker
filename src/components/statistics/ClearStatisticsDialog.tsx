/**
 * @packageDocumentation
 * @module ClearStatisticsDialog
 * @description Statistics Data Clear Confirmation Dialog
 *
 * Provides a comprehensive warning and confirmation interface before
 * permanently deleting all statistics data. This component ensures
 * users fully understand the consequences of clearing their data through
 * clear visual cues and explicit descriptions of affected data.
 *
 * Features:
 * - Prominent warning design with danger color palette
 * - Explicit listing of all data types that will be affected
 * - Permanent action warning with visual emphasis
 * - Loading state during data clearing operation
 * - Confirmation requirements to prevent accidental data loss
 * - Ability to safely cancel the operation
 *
 * This dialog serves as a critical safety mechanism to prevent accidental
 * loss of valuable usage data and analytics, requiring deliberate user
 * confirmation before proceeding with destructive data operations.
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
import {
  AlertTriangle,
  Clock,
  Database,
  History,
  InfoIcon,
  Shield,
  Trash2,
  X,
} from "lucide-react";
import React from "react";

/**
 * Props for the ClearStatisticsDialog component
 *
 * @property open - Whether the dialog is currently visible
 * @property onOpenChange - Callback to control dialog visibility
 * @property onClear - Callback function to execute when clearing is confirmed
 * @property clearing - Whether the clearing operation is currently in progress
 */
interface ClearStatisticsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClear: () => void;
  clearing: boolean;
}

/**
 * Confirmation dialog for clearing all statistics data
 *
 * Renders a detailed warning dialog when users attempt to clear their
 * statistics data. Provides comprehensive information about what data
 * will be affected and requires explicit confirmation due to the
 * permanent nature of the action.
 *
 * The dialog uses distinctive destructive styling with warning colors
 * and icons to emphasize the irreversible nature of the operation.
 * It displays a detailed list of data categories that will be removed
 * and supports a loading state during the clearing process.
 *
 * @param props - Component properties
 * @param props.open - Whether dialog is visible
 * @param props.onOpenChange - Function to control dialog visibility
 * @param props.onClear - Function to execute when clearing is confirmed
 * @param props.clearing - Whether data clearing is in progress
 * @returns React component for statistics clearing confirmation dialog
 * @source
 */
export function ClearStatisticsDialog({
  open,
  onOpenChange,
  onClear,
  clearing,
}: ClearStatisticsDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-destructive/20 sm:max-w-md">
        <AlertDialogHeader className="pb-2">
          <div className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <AlertDialogTitle className="text-destructive">
              Clear Statistics
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-4 pt-2">
            <div className="border-destructive/30 bg-destructive/5 flex items-center gap-3 rounded-md border p-3">
              <div className="text-destructive shrink-0">
                <Shield className="h-5 w-5" />
              </div>
              <p className="text-destructive text-sm font-medium">
                This action is{" "}
                <span className="font-bold underline">PERMANENT</span> and{" "}
                <span className="font-bold underline">CANNOT BE UNDONE</span>
              </p>
            </div>

            <div className="border-destructive/30 bg-destructive/10 rounded-md border p-4 text-sm">
              <p className="text-destructive mb-3 flex items-center gap-2 font-medium">
                <Database className="h-4 w-4" />
                All of the following data will be permanently deleted:
              </p>
              <ul className="grid gap-2 pl-2">
                <li className="text-destructive/90 flex items-start gap-2">
                  <div className="text-destructive/70 mt-0.5">
                    <History className="h-3.5 w-3.5" />
                  </div>
                  <span>All listening history and statistics</span>
                </li>
                <li className="text-destructive/90 flex items-start gap-2">
                  <div className="text-destructive/70 mt-0.5">
                    <History className="h-3.5 w-3.5" />
                  </div>
                  <span>Artist listening patterns and skip rates</span>
                </li>
                <li className="text-destructive/90 flex items-start gap-2">
                  <div className="text-destructive/70 mt-0.5">
                    <History className="h-3.5 w-3.5" />
                  </div>
                  <span>Session data and device usage information</span>
                </li>
                <li className="text-destructive/90 flex items-start gap-2">
                  <div className="text-destructive/70 mt-0.5">
                    <History className="h-3.5 w-3.5" />
                  </div>
                  <span>Daily, weekly, and monthly metrics</span>
                </li>
                <li className="text-destructive/90 flex items-start gap-2">
                  <div className="text-destructive/70 mt-0.5">
                    <History className="h-3.5 w-3.5" />
                  </div>
                  <span>Time-based analytics and trends</span>
                </li>
              </ul>
            </div>

            <div className="flex items-start gap-2 rounded-md border border-amber-200/50 bg-amber-50/50 p-3 text-amber-800 dark:border-amber-800/30 dark:bg-amber-950/20 dark:text-amber-400">
              <div className="mt-0.5 shrink-0">
                <InfoIcon className="h-4 w-4" />
              </div>
              <p className="text-xs">
                <span className="font-medium">Important:</span> Some statistics
                are derived from skipped track data. For a complete reset, you
                should first clear your skipped tracks in the Skips tab, then
                clear statistics.
              </p>
            </div>

            <div className="pt-1 text-center">
              <p className="text-muted-foreground text-sm">
                Are you sure you want to continue?
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-3 sm:justify-between">
          <AlertDialogCancel
            disabled={clearing}
            className="border-muted mt-0 flex items-center gap-1"
          >
            <X className="h-4 w-4" />
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onClear}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 flex items-center gap-2 transition-all duration-200"
            disabled={clearing}
          >
            {clearing ? (
              <>
                <Clock className="h-4 w-4 animate-spin" />
                Clearing...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />I Understand, Clear All Data
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
