/**
 * Artist Summary component
 *
 * Displays statistics about artists with the most skipped tracks,
 * including a ranking and skip percentages.
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

interface ArtistData {
  id: string;
  name: string;
  skipCount: number;
  trackCount: number;
  skipPercentage: number;
}

interface ArtistSummaryProps {
  isLoading?: boolean;
  artists?: ArtistData[];
  maxItems?: number;
}

/**
 * Component to display artist statistics with skip patterns
 *
 * @param props - Component props
 * @returns Artist summary component
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
