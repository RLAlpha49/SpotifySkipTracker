/**
 * Spotify Playback Control
 *
 * Provides functions for controlling and monitoring playback on Spotify.
 */

import { saveLog } from "../../helpers/storage/logs-store";
import { API_BASE_URL } from "./constants";
import {
  SpotifyPlaybackState,
  SpotifyRecentlyPlayedResponse,
  SpotifyTrack,
  AxiosErrorResponse,
} from "@/types/spotify-api";
import { ensureValidToken, getAccessToken } from "./token";
import { retryApiCall } from "../api-retry";
import spotifyAxios from "./interceptors";

/**
 * Gets the user's current playback state
 *
 * @param detailed Whether to include additional playback state details
 * @returns Promise resolving to playback state or null if not playing
 * @throws Error if the request fails
 */
export async function getCurrentPlayback(
  detailed: boolean = false,
): Promise<SpotifyPlaybackState | null> {
  await ensureValidToken();

  try {
    const response = await retryApiCall(async () => {
      return await spotifyAxios.get(
        `${API_BASE_URL}/me/player${detailed ? "?additional_types=episode" : ""}`,
        {
          headers: {
            Authorization: `Bearer ${getAccessToken()}`,
          },
        },
      );
    }, 3);

    // Spotify returns 204 No Content if user is not playing anything
    if (response.status === 204 || !response.data) {
      return null;
    }

    return response.data as SpotifyPlaybackState;
  } catch (error: unknown) {
    const err = error as Error & AxiosErrorResponse;

    // Don't log 4xx errors as they're usually expected
    if (
      err.response &&
      err.response.status >= 400 &&
      err.response.status < 500
    ) {
      return null;
    }

    saveLog(`Failed to get playback state: ${err.message}`, "ERROR");
    throw new Error(`Failed to get playback state: ${err.message}`);
  }
}

/**
 * Gets a specific track by its Spotify ID
 *
 * @param trackId The Spotify track ID to retrieve
 * @returns Promise resolving to the track data or null if not found
 * @throws Error if the request fails
 */
export async function getTrack(trackId: string): Promise<SpotifyTrack | null> {
  await ensureValidToken();

  try {
    const response = await retryApiCall(async () => {
      return await spotifyAxios.get(`${API_BASE_URL}/tracks/${trackId}`, {
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
        },
      });
    });

    return response.data as SpotifyTrack;
  } catch (error: unknown) {
    const err = error as Error & AxiosErrorResponse;

    // Don't log 404 errors as they just mean the track wasn't found
    if (err.response && err.response.status === 404) {
      return null;
    }

    saveLog(`Failed to get track ${trackId}: ${err.message}`, "ERROR");
    throw new Error(`Failed to get track ${trackId}: ${err.message}`);
  }
}

/**
 * Gets the user's recently played tracks
 *
 * @param limit Maximum number of tracks to return (default: 5)
 * @returns Promise resolving to recently played track data
 * @throws Error if the request fails
 */
export async function getRecentlyPlayedTracks(
  limit: number = 5,
): Promise<SpotifyRecentlyPlayedResponse> {
  await ensureValidToken();

  try {
    const response = await retryApiCall(async () => {
      return await spotifyAxios.get(
        `${API_BASE_URL}/me/player/recently-played?limit=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${getAccessToken()}`,
          },
        },
      );
    });

    return response.data as SpotifyRecentlyPlayedResponse;
  } catch (error: unknown) {
    const err = error as Error;
    saveLog(`Failed to get recently played tracks: ${err.message}`, "ERROR");
    throw new Error(`Failed to get recently played tracks: ${err.message}`);
  }
}

/**
 * Pauses the user's playback
 *
 * @throws Error if the request fails
 */
export async function pause(): Promise<void> {
  await ensureValidToken();

  try {
    await retryApiCall(async () => {
      await spotifyAxios.put(
        `${API_BASE_URL}/me/player/pause`,
        {},
        {
          headers: {
            Authorization: `Bearer ${getAccessToken()}`,
          },
        },
      );
    });
  } catch (error: unknown) {
    const err = error as Error & AxiosErrorResponse;

    // Ignore 403/404 errors which usually mean no active device
    if (
      err.response &&
      (err.response.status === 403 || err.response.status === 404)
    ) {
      return;
    }

    saveLog(`Failed to pause playback: ${err.message}`, "ERROR");
    throw new Error(`Failed to pause playback: ${err.message}`);
  }
}

/**
 * Resumes the user's playback
 *
 * @throws Error if the request fails
 */
export async function play(): Promise<void> {
  await ensureValidToken();

  try {
    await retryApiCall(async () => {
      await spotifyAxios.put(
        `${API_BASE_URL}/me/player/play`,
        {},
        {
          headers: {
            Authorization: `Bearer ${getAccessToken()}`,
          },
        },
      );
    });
  } catch (error: unknown) {
    const err = error as Error & AxiosErrorResponse;

    // Ignore 403/404 errors which usually mean no active device
    if (
      err.response &&
      (err.response.status === 403 || err.response.status === 404)
    ) {
      return;
    }

    saveLog(`Failed to resume playback: ${err.message}`, "ERROR");
    throw new Error(`Failed to resume playback: ${err.message}`);
  }
}

/**
 * Skips to the previous track
 *
 * @throws Error if the request fails
 */
export async function skipToPrevious(): Promise<void> {
  await ensureValidToken();

  await retryApiCall(async () => {
    await spotifyAxios.post(
      `${API_BASE_URL}/me/player/previous`,
      {},
      {
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
        },
      },
    );
  });
}

/**
 * Skips to the next track
 *
 * @throws Error if the request fails
 */
export async function skipToNext(): Promise<void> {
  await ensureValidToken();

  await retryApiCall(async () => {
    await spotifyAxios.post(
      `${API_BASE_URL}/me/player/next`,
      {},
      {
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
        },
      },
    );
  });
}
