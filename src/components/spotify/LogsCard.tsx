import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FolderOpen, Trash2, HelpCircle, FileText } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { LogSettings } from "@/types/spotify";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { saveLog } from "@/helpers/storage/logs-store";

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

    saveLog(
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

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-2 flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Activity Logs</h2>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onOpenLogsDirectory}
                      className="flex items-center gap-1"
                    >
                      <FolderOpen className="h-4 w-4" />
                      <span>Open Logs</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Open the logs directory</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Button variant="outline" size="sm" onClick={onClearLogs}>
                      <Trash2 className="h-4 w-4" />
                      <span>Clear Logs</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Clear all log files</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* Add log file selector */}
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <div className="flex items-center space-x-1">
                <Label className="mb-1 text-xs">Log File</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="text-muted-foreground h-3 w-3" />
                    </TooltipTrigger>
                    <TooltipContent>
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
                <SelectTrigger className="w-40">
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

            <div className="flex flex-col">
              <div className="flex items-center space-x-1">
                <Label className="mb-1 text-xs">Display Filter</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="text-muted-foreground h-3 w-3" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        Filter logs by severity level. Each level includes all
                        higher severity levels (e.g., INFO shows INFO, WARNING,
                        ERROR, and CRITICAL).
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select
                value={settings.displayLogLevel}
                onValueChange={onDisplayLogLevelChange}
              >
                <SelectTrigger className="w-32">
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

            {/* Auto-refresh switch should only be enabled for latest.log */}
            <div className="flex items-center space-x-2">
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
                      <Label htmlFor="log-auto-refresh">Auto-refresh</Label>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {selectedLogFile === "latest.log"
                        ? "When enabled, logs will automatically update as new events occur. Disable for better performance when analyzing specific log entries."
                        : "Auto-refresh is only available for the Current Session log."}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Input
                    type="text"
                    placeholder="Search logs..."
                    value={logSearchTerm}
                    onChange={onLogSearch}
                    className="flex-1"
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    Filter logs by text content. Shows only logs containing the
                    search term.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <Separator className="my-2" />
        <ScrollArea className="h-[350px] w-full">
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
            <p className="text-muted-foreground text-center text-sm">
              No logs to display
            </p>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
