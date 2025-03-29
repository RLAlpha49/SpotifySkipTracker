/**
 * @packageDocumentation
 * @module SkippedTrackRow
 * @description Individual Skipped Track Row Component
 *
 * Renders a single track row within the skipped tracks table, displaying comprehensive
 * track information and skip statistics with appropriate visual styling based on
 * skip frequency. Highlights tracks that exceed the configured skip threshold.
 *
 * Features:
 * - Conditional styling for tracks that exceed skip thresholds
 * - Direct link to open tracks in Spotify
 * - Color-coded skip ratio visualization
 * - Formatted relative timestamps for skip history
 * - Contextual warning indicators for tracks suggested for removal
 * - Dropdown menu with track-specific actions
 *
 * This component forms the core visual representation of each tracked song in the
 * application, combining metadata, statistics, and actionable controls in a cohesive
 * and informative row display.
 */

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SkippedTrack } from "@/types/spotify";
import {
  AlertTriangle,
  Clock,
  ExternalLink,
  MoreVertical,
  Music,
} from "lucide-react";
import React, { lazy, Suspense } from "react";
import { calculateSkipRatio, formatDate, getRecentSkipCount } from "./utils";

// Lazy load the track actions menu
const TrackActionsMenu = lazy(() => import("./TrackActionsMenu"));

/**
 * Props for the SkippedTrackRow component
 *
 * @property track - The skipped track data object to display
 * @property timeframeInDays - Analysis window in days for recent skip counting
 * @property shouldSuggestRemoval - Whether this track exceeds the skip threshold
 * @property onUnlikeTrack - Callback for removing the track from Spotify library
 * @property onRemoveTrackData - Callback for removing just the track's skip data
 */
interface SkippedTrackRowProps {
  track: SkippedTrack;
  timeframeInDays: number;
  shouldSuggestRemoval: boolean;
  onUnlikeTrack: (track: SkippedTrack) => Promise<void>;
  onRemoveTrackData: (track: SkippedTrack) => Promise<void>;
}

/**
 * Table row component for an individual skipped track
 *
 * Renders a comprehensive view of a single track's skip statistics and metadata
 * with appropriate styling based on skip frequency. Provides interactive elements
 * including a Spotify link and dropdown menu for track-specific actions.
 *
 * Visual features:
 * - Highlighted background for tracks exceeding skip threshold
 * - Warning icon for tracks suggested for removal
 * - Color-coded skip ratio visualization based on skip percentage
 * - Formatted timestamp of most recent skip event
 * - Condensed artist and track information with truncation for long names
 *
 * @param props - Component properties
 * @param props.track - Track data to display
 * @param props.timeframeInDays - Analysis window in days for recent skips
 * @param props.shouldSuggestRemoval - Whether this track exceeds the threshold
 * @param props.onUnlikeTrack - Function to handle track removal from library
 * @param props.onRemoveTrackData - Function to handle skip data deletion
 * @returns React component for a single track table row
 * @source
 */
export function SkippedTrackRow({
  track,
  timeframeInDays,
  shouldSuggestRemoval,
  onUnlikeTrack,
  onRemoveTrackData,
}: SkippedTrackRowProps) {
  const recentSkips = getRecentSkipCount(track, timeframeInDays);

  // Calculate skip percentage for styling
  const totalInteractions =
    (track.skipCount || 0) + (track.notSkippedCount || 0);
  const skipPercentage =
    totalInteractions > 0
      ? ((track.skipCount || 0) / totalInteractions) * 100
      : 0;

  // Determine cell styling based on removal suggestion
  const bgColor = shouldSuggestRemoval
    ? "bg-rose-50 dark:bg-rose-950/20 group-hover:bg-rose-100/70 dark:group-hover:bg-rose-950/30"
    : "group-hover:bg-muted/50";

  const textColor = shouldSuggestRemoval
    ? "text-rose-600 dark:text-rose-400"
    : "";

  const subTextColor = shouldSuggestRemoval
    ? "text-rose-500/70 dark:text-rose-400/70"
    : "text-muted-foreground";

  // Create Spotify URL
  const spotifyUrl = `https://open.spotify.com/track/${track.id}`;

  // Handler to open link in system browser using IPC
  const handleOpenSpotify = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.spotify.openURL(spotifyUrl);
  };

  return (
    <TableRow
      className={`group transition-colors duration-200 ${shouldSuggestRemoval ? "bg-rose-50 hover:bg-rose-100/70 dark:bg-rose-950/20 dark:hover:bg-rose-950/30" : "hover:bg-muted/50"}`}
    >
      <TableCell className={`w-full max-w-0 overflow-hidden py-3 ${bgColor}`}>
        <div className="w-full">
          <div
            className={`flex w-full items-center gap-1.5 truncate font-medium ${textColor}`}
            title={`${track.name} - Click to open in Spotify`}
          >
            <Music className="text-primary-muted h-3.5 w-3.5 flex-shrink-0" />
            <button
              className="flex flex-1 items-center gap-1 truncate text-left hover:underline"
              onClick={handleOpenSpotify}
            >
              <span className="truncate">{track.name}</span>
              <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-70" />
            </button>
            {shouldSuggestRemoval && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex-shrink-0 text-rose-500 dark:text-rose-400">
                      <AlertTriangle className="h-3.5 w-3.5" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="text-xs">
                      Frequently skipped track, suggested for removal
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <div
            className={`w-full truncate text-sm ${subTextColor}`}
            title={track.artist}
          >
            {track.artist}
          </div>
        </div>
      </TableCell>
      <TableCell className={`whitespace-nowrap text-right ${bgColor}`}>
        <span
          className={
            shouldSuggestRemoval
              ? "font-bold text-rose-600 dark:text-rose-400"
              : ""
          }
        >
          {recentSkips}
        </span>
        <span className="text-muted-foreground ml-1 text-xs">
          ({timeframeInDays}d)
        </span>
      </TableCell>
      <TableCell className={`text-right ${bgColor}`}>
        {track.skipCount}
      </TableCell>
      <TableCell className={`text-right ${bgColor}`}>
        {track.notSkippedCount}
      </TableCell>
      <TableCell className={`text-right ${bgColor}`}>
        <div className="flex items-center justify-end gap-1">
          <span
            className={
              skipPercentage > 70
                ? "text-rose-500"
                : skipPercentage > 40
                  ? "text-amber-500"
                  : ""
            }
          >
            {calculateSkipRatio(track)}
          </span>
        </div>
      </TableCell>
      <TableCell className={`whitespace-nowrap text-right ${bgColor}`}>
        <div className="text-muted-foreground flex items-center justify-end gap-1">
          <Clock className="h-3.5 w-3.5" />
          {formatDate(track)}
        </div>
      </TableCell>
      <TableCell className={`text-right ${bgColor}`}>
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <Suspense fallback={null}>
              <TrackActionsMenu
                track={track}
                onUnlikeTrack={onUnlikeTrack}
                onRemoveTrackData={onRemoveTrackData}
              />
            </Suspense>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
}
