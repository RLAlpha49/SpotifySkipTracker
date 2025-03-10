/**
 * Types for skipped tracks components
 */

/**
 * Track data with skip statistics and metadata
 */
export interface SkippedTrack {
  id: string;
  name: string;
  artist: string;
  skipCount: number;
  notSkippedCount: number;
  lastSkipped: string;
  skipTimestamps?: string[];
  autoProcessed?: boolean;
} 