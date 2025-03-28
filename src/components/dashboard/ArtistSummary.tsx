/**
 * Artist Skip Pattern Analysis Component
 *
 * Provides insight into which artists are most frequently skipped during
 * listening sessions, visualizing skip patterns by artist to help identify
 * potential music preferences and library optimization opportunities.
 *
 * Features:
 * - Ranked list of most-skipped artists with numeric position
 * - Visual skip percentage representation with progress bars
 * - Skip count and track count for quantitative context
 * - Responsive design for various dashboard positions
 * - Empty state handling for new users
 * - Loading skeleton for progressive content display
 *
 * This component helps users understand their listening preferences by
 * artist, highlighting which artists they tend to skip more frequently
 * and might be candidates for library cleanup or playlist exclusion.
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";
import React from "react";

/**
 * Artist skip pattern data structure
 *
 * @property id - Unique identifier for the artist
 * @property name - Artist or group name
 * @property skipCount - Total number of tracks skipped for this artist
 * @property trackCount - Total number of tracks played for this artist
 * @property skipPercentage - Percentage of tracks skipped (0-100)
 */
interface ArtistData {
  id: string;
  name: string;
  skipCount: number;
  trackCount: number;
  skipPercentage: number;
}

/**
 * Props for the ArtistSummary component
 *
 * @property isLoading - Optional flag indicating if artist data is being loaded
 * @property artists - Array of artist data objects with skip statistics
 * @property maxItems - Maximum number of artists to display (default: 5)
 */
interface ArtistSummaryProps {
  isLoading?: boolean;
  artists?: ArtistData[];
  maxItems?: number;
}

/**
 * Artist skip pattern visualization component
 *
 * Displays a ranked list of artists whose tracks are most frequently
 * skipped, with visual representation of skip percentages and counts.
 * The component provides insights into which artists might be less
 * preferred in the user's music library.
 *
 * The display includes:
 * - Ranking position (1-N) for quick reference
 * - Artist name with truncation for long names
 * - Skip count relative to total play count
 * - Visual progress bar representing skip percentage
 * - Numeric skip percentage for precise comparison
 * - Link to full artist statistics when applicable
 *
 * @param props - Component properties
 * @param props.isLoading - Whether skeleton loading state should display
 * @param props.artists - Array of artist data to visualize
 * @param props.maxItems - Maximum number of artists to show
 * @returns React component with artist skip pattern analysis
 */
export function ArtistSummary({
  isLoading = false,
  artists = [],
  maxItems = 5,
}: ArtistSummaryProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
          <Users className="mr-2 h-5 w-5" />
          Most Skipped Artists
        </CardTitle>
        <CardDescription>
          Artists whose tracks you skip most frequently
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array(maxItems)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-2 w-full" />
                  </div>
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
          </div>
        ) : artists.length === 0 ? (
          <div className="text-muted-foreground flex h-48 flex-col items-center justify-center">
            <Users className="mb-2 h-8 w-8 opacity-50" />
            <p>No artist data available yet</p>
            <p className="mt-1 text-xs">
              As you listen to more music, artist statistics will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {artists.slice(0, maxItems).map((artist, index) => (
              <div key={artist.id} className="flex items-center">
                <div className="mr-4 w-5 flex-shrink-0 text-center text-sm font-medium">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex justify-between">
                    <p className="truncate text-sm font-medium">
                      {artist.name}
                    </p>
                    <span className="text-muted-foreground text-sm">
                      {artist.skipCount} / {artist.trackCount}
                    </span>
                  </div>
                  <Progress value={artist.skipPercentage} className="h-2" />
                </div>
                <div className="ml-4 text-sm font-medium">
                  {artist.skipPercentage}%
                </div>
              </div>
            ))}

            {artists.length > maxItems && (
              <div className="mt-2 flex justify-center">
                <a
                  href="/statistics?tab=artists"
                  className="text-primary text-xs hover:underline"
                >
                  View all artists
                </a>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
