import React, { lazy, Suspense } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { MoreVertical } from "lucide-react";
import { SkippedTrack } from "@/types/spotify";
import { calculateSkipRatio, formatDate, getRecentSkipCount } from "./utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

  return (
    <TableRow
      className={shouldSuggestRemoval ? "bg-red-50 dark:bg-red-950/20" : ""}
    >
      <TableCell className="w-full max-w-0 overflow-hidden">
        <div className="w-full">
          <div
            className={`w-full truncate font-medium ${
              shouldSuggestRemoval ? "text-red-600 dark:text-red-400" : ""
            }`}
            title={track.name}
          >
            {track.name}
            {shouldSuggestRemoval && " 🗑️"}
          </div>
          <div
            className="text-muted-foreground w-full truncate text-sm"
            title={track.artist}
          >
            {track.artist}
          </div>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <span
          className={
            shouldSuggestRemoval
              ? "font-bold text-red-600 dark:text-red-400"
              : ""
          }
        >
          {recentSkips}
        </span>
      </TableCell>
      <TableCell className="text-right">{track.skipCount}</TableCell>
      <TableCell className="text-right">{track.notSkippedCount}</TableCell>
      <TableCell className="text-right">{calculateSkipRatio(track)}</TableCell>
      <TableCell className="text-right">{formatDate(track)}</TableCell>
      <TableCell className="text-right">
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
