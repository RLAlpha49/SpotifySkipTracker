/**
 * @packageDocumentation
 * @module DashboardActions
 * @description Dashboard Quick Actions Panel
 *
 * Provides a centralized interface for performing common operations related to
 * data management and navigation throughout the application. This component serves
 * as a command center for user-initiated actions in a consistent card layout.
 *
 * Features:
 * - Data management actions (refresh, export, clear)
 * - Quick navigation to related sections
 * - Loading state indicators for asynchronous operations
 * - Destructive action highlighting for dangerous operations
 * - Consistent button styling and iconography
 *
 * This component is typically displayed in the sidebar of the dashboard layout
 * and provides context-specific actions related to the user's data and application
 * workflow.
 */

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "@tanstack/react-router";
import {
  BarChart2,
  Download,
  RefreshCw,
  Settings,
  SkipForward,
  Trash2,
} from "lucide-react";
import React from "react";

/**
 * Props for the DashboardActions component
 *
 * @property onRefreshData - Optional callback for data refresh action
 * @property onExportData - Optional callback for data export action
 * @property onClearAll - Optional callback for data clearing action
 * @property isRefreshing - Whether data refresh operation is in progress
 * @property isExporting - Whether data export operation is in progress
 * @property isClearing - Whether data clearing operation is in progress
 */
interface DashboardActionsProps {
  onRefreshData?: () => void;
  onExportData?: () => void;
  onClearAll?: () => void;
  isRefreshing?: boolean;
  isExporting?: boolean;
  isClearing?: boolean;
}

/**
 * Dashboard actions component with quick access buttons
 *
 * Renders a card containing buttons for common dashboard operations
 * including data management and navigation to related sections.
 * Each button features an appropriate icon and loading state when
 * relevant.
 *
 * The component handles five primary actions:
 * 1. Refresh data - Updates dashboard data from the backend
 * 2. Export statistics - Downloads user statistics in a file
 * 3. View detailed statistics - Navigates to statistics page
 * 4. Manage skipped tracks - Navigates to skipped tracks page
 * 5. Clear all data - Destructive action to reset user data
 *
 * @param props - Component properties
 * @param props.onRefreshData - Handler for data refresh
 * @param props.onExportData - Handler for data export
 * @param props.onClearAll - Handler for data clearing
 * @param props.isRefreshing - Whether refresh operation is running
 * @param props.isExporting - Whether export operation is running
 * @param props.isClearing - Whether clear operation is running
 * @returns React component with action buttons in a card layout
 * @source
 */
export function DashboardActions({
  onRefreshData,
  onExportData,
  onClearAll,
  isRefreshing = false,
  isExporting = false,
  isClearing = false,
}: DashboardActionsProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
          <Settings className="mr-2 h-5 w-5" />
          Quick Actions
        </CardTitle>
        <CardDescription>Common dashboard operations</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          className="flex w-full items-center justify-start"
          variant="outline"
          onClick={onRefreshData}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          {isRefreshing ? "Refreshing data..." : "Refresh data"}
        </Button>

        <Button
          className="flex w-full items-center justify-start"
          variant="outline"
          onClick={onExportData}
          disabled={isExporting}
        >
          <Download className="mr-2 h-4 w-4" />
          {isExporting ? "Exporting..." : "Export statistics"}
        </Button>

        <Link to="/statistics" className="w-full">
          <Button
            className="flex w-full items-center justify-start"
            variant="outline"
          >
            <BarChart2 className="mr-2 h-4 w-4" />
            View detailed statistics
          </Button>
        </Link>

        <Link to="/skipped-tracks" className="w-full">
          <Button
            className="flex w-full items-center justify-start"
            variant="outline"
          >
            <SkipForward className="mr-2 h-4 w-4" />
            Manage skipped tracks
          </Button>
        </Link>

        <Button
          className="flex w-full items-center justify-start"
          variant="outline"
          onClick={onClearAll}
          disabled={isClearing}
          data-variant="destructive"
        >
          <Trash2 className="mr-2 h-4 w-4 text-red-500" />
          <span className="text-red-500">
            {isClearing ? "Clearing data..." : "Clear all data"}
          </span>
        </Button>
      </CardContent>
    </Card>
  );
}
