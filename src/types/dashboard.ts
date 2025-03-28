/**
 * Dashboard data type definitions
 *
 * Re-exports needed interfaces from global types for use in components
 */

/**
 * Dashboard summary statistics
 */
export interface StatisticsSummary {
  totalTracks: number;
  totalSkips: number;
  skipPercentage: number;
  todaySkips: number;
  weekSkips: number;
  monthSkips: number;
  avgSkipTime: number;
}

/**
 * Dashboard track data
 */
export interface DashboardTrackData {
  id: string;
  name: string;
  artist: string;
  album: string;
  timestamp: string;
  skipPercentage: number;
  skipCount: number;
}

/**
 * Dashboard artist data
 */
export interface DashboardArtistData {
  id: string;
  name: string;
  skipCount: number;
  trackCount: number;
  skipPercentage: number;
}

/**
 * Dashboard session data
 */
export interface DashboardSessionData {
  id: string;
  date: string;
  duration: number;
  trackCount: number;
  skipCount: number;
  skipPercentage: number;
}
