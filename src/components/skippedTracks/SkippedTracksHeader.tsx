import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FolderOpen,
  RefreshCw,
  SkipForward,
  AlertCircle,
  Calendar,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
    <div className="bg-card mb-6 flex flex-col justify-between gap-4 rounded-lg border p-4 shadow-sm sm:flex-row sm:items-center">
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <SkipForward className="h-5 w-5 text-rose-500" />
          <h1 className="text-2xl font-bold">Skipped Tracks</h1>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            <span>
              Tracks you&apos;ve skipped within the last{" "}
              <Badge variant="outline" className="ml-0.5 mr-0.5 font-mono">
                {timeframeInDays}
              </Badge>{" "}
              days
            </span>
          </p>
          <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
            <span>
              Tracks skipped{" "}
              <Badge
                variant="outline"
                className="ml-0.5 mr-0.5 font-mono text-xs"
              >
                {skipThreshold}+
              </Badge>{" "}
              times are highlighted for removal
            </span>
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenSkipsDirectory}
                className="border-muted-foreground/20 hover:bg-muted flex items-center gap-1 transition-colors duration-200"
              >
                <FolderOpen className="h-4 w-4 text-amber-500" />
                <span>Open Skips</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Open the folder containing skip tracking data files</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onRefresh}
                disabled={loading}
                className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1 transition-colors duration-200"
              >
                {loading ? (
                  <span className="flex items-center gap-1">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Loading...</span>
                  </span>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    <span>Refresh</span>
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Reload skip data to get the latest skip statistics</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
