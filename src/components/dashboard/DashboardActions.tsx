/**
 * Dashboard Actions component
 *
 * Provides quick action buttons for common tasks on the dashboard.
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

interface DashboardActionsProps {
  onRefreshData?: () => void;
  onExportData?: () => void;
  onClearAll?: () => void;
  isRefreshing?: boolean;
  isExporting?: boolean;
  isClearing?: boolean;
}

/**
 * Component that provides quick action buttons for the dashboard
 *
 * @param props - Component props
 * @returns Dashboard actions component
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
