import React from "react";
import { SkippedTrack } from "@/types/spotify";
import { Trash2, XCircle } from "lucide-react";
import {
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

interface TrackActionsMenuProps {
  track: SkippedTrack;
  onUnlikeTrack: (track: SkippedTrack) => Promise<void>;
  onRemoveTrackData: (track: SkippedTrack) => Promise<void>;
}

/**
 * Track actions dropdown menu
 *
 * Extracted into a separate component to enable lazy loading
 */
export default function TrackActionsMenu({
  track,
  onUnlikeTrack,
  onRemoveTrackData,
}: TrackActionsMenuProps) {
  return (
    <DropdownMenuContent align="end">
      <DropdownMenuItem
        onClick={() => onUnlikeTrack(track)}
        className="cursor-pointer text-red-600 hover:text-red-800 dark:text-red-400 hover:dark:text-red-300"
      >
        <Trash2 className="mr-2 h-4 w-4" />
        <span>Remove from library</span>
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => onRemoveTrackData(track)}
        className="cursor-pointer text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 hover:dark:text-yellow-300"
      >
        <XCircle className="mr-2 h-4 w-4" />
        <span>Remove tracking data</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}
