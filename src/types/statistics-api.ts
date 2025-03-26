import { DetectedPattern } from "@/services/statistics/pattern-detector";
import { SkippedTrack } from "@/types/spotify";
import { StatisticsData } from "@/types/statistics";

/**
 * Response format for export operations
 */
export interface ExportResponse {
  success: boolean;
  message?: string;
  filePath?: string;
}

/**
 * Centralized StatisticsAPI interface
 * Defines all methods available through the statisticsAPI global
 */
export interface StatisticsAPI {
  // Collection service controls
  isCollectionActive: () => Promise<boolean>;
  startCollection: () => Promise<{ success: boolean; message?: string }>;
  stopCollection: () => Promise<{ success: boolean; message?: string }>;
  triggerAggregation: () => Promise<{ success: boolean; message?: string }>;

  // Statistics data access
  getDailySkipMetrics: () => Promise<{
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
  }>;
  getWeeklySkipMetrics: () => Promise<{
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
  }>;
  getArtistSkipMetrics: () => Promise<{
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
  }>;
  getLibraryStats: () => Promise<{
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
  }>;
  getTimePatterns: () => Promise<{
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
  }>;
  getSkipPatterns: () => Promise<{
    success: boolean;
    data?: DetectedPattern[];
    error?: string;
  }>;
  detectPatterns: () => Promise<{ success: boolean; message?: string }>;

  // Artist insights
  getArtistInsights: () => Promise<{
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
  }>;

  // Statistics data methods
  getAll: () => Promise<StatisticsData>;
  getUniqueArtistCount: () => Promise<number>;
  getSkippedTracks: () => Promise<SkippedTrack[]>;
  getDailyMetrics: () => Promise<Record<string, unknown>>;
  getArtistMetrics: () => Promise<Record<string, unknown>>;

  // Export functions
  exportSkippedTracksToCSV: () => Promise<ExportResponse>;
  exportArtistMetricsToCSV: () => Promise<ExportResponse>;
  exportDailyMetricsToCSV: () => Promise<ExportResponse>;
  exportWeeklyMetricsToCSV: () => Promise<ExportResponse>;
  exportLibraryStatisticsToCSV: () => Promise<ExportResponse>;
  exportTimePatternsToCSV: () => Promise<ExportResponse>;
  exportDetectedPatternsToCSV: () => Promise<ExportResponse>;
  exportAllToJSON: () => Promise<ExportResponse>;
  copyToClipboard: () => Promise<ExportResponse>;
}
