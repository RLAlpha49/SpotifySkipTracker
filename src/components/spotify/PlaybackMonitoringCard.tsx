/**
 * @packageDocumentation
 * @module PlaybackMonitoringCard
 * @description Spotify Playback Monitoring Control Component
 *
 * Provides a user interface for controlling and visualizing the status of
 * Spotify playback monitoring. This component serves as the primary control
 * center for starting and stopping the monitoring service that detects
 * skipped tracks and collects listening data.
 *
 * Features:
 * - Real-time monitoring status visualization with color-coded indicators
 * - Start/stop controls with loading states during transitions
 * - Detailed status messaging with tooltips for additional information
 * - Error state handling with descriptive feedback
 * - Authentication-aware UI that adapts to login state
 * - Toast notifications for monitoring state changes
 *
 * This component is central to the application's core functionality,
 * as it controls the service responsible for tracking skip patterns
 * and collecting the data used throughout the analytics features.
 */

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

/**
 * Possible states for the playback monitoring service
 *
 * @property inactive - Service is not running
 * @property initializing - Service is starting up
 * @property active - Service is running normally
 * @property error - Service encountered an error
 */
export type MonitoringStatus = "inactive" | "initializing" | "active" | "error";

/**
 * Props for the PlaybackMonitoringCard component
 *
 * @property isAuthenticated - Whether the user is currently authenticated with Spotify
 * @property isMonitoring - Whether the monitoring service is currently active
 * @property onStartMonitoring - Handler function for initiating monitoring
 * @property onStopMonitoring - Handler function for stopping monitoring
 * @property monitoringStatus - Current detailed status of the monitoring service
 * @property statusMessage - Optional status message providing additional context
 * @property errorDetails - Optional detailed error information when in error state
 */
interface PlaybackMonitoringCardProps {
  isAuthenticated: boolean;
  isMonitoring: boolean;
  onStartMonitoring: () => Promise<void>;
  onStopMonitoring: () => Promise<void>;
  monitoringStatus?: MonitoringStatus;
  statusMessage?: string;
  errorDetails?: string;
}

/**
 * Spotify playback monitoring control card
 *
 * Renders a card component that displays the current status of the
 * monitoring service and provides controls to start or stop it.
 * The card adapts its display based on authentication state and
 * current monitoring status to provide contextual controls and messaging.
 *
 * The component maintains local loading states during transitions to
 * provide immediate feedback to users while asynchronous operations
 * complete, and uses toast notifications to confirm successful actions.
 *
 * @param props - Component properties
 * @param props.isAuthenticated - Whether the user is authenticated
 * @param props.isMonitoring - Whether monitoring is currently active
 * @param props.onStartMonitoring - Function to start monitoring
 * @param props.onStopMonitoring - Function to stop monitoring
 * @param props.monitoringStatus - Detailed monitoring status
 * @param props.statusMessage - Optional additional status information
 * @param props.errorDetails - Optional error details when in error state
 * @returns React component for monitoring control
 * @source
 */
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

  /**
   * Initiates monitoring with loading state and user feedback
   *
   * Handles the start monitoring process with appropriate loading states
   * and toast notifications for success or error outcomes. Maintains the
   * loading state during the asynchronous operation.
   */
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

  /**
   * Stops monitoring with loading state and user feedback
   *
   * Handles the stop monitoring process with appropriate loading states
   * and toast notifications for success or error outcomes. Maintains the
   * loading state during the asynchronous operation.
   */
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

  /**
   * Determines badge styling based on current monitoring status
   *
   * Returns an object containing the icon, text, and style classes
   * for the status badge based on the current monitoring status.
   * Each status has a distinctive color scheme and icon.
   *
   * @returns Object with icon, text, and styling for status badge
   */
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
