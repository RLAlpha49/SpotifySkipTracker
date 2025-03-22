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
import {
  AlertTriangle,
  Trash2,
  X,
  Shield,
  Clock,
  Database,
  History,
} from "lucide-react";

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
