import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
    <Card>
      <CardContent className="p-4">
        <h2 className="mb-4 text-lg font-semibold">Playback Monitoring</h2>
        {isAuthenticated ? (
          <div className="flex items-center justify-between">
            <span
              className={
                isMonitoring
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }
            >
              {isMonitoring ? "Monitoring Active" : "Monitoring Inactive"}
            </span>
            {isMonitoring ? (
              <Button
                variant="outline"
                onClick={onStopMonitoring}
                disabled={!isAuthenticated}
              >
                Stop Monitoring
              </Button>
            ) : (
              <Button onClick={onStartMonitoring} disabled={!isAuthenticated}>
                Start Monitoring
              </Button>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">
            Authenticate to enable monitoring
          </span>
        )}
      </CardContent>
    </Card>
  );
}
