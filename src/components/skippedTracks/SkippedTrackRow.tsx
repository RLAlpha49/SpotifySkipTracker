import React, { lazy, Suspense } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  MoreVertical,
  Music,
  AlertTriangle,
  Clock,
  ExternalLink,
} from "lucide-react";
import { SkippedTrack } from "@/types/spotify";
import { calculateSkipRatio, formatDate, getRecentSkipCount } from "./utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Lazy load the track actions menu
const TrackActionsMenu = lazy(() => import("./TrackActionsMenu"));

interface SkippedTrackRowProps {
  track: SkippedTrack;
  timeframeInDays: number;
  shouldSuggestRemoval: boolean;
  onUnlikeTrack: (track: SkippedTrack) => Promise<void>;
  onRemoveTrackData: (track: SkippedTrack) => Promise<void>;
}

export function SkippedTrackRow({
  track,
  timeframeInDays,
  shouldSuggestRemoval,
  onUnlikeTrack,
  onRemoveTrackData,
}: SkippedTrackRowProps) {
  const recentSkips = getRecentSkipCount(track, timeframeInDays);

  // Calculate skip percentage for styling
  const totalInteractions = track.skipCount + track.notSkippedCount;
  const skipPercentage =
    totalInteractions > 0 ? (track.skipCount / totalInteractions) * 100 : 0;

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
