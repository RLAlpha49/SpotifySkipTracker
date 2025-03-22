import React, { lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, XCircle } from "lucide-react";
import { SkippedTrack } from "@/types/spotify";
import { shouldSuggestRemoval } from "./utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";

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
