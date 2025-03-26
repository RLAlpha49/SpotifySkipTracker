import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatisticsData } from "@/types/statistics";
import "@/types/statistics-api";
import { ExportResponse } from "@/types/statistics-api";
import {
  Clipboard,
  Download,
  FileDown,
  FileJson,
  FileSpreadsheet,
  FileText,
  RefreshCw,
} from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import { NoDataMessage } from "./NoDataMessage";

interface ExportDataTabProps {
  loading: boolean;
  statistics: StatisticsData | null;
}

export function ExportDataTab({ loading, statistics }: ExportDataTabProps) {
  const [exporting, setExporting] = useState<{
    csv: boolean;
    json: boolean;
    clipboard: boolean;
  }>({
    csv: false,
    json: false,
    clipboard: false,
  });

  const handleExportResponse = (
    response: ExportResponse,
    operation: string,
  ) => {
    if (response.success) {
      toast.success("Export Successful", {
        description:
          response.message || `${operation} was completed successfully.`,
      });
    } else {
      toast.error("Export Failed", {
        description:
          response.message || `Failed to ${operation.toLowerCase()}.`,
      });
    }
  };

  const exportSkippedTracks = async () => {
    setExporting((prev) => ({ ...prev, csv: true }));
    try {
      const response = await window.statisticsAPI.exportSkippedTracksToCSV();
      handleExportResponse(response, "Skipped tracks export");
    } catch (error) {
      toast.error("Export Failed", {
        description: `Error exporting skipped tracks: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setExporting((prev) => ({ ...prev, csv: false }));
    }
  };

  const exportArtistMetrics = async () => {
    setExporting((prev) => ({ ...prev, csv: true }));
    try {
      const response = await window.statisticsAPI.exportArtistMetricsToCSV();
      handleExportResponse(response, "Artist metrics export");
    } catch (error) {
      toast.error("Export Failed", {
        description: `Error exporting artist metrics: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setExporting((prev) => ({ ...prev, csv: false }));
    }
  };

  const exportDailyMetrics = async () => {
    setExporting((prev) => ({ ...prev, csv: true }));
    try {
      const response = await window.statisticsAPI.exportDailyMetricsToCSV();
      handleExportResponse(response, "Daily metrics export");
    } catch (error) {
      toast.error("Export Failed", {
        description: `Error exporting daily metrics: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setExporting((prev) => ({ ...prev, csv: false }));
    }
  };

  const exportAllToJSON = async () => {
    setExporting((prev) => ({ ...prev, json: true }));
    try {
      const response = await window.statisticsAPI.exportAllToJSON();
      handleExportResponse(response, "JSON export");
    } catch (error) {
      toast.error("Export Failed", {
        description: `Error exporting to JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setExporting((prev) => ({ ...prev, json: false }));
    }
  };

  const copyToClipboard = async () => {
    setExporting((prev) => ({ ...prev, clipboard: true }));
    try {
      const response = await window.statisticsAPI.copyToClipboard();
      handleExportResponse(response, "Copy to clipboard");
    } catch (error) {
      toast.error("Copy Failed", {
        description: `Error copying to clipboard: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setExporting((prev) => ({ ...prev, clipboard: false }));
    }
  };

  const exportWeeklyMetrics = async () => {
    setExporting((prev) => ({ ...prev, csv: true }));
    try {
      const response = await window.statisticsAPI.exportWeeklyMetricsToCSV();
      handleExportResponse(response, "Weekly metrics export");
    } catch (error) {
      toast.error("Export Failed", {
        description: `Error exporting weekly metrics: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setExporting((prev) => ({ ...prev, csv: false }));
    }
  };

  const exportLibraryStatistics = async () => {
    setExporting((prev) => ({ ...prev, csv: true }));
    try {
      const response =
        await window.statisticsAPI.exportLibraryStatisticsToCSV();
      handleExportResponse(response, "Library statistics export");
    } catch (error) {
      toast.error("Export Failed", {
        description: `Error exporting library statistics: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setExporting((prev) => ({ ...prev, csv: false }));
    }
  };

  const exportTimePatterns = async () => {
    setExporting((prev) => ({ ...prev, csv: true }));
    try {
      const response = await window.statisticsAPI.exportTimePatternsToCSV();
      handleExportResponse(response, "Time patterns export");
    } catch (error) {
      toast.error("Export Failed", {
        description: `Error exporting time patterns: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setExporting((prev) => ({ ...prev, csv: false }));
    }
  };

  const exportDetectedPatterns = async () => {
    setExporting((prev) => ({ ...prev, csv: true }));
    try {
      const response = await window.statisticsAPI.exportDetectedPatternsToCSV();
      handleExportResponse(response, "Detected patterns export");
    } catch (error) {
      toast.error("Export Failed", {
        description: `Error exporting detected patterns: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setExporting((prev) => ({ ...prev, csv: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="text-muted-foreground h-8 w-8 animate-spin" />
          <p className="text-muted-foreground text-sm">
            Loading statistics data...
          </p>
        </div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <NoDataMessage message="No statistics data available. Start listening to music to collect statistics." />
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Export Data</h2>
        <p className="text-muted-foreground mt-2">
          Export your statistics data in various formats or copy a summary to
          the clipboard
        </p>
      </div>

      <Tabs defaultValue="json" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="csv">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            CSV Export
          </TabsTrigger>
          <TabsTrigger value="json">
            <FileJson className="mr-2 h-4 w-4" />
            JSON Export
          </TabsTrigger>
          <TabsTrigger value="clipboard">
            <Clipboard className="mr-2 h-4 w-4" />
            Clipboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="csv" className="mt-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Skipped Tracks
                </CardTitle>
                <CardDescription>
                  Export all skipped tracks data with counts, timestamps, and
                  skip types
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Includes track information, skip counts, first and last
                  skipped timestamps, and skip types.
                </p>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  onClick={exportSkippedTracks}
                  disabled={exporting.csv}
                >
                  {exporting.csv ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Export CSV
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Artist Metrics
                </CardTitle>
                <CardDescription>
                  Export artist-level metrics and insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Includes total skips per artist, unique tracks skipped, skip
                  ratios, and type distribution.
                </p>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  onClick={exportArtistMetrics}
                  disabled={exporting.csv}
                >
                  {exporting.csv ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Export CSV
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Daily Metrics
                </CardTitle>
                <CardDescription>
                  Export daily listening and skip metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Includes daily skip totals, unique tracks, sequential skips,
                  peak hours, and skip type distribution.
                </p>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  onClick={exportDailyMetrics}
                  disabled={exporting.csv}
                >
                  {exporting.csv ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Export CSV
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Weekly Metrics
                </CardTitle>
                <CardDescription>
                  Export weekly aggregated listening statistics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Includes weekly listening totals, skip rates, unique tracks
                  played, and most active days.
                </p>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  onClick={exportWeeklyMetrics}
                  disabled={exporting.csv}
                >
                  {exporting.csv ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Export CSV
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Library Statistics
                </CardTitle>
                <CardDescription>
                  Export aggregated statistics about your music library
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Includes overall totals, skip distributions, and analysis of
                  your listening patterns across your music library.
                </p>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  onClick={exportLibraryStatistics}
                  disabled={exporting.csv}
                >
                  {exporting.csv ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Export CSV
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Time Patterns
                </CardTitle>
                <CardDescription>
                  Export time-based listening patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Includes hourly and daily listening distributions, session
                  data, and time-based skip patterns.
                </p>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  onClick={exportTimePatterns}
                  disabled={exporting.csv}
                >
                  {exporting.csv ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Export CSV
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Detected Patterns
                </CardTitle>
                <CardDescription>
                  Export identified listening and skip patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Includes detected patterns in your listening habits, with
                  confidence ratings and affected track counts.
                </p>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  onClick={exportDetectedPatterns}
                  disabled={exporting.csv}
                >
                  {exporting.csv ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Export CSV
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="json" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileJson className="h-5 w-5" />
                Complete Data Export
              </CardTitle>
              <CardDescription>
                Export complete dataset in JSON format
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Exports all statistics data including skip tracks, metrics,
                patterns, and insights in a single JSON file. Useful for backing
                up your data or transferring it to another device.
              </p>
              <div className="mt-4">
                <Badge variant="outline" className="mr-2">
                  All skip data
                </Badge>
                <Badge variant="outline" className="mr-2">
                  Artist metrics
                </Badge>
                <Badge variant="outline" className="mr-2">
                  Time patterns
                </Badge>
                <Badge variant="outline" className="mr-2">
                  Skip patterns
                </Badge>
                <Badge variant="outline">Library statistics</Badge>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                onClick={exportAllToJSON}
                disabled={exporting.json}
              >
                {exporting.json ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <FileDown className="mr-2 h-4 w-4" />
                    Export All Data (JSON)
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="clipboard" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clipboard className="h-5 w-5" />
                Statistics Summary
              </CardTitle>
              <CardDescription>
                Copy a summary of your listening statistics to clipboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Creates a text summary of your statistics including overview
                metrics, top listening hours, and listening by day of week.
                Perfect for sharing or pasting into notes.
              </p>
              <div className="bg-muted mt-4 rounded-md p-4 font-mono text-xs">
                <p>SPOTIFY SKIP TRACKER STATISTICS SUMMARY</p>
                <p>=====================================</p>
                <p>Generated: [current date/time]</p>
                <p>OVERVIEW</p>
                <p>--------</p>
                <p>Total Unique Tracks: {statistics.totalUniqueTracks}</p>
                <p>Total Unique Artists: {statistics.totalUniqueArtists}</p>
                <p>
                  Overall Skip Rate:{" "}
                  {(statistics.overallSkipRate * 100).toFixed(2)}%
                </p>
                <p>...</p>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                onClick={copyToClipboard}
                disabled={exporting.clipboard}
              >
                {exporting.clipboard ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Copying...
                  </>
                ) : (
                  <>
                    <Clipboard className="mr-2 h-4 w-4" />
                    Copy to Clipboard
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
