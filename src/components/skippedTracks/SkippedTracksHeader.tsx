import React from "react";
import { Button } from "@/components/ui/button";
import { FolderOpen } from "lucide-react";

interface SkippedTracksHeaderProps {
  timeframeInDays: number;
  skipThreshold: number;
  loading: boolean;
  onRefresh: () => Promise<void>;
  onOpenSkipsDirectory: () => Promise<void>;
}

export function SkippedTracksHeader({
  timeframeInDays,
  skipThreshold,
  loading,
  onRefresh,
  onOpenSkipsDirectory,
}: SkippedTracksHeaderProps) {
  return (
    <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row">
      <div className="flex-1 pr-4">
        <h1 className="text-2xl font-bold">Skipped Tracks</h1>
        <p className="text-muted-foreground text-sm text-wrap">
          Tracks you&apos;ve skipped within the last {timeframeInDays} days.
          <span className="mt-0.5 block text-xs">
            Tracks skipped {skipThreshold}+ times are highlighted for removal.
          </span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenSkipsDirectory}
          title="Open skip data folder"
          className="flex items-center gap-1"
        >
          <FolderOpen className="h-4 w-4" />
          <span>Open Skips</span>
        </Button>
        <Button onClick={onRefresh} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </Button>
      </div>
    </div>
  );
} 