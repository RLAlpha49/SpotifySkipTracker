import React from "react";
import { SkippedTrack } from "@/types/spotify";
import { Trash2, XCircle, ExternalLink } from "lucide-react";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  // Create Spotify URL
  const spotifyUrl = `https://open.spotify.com/track/${track.id}`;

  // Handler to open link in system browser using IPC
  const handleOpenInSpotify = (e: React.MouseEvent) => {
    e.preventDefault();
    // Use the app's IPC bridge to open URLs in default browser
    window.spotify.openURL(spotifyUrl);
  };

  return (
    <DropdownMenuContent align="end">
      <DropdownMenuItem
        onClick={handleOpenInSpotify}
        className="text-primary hover:text-primary/80 cursor-pointer"
      >
        <ExternalLink className="mr-2 h-4 w-4" />
        <span>Open in Spotify</span>
      </DropdownMenuItem>

      <DropdownMenuSeparator />

      <DropdownMenuItem
        onClick={() => onUnlikeTrack(track)}
        className="cursor-pointer text-rose-600 hover:text-rose-800 dark:text-rose-400 hover:dark:text-rose-300"
      >
        <Trash2 className="mr-2 h-4 w-4" />
        <span>Remove from library</span>
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => onRemoveTrackData(track)}
        className="cursor-pointer text-amber-600 hover:text-amber-800 dark:text-amber-400 hover:dark:text-amber-300"
      >
        <XCircle className="mr-2 h-4 w-4" />
        <span>Remove tracking data</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}
