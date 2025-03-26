import React from "react";
import { AlertTriangle, Database, Clock, X, XCircle } from "lucide-react";
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

interface ClearDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}

/**
 * Dialog for confirming clearing all skipped tracks data
 * Lazy loaded to reduce initial bundle size
 */
export default function ClearDataDialog({
  open,
  onOpenChange,
  onConfirm,
}: ClearDataDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-amber-200 sm:max-w-md dark:border-amber-900/30">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-5 w-5" />
            <AlertDialogTitle>Clear Skip Statistics</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-4 pt-2">
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/30 dark:bg-amber-950/30">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 font-medium text-amber-700 dark:text-amber-300">
                  <Database className="h-4 w-4" />
                  <span>All Statistics Will Be Cleared</span>
                </div>
                <div className="rounded-full bg-amber-200 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-800 dark:text-amber-200">
                  Data Only
                </div>
              </div>

              <p className="mb-2 text-sm text-amber-600 dark:text-amber-400">
                This will permanently delete all skipped tracks data. Your
                tracks will remain in your Spotify library, but all skip
                statistics will be lost.
              </p>

              <div className="space-y-2 border-t border-amber-200 pt-2 text-xs dark:border-amber-800/50">
                <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                  <Clock className="h-3.5 w-3.5" />
                  <span>This may take a moment to process</span>
                </div>
              </div>
            </div>

            <div className="py-1 text-center">
              <p className="font-medium text-amber-600 dark:text-amber-400">
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
            className="flex items-center gap-2 bg-amber-600 text-white transition-colors hover:bg-amber-700"
          >
            <XCircle className="h-4 w-4" />
            Clear All Skip Data
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
