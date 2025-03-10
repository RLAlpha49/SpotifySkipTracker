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
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Restart Required</AlertDialogTitle>
          <AlertDialogDescription>
            The changes you made require an application restart to take effect.
            Do you want to restart now?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Later</AlertDialogCancel>
          <AlertDialogAction onClick={onRestart}>Restart Now</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 