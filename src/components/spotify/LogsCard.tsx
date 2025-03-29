/**
 * @packageDocumentation
 * @module LogsCard
 * @description Application Logging and Diagnostics Console Component
 *
 * Provides a comprehensive interface for monitoring, filtering, and managing
 * application logs. This component serves as the primary debugging and diagnostic
 * tool, allowing users to inspect application behavior and troubleshoot issues.
 *
 * Features:
 * - Real-time log visualization with automatic scrolling
 * - Log filtering by severity level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
 * - Text search functionality for finding specific log entries
 * - Historical log file navigation with file selection
 * - Auto-refresh toggle for real-time monitoring
 * - Color-coded log entries based on severity level
 * - Utilities for clearing logs and accessing log files
 * - Session grouping for improved log readability
 *
 * This component is essential for development, debugging, and user troubleshooting,
 * providing visibility into the application's internal processes and events.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LogSettings } from "@/types/spotify";
import {
  FileText,
  Filter,
  FolderOpen,
  HelpCircle,
  RefreshCw,
  Search,
  Terminal,
  Trash2,
} from "lucide-react";
import React, { useEffect, useState } from "react";

/**
 * Props for the LogsCard component
 *
 * @property logs - Array of log message strings for the current session
 * @property settings - Configuration for log display and behavior
 * @property logSearchTerm - Current search filter text
 * @property onDisplayLogLevelChange - Handler for changing minimum display log level
 * @property onToggleLogAutoRefresh - Handler for toggling automatic log refreshing
 * @property onLogSearch - Handler for log search text changes
 * @property onClearLogs - Handler for clearing the current log data
 * @property onOpenLogsDirectory - Handler for opening the logs directory
 */
interface LogsCardProps {
  logs: string[];
  settings: LogSettings;
  logSearchTerm: string;
  onDisplayLogLevelChange: (value: string) => Promise<void>;
  onToggleLogAutoRefresh: () => Promise<void>;
  onLogSearch: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearLogs: () => Promise<boolean>;
  onOpenLogsDirectory: () => Promise<boolean>;
}

/**
 * Application logging and diagnostics console
 *
 * Renders a comprehensive logging interface that displays application logs
 * with filtering, search, and file navigation capabilities. Provides tools
 * for log analysis and management to aid in debugging and troubleshooting.
 *
 * The component manages both current session logs and historical log files,
 * with appropriate controls for each context. Log entries are parsed,
 * filtered, and formatted for optimal readability.
 *
 * @param props - Component properties
 * @param props.logs - Current session log messages
 * @param props.settings - Log display configuration
 * @param props.logSearchTerm - Current search filter
 * @param props.onDisplayLogLevelChange - Function to change minimum log level
 * @param props.onToggleLogAutoRefresh - Function to toggle auto-refresh
 * @param props.onLogSearch - Function to handle search input
 * @param props.onClearLogs - Function to clear logs
 * @param props.onOpenLogsDirectory - Function to open logs directory
 * @returns React component for log visualization and management
 * @source
 */
export function LogsCard({
  logs,
  settings,
  logSearchTerm,
  onDisplayLogLevelChange,
  onToggleLogAutoRefresh,
  onLogSearch,
  onClearLogs,
  onOpenLogsDirectory,
}: LogsCardProps) {
  // Add state for available log files and currently selected log file
  const [availableLogFiles, setAvailableLogFiles] = useState<
    { name: string; mtime: number; displayName: string }[]
  >([]);
  const [selectedLogFile, setSelectedLogFile] = useState<string>("latest.log");
  const [selectedFileLogs, setSelectedFileLogs] = useState<string[]>([]);

  // Fetch available log files on component mount
  useEffect(() => {
    const fetchLogFiles = async () => {
      try {
        const files = await window.spotify.getAvailableLogFiles();
        setAvailableLogFiles(files);
      } catch (error) {
        console.error("Failed to fetch log files:", error);
      }
    };

    fetchLogFiles();
  }, []);

  // Load logs from selected file when it changes
  useEffect(() => {
    const loadSelectedFileLogs = async () => {
      try {
        // If we're showing latest.log (Current Session), use getLogs
        if (selectedLogFile === "latest.log") {
          const currentSessionLogs = await window.spotify.getLogs(100);
          setSelectedFileLogs(currentSessionLogs);
          return;
        }

        // Otherwise, load logs from the selected file
        const fileLogs = await window.spotify.getLogsFromFile(selectedLogFile);
        setSelectedFileLogs(fileLogs);
      } catch (error) {
        console.error(`Failed to load logs from ${selectedLogFile}:`, error);
        setSelectedFileLogs([
          `[${new Date().toLocaleTimeString()}] [ERROR] Failed to load logs from ${selectedLogFile}: ${error}`,
        ]);
      }
    };

    loadSelectedFileLogs();
  }, [selectedLogFile]); // Removed logs dependency to avoid refreshing when parent logs update

  // Add useEffect to update logs when parent logs change, but only for latest.log
  useEffect(() => {
    // Only update if we're viewing the current session (latest.log) and auto-refresh is enabled
    if (selectedLogFile === "latest.log" && settings.logAutoRefresh) {
      setSelectedFileLogs(logs);
    }
  }, [logs, selectedLogFile, settings.logAutoRefresh]);

  // Handle log file selection change
  const handleLogFileChange = (value: string) => {
    // If switching to latest.log, ensure auto-refresh works if enabled
    const isLatestLog = value === "latest.log";
    const isAutoRefresh = settings.logAutoRefresh;

    window.spotify.saveLog(
      `Switching to log file: ${value} (auto-refresh: ${isAutoRefresh && isLatestLog ? "enabled" : "disabled"})`,
      "DEBUG",
    );
    setSelectedLogFile(value);
  };

  /**
   * Filters and processes logs for display
   * - Parses timestamps for sorting
   * - Groups logs into sessions
   * - Filters by log level and search term
   * - Deduplicates entries
   *
   * @returns Array of filtered log messages
   */
  const getFilteredLogs = () => {
    const logLevels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"];
    const selectedLevelIndex = logLevels.indexOf(settings.displayLogLevel);

    // Parse timestamps and sort logs by timestamp (newest first)
    const parsedLogs = selectedFileLogs.map((log) => {
      const matches = log.match(/\[(.*?)\]\s+\[([A-Z]+)\]\s+(.*)/);
      if (matches && matches.length >= 4) {
        const timestamp = matches[1];
        const level = matches[2];
        const message = matches[3];

        // Parse timestamp into a date object
        const dateParts = timestamp.match(/(\d+):(\d+):(\d+)\s+([AP])M\.(\d+)/);
        let dateObj = null;

        if (dateParts) {
          // Create date for today with the parsed time
          const now = new Date();
          let hours = parseInt(dateParts[1]);
          const minutes = parseInt(dateParts[2]);
          const seconds = parseInt(dateParts[3]);
          const milliseconds = parseInt(dateParts[5]);
          const isPM = dateParts[4] === "P";

          // Convert to 24-hour format
          if (isPM && hours < 12) hours += 12;
          if (!isPM && hours === 12) hours = 0;

          dateObj = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            hours,
            minutes,
            seconds,
            milliseconds,
          );
        }

        return {
          original: log,
          timestamp,
          dateObj,
          level,
          message,
          contentKey: `${level}-${message}`,
        };
      }

      return {
        original: log,
        timestamp: "",
        dateObj: null,
        level: "",
        message: log,
        contentKey: log,
      };
    });

    // Sort by timestamp
    const sortedLogs = parsedLogs.sort((a, b) => {
      if (a.dateObj && b.dateObj) {
        return b.dateObj.getTime() - a.dateObj.getTime();
      }
      return 0;
    });

    // Group logs by session (30 min threshold)
    const sessionBreakThreshold = 30 * 60 * 1000;
    const currentSession = [];
    let previousTime = null;

    for (const log of sortedLogs) {
      if (log.dateObj && previousTime) {
        const timeDiff = previousTime - log.dateObj.getTime();

        if (timeDiff < 0 || timeDiff > sessionBreakThreshold) {
          break;
        }
      }

      currentSession.push(log);
      if (log.dateObj) {
        previousTime = log.dateObj.getTime();
      }
    }

    // Deduplicate logs
    const uniqueSessionLogs = new Map();
    const seenMessages = new Set();

    currentSession.forEach((log) => {
      if (seenMessages.has(log.contentKey)) {
        return;
      }

      seenMessages.add(log.contentKey);
      uniqueSessionLogs.set(log.contentKey, log.original);
    });

    // Filter by log level and search term
    const filteredSessionLogs = Array.from(uniqueSessionLogs.values()).filter(
      (log) => {
        // Filter by log level
        const match = log.match(/\[.*?\]\s+\[([A-Z]+)\]/);
        if (!match) return false;

        const logLevel = match[1];
        const logLevelIndex = logLevels.indexOf(logLevel);

        const levelMatches = logLevelIndex >= selectedLevelIndex;

        // Filter by search term
        const searchMatches =
          !logSearchTerm ||
          log.toLowerCase().includes(logSearchTerm.toLowerCase());

        return levelMatches && searchMatches;
      },
    );

    return filteredSessionLogs;
  };

  /**
   * Determines CSS class based on log level
   *
   * @param log - Log message string
   * @returns CSS class name for styling the log entry
   */
  const getLogLevelClass = (log: string): string => {
    if (log.includes("[DEBUG]")) {
      return "text-muted-foreground";
    } else if (log.includes("[INFO]")) {
      return "text-primary";
    } else if (log.includes("[WARNING]")) {
      return "text-yellow-600 dark:text-yellow-400";
    } else if (log.includes("[ERROR]")) {
      return "text-red-600 dark:text-red-400";
    } else if (log.includes("[CRITICAL]")) {
      return "text-red-700 dark:text-red-300 font-bold";
    }
    return "";
  };

  const filteredLogs = getFilteredLogs();
  const logLevelCounts = {
    DEBUG: 0,
    INFO: 0,
    WARNING: 0,
    ERROR: 0,
    CRITICAL: 0,
  };

  // Count log levels for badges
  filteredLogs.forEach((log) => {
    const match = log.match(/\[.*?\]\s+\[([A-Z]+)\]/);
    if (match && match[1] in logLevelCounts) {
      const level = match[1] as keyof typeof logLevelCounts;
      logLevelCounts[level]++;
    }
  });

  return (
    <Card className="border-muted-foreground/20 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-xl font-semibold">
            <Terminal className="text-primary mr-2 h-5 w-5" />
            Activity Logs
          </CardTitle>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onOpenLogsDirectory}
                    className="h-8"
                  >
                    <FolderOpen className="mr-1.5 h-4 w-4" />
                    <span>Open Logs</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Open the logs directory</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onClearLogs}
                    className="h-8"
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    <span>Clear</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Clear all log files</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
            <div className="space-y-1 md:col-span-3">
              <div className="flex items-center space-x-1">
                <Label className="flex items-center text-xs font-medium">
                  <FileText className="mr-1 h-3 w-3" />
                  Log File
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="text-muted-foreground h-3 w-3" />
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>
                        Select which log file to view. Current Session is always
                        updated with new logs.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select
                value={selectedLogFile}
                onValueChange={handleLogFileChange}
              >
                <SelectTrigger className="h-8 w-full">
                  <SelectValue placeholder="Log File" />
                </SelectTrigger>
                <SelectContent>
                  {availableLogFiles.map((file) => (
                    <SelectItem key={file.name} value={file.name}>
                      <div className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        <span>{file.displayName}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 md:col-span-3">
              <div className="flex items-center space-x-1">
                <Label className="flex items-center text-xs font-medium">
                  <Filter className="mr-1 h-3 w-3" />
                  Display Filter
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="text-muted-foreground h-3 w-3" />
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>
                        Filter logs by severity level. Each level includes all
                        higher severity levels.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select
                value={settings.displayLogLevel}
                onValueChange={onDisplayLogLevelChange}
              >
                <SelectTrigger className="h-8 w-full">
                  <SelectValue placeholder="Display Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEBUG">DEBUG</SelectItem>
                  <SelectItem value="INFO">INFO</SelectItem>
                  <SelectItem value="WARNING">WARNING</SelectItem>
                  <SelectItem value="ERROR">ERROR</SelectItem>
                  <SelectItem value="CRITICAL">CRITICAL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 md:col-span-2">
              <Label className="flex items-center text-xs font-medium">
                <RefreshCw className="mr-1 h-3 w-3" />
                Auto-refresh
              </Label>
              <div className="flex h-8 items-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="log-auto-refresh"
                          checked={
                            settings.logAutoRefresh &&
                            selectedLogFile === "latest.log"
                          }
                          disabled={selectedLogFile !== "latest.log"}
                          onCheckedChange={onToggleLogAutoRefresh}
                        />
                        <Label htmlFor="log-auto-refresh" className="text-sm">
                          {settings.logAutoRefresh &&
                          selectedLogFile === "latest.log"
                            ? "Enabled"
                            : "Disabled"}
                        </Label>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>
                        {selectedLogFile === "latest.log"
                          ? "When enabled, logs will automatically update as new events occur."
                          : "Auto-refresh is only available for the Current Session log."}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            <div className="space-y-1 md:col-span-4">
              <Label className="flex items-center text-xs font-medium">
                <Search className="mr-1 h-3 w-3" />
                Search Logs
              </Label>
              <div className="flex h-8 w-full items-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Input
                        type="text"
                        placeholder="Search logs..."
                        value={logSearchTerm}
                        onChange={onLogSearch}
                        className="h-8"
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>
                        Filter logs by text content. Shows only logs containing
                        the search term.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1 pt-1">
            <Badge
              variant="outline"
              className={`${settings.displayLogLevel === "DEBUG" ? "bg-muted/90" : "bg-muted/30"}`}
            >
              DEBUG: {logLevelCounts.DEBUG}
            </Badge>
            <Badge
              variant="outline"
              className={`${settings.displayLogLevel === "INFO" || settings.displayLogLevel === "DEBUG" ? "border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400" : "bg-muted/30"}`}
            >
              INFO: {logLevelCounts.INFO}
            </Badge>
            <Badge
              variant="outline"
              className={`${settings.displayLogLevel === "WARNING" || settings.displayLogLevel === "DEBUG" || settings.displayLogLevel === "INFO" ? "border-yellow-200 bg-yellow-100 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400" : "bg-muted/30"}`}
            >
              WARNING: {logLevelCounts.WARNING}
            </Badge>
            <Badge
              variant="outline"
              className={`${settings.displayLogLevel === "ERROR" || settings.displayLogLevel === "DEBUG" || settings.displayLogLevel === "INFO" || settings.displayLogLevel === "WARNING" ? "border-red-200 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400" : "bg-muted/30"}`}
            >
              ERROR: {logLevelCounts.ERROR}
            </Badge>
            <Badge
              variant="outline"
              className={`${settings.displayLogLevel === "CRITICAL" || settings.displayLogLevel === "DEBUG" || settings.displayLogLevel === "INFO" || settings.displayLogLevel === "WARNING" || settings.displayLogLevel === "ERROR" ? "border-red-300 bg-red-100 font-semibold text-red-900 dark:border-red-900 dark:bg-red-900/30 dark:text-red-300" : "bg-muted/30"}`}
            >
              CRITICAL: {logLevelCounts.CRITICAL}
            </Badge>
          </div>
        </div>

        <Separator className="my-3" />
        <ScrollArea className="bg-muted/5 h-[350px] w-full rounded-md border px-4 py-3">
          {filteredLogs.length > 0 ? (
            <div className="space-y-1">
              {filteredLogs.map((log, index) => (
                <div
                  key={index}
                  className={`py-0.5 font-mono text-xs ${getLogLevelClass(log)}`}
                >
                  {log}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-muted-foreground text-center text-sm">
                No logs to display
              </p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
