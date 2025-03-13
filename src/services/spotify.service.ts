/**
 * Renderer process Spotify service
 *
 * Provides type-safe interface for IPC communication with the main process
 * to access Spotify API functionality. Handles all renderer-side interactions
 * with Spotify features implemented in the main process.
 *
 * All methods communicate via predefined IPC channels to corresponding
 * main process handlers.
 */

import { ipcRenderer } from "electron";
import { SkippedTrack } from "@/types/spotify";

/**
 * Spotify API authentication credentials
 */
export interface SpotifyCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/**
 * Current playback state information
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
 * Core application configuration settings
 */
export interface SpotifySettings {
  skipThreshold: number;
  timeframeInDays: number;
  skipProgress: number;
}

/**
 * Spotify API interaction service
 * Facilitates renderer-to-main process communication
 */
class SpotifyService {
  /**
   * Authenticates with Spotify API
   *
   * @param credentials - Optional Spotify credentials (uses stored if omitted)
   * @returns Promise resolving to authentication success status
   */
  public async authenticate(
    credentials?: SpotifyCredentials,
  ): Promise<boolean> {
    try {
      return await ipcRenderer.invoke("spotify:authenticate", credentials);
    } catch (error) {
      console.error("Authentication error:", error);
      return false;
    }
  }

  /**
   * Terminates Spotify session and clears stored tokens
   *
   * @returns Promise resolving to logout success status
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
   * Verifies if user has valid Spotify authentication
   *
   * @returns Promise resolving to authentication status
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
   * Retrieves current Spotify playback state
   *
   * @returns Promise resolving to playback data or null if inactive
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
   * Retrieves skip tracking data for all monitored tracks
   *
   * @returns Promise resolving to array of tracked tracks
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
   * Updates skip tracking data from storage
   *
   * @returns Promise resolving to refreshed tracks array
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
   * Persists application settings
   *
   * @param settings - Configuration settings to store
   * @returns Promise resolving to save operation success status
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
   * Retrieves application settings
   *
   * @returns Promise resolving to current settings or defaults
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
   * Initiates Spotify playback monitoring
   *
   * @returns Promise resolving to operation success status
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
   * Terminates Spotify playback monitoring
   *
   * @returns Promise resolving to operation success status
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
   * Checks if playback monitoring is currently active
   *
   * @returns Promise resolving to monitoring state
   */
  public async isMonitoringActive(): Promise<boolean> {
    try {
      return await ipcRenderer.invoke("spotify:isMonitoringActive");
    } catch (error) {
      console.error("Check monitoring status error:", error);
      return false;
    }
  }

  /**
   * Pauses Spotify playback
   *
   * @returns Promise resolving to operation success status
   */
  public async pausePlayback(): Promise<boolean> {
    try {
      return await ipcRenderer.invoke("spotify:pausePlayback");
    } catch (error) {
      console.error("Pause playback error:", error);
      return false;
    }
  }

  /**
   * Resumes Spotify playback
   *
   * @returns Promise resolving to operation success status
   */
  public async resumePlayback(): Promise<boolean> {
    try {
      return await ipcRenderer.invoke("spotify:resumePlayback");
    } catch (error) {
      console.error("Resume playback error:", error);
      return false;
    }
  }

  /**
   * Skips to previous track in queue
   *
   * @returns Promise resolving to operation success status
   */
  public async skipToPreviousTrack(): Promise<boolean> {
    try {
      return await ipcRenderer.invoke("spotify:skipToPreviousTrack");
    } catch (error) {
      console.error("Skip to previous track error:", error);
      return false;
    }
  }

  /**
   * Skips to next track in queue
   *
   * @returns Promise resolving to operation success status
   */
  public async skipToNextTrack(): Promise<boolean> {
    try {
      return await ipcRenderer.invoke("spotify:skipToNextTrack");
    } catch (error) {
      console.error("Skip to next track error:", error);
      return false;
    }
  }
}

// Export a singleton instance
export const spotifyService = new SpotifyService();
