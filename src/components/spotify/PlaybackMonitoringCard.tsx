import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Activity,
  AlertCircle,
  Info,
  PlayCircle,
  RadioTower,
  StopCircle,
} from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

export type MonitoringStatus = "inactive" | "initializing" | "active" | "error";

interface PlaybackMonitoringCardProps {
  isAuthenticated: boolean;
  isMonitoring: boolean;
  onStartMonitoring: () => Promise<void>;
  onStopMonitoring: () => Promise<void>;
  monitoringStatus?: MonitoringStatus;
  statusMessage?: string;
  errorDetails?: string;
}

export function PlaybackMonitoringCard({
  isAuthenticated,
  isMonitoring,
  onStartMonitoring,
  onStopMonitoring,
  monitoringStatus = isMonitoring ? "active" : "inactive",
  statusMessage,
  errorDetails,
}: PlaybackMonitoringCardProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  // Handle monitoring start with loading state and notifications
  const handleStartMonitoring = async () => {
    try {
      setIsStarting(true);
      await onStartMonitoring();
      toast.success("Monitoring Started", {
        description: "Spotify playback monitoring is now active",
      });
    } catch (error) {
      toast.error("Monitoring Error", {
        description: `Failed to start monitoring: ${error}`,
      });
    } finally {
      setIsStarting(false);
    }
  };

  // Handle monitoring stop with loading state and notifications
  const handleStopMonitoring = async () => {
    try {
      setIsStopping(true);
      await onStopMonitoring();
      toast.success("Monitoring Stopped", {
        description: "Spotify playback monitoring has been stopped",
      });
    } catch (error) {
      toast.error("Monitoring Error", {
        description: `Failed to stop monitoring: ${error}`,
      });
    } finally {
      setIsStopping(false);
    }
  };

  // Get status badge details based on monitoring status
  const getStatusBadge = () => {
    switch (monitoringStatus) {
      case "initializing":
        return {
          icon: (
            <Activity className="h-5 w-5 animate-pulse text-yellow-600 dark:text-yellow-400" />
          ),
          text: "Initializing",
          textClass: "font-medium text-yellow-600 dark:text-yellow-400",
          badgeClass:
            "border-yellow-200 bg-yellow-100 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
        };
      case "active":
        return {
          icon: (
            <Activity className="h-5 w-5 animate-pulse text-green-600 dark:text-green-400" />
          ),
          text: "Monitoring Active",
          textClass: "font-medium text-green-600 dark:text-green-400",
          badgeClass:
            "border-green-200 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400",
        };
      case "error":
        return {
          icon: (
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          ),
          text: "Monitoring Error",
          textClass: "font-medium text-red-600 dark:text-red-400",
          badgeClass:
            "border-red-200 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400",
        };
      default:
        return {
          icon: (
            <StopCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          ),
          text: "Monitoring Inactive",
          textClass: "font-medium text-red-600 dark:text-red-400",
          badgeClass:
            "border-red-200 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400",
        };
    }
  };

  const statusBadge = getStatusBadge();

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
                {statusBadge.icon}
                <span className={statusBadge.textClass}>
                  {statusBadge.text}
                </span>

                {(statusMessage || errorDetails) && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="text-muted-foreground/70 ml-1 h-4 w-4 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="max-w-xs text-sm">
                          {statusMessage && (
                            <p className="font-medium">{statusMessage}</p>
                          )}
                          {errorDetails && (
                            <p className="text-destructive mt-1 text-xs">
                              {errorDetails}
                            </p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>

              <Badge variant="outline" className={statusBadge.badgeClass}>
                {monitoringStatus === "initializing"
                  ? "Starting"
                  : monitoringStatus === "active"
                    ? "Active"
                    : monitoringStatus === "error"
                      ? "Error"
                      : "Inactive"}
              </Badge>
            </div>

            <p className="text-muted-foreground text-sm">
              {monitoringStatus === "initializing" &&
                "Starting monitoring service. Please wait..."}
              {monitoringStatus === "active" &&
                "Monitoring is active. Skipped tracks are being detected and recorded."}
              {monitoringStatus === "error" &&
                (statusMessage ||
                  "An error occurred with the monitoring service. Try restarting.")}
              {monitoringStatus === "inactive" &&
                "Monitoring is inactive. Start monitoring to detect skipped tracks."}
            </p>

            {monitoringStatus === "active" || monitoringStatus === "error" ? (
              <Button
                variant="outline"
                onClick={handleStopMonitoring}
                disabled={!isAuthenticated || isStopping}
                className="w-full"
              >
                {isStopping ? (
                  <>
                    <Activity className="mr-2 h-4 w-4 animate-spin" />
                    Stopping...
                  </>
                ) : (
                  <>
                    <StopCircle className="mr-2 h-4 w-4" />
                    Stop Monitoring
                  </>
                )}
              </Button>
            ) : monitoringStatus === "initializing" ? (
              <Button
                disabled
                className="w-full bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-700 dark:hover:bg-yellow-800"
              >
                <Activity className="mr-2 h-4 w-4 animate-spin" />
                Initializing...
              </Button>
            ) : (
              <Button
                onClick={handleStartMonitoring}
                disabled={!isAuthenticated || isStarting}
                className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
              >
                {isStarting ? (
                  <>
                    <Activity className="mr-2 h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Start Monitoring
                  </>
                )}
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
