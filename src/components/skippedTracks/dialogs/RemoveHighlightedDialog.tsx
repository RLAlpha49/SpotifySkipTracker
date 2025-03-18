import React from "react";
import { AlertTriangle } from "lucide-react";
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
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Remove All Highlighted Tracks
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will remove {tracksToRemove} tracks from your Spotify library
            and tracking data. These tracks have been skipped {skipThreshold} or
            more times within the last {timeframeInDays} days.
            <p className="mt-2 font-medium">This action cannot be undone.</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700"
          >
            Remove Tracks
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
