import React from "react";
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

interface ClearStatisticsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClear: () => void;
  clearing: boolean;
}

export function ClearStatisticsDialog({
  open,
  onOpenChange,
  onClear,
  clearing,
}: ClearStatisticsDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive">
            Clear Statistics
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p className="font-medium">
              This action is{" "}
              <span className="text-destructive font-bold">PERMANENT</span> and{" "}
              <span className="text-destructive font-bold">
                CANNOT BE UNDONE
              </span>
              .
            </p>
            <div className="bg-destructive/20 rounded-md p-3 text-sm">
              <p className="mb-2">
                All of the following data will be permanently deleted:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>All listening history and statistics</li>
                <li>Artist listening patterns and skip rates</li>
                <li>Session data and device usage information</li>
                <li>Daily, weekly, and monthly metrics</li>
                <li>Time-based analytics and trends</li>
              </ul>
            </div>
            <p>Are you sure you want to continue?</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={clearing}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onClear}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/70 transition-colors"
            disabled={clearing}
          >
            {clearing ? "Clearing..." : "I Understand, Clear All Data"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
