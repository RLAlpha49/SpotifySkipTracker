/**
 * @packageDocumentation
 * @module RemoveHighlightedDialog
 * @description Bulk Track Removal Confirmation Dialog Component
 *
 * Provides a specialized confirmation dialog for the critical operation of removing
 * multiple highlighted tracks from the user's Spotify library. This dialog is
 * designed to clearly communicate the consequences of the action and provide
 * detailed information about the affected tracks.
 *
 * Features:
 * - Clear visual warning indicators with appropriate color scheme
 * - Count of tracks that will be removed
 * - Explanation of removal criteria (skip threshold and timeframe)
 * - Details about the permanent nature of the operation
 * - Contextual information about the process duration
 * - Option to safely cancel the operation
 *
 * This component is lazy-loaded to improve initial page load performance,
 * as it's only needed when users choose to perform bulk removal operations.
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
  Music,
  SkipForward,
  Trash2,
  X,
} from "lucide-react";
import React from "react";

/**
 * Props for the RemoveHighlightedDialog component
 *
 * @property open - Whether the dialog is currently visible
 * @property onOpenChange - Callback to control dialog visibility
 * @property onConfirm - Callback function to execute when removal is confirmed
 * @property tracksToRemove - Number of tracks that will be removed
 * @property skipThreshold - The skip count threshold that triggered highlighting
 * @property timeframeInDays - The analysis timeframe in days
 */
interface RemoveHighlightedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  tracksToRemove: number;
  skipThreshold: number;
  timeframeInDays: number;
}

/**
 * Confirmation dialog for removing multiple highlighted tracks
 *
 * Renders a detailed confirmation dialog when users attempt to remove all
 * tracks that exceed the skip threshold. Provides context about the operation,
 * including how many tracks will be affected and why they were selected for removal.
 *
 * The dialog uses distinctive styling with warning colors and icons to emphasize
 * the permanent nature of the action. It displays the exact criteria that caused
 * tracks to be highlighted and provides options to proceed or cancel.
 *
 * This component is lazy-loaded to reduce initial bundle size, only appearing
 * when needed for the bulk removal operation.
 *
 * @param props - Component properties
 * @param props.open - Whether dialog is visible
 * @param props.onOpenChange - Function to control dialog visibility
 * @param props.onConfirm - Function to execute when removal is confirmed
 * @param props.tracksToRemove - Number of tracks to be removed
 * @param props.skipThreshold - Skip threshold that caused highlighting
 * @param props.timeframeInDays - Analysis timeframe in days
 * @returns React component for bulk track removal confirmation dialog
 * @source
 */
export default function RemoveHighlightedDialog({
  open,
  onOpenChange,
  onConfirm,
  tracksToRemove,
  skipThreshold,
  timeframeInDays,
}: RemoveHighlightedDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-rose-200 sm:max-w-md dark:border-rose-900/30">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="h-5 w-5" />
            <AlertDialogTitle>Remove Highlighted Tracks</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-4 pt-2">
            <div className="rounded-md border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/30 dark:bg-rose-950/30">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 font-medium text-rose-700 dark:text-rose-300">
                  <Music className="h-4 w-4" />
                  <span>Tracks to Remove: {tracksToRemove}</span>
                </div>
                <div className="rounded-full bg-rose-200 px-2 py-1 text-xs font-medium text-rose-800 dark:bg-rose-800 dark:text-rose-200">
                  Permanent Action
                </div>
              </div>

              <div className="space-y-1.5 text-sm text-rose-600 dark:text-rose-400">
                <div className="flex items-start gap-2">
                  <SkipForward className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>
                    These tracks have been skipped{" "}
                    <strong>{skipThreshold} or more times</strong> within the
                    last <strong>{timeframeInDays} days</strong>.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Trash2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>
                    This will remove these tracks from your Spotify library and
                    tracking data.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>
                    The process may take a moment to complete for multiple
                    tracks.
                  </span>
                </div>
              </div>
            </div>

            <div className="py-1 text-center">
              <p className="font-medium text-rose-600 dark:text-rose-400">
                This action cannot be undone.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-3 sm:justify-between">
          <AlertDialogCancel className="border-muted mt-0 flex items-center gap-1">
            <X className="h-4 w-4" />
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="flex items-center gap-2 bg-rose-600 text-white transition-colors hover:bg-rose-700"
          >
            <Trash2 className="h-4 w-4" />
            Remove {tracksToRemove} Tracks
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
