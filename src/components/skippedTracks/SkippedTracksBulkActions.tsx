import React, { lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { TrashIcon, MinusCircleIcon } from "lucide-react";
import { SkippedTrack } from "@/types/spotify";
import { shouldSuggestRemoval } from "./utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Lazy load the dialogs
const ClearDataDialog = lazy(() => import("./dialogs/ClearDataDialog"));
const RemoveHighlightedDialog = lazy(
  () => import("./dialogs/RemoveHighlightedDialog"),
);

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
    <div className="mb-4 flex justify-end gap-2">
      {/* Clear All Skipped Data Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={loading || tracks.length === 0}
              className="flex items-center gap-1 border-yellow-300 text-yellow-600 hover:text-yellow-800"
              onClick={() => setShowClearDataDialog(true)}
            >
              <TrashIcon className="h-4 w-4" />
              <span>Clear All Skipped Data</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              Delete all skip statistics while keeping your tracks in Spotify
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
              className="flex items-center gap-1 border-red-300 text-red-600 hover:text-red-800"
              onClick={() => setShowRemoveHighlightedDialog(true)}
            >
              <MinusCircleIcon className="h-4 w-4" />
              <span>Remove All Highlighted</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              Remove all frequently-skipped tracks (highlighted rows) from your
              Spotify library
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

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
    </div>
  );
}
