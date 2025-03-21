/**
 * Statistics types module
 *
 * Provides type definitions for tracking enhanced metrics and listening statistics
 * used for generating visual insights and analytical reports.
 */

/**
 * Time-based metrics tracking daily, weekly, and monthly statistics
 */
export interface TimeBasedMetrics {
  /** ISO date string when these metrics were recorded */
  date: string;
  /** Total listening time in milliseconds */
  listeningTimeMs: number;
  /** Number of tracks played */
  tracksPlayed: number;
  /** Number of tracks skipped */
  tracksSkipped: number;
  /** Number of unique artists listened to */
  uniqueArtists: Set<string> | string[];
  /** Number of unique tracks listened to */
  uniqueTracks: Set<string> | string[];
}

/**
 * Daily listening metrics record
 */
export interface DailyMetrics extends TimeBasedMetrics {
  /** ISO date string in YYYY-MM-DD format */
  date: string;
  /** Peak listening hour (0-23) */
  peakHour: number;
}

/**
 * Weekly listening metrics record
 */
export interface WeeklyMetrics extends TimeBasedMetrics {
  /** ISO week string in YYYY-Www format (e.g., 2023-W42) */
  date: string;
  /** Most active day of week (0-6, where 0 is Sunday) */
  mostActiveDay: number;
}

/**
 * Monthly listening metrics record
 */
export interface MonthlyMetrics extends TimeBasedMetrics {
  /** ISO month string in YYYY-MM format */
  date: string;
  /** Weekly trend data */
  weeklyTrend: number[];
}

/**
 * Genre-related metrics
 */
export interface GenreMetrics {
  /** Genre name */
  name: string;
  /** Total listening time in milliseconds */
  listeningTimeMs: number;
  /** Number of tracks played from this genre */
  tracksPlayed: number;
  /** Skip rate for this genre (0-1) */
  skipRate: number;
  /** Average listening time before skipping (milliseconds) */
  avgListeningBeforeSkipMs: number;
}

/**
 * Artist-related metrics
 */
export interface ArtistMetrics {
  /** Artist ID */
  id: string;
  /** Artist name */
  name: string;
  /** Total listening time in milliseconds */
  listeningTimeMs: number;
  /** Skip rate for this artist (0-1) */
  skipRate: number;
  /** Number of tracks played by this artist */
  tracksPlayed: number;
  /** Average listening time before skipping (milliseconds) */
  avgListeningBeforeSkipMs: number;
  /** Most played track ID */
  mostPlayedTrackId: string;
  /** Most skipped track ID */
  mostSkippedTrackId: string;
}

/**
 * Listening session information
 */
export interface ListeningSession {
  /** Unique session ID */
  id: string;
  /** Session start time (ISO string) */
  startTime: string;
  /** Session end time (ISO string) */
  endTime: string;
  /** Total session duration in milliseconds */
  durationMs: number;
  /** IDs of tracks played in this session */
  trackIds: string[];
  /** Number of tracks skipped in this session */
  skippedTracks: number;
  /** Device used for this session */
  deviceName: string;
  /** Device type used */
  deviceType: string;
}

/**
 * Global statistics aggregation
 */
export interface StatisticsData {
  /** Last updated timestamp */
  lastUpdated: string;
  /** Map of daily metrics by date string */
  dailyMetrics: Record<string, DailyMetrics>;
  /** Map of weekly metrics by week string */
  weeklyMetrics: Record<string, WeeklyMetrics>;
  /** Map of monthly metrics by month string */
  monthlyMetrics: Record<string, MonthlyMetrics>;
  /** Genre metrics by genre name */
  genreMetrics: Record<string, GenreMetrics>;
  /** Artist metrics by artist ID */
  artistMetrics: Record<string, ArtistMetrics>;
  /** Recent listening sessions */
  sessions: ListeningSession[];
  /** Total unique tracks played count */
  totalUniqueTracks: number;
  /** Total unique artists played count */
  totalUniqueArtists: number;
  /** Overall average skip rate (0-1) */
  overallSkipRate: number;
  /** Discovery rate - percentage of new artists/tracks over time (0-1) */
  discoveryRate: number;
  /** Total listening time in milliseconds */
  totalListeningTimeMs: number;
  /** Top genres by listening time */
  topGenres: string[];
  /** Top artists by listening time */
  topArtistIds: string[];
  /** Peak listening times distribution (24-hour format, 0-23) */
  hourlyDistribution: number[];
  /** Most active days (0-6, where 0 is Sunday) */
  dailyDistribution: number[];
}
