/**
 * Session Overview component
 *
 * Displays information about recent listening sessions with key metrics
 * such as duration, tracks played, and skips.
 */

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Calendar, Clock, Music, SkipForward } from "lucide-react";
import React from "react";

interface SessionData {
  id: string;
  date: string;
  duration: number;
  trackCount: number;
  skipCount: number;
  skipPercentage: number;
}

interface SessionOverviewProps {
  isLoading?: boolean;
  sessions?: SessionData[];
  maxItems?: number;
}

/**
 * Component to display recent listening sessions with statistics
 *
 * @param props - Component props
 * @returns Session overview component
 */
export function SessionOverview({
  isLoading = false,
  sessions = [],
  maxItems = 3,
}: SessionOverviewProps) {
  // Format date to a readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  // Format duration in minutes
  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return `${hours}h ${remainingMins}m`;
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
          <Calendar className="mr-2 h-5 w-5" />
          Recent Sessions
        </CardTitle>
        <CardDescription>
          Your latest Spotify listening sessions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-5">
            {Array(maxItems)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="space-y-2 border-b pb-4 last:border-0">
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <div className="mt-2 flex gap-4">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-muted-foreground flex h-48 flex-col items-center justify-center">
            <Calendar className="mb-2 h-8 w-8 opacity-50" />
            <p>No listening sessions yet</p>
            <p className="mt-1 text-xs">
              Session data will appear as you listen to Spotify
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.slice(0, maxItems).map((session) => (
              <div key={session.id} className="border-b pb-4 last:border-0">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="font-medium">
                      {formatDate(session.date)}
                    </span>
                    {new Date(session.date).toDateString() ===
                      new Date().toDateString() && (
                      <Badge className="ml-2" variant="outline">
                        Today
                      </Badge>
                    )}
                  </div>
                  <div className="text-muted-foreground flex items-center text-sm">
                    <Clock className="mr-1 h-3 w-3" />
                    {formatDuration(session.duration)}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="flex items-center">
                    <Music className="text-muted-foreground mr-1 h-3 w-3" />
                    <span>{session.trackCount} tracks</span>
                  </div>
                  <div className="flex items-center">
                    <SkipForward className="text-muted-foreground mr-1 h-3 w-3" />
                    <span>{session.skipCount} skips</span>
                  </div>
                  <div className="flex items-center">
                    <BarChart className="text-muted-foreground mr-1 h-3 w-3" />
                    <span>{session.skipPercentage}% skipped</span>
                  </div>
                </div>
              </div>
            ))}

            {sessions.length > maxItems && (
              <div className="flex justify-center">
                <a
                  href="/statistics?tab=sessions"
                  className="text-primary text-xs hover:underline"
                >
                  View all sessions
                </a>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
