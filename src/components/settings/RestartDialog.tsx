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
import { RefreshCw } from "lucide-react";

interface RestartDialogProps {
  showRestartDialog: boolean;
  setShowRestartDialog: (show: boolean) => void;
  onRestart: () => Promise<void>;
}

export function RestartDialog({
  showRestartDialog,
  setShowRestartDialog,
  onRestart,
}: RestartDialogProps) {
  return (
    <AlertDialog open={showRestartDialog} onOpenChange={setShowRestartDialog}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center text-xl">
            <RefreshCw className="text-primary mr-2 h-5 w-5" />
            Restart Required
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            The changes you made require an application restart to take effect.
            Do you want to restart now?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel className="mt-0">Later</AlertDialogCancel>
          <AlertDialogAction
            onClick={onRestart}
            className="bg-primary hover:bg-primary/90"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Restart Now
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
