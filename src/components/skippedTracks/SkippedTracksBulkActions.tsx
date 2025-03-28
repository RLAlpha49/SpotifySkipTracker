/**
 * Skipped Tracks Bulk Action Controls Component
 *
 * Provides centralized controls for performing batch operations on skipped tracks,
 * including options to clear tracking data or remove multiple tracks at once.
 * This component serves as the command center for efficient library maintenance.
 *
 * Features:
 * - Summary counts of tracked tracks and highlighted tracks
 * - Bulk clear data functionality with confirmation dialog
 * - Bulk remove functionality for tracks exceeding skip thresholds
 * - Contextual button styling and state management
 * - Lazy-loaded confirmation dialogs for destructive actions
 * - Detailed tooltips explaining each action's consequences
 *
 * This component enables efficient library management by providing batch operations
 * for frequently skipped tracks, improving workflow efficiency compared to
 * individual track operations.
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SkippedTrack } from "@/types/spotify";
import { AlertTriangle, XCircle } from "lucide-react";
import React, { lazy, Suspense } from "react";
import { shouldSuggestRemoval } from "./utils";

// Lazy load the dialogs
const ClearDataDialog = lazy(() => import("./dialogs/ClearDataDialog"));
const RemoveHighlightedDialog = lazy(
  () => import("./dialogs/RemoveHighlightedDialog"),
);

/**
 * Props for the SkippedTracksBulkActions component
 *
 * @property loading - Whether data operations are currently in progress
 * @property tracks - Array of skipped track data objects to analyze
 * @property skipThreshold - Minimum number of skips to highlight tracks for removal
 * @property timeframeInDays - Number of days to consider for skip analysis
 * @property showClearDataDialog - Whether the clear data confirmation dialog is visible
 * @property setShowClearDataDialog - Callback to control clear data dialog visibility
 * @property showRemoveHighlightedDialog - Whether the remove dialog is visible
 * @property setShowRemoveHighlightedDialog - Callback to control remove dialog visibility
 * @property onClearSkippedData - Callback function to execute data clearing
 * @property onRemoveAllHighlighted - Callback function to execute highlighted track removal
 */
interface SkippedTracksBulkActionsProps {
  loading: boolean;
  tracks: SkippedTrack[];
  skipThreshold: number;
  timeframeInDays: number;
  showClearDataDialog: boolean;
  setShowClearDataDialog: (show: boolean) => void;
  showRemoveHighlightedDialog: boolean;
  setShowRemoveHighlightedDialog: (show: boolean) => void;
  onClearSkippedData: () => Promise<void>;
  onRemoveAllHighlighted: () => Promise<void>;
}

/**
 * Bulk action controls for skipped tracks management
 *
 * Renders a card with summary information about tracked tracks and provides
 * action buttons for bulk operations. Includes dynamically-loaded confirmation
 * dialogs for destructive operations with appropriate safety mechanisms.
 *
 * The component displays:
 * - Summary of total tracks being tracked
 * - Count of tracks highlighted for removal
 * - Button to clear all skip statistics while keeping tracks
 * - Button to remove all highlighted tracks from library
 * - Confirmation dialogs for destructive actions
 *
 * @param props - Component properties
 * @param props.loading - Whether operations are in progress
 * @param props.tracks - Array of tracked tracks
 * @param props.skipThreshold - Skip threshold for highlighting
 * @param props.timeframeInDays - Analysis window in days
 * @param props.showClearDataDialog - Clear data dialog visibility state
 * @param props.setShowClearDataDialog - Function to toggle clear data dialog
 * @param props.showRemoveHighlightedDialog - Remove dialog visibility state
 * @param props.setShowRemoveHighlightedDialog - Function to toggle remove dialog
 * @param props.onClearSkippedData - Function to handle clearing all data
 * @param props.onRemoveAllHighlighted - Function to handle removing all highlighted tracks
 * @returns React component for bulk action controls
 */
export function SkippedTracksBulkActions({
  loading,
  tracks,
  skipThreshold,
  timeframeInDays,
  showClearDataDialog,
  setShowClearDataDialog,
  showRemoveHighlightedDialog,
  setShowRemoveHighlightedDialog,
  onClearSkippedData,
  onRemoveAllHighlighted,
}: SkippedTracksBulkActionsProps) {
  const tracksToRemove = tracks.filter((track) =>
    shouldSuggestRemoval(track, skipThreshold, timeframeInDays),
  );

  return (
    <Card className="border-muted mb-4 border">
      <CardContent className="p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-muted-foreground text-sm">
            <span className="font-medium">{tracks.length}</span> tracks tracked
            {tracksToRemove.length > 0 && (
              <span className="ml-2 text-rose-500">
                (<span className="font-medium">{tracksToRemove.length}</span>{" "}
                highlighted for removal)
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Clear All Skipped Data Button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loading || tracks.length === 0}
                    className="flex items-center gap-1.5 border-yellow-200 text-amber-600 transition-colors hover:bg-amber-50 hover:text-amber-700 dark:border-yellow-900 dark:text-amber-500 dark:hover:bg-amber-950/50"
                    onClick={() => setShowClearDataDialog(true)}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Clear Skip Data</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">
                    Delete all skip statistics while keeping your tracks in
                    Spotify
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Remove All Highlighted Button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loading || tracksToRemove.length === 0}
                    className="flex items-center gap-1.5 border-rose-200 bg-rose-50/50 text-rose-600 transition-colors hover:bg-rose-100 hover:text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/20 dark:text-rose-500 dark:hover:bg-rose-950/50"
                    onClick={() => setShowRemoveHighlightedDialog(true)}
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Remove Highlighted</span>
                    {tracksToRemove.length > 0 && (
                      <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-200 px-1 text-xs font-semibold text-rose-700 dark:bg-rose-800 dark:text-rose-200">
                        {tracksToRemove.length}
                      </span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">
                    Remove all frequently-skipped tracks (highlighted rows) from
                    your Spotify library
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardContent>

      {/* Lazy load the dialogs only when needed */}
      {showClearDataDialog && (
        <Suspense fallback={null}>
          <ClearDataDialog
            open={showClearDataDialog}
            onOpenChange={setShowClearDataDialog}
            onConfirm={onClearSkippedData}
          />
        </Suspense>
      )}

      {showRemoveHighlightedDialog && (
        <Suspense fallback={null}>
          <RemoveHighlightedDialog
            open={showRemoveHighlightedDialog}
            onOpenChange={setShowRemoveHighlightedDialog}
            onConfirm={onRemoveAllHighlighted}
            tracksToRemove={tracksToRemove.length}
            skipThreshold={skipThreshold}
            timeframeInDays={timeframeInDays}
          />
        </Suspense>
      )}
    </Card>
  );
}
