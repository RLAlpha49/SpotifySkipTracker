import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrashIcon, MinusCircleIcon } from "lucide-react";
import { SkippedTrack } from "@/types/spotify";
import { shouldSuggestRemoval } from "./utils";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
      {/* Clear All Skipped Data with AlertDialog */}
      <AlertDialog
        open={showClearDataDialog}
        onOpenChange={setShowClearDataDialog}
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loading || tracks.length === 0}
                  className="flex items-center gap-1 border-yellow-300 text-yellow-600 hover:text-yellow-800"
                >
                  <TrashIcon className="h-4 w-4" />
                  <span>Clear All Skipped Data</span>
                </Button>
              </AlertDialogTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                Delete all skip statistics while keeping your tracks in Spotify
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Clear All Skipped Data
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all skipped tracks data. Your tracks
              will remain in your Spotify library, but all skip statistics will
              be lost.
              <p className="mt-2 font-medium">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onClearSkippedData}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              Clear All Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove All Highlighted with AlertDialog */}
      <AlertDialog
        open={showRemoveHighlightedDialog}
        onOpenChange={setShowRemoveHighlightedDialog}
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loading || tracksToRemove.length === 0}
                  className="flex items-center gap-1 border-red-300 text-red-600 hover:text-red-800"
                >
                  <MinusCircleIcon className="h-4 w-4" />
                  <span>Remove All Highlighted</span>
                </Button>
              </AlertDialogTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                Remove all frequently-skipped tracks (highlighted rows) from
                your Spotify library
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Remove All Highlighted Tracks
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {tracksToRemove.length} tracks from your Spotify
              library and tracking data. These tracks have been skipped{" "}
              {skipThreshold} or more times within the last {timeframeInDays}{" "}
              days.
              <p className="mt-2 font-medium">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onRemoveAllHighlighted}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove Tracks
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
