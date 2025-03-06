import { BrowserWindow } from "electron";
import {
  getCurrentPlayback,
  getRecentlyPlayedTracks,
  isTrackInLibrary,
  unlikeTrack,
} from "./spotify-api";
import { saveLog, getSettings } from "../helpers/storage/store";

interface PlaybackState {
  trackId: string | null;
  trackName: string | null;
  artistName: string | null;
  albumName: string | null;
  progress: number;
  duration: number;
  isInLibrary: boolean;
  lastProgress: number;
  recentTracks: string[];
  libraryStatusLogged: boolean;
  lastNowPlayingLog?: number;
}

let playbackState: PlaybackState = {
  trackId: null,
  trackName: null,
  artistName: null,
  albumName: null,
  progress: 0,
  duration: 0,
  isInLibrary: false,
  lastProgress: 0,
  recentTracks: [],
  libraryStatusLogged: false,
  lastNowPlayingLog: 0,
};

let monitoringInterval: NodeJS.Timeout | null = null;
let clientId: string;
let clientSecret: string;

// Define interfaces for Spotify API responses
interface SpotifyArtist {
  name: string;
  id: string;
}

interface SpotifyImage {
  url: string;
  height: number;
  width: number;
}

interface SpotifyAlbum {
  name: string;
  id: string;
  images: SpotifyImage[];
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  duration_ms: number;
}

interface SpotifyPlaybackItem {
  track: SpotifyTrack;
}

interface RecentlyPlayedResponse {
  items: SpotifyPlaybackItem[];
}

interface SkippedTrackInfo {
  id: string;
  name: string;
  artist: string;
  skipCount: number;
  lastSkipped: string;
}

/**
 * Start monitoring playback
 */
export function startPlaybackMonitoring(
  mainWindow: BrowserWindow,
  spotifyClientId: string,
  spotifyClientSecret: string,
): boolean {
  try {
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      saveLog("Restarting existing playback monitoring session", "DEBUG");
    }

    clientId = spotifyClientId;
    clientSecret = spotifyClientSecret;

    // Get settings for skip threshold
    const settings = getSettings();
    const skipProgressThreshold = settings.skipProgress / 100 || 0.7; // Convert from percentage to decimal

    saveLog(
      `Started Spotify playback monitoring (skip threshold: ${skipProgressThreshold * 100}%)`,
      "INFO",
    );

    // Initialize recent tracks
    updateRecentTracks();

    // Start monitoring interval
    monitoringInterval = setInterval(() => {
      monitorPlayback(mainWindow);
    }, 1000); // Check every 1 second

    return true;
  } catch (error) {
    saveLog(`Failed to start playback monitoring: ${error}`, "ERROR");
    return false;
  }
}

/**
 * Stop monitoring playback
 */
export function stopPlaybackMonitoring(): boolean {
  try {
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      monitoringInterval = null;

      saveLog("Stopped Spotify playback monitoring", "INFO");

      // Log summary info if we were tracking a song
      if (playbackState.trackId) {
        saveLog(
          `Last tracked song was: ${playbackState.trackName} by ${playbackState.artistName} at ${Math.round(
            (playbackState.lastProgress / playbackState.duration) * 100,
          )}% progress`,
          "DEBUG",
        );
      }

      return true;
    } else {
      saveLog("No active monitoring session to stop", "DEBUG");
      return true;
    }
  } catch (error) {
    saveLog(`Failed to stop playback monitoring: ${error}`, "ERROR");
    return false;
  }
}

/**
 * Check if monitoring is active
 */
export function isMonitoringActive(): boolean {
  return monitoringInterval !== null;
}

/**
 * Monitor playback and detect skips
 */
async function monitorPlayback(mainWindow: BrowserWindow): Promise<void> {
  try {
    // Get current playback from Spotify
    const playback = await getCurrentPlayback(clientId, clientSecret);

    if (!playback) {
      // Nothing is playing, reset tracking and notify renderer
      resetPlaybackState();

      // Send empty playback update to renderer
      mainWindow.webContents.send("spotify:playbackUpdate", {
        isPlaying: false,
        trackId: "",
        trackName: "",
        artistName: "",
        albumName: "",
        albumArt: "",
        progress: 0,
        duration: 0,
        isInPlaylist: false,
      });

      return;
    }

    // Extract playback data
    const isPlaying = playback.is_playing || false;
    const item = playback.item as SpotifyTrack;

    if (!isPlaying || !item) {
      resetPlaybackState();
      return;
    }

    // Extract track details
    const trackId = item.id;
    const trackName = item.name;
    const artistName = item.artists
      .map((artist: SpotifyArtist) => artist.name)
      .join(", ");
    const albumName = item.album.name;
    const albumArt = item.album.images[0]?.url || "";
    const progress = playback.progress_ms;
    const duration = item.duration_ms;

    // Check if track is in library (need to check if in a playlist in this implementation)
    const isInLibrary = await isTrackInLibrary(clientId, clientSecret, trackId);

    // If track changed, check for skip
    if (playbackState.trackId && playbackState.trackId !== trackId) {
      await handleTrackChange(trackId);
      // Track changed, reset the libraryStatusLogged flag
      playbackState.libraryStatusLogged = false;
    }

    // Log library status only when:
    // 1. This is a new track (different from last one)
    // 2. The track is in the library
    // 3. We haven't logged it yet
    if (
      isInLibrary &&
      !playbackState.libraryStatusLogged &&
      (playbackState.trackId !== trackId ||
        playbackState.isInLibrary !== isInLibrary)
    ) {
      saveLog(
        `Track "${trackName}" by ${artistName} is in your library - skips will be tracked`,
        "INFO",
      );
      playbackState.libraryStatusLogged = true;
    }

    // Store the current timestamp for logging purposes
    const now = Date.now();
    const lastNowPlayingLog = playbackState.lastNowPlayingLog || 0;

    // Log "Now playing" only when:
    // 1. This is a new track (different from last one)
    // 2. We haven't logged it yet in recent tracks
    // 3. OR it's been more than 30 seconds since the last "Now playing" log for this track
    const shouldLogNowPlaying =
      !playbackState.recentTracks.includes(trackId) ||
      trackId !== playbackState.trackId ||
      now - lastNowPlayingLog > 30000; // 30 seconds

    // Update playback state
    playbackState = {
      ...playbackState,
      trackId,
      trackName,
      artistName,
      albumName,
      progress,
      duration,
      isInLibrary,
      lastProgress: progress,
      // Maintain the libraryStatusLogged flag
      libraryStatusLogged: playbackState.libraryStatusLogged,
      // Update the timestamp for the last "Now playing" log if we're logging it
      lastNowPlayingLog: shouldLogNowPlaying
        ? now
        : playbackState.lastNowPlayingLog || now,
    };

    // Log first play of a track or periodic update
    if (shouldLogNowPlaying) {
      saveLog(`Now playing: ${trackName} by ${artistName}`, "DEBUG");
    }

    // Send playback update to renderer
    mainWindow.webContents.send("spotify:playbackUpdate", {
      isPlaying: true,
      trackId,
      trackName,
      artistName,
      albumName,
      albumArt,
      progress: Math.round((progress / duration) * 100),
      duration: Math.round(duration / 1000), // Convert to seconds
      isInPlaylist: isInLibrary,
    });
  } catch (error) {
    saveLog(`Error in playback monitoring: ${error}`, "ERROR");
  }
}

/**
 * Handle track change and detect skips
 */
async function handleTrackChange(newTrackId: string): Promise<void> {
  try {
    // Skip detection logic
    const settings = getSettings();
    const skipProgressThreshold = settings.skipProgress / 100 || 0.7; // Convert from percentage to decimal

    const progressPercentage =
      playbackState.lastProgress / playbackState.duration;

    // If we have a previous track and it's not in our recent tracks
    if (
      playbackState.trackId &&
      !playbackState.recentTracks.includes(newTrackId)
    ) {
      // Check if track was skipped
      if (progressPercentage > skipProgressThreshold) {
        // If track was in library, record the skip
        if (playbackState.isInLibrary) {
          // This is a skip - record it
          saveLog(
            `Track skipped: ${playbackState.trackName} by ${playbackState.artistName} (${Math.round(progressPercentage * 100)}% played)`,
            progressPercentage < 0.1 ? "DEBUG" : "INFO",
          );

          try {
            // Update skip count in storage
            const store = await import("../helpers/storage/store");
            await store.updateSkippedTrack({
              id: playbackState.trackId,
              name: playbackState.trackName || "",
              artist: playbackState.artistName || "",
              skipCount: 1,
              lastSkipped: new Date().toISOString(),
            } as SkippedTrackInfo);

            // Check if track should be unliked
            const skipThresholdCount = settings.skipThreshold || 3; // This is correctly using skipThreshold
            const skippedTracks = await getSkippedTracks();
            const skippedTrack = skippedTracks.find(
              (track) => track.id === playbackState.trackId,
            );

            if (skippedTrack && skippedTrack.skipCount >= skipThresholdCount) {
              // Unlike track
              saveLog(
                `Track "${playbackState.trackName}" by ${playbackState.artistName} has been skipped ${skippedTrack.skipCount} times, removing from library`,
                "INFO",
              );

              await unlikeTrack(clientId, clientSecret, playbackState.trackId);
            }
          } catch (error) {
            saveLog(`Error updating skipped track data: ${error}`, "ERROR");
          }
        }
      } else {
        // Track was played sufficiently
        saveLog(
          `Track completed: ${playbackState.trackName} by ${playbackState.artistName} (${Math.round(progressPercentage * 100)}%)`,
          "DEBUG",
        );
      }
    }

    // Update recent tracks list
    await updateRecentTracks();
  } catch (error) {
    saveLog(`Error handling track change: ${error}`, "ERROR");
  }
}

/**
 * Update the list of recent tracks
 */
async function updateRecentTracks(): Promise<void> {
  try {
    const recentlyPlayed = (await getRecentlyPlayedTracks(
      clientId,
      clientSecret,
    )) as RecentlyPlayedResponse;

    if (recentlyPlayed && recentlyPlayed.items) {
      playbackState.recentTracks = recentlyPlayed.items.map(
        (item: SpotifyPlaybackItem) => item.track.id,
      );
    }
  } catch (error) {
    saveLog(`Error updating recent tracks: ${error}`, "DEBUG");
  }
}

/**
 * Reset the playback state
 */
function resetPlaybackState(): void {
  playbackState = {
    ...playbackState,
    trackId: null,
    trackName: null,
    artistName: null,
    albumName: null,
    progress: 0,
    duration: 0,
    lastProgress: 0,
    libraryStatusLogged: false,
  };
}

/**
 * Get skipped tracks from storage
 */
async function getSkippedTracks(): Promise<SkippedTrackInfo[]> {
  try {
    // Import directly from the store module to avoid path issues
    const store = await import("../helpers/storage/store");
    return store.getSkippedTracks();
  } catch (error) {
    saveLog(`Error getting skipped tracks: ${error}`, "ERROR");
    return [];
  }
}
