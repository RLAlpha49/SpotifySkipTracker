import { ipcRenderer } from "electron";

// Define interfaces for the service
export interface SpotifyCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

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

export interface SkippedTrack {
  id: string;
  name: string;
  artist: string;
  skipCount: number;
  lastSkipped: string;
}

export interface SpotifySettings {
  skipThreshold: number;
  timeframeInDays: number;
  skipProgress: number;
}

// Spotify Service
class SpotifyService {
  // Authentication methods
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

  public async logout(): Promise<boolean> {
    try {
      return await ipcRenderer.invoke("spotify:logout");
    } catch (error) {
      console.error("Logout error:", error);
      return false;
    }
  }

  public async isAuthenticated(): Promise<boolean> {
    try {
      return await ipcRenderer.invoke("spotify:isAuthenticated");
    } catch (error) {
      console.error("Authentication check error:", error);
      return false;
    }
  }

  // Playback methods
  public async getCurrentPlayback(): Promise<SpotifyPlaybackInfo | null> {
    try {
      return await ipcRenderer.invoke("spotify:getCurrentPlayback");
    } catch (error) {
      console.error("Get current playback error:", error);
      return null;
    }
  }

  // Skipped tracks methods
  public async getSkippedTracks(): Promise<SkippedTrack[]> {
    try {
      return await ipcRenderer.invoke("spotify:getSkippedTracks");
    } catch (error) {
      console.error("Get skipped tracks error:", error);
      return [];
    }
  }

  public async refreshSkippedTracks(): Promise<SkippedTrack[]> {
    try {
      return await ipcRenderer.invoke("spotify:refreshSkippedTracks");
    } catch (error) {
      console.error("Refresh skipped tracks error:", error);
      return [];
    }
  }

  // Settings methods
  public async saveSettings(settings: SpotifySettings): Promise<boolean> {
    try {
      return await ipcRenderer.invoke("spotify:saveSettings", settings);
    } catch (error) {
      console.error("Save settings error:", error);
      return false;
    }
  }

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

  // Service methods
  public async startMonitoring(): Promise<boolean> {
    try {
      return await ipcRenderer.invoke("spotify:startMonitoring");
    } catch (error) {
      console.error("Start monitoring error:", error);
      return false;
    }
  }

  public async stopMonitoring(): Promise<boolean> {
    try {
      return await ipcRenderer.invoke("spotify:stopMonitoring");
    } catch (error) {
      console.error("Stop monitoring error:", error);
      return false;
    }
  }
}

// Export a singleton instance
export const spotifyService = new SpotifyService();
