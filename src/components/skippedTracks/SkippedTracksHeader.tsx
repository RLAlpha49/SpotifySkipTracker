/**
 * Skipped Tracks Page Header Component
 *
 * Provides the main header section for the Skipped Tracks page with
 * contextual information about the current analysis parameters and
 * action buttons for data management and refresh operations.
 *
 * Visual elements:
 * - Page title with distinctive icon
 * - Analysis timeframe indicator with badge
 * - Threshold explanation for highlighted tracks
 * - Utility buttons with tooltips for data operations
 * - Loading state feedback during refresh operations
 *
 * This component serves as both the visual anchor for the page and
 * the primary interaction point for data operations, providing users
 * with context about the displayed data and actions they can take.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertCircle,
  Calendar,
  FolderOpen,
  RefreshCw,
  SkipForward,
} from "lucide-react";
import React from "react";

/**
 * Props for the SkippedTracksHeader component
 *
 * @property timeframeInDays - Number of days to consider for skip analysis
 * @property skipThreshold - Minimum number of skips to highlight tracks for removal
 * @property loading - Whether data is currently being loaded
 * @property onRefresh - Handler function to refresh skip data
 * @property onOpenSkipsDirectory - Handler function to open data directory
 */
interface SkippedTracksHeaderProps {
  timeframeInDays: number;
  skipThreshold: number;
  loading: boolean;
  onRefresh: () => Promise<void>;
  onOpenSkipsDirectory: () => Promise<void>;
}

/**
 * Header component for the Skipped Tracks page
 *
 * Renders a comprehensive header section with title, contextual
 * information about current analysis parameters, and action buttons.
 * Adapts its display for both desktop and mobile viewports.
 *
 * Key sections:
 * - Title area with page heading and skip icon
 * - Analysis parameters display (timeframe and threshold)
 * - Action buttons with tooltips for data operations
 * - Loading state indication during refresh
 *
 * The component communicates the current analysis configuration to users
 * while providing clear actions for data management.
 *
 * @param props - Component properties
 * @param props.timeframeInDays - Analysis window in days
 * @param props.skipThreshold - Skip count threshold for highlighting
 * @param props.loading - Whether data refresh is in progress
 * @param props.onRefresh - Function to handle data refresh
 * @param props.onOpenSkipsDirectory - Function to open data folder
 * @returns React component for page header
 */
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
              <Badge variant="outline" className="mr-0.5 ml-0.5 font-mono">
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
                className="mr-0.5 ml-0.5 font-mono text-xs"
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
