import React from "react";
import {
  AlertTriangle,
  Trash2,
  X,
  SkipForward,
  Clock,
  Music,
} from "lucide-react";
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

interface RemoveHighlightedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  tracksToRemove: number;
  skipThreshold: number;
  timeframeInDays: number;
}

/**
 * Dialog for confirming removal of all highlighted tracks
 * Lazy loaded to reduce initial bundle size
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
