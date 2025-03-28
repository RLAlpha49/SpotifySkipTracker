/**
 * Listening Session Analysis Component
 *
 * Visualizes the user's recent listening sessions with comprehensive metrics
 * about duration, track count, and skip behavior. This component provides
 * insight into listening patterns over time through a chronological display
 * of session data.
 *
 * Features:
 * - Chronological listing of recent listening sessions
 * - Key metrics for each session (duration, tracks, skips)
 * - Today indicator for current-day sessions
 * - Time formatting for intuitive duration display
 * - Empty state handling for new users
 * - Loading skeleton for progressive content display
 *
 * This component serves as a timeline of listening activity, helping users
 * understand their music consumption patterns and identify trends in their
 * listening behavior across different sessions.
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

/**
 * Individual listening session data structure
 *
 * @property id - Unique identifier for the session
 * @property date - ISO date string when the session occurred
 * @property duration - Length of the session in minutes
 * @property trackCount - Number of tracks played during the session
 * @property skipCount - Number of tracks skipped during the session
 * @property skipPercentage - Percentage of tracks skipped (0-100)
 */
interface SessionData {
  id: string;
  date: string;
  duration: number;
  trackCount: number;
  skipCount: number;
  skipPercentage: number;
}

/**
 * Props for the SessionOverview component
 *
 * @property isLoading - Optional flag indicating if session data is being loaded
 * @property sessions - Array of listening session data objects to display
 * @property maxItems - Maximum number of sessions to display (default: 3)
 */
interface SessionOverviewProps {
  isLoading?: boolean;
  sessions?: SessionData[];
  maxItems?: number;
}

/**
 * Recent listening sessions overview component
 *
 * Displays a chronological list of the user's most recent listening sessions
 * with key metrics for each session. Provides visual indicators for today's
 * sessions and handles both loading and empty states gracefully.
 *
 * The component formats dates and durations for easy reading and provides
 * a link to the full sessions view when more sessions are available than
 * can be displayed in the limited dashboard space.
 *
 * @param props - Component properties
 * @param props.isLoading - Whether to display skeleton loading state
 * @param props.sessions - Array of session data to display
 * @param props.maxItems - Maximum number of sessions to show
 * @returns React component with recent sessions overview
 */
export function SessionOverview({
  isLoading = false,
  sessions = [],
  maxItems = 3,
}: SessionOverviewProps) {
  /**
   * Formats ISO date string to user-friendly display format
   *
   * Converts raw date strings to a readable format showing
   * weekday, month, and day (e.g., "Mon, Jan 15").
   *
   * @param dateString - ISO date string to format
   * @returns Formatted date string for display
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  /**
   * Converts minutes to human-readable duration format
   *
   * Formats duration values appropriately based on length:
   * - Less than 60 minutes: "X min"
   * - 60 minutes or more: "Xh Ym"
   *
   * @param minutes - Duration in minutes
   * @returns Formatted duration string
   */
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
