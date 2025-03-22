import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioTower, Activity, PlayCircle, StopCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PlaybackMonitoringCardProps {
  isAuthenticated: boolean;
  isMonitoring: boolean;
  onStartMonitoring: () => Promise<void>;
  onStopMonitoring: () => Promise<void>;
}

export function PlaybackMonitoringCard({
  isAuthenticated,
  isMonitoring,
  onStartMonitoring,
  onStopMonitoring,
}: PlaybackMonitoringCardProps) {
  return (
    <Card className="border-muted-foreground/20 h-full shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center text-xl font-semibold">
          <RadioTower className="text-primary mr-2 h-5 w-5" />
          Playback Monitoring
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        {isAuthenticated ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {isMonitoring ? (
                  <Activity className="h-5 w-5 animate-pulse text-green-600 dark:text-green-400" />
                ) : (
                  <StopCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                )}
                <span
                  className={
                    isMonitoring
                      ? "font-medium text-green-600 dark:text-green-400"
                      : "font-medium text-red-600 dark:text-red-400"
                  }
                >
                  {isMonitoring ? "Monitoring Active" : "Monitoring Inactive"}
                </span>
              </div>

              <Badge
                variant="outline"
                className={
                  isMonitoring
                    ? "border-green-200 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400"
                    : "border-red-200 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
                }
              >
                {isMonitoring ? "Active" : "Inactive"}
              </Badge>
            </div>

            <p className="text-muted-foreground text-sm">
              {isMonitoring
                ? "Monitoring is active. Skipped tracks are being detected and recorded."
                : "Monitoring is inactive. Start monitoring to detect skipped tracks."}
            </p>

            {isMonitoring ? (
              <Button
                variant="outline"
                onClick={onStopMonitoring}
                disabled={!isAuthenticated}
                className="w-full"
              >
                <StopCircle className="mr-2 h-4 w-4" />
                Stop Monitoring
              </Button>
            ) : (
              <Button
                onClick={onStartMonitoring}
                disabled={!isAuthenticated}
                className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
              >
                <PlayCircle className="mr-2 h-4 w-4" />
                Start Monitoring
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <StopCircle className="text-muted-foreground h-5 w-5" />
              <span className="text-muted-foreground font-medium">
                Monitoring Unavailable
              </span>
            </div>
            <p className="text-muted-foreground text-sm">
              Please authenticate with Spotify to enable monitoring features.
            </p>
            <Button disabled className="w-full opacity-50">
              <PlayCircle className="mr-2 h-4 w-4" />
              Authenticate First
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
