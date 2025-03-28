/**
 * Recent Skipped Tracks component
 *
 * Displays a list of recently skipped tracks with basic information and metrics.
 */

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "@tanstack/react-router";
import { Music, SkipForward } from "lucide-react";
import React from "react";

interface TrackData {
  id: string;
  name: string;
  artist: string;
  album: string;
  timestamp: string;
  skipPercentage: number;
  skipCount: number;
}

interface RecentTracksProps {
  isLoading?: boolean;
  tracks?: TrackData[];
  maxItems?: number;
}

/**
 * Component to display recently skipped tracks in a table format
 *
 * @param props - Component props
 * @returns Recent tracks component
 */
export function RecentTracks({
  isLoading = false,
  tracks = [],
  maxItems = 5,
}: RecentTracksProps) {
  // Generate skeleton rows for loading state
  const skeletonRows = Array(maxItems)
    .fill(0)
    .map((_, index) => (
      <TableRow key={`skeleton-${index}`}>
        <TableCell>
          <Skeleton className="h-6 w-6 rounded-full" />
        </TableCell>
        <TableCell>
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-24" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-32" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-16" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-16" />
        </TableCell>
      </TableRow>
    ));

  // Format timestamp to relative time (e.g., "2 hours ago")
  const formatRelativeTime = (dateString: string) => {
    if (!dateString) return "Unknown";

    try {
      const date = new Date(dateString);
      const now = new Date();

      // Validate date
      if (isNaN(date.getTime())) {
        console.error("Invalid date format:", dateString);
        return "Invalid date";
      }

      const diffMs = now.getTime() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);

      if (diffDay > 0) {
        return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
      } else if (diffHour > 0) {
        return `${diffHour} hour${diffHour > 1 ? "s" : ""} ago`;
      } else if (diffMin > 0) {
        return `${diffMin} minute${diffMin > 1 ? "s" : ""} ago`;
      } else if (diffSec >= 0) {
        return "Just now";
      } else {
        // Handle future dates or time inconsistencies
        return "Just now";
      }
    } catch (e) {
      console.error("Error formatting date:", e);
      return "Invalid date";
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center text-xl">
              <SkipForward className="mr-2 h-5 w-5" />
              Recently Skipped Tracks
            </CardTitle>
            <CardDescription>
              The latest tracks you&apos;ve skipped during playback
            </CardDescription>
          </div>
          <Badge variant="outline" className="ml-auto">
            Last 24 hours
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead>Track</TableHead>
              <TableHead>Album</TableHead>
              <TableHead className="hidden md:table-cell">Skipped</TableHead>
              <TableHead className="text-right">Skip %</TableHead>
              <TableHead className="hidden text-right md:table-cell">
                Total Skips
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              skeletonRows
            ) : tracks.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-muted-foreground py-8 text-center"
                >
                  <Music className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p>No skipped tracks recorded yet</p>
                  <p className="mt-1 text-xs">
                    Skipped tracks will appear here as you listen to Spotify
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              tracks.slice(0, maxItems).map((track) => (
                <TableRow key={track.id}>
                  <TableCell>
                    <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-full">
                      <Music className="h-4 w-4" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[200px] truncate font-medium">
                      {track.name}
                    </div>
                    <div className="text-muted-foreground max-w-[200px] truncate text-sm">
                      {track.artist}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate">
                    {track.album}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {formatRelativeTime(track.timestamp)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end">
                      <div className="mr-2 w-12">
                        <Progress
                          value={track.skipPercentage}
                          className="h-2"
                        />
                      </div>
                      <span>{track.skipPercentage}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-right md:table-cell">
                    {track.skipCount}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {tracks.length > maxItems && (
          <div className="mt-4 flex justify-center">
            <Link
              to="/skipped-tracks"
              className="text-primary flex items-center text-sm hover:underline"
            >
              View all skipped tracks <SkipForward className="ml-1 h-3 w-3" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
