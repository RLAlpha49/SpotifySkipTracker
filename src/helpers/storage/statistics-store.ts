/**
 * Statistics storage module
 *
 * Manages persistence of listening statistics and metrics for analysis and visualization
 */

import { ensureDir, existsSync, readJsonSync, writeJsonSync } from "fs-extra";
import { join } from "path";
import { app } from "electron";
import { StatisticsData } from "@/types/statistics";

// File path for statistics storage
const statisticsFilePath = join(
  app.getPath("userData"),
  "data",
  "statistics.json",
);

/**
 * Default empty statistics data structure
 */
const defaultStatisticsData: StatisticsData = {
  lastUpdated: new Date().toISOString(),
  dailyMetrics: {},
  weeklyMetrics: {},
  monthlyMetrics: {},
  genreMetrics: {},
  artistMetrics: {},
  sessions: [],
  totalUniqueTracks: 0,
  totalUniqueArtists: 0,
  overallSkipRate: 0,
  discoveryRate: 0,
  totalListeningTimeMs: 0,
  topGenres: [],
  topArtistIds: [],
  hourlyDistribution: Array(24).fill(0),
  dailyDistribution: Array(7).fill(0),
};

/**
 * Retrieves statistics data from storage
 *
 * @returns Statistics data object
 */
export const getStatistics = async (): Promise<StatisticsData> => {
  try {
    await ensureDir(join(app.getPath("userData"), "data"));

    if (!existsSync(statisticsFilePath)) {
      await saveStatistics(defaultStatisticsData);
      return { ...defaultStatisticsData };
    }

    const statistics: StatisticsData = readJsonSync(statisticsFilePath);
    return statistics;
  } catch (error) {
    console.error("Error reading statistics:", error);
    throw error;
  }
};

/**
 * Saves statistics data to storage
 *
 * @param statistics Statistics data to save
 * @returns Boolean indicating success or failure
 */
export const saveStatistics = async (
  statistics: StatisticsData,
): Promise<boolean> => {
  try {
    await ensureDir(join(app.getPath("userData"), "data"));

    // Update the lastUpdated timestamp
    statistics.lastUpdated = new Date().toISOString();

    writeJsonSync(statisticsFilePath, statistics, { spaces: 2 });
    return true;
  } catch (error) {
    console.error("Error saving statistics:", error);
    return false;
  }
};

/**
 * Update statistics with data from a newly played or skipped track
 *
 * @param trackId Spotify ID of the track
 * @param trackName Name of the track
 * @param artistId Spotify ID of the artist
 * @param artistName Name of the artist
 * @param durationMs Duration of the track in milliseconds
 * @param wasSkipped Whether the track was skipped or played to completion
 * @param playedTimeMs How long the track was played in milliseconds
 * @param deviceName Name of the device used for playback
 * @param deviceType Type of the device used for playback
 * @param timestamp When the track was played (optional, defaults to now)
 * @returns Success or failure
 */
export async function updateTrackStatistics(
  trackId: string,
  trackName: string,
  artistId: string,
  artistName: string,
  durationMs: number,
  wasSkipped: boolean,
  playedTimeMs: number,
  deviceName: string | null,
  deviceType: string | null,
  timestamp: number = Date.now(),
): Promise<boolean> {
  try {
    // Get current statistics data
    const statistics = await getStatistics();
    const date = new Date(timestamp);

    // Get current date, week, and month strings (using current timestamp, not future dates)
    const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD
    const month = dateStr.substring(0, 7); // YYYY-MM

    // Calculate ISO week number
    const weekNum = getISOWeek(date);
    const weekStr = `${date.getFullYear()}-W${weekNum.toString().padStart(2, "0")}`;

    // Initialize properties if they don't exist
    if (!statistics.dailyMetrics) statistics.dailyMetrics = {};
    if (!statistics.weeklyMetrics) statistics.weeklyMetrics = {};
    if (!statistics.monthlyMetrics) statistics.monthlyMetrics = {};
    if (!statistics.artistMetrics) statistics.artistMetrics = {};
    if (!statistics.sessions) statistics.sessions = [];

    // Update daily metrics - ensure the object exists before accessing it
    const dailyMetric = statistics.dailyMetrics[dateStr] || {
      date: dateStr,
      listeningTimeMs: 0,
      tracksPlayed: 0,
      tracksSkipped: 0,
      uniqueArtists: new Set<string>(),
      uniqueTracks: new Set<string>(),
      peakHour: 0,
    };

    dailyMetric.listeningTimeMs += playedTimeMs;
    dailyMetric.tracksPlayed += 1;
    if (wasSkipped) dailyMetric.tracksSkipped += 1;

    // Ensure uniqueArtists is a Set
    if (!dailyMetric.uniqueArtists) {
      dailyMetric.uniqueArtists = new Set<string>();
    } else if (Array.isArray(dailyMetric.uniqueArtists)) {
      dailyMetric.uniqueArtists = new Set<string>(dailyMetric.uniqueArtists);
    }

    // Ensure uniqueTracks is a Set
    if (!dailyMetric.uniqueTracks) {
      dailyMetric.uniqueTracks = new Set<string>();
    } else if (Array.isArray(dailyMetric.uniqueTracks)) {
      dailyMetric.uniqueTracks = new Set<string>(dailyMetric.uniqueTracks);
    }

    // Now safely add to Sets
    (dailyMetric.uniqueArtists as Set<string>).add(artistId);
    (dailyMetric.uniqueTracks as Set<string>).add(trackId);

    // Update peak hour
    const hourOfDay = date.getHours();
    const hourlyDist = [...statistics.hourlyDistribution];
    hourlyDist[hourOfDay] += 1;
    statistics.hourlyDistribution = hourlyDist;

    if (hourlyDist[hourOfDay] > hourlyDist[dailyMetric.peakHour]) {
      dailyMetric.peakHour = hourOfDay;
    }

    statistics.dailyMetrics[dateStr] = dailyMetric;

    // Update day of week distribution
    const dayOfWeek = date.getDay(); // 0 (Sunday) to 6 (Saturday)
    const dailyDist = [...statistics.dailyDistribution];
    dailyDist[dayOfWeek] += 1;
    statistics.dailyDistribution = dailyDist;

    // Update weekly metrics
    const weeklyMetric = statistics.weeklyMetrics[weekStr] || {
      date: weekStr,
      listeningTimeMs: 0,
      tracksPlayed: 0,
      tracksSkipped: 0,
      uniqueArtists: new Set<string>(),
      uniqueTracks: new Set<string>(),
      mostActiveDay: 0,
    };

    weeklyMetric.listeningTimeMs += playedTimeMs;
    weeklyMetric.tracksPlayed += 1;
    if (wasSkipped) weeklyMetric.tracksSkipped += 1;

    // Ensure uniqueArtists is a Set
    if (!weeklyMetric.uniqueArtists) {
      weeklyMetric.uniqueArtists = new Set<string>();
    } else if (Array.isArray(weeklyMetric.uniqueArtists)) {
      weeklyMetric.uniqueArtists = new Set<string>(weeklyMetric.uniqueArtists);
    }

    // Ensure uniqueTracks is a Set
    if (!weeklyMetric.uniqueTracks) {
      weeklyMetric.uniqueTracks = new Set<string>();
    } else if (Array.isArray(weeklyMetric.uniqueTracks)) {
      weeklyMetric.uniqueTracks = new Set<string>(weeklyMetric.uniqueTracks);
    }

    // Now safely add to Sets
    (weeklyMetric.uniqueArtists as Set<string>).add(artistId);
    (weeklyMetric.uniqueTracks as Set<string>).add(trackId);

    // Update most active day for the week
    const weekDayDist = Array(7).fill(0);
    for (const date in statistics.dailyMetrics) {
      if (date.startsWith(weekStr.substring(0, 4))) {
        const dayDate = new Date(date);
        const weekNum = getISOWeek(dayDate);
        const weekOfDay = `${dayDate.getFullYear()}-W${weekNum.toString().padStart(2, "0")}`;

        if (weekOfDay === weekStr) {
          const dayIdx = dayDate.getDay();
          weekDayDist[dayIdx] += statistics.dailyMetrics[date].tracksPlayed;
        }
      }
    }

    weeklyMetric.mostActiveDay = weekDayDist.indexOf(Math.max(...weekDayDist));
    statistics.weeklyMetrics[weekStr] = weeklyMetric;

    // Update monthly metrics
    const monthlyMetric = statistics.monthlyMetrics[month] || {
      date: month,
      listeningTimeMs: 0,
      tracksPlayed: 0,
      tracksSkipped: 0,
      uniqueArtists: new Set<string>(),
      uniqueTracks: new Set<string>(),
      weeklyTrend: [],
    };

    monthlyMetric.listeningTimeMs += playedTimeMs;
    monthlyMetric.tracksPlayed += 1;
    if (wasSkipped) monthlyMetric.tracksSkipped += 1;

    // Ensure uniqueArtists is a Set
    if (!monthlyMetric.uniqueArtists) {
      monthlyMetric.uniqueArtists = new Set<string>();
    } else if (Array.isArray(monthlyMetric.uniqueArtists)) {
      monthlyMetric.uniqueArtists = new Set<string>(
        monthlyMetric.uniqueArtists,
      );
    }

    // Ensure uniqueTracks is a Set
    if (!monthlyMetric.uniqueTracks) {
      monthlyMetric.uniqueTracks = new Set<string>();
    } else if (Array.isArray(monthlyMetric.uniqueTracks)) {
      monthlyMetric.uniqueTracks = new Set<string>(monthlyMetric.uniqueTracks);
    }

    // Now safely add to Sets
    (monthlyMetric.uniqueArtists as Set<string>).add(artistId);
    (monthlyMetric.uniqueTracks as Set<string>).add(trackId);

    // Calculate weekly trends for the month
    const weeks = Object.keys(statistics.weeklyMetrics)
      .filter((w) => w.startsWith(month.substring(0, 4)))
      .filter((w) => {
        const weekDate = getDateOfISOWeek(
          parseInt(w.substring(6)),
          parseInt(w.substring(0, 4)),
        );
        return weekDate.toISOString().substring(0, 7) === month;
      });

    monthlyMetric.weeklyTrend = weeks.map(
      (w) => statistics.weeklyMetrics[w].tracksPlayed,
    );
    statistics.monthlyMetrics[month] = monthlyMetric;

    // Update artist metrics
    const artistMetric = statistics.artistMetrics[artistId] || {
      id: artistId,
      name: artistName,
      listeningTimeMs: 0,
      skipRate: 0,
      tracksPlayed: 0,
      avgListeningBeforeSkipMs: 0,
      mostPlayedTrackId: "",
      mostSkippedTrackId: "",
    };

    artistMetric.listeningTimeMs += playedTimeMs;
    artistMetric.tracksPlayed += 1;

    // Track most played and most skipped
    const artistTrackCount: Record<string, number> = {};
    const artistSkipCount: Record<string, number> = {};

    // Get existing data
    Object.values(statistics.sessions).forEach((session) => {
      session.trackIds.forEach((tid) => {
        if (tid === trackId) {
          artistTrackCount[tid] = (artistTrackCount[tid] || 0) + 1;
        }
      });
    });

    // Add current track play
    artistTrackCount[trackId] = (artistTrackCount[trackId] || 0) + 1;

    if (wasSkipped) {
      artistSkipCount[trackId] = (artistSkipCount[trackId] || 0) + 1;
    }

    // Find most played track
    let mostPlayed = artistMetric.mostPlayedTrackId;
    let maxPlays = 0;

    for (const [tid, count] of Object.entries(artistTrackCount)) {
      if (count > maxPlays) {
        maxPlays = count;
        mostPlayed = tid;
      }
    }

    // Find most skipped track
    let mostSkipped = artistMetric.mostSkippedTrackId;
    let maxSkips = 0;

    for (const [tid, count] of Object.entries(artistSkipCount)) {
      if (count > maxSkips) {
        maxSkips = count;
        mostSkipped = tid;
      }
    }

    artistMetric.mostPlayedTrackId = mostPlayed;
    artistMetric.mostSkippedTrackId = mostSkipped;

    // Update skip rate and average listening time
    const totalPlays = artistMetric.tracksPlayed;
    const newSkipRate =
      (artistMetric.skipRate * (totalPlays - 1) + (wasSkipped ? 1 : 0)) /
      totalPlays;

    artistMetric.skipRate = newSkipRate;

    if (wasSkipped) {
      const oldAvgTimeBeforeSkip = artistMetric.avgListeningBeforeSkipMs;
      const oldSkipCount = Math.round(artistMetric.skipRate * (totalPlays - 1));

      if (oldSkipCount > 0) {
        artistMetric.avgListeningBeforeSkipMs =
          (oldAvgTimeBeforeSkip * oldSkipCount + playedTimeMs) /
          (oldSkipCount + 1);
      } else {
        artistMetric.avgListeningBeforeSkipMs = playedTimeMs;
      }
    }

    statistics.artistMetrics[artistId] = artistMetric;

    // Update global statistics
    statistics.totalUniqueTracks = Object.values(
      statistics.dailyMetrics,
    ).reduce((set, day) => {
      if (day.uniqueTracks instanceof Set) {
        Array.from(day.uniqueTracks).forEach((id) => set.add(id));
      } else if (Array.isArray(day.uniqueTracks)) {
        day.uniqueTracks.forEach((id) => set.add(id));
      }
      return set;
    }, new Set<string>()).size;

    statistics.totalUniqueArtists = Object.values(
      statistics.dailyMetrics,
    ).reduce((set, day) => {
      if (day.uniqueArtists instanceof Set) {
        Array.from(day.uniqueArtists).forEach((id) => set.add(id));
      } else if (Array.isArray(day.uniqueArtists)) {
        day.uniqueArtists.forEach((id) => set.add(id));
      }
      return set;
    }, new Set<string>()).size;

    statistics.totalListeningTimeMs += playedTimeMs;

    // Calculate overall skip rate
    const totalTracks = Object.values(statistics.dailyMetrics).reduce(
      (sum, day) => sum + day.tracksPlayed,
      0,
    );

    const totalSkipped = Object.values(statistics.dailyMetrics).reduce(
      (sum, day) => sum + day.tracksSkipped,
      0,
    );

    statistics.overallSkipRate =
      totalTracks > 0 ? totalSkipped / totalTracks : 0;

    // Update top artists and calculate discovery rate
    const artistPlaytime: Record<string, number> = {};
    const firstAppearances: Record<string, string> = {}; // artistId -> first date

    // Calculate artist playtime and first appearances
    for (const [date, day] of Object.entries(statistics.dailyMetrics)) {
      let artists: string[] = [];

      // Handle both Set and array types
      if (day.uniqueArtists instanceof Set) {
        artists = Array.from(day.uniqueArtists);
      } else if (Array.isArray(day.uniqueArtists)) {
        artists = day.uniqueArtists;
      }

      artists.forEach((artistId) => {
        if (!firstAppearances[artistId] || date < firstAppearances[artistId]) {
          firstAppearances[artistId] = date;
        }
      });
    }

    // Sum up artist playtimes
    for (const [artistId, metrics] of Object.entries(
      statistics.artistMetrics,
    )) {
      artistPlaytime[artistId] = metrics.listeningTimeMs;
    }

    // Sort artists by playtime and get top IDs
    statistics.topArtistIds = Object.entries(artistPlaytime)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id]) => id);

    // Calculate discovery rate (new artists in last 30 days / total artists)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

    const newArtistsCount = Object.values(firstAppearances).filter(
      (date) => date >= thirtyDaysAgoStr,
    ).length;

    statistics.discoveryRate =
      statistics.totalUniqueArtists > 0
        ? newArtistsCount / statistics.totalUniqueArtists
        : 0;

    // Update sessions or create new session
    // Determine if this belongs to an existing session or starts a new one
    // Sessions are considered continuous if tracks are played within 30 minutes of each other
    const currentTime = timestamp;
    let sessionFound = false;

    if (statistics.sessions && statistics.sessions.length > 0) {
      // Reverse the array to find the most recent session first
      const recentSessions = [...statistics.sessions].reverse();

      for (const session of recentSessions) {
        const sessionEndTime = new Date(session.endTime).getTime();

        // If within 30 minutes (1800000ms), add to existing session
        if (currentTime - sessionEndTime <= 1800000) {
          session.endTime = new Date(currentTime).toISOString();
          session.durationMs =
            currentTime - new Date(session.startTime).getTime();
          session.trackIds.push(trackId);
          if (wasSkipped) session.skippedTracks += 1;
          session.deviceName = deviceName || session.deviceName;
          session.deviceType = deviceType || session.deviceType;
          sessionFound = true;
          break;
        }
      }
    }

    // If no suitable session found, create new one
    if (!sessionFound) {
      const newSession = {
        id: `session-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        startTime: new Date(currentTime).toISOString(),
        endTime: new Date(currentTime).toISOString(),
        durationMs: 0,
        trackIds: [trackId],
        skippedTracks: wasSkipped ? 1 : 0,
        deviceName: deviceName || "Unknown",
        deviceType: deviceType || "Unknown",
      };

      statistics.sessions.push(newSession);

      // Keep only the 100 most recent sessions
      if (statistics.sessions.length > 100) {
        statistics.sessions = statistics.sessions.slice(-100);
      }
    }

    // Save updated statistics
    try {
      await saveStatistics(statistics);
      return true;
    } catch (error) {
      console.error("Failed to save updated statistics:", error);
      return false;
    }
  } catch (error) {
    console.error("Failed to update track statistics:", error);
    return false;
  }
}

/**
 * Helper function to get the ISO week number from a date
 */
function getISOWeek(date: Date): number {
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  // Thursday in current week decides the year
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  // January 4 is always in week 1
  const week1 = new Date(d.getFullYear(), 0, 4);
  // Adjust to Thursday in week 1 and count number of weeks from date to week1
  return (
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7,
    )
  );
}

/**
 * Helper function to get a date from ISO week number
 */
function getDateOfISOWeek(week: number, year: number): Date {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dayOfWeek = simple.getDay();
  const ISOweekStart = simple;
  if (dayOfWeek <= 4)
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  return ISOweekStart;
}

/**
 * Clear all statistics data and reset to default empty state
 */
export const clearStatistics = async (): Promise<boolean> => {
  try {
    // Create a fresh default statistics object with current timestamp
    const freshDefault = {
      ...defaultStatisticsData,
      lastUpdated: new Date().toISOString(),
    };

    // Make sure directory exists
    await ensureDir(join(app.getPath("userData"), "data"));

    // Write the default data directly to file instead of using saveStatistics
    // to avoid any issues with async handling
    writeJsonSync(statisticsFilePath, freshDefault, { spaces: 2 });

    return true;
  } catch (error) {
    console.error("Error clearing statistics:", error);
    return false;
  }
};
