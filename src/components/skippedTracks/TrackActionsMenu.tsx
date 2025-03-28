/**
 * Track-Specific Actions Dropdown Menu Component
 *
 * Provides a contextual dropdown menu with track-specific actions for managing
 * individual tracks in the skipped tracks table. This component is lazy-loaded
 * to improve initial page load performance.
 *
 * Features:
 * - Direct link to open the track in Spotify
 * - Option to remove the track from the user's Spotify library
 * - Option to remove just the track's skip tracking data
 * - Visually distinguished action types with appropriate iconography
 * - Semantic color coding for different action types
 *
 * This component encapsulates the per-track actions in a dropdown menu to
 * keep the table interface clean while providing all necessary functionality.
 */

import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { SkippedTrack } from "@/types/spotify";
import { ExternalLink, Trash2, XCircle } from "lucide-react";
import React from "react";

/**
 * Props for the TrackActionsMenu component
 *
 * @property track - The skipped track data object to act upon
 * @property onUnlikeTrack - Callback for removing the track from Spotify library
 * @property onRemoveTrackData - Callback for removing just the track's skip data
 */
interface TrackActionsMenuProps {
  track: SkippedTrack;
  onUnlikeTrack: (track: SkippedTrack) => Promise<void>;
  onRemoveTrackData: (track: SkippedTrack) => Promise<void>;
}

/**
 * Track actions dropdown menu
 *
 * Renders a dropdown menu containing actions that can be performed on a specific
 * track. Actions include opening in Spotify, removing from library, and clearing
 * tracking data. Each action is color-coded according to its impact.
 *
 * This component is extracted to enable lazy loading, reducing the initial bundle
 * size and improving page load performance. It's only loaded when a user interacts
 * with a track's menu button.
 *
 * @param props - Component properties
 * @param props.track - Track data to act upon
 * @param props.onUnlikeTrack - Function to handle track removal from library
 * @param props.onRemoveTrackData - Function to handle skip data deletion
 * @returns React component for track actions dropdown
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
