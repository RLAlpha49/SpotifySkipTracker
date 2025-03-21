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
  /** Sequential skips count (number of times user skipped multiple tracks in a row) */
  sequentialSkips: number;
}

/**
 * Weekly listening metrics record
 */
export interface WeeklyMetrics extends TimeBasedMetrics {
  /** ISO week string in YYYY-Www format (e.g., 2023-W42) */
  date: string;
  /** Most active day of week (0-6, where 0 is Sunday) */
  mostActiveDay: number;
  /** Average listening session duration in milliseconds */
  avgSessionDurationMs: number;
}

/**
 * Monthly listening metrics record
 */
export interface MonthlyMetrics extends TimeBasedMetrics {
  /** ISO month string in YYYY-MM format */
  date: string;
  /** Weekly trend data */
  weeklyTrend: number[];
  /** Month-over-month change in skip rate (percentage) */
  skipRateChange: number;
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
  /** Times listened to in the last 30 days */
  recentListenCount: number;
  /** Whether this is a newly discovered artist (first listened in the last 30 days) */
  isNewDiscovery: boolean;
}

/**
 * Device-specific metrics
 */
export interface DeviceMetrics {
  /** Device type (e.g., Computer, Smartphone, Speaker) */
  deviceType: string;
  /** Device name */
  deviceName: string;
  /** Total listening time on this device */
  listeningTimeMs: number;
  /** Number of tracks played on this device */
  tracksPlayed: number;
  /** Skip rate on this device (0-1) */
  skipRate: number;
  /** Most common time of day used (hour 0-23) */
  peakUsageHour: number;
}

/**
 * Track-specific metrics beyond just skips
 */
export interface TrackMetrics {
  /** Track ID */
  id: string;
  /** Track name */
  name: string;
  /** Artist name */
  artistName: string;
  /** Total times played */
  playCount: number;
  /** Total times skipped */
  skipCount: number;
  /** Average percent of track listened before skipping (0-100) */
  avgCompletionPercent: number;
  /** Last played timestamp */
  lastPlayed: string;
  /** If track has been repeated within the same session */
  hasBeenRepeated: boolean;
}

/**
 * Sequential skip pattern tracking
 */
export interface SkipPatternMetrics {
  /** Date of pattern (YYYY-MM-DD) */
  date: string;
  /** Maximum consecutive skips in one session */
  maxConsecutiveSkips: number;
  /** Total number of skip sequences (2+ skips in a row) */
  skipSequenceCount: number;
  /** Average skips per sequence */
  avgSkipsPerSequence: number;
  /** Time periods with highest skip rates (hour 0-23) */
  highSkipRateHours: number[];
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
  /** Number of tracks repeated within this session */
  repeatedTracks: number;
  /** Longest streak of non-skipped tracks */
  longestNonSkipStreak: number;
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
  /** Top artists by listening time */
  topArtistIds: string[];
  /** Peak listening times distribution (24-hour format, 0-23) */
  hourlyDistribution: number[];
  /** Most active days (0-6, where 0 is Sunday) */
  dailyDistribution: number[];
  /** Device-specific metrics */
  deviceMetrics: Record<string, DeviceMetrics>;
  /** Track-specific detailed metrics */
  trackMetrics: Record<string, TrackMetrics>;
  /** Skip pattern analysis */
  skipPatterns: Record<string, SkipPatternMetrics>;
  /** Recently discovered artists (in last 30 days) */
  recentDiscoveries: string[];
  /** Average session duration in milliseconds */
  avgSessionDurationMs: number;
  /** Time spent listening by hour of day (24 hours) */
  hourlyListeningTime: number[];
  /** Repeat listening rate - percentage of repeated tracks in sessions */
  repeatListeningRate: number;
  /** Recent trends (last 14 days) of skip rates */
  recentSkipRateTrend: number[];
  /** Recent trends (last 14 days) of listening time */
  recentListeningTimeTrend: number[];
}
