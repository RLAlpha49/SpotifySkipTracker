/**
 * Spotify Service for Renderer Process
 *
 * This service provides a type-safe wrapper around the IPC communication with the main process
 * for Spotify-related functionality. It's used by the React/renderer side of the application
 * to interact with Spotify API features that are implemented in the main process.
 *
 * All methods in this service communicate via IPC channels with corresponding handlers
 * in the main process, which perform the actual API calls and return the results.
 */

import { ipcRenderer } from "electron";

/**
 * Spotify API credentials interface
 */
export interface SpotifyCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/**
 * Information about the currently playing track
 */
export interface SpotifyPlaybackInfo {
  isPlaying: boolean;
  trackId: string;
  trackName: string;
  artistName: string;
  albumName: string;
  albumArt: string;
  progress: number;
  duration: number;
}

/**
 * Statistics about a track that has been skipped
 */
export interface SkippedTrack {
  id: string;
  name: string;
  artist: string;
  skipCount: number;
  notSkippedCount: number;
  lastSkipped: string;
}

/**
 * Application settings for skip behavior
 */
export interface SpotifySettings {
  skipThreshold: number;
  timeframeInDays: number;
  skipProgress: number;
}

/**
 * Service class that provides methods to interact with Spotify functionality
 * through IPC communication with the main process
 */
class SpotifyService {
  /**
   * Authenticate with Spotify using provided credentials
   *
   * @param credentials - Optional Spotify API credentials (if not provided, stored credentials are used)
   * @returns Promise resolving to true if authentication was successful
   */
  public async authenticate(
    credentials?: SpotifyCredentials,
  ): Promise<boolean> {
    try {
      // In a real application, this would send an IPC message to the main process
      // which would handle the OAuth flow with Spotify
      return await ipcRenderer.invoke("spotify:authenticate", credentials);
    } catch (error) {
      console.error("Authentication error:", error);
      return false;
    }
  }

  /**
   * Log out from Spotify and clear stored tokens
   *
   * @returns Promise resolving to true if logout was successful
   */
  public async logout(): Promise<boolean> {
    try {
      return await ipcRenderer.invoke("spotify:logout");
    } catch (error) {
      console.error("Logout error:", error);
      return false;
    }
  }

  /**
   * Check if the user is currently authenticated with Spotify
   *
   * @returns Promise resolving to true if authenticated, false otherwise
   */
  public async isAuthenticated(): Promise<boolean> {
    try {
      return await ipcRenderer.invoke("spotify:isAuthenticated");
    } catch (error) {
      console.error("Authentication check error:", error);
      return false;
    }
  }

  /**
   * Get the current playback state from Spotify
   *
   * @returns Promise resolving to playback information or null if nothing is playing
   */
  public async getCurrentPlayback(): Promise<SpotifyPlaybackInfo | null> {
    try {
      return await ipcRenderer.invoke("spotify:getCurrentPlayback");
    } catch (error) {
      console.error("Get current playback error:", error);
      return null;
    }
  }

  /**
   * Get the list of tracks that have been skipped
   *
   * @returns Promise resolving to an array of skipped track information
   */
  public async getSkippedTracks(): Promise<SkippedTrack[]> {
    try {
      return await ipcRenderer.invoke("spotify:getSkippedTracks");
    } catch (error) {
      console.error("Get skipped tracks error:", error);
      return [];
    }
  }

  /**
   * Refresh the list of skipped tracks (typically after changes)
   *
   * @returns Promise resolving to the updated array of skipped track information
   */
  public async refreshSkippedTracks(): Promise<SkippedTrack[]> {
    try {
      return await ipcRenderer.invoke("spotify:refreshSkippedTracks");
    } catch (error) {
      console.error("Refresh skipped tracks error:", error);
      return [];
    }
  }

  /**
   * Save application settings
   *
   * @param settings - The settings to save
   * @returns Promise resolving to true if settings were saved successfully
   */
  public async saveSettings(settings: SpotifySettings): Promise<boolean> {
    try {
      return await ipcRenderer.invoke("spotify:saveSettings", settings);
    } catch (error) {
      console.error("Save settings error:", error);
      return false;
    }
  }

  /**
   * Get current application settings
   *
   * @returns Promise resolving to the current settings
   */
  public async getSettings(): Promise<SpotifySettings> {
    try {
      return await ipcRenderer.invoke("spotify:getSettings");
    } catch (error) {
      console.error("Get settings error:", error);
      return {
        skipThreshold: 3,
        timeframeInDays: 30,
        skipProgress: 70,
      };
    }
  }

  /**
   * Start monitoring Spotify playback
   *
   * @returns Promise resolving to true if monitoring started successfully
   */
  public async startMonitoring(): Promise<boolean> {
    try {
      return await ipcRenderer.invoke("spotify:startMonitoring");
    } catch (error) {
      console.error("Start monitoring error:", error);
      return false;
    }
  }

  /**
   * Stop monitoring Spotify playback
   *
   * @returns Promise resolving to true if monitoring stopped successfully
   */
  public async stopMonitoring(): Promise<boolean> {
    try {
      return await ipcRenderer.invoke("spotify:stopMonitoring");
    } catch (error) {
      console.error("Stop monitoring error:", error);
      return false;
    }
  }

  /**
   * Check if playback monitoring is currently active
   *
   * @returns Promise resolving to true if monitoring is active
   */
  public async isMonitoringActive(): Promise<boolean> {
    try {
      return await ipcRenderer.invoke("spotify:isMonitoringActive");
    } catch (error) {
      console.error("Check monitoring status error:", error);
      return false;
    }
  }
}

// Export a singleton instance
export const spotifyService = new SpotifyService();
