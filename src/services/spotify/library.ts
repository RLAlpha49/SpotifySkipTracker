/**
 * Spotify Library Management Service
 *
 * This module provides functionality for interacting with the user's Spotify library,
 * focusing on track management operations such as checking saved status, liking,
 * and unliking tracks.
 *
 * Features:
 * - Check if tracks are saved in the user's library
 * - Add tracks to the user's library (like/save)
 * - Remove tracks from the user's library (unlike/unsave)
 * - Silent operation mode for background checks
 * - Automatic token validation before API calls
 * - Comprehensive error handling with optional silent mode
 * - Automatic retry for API request failures
 *
 * The library management functionality is essential for implementing features
 * such as track favoriting, checking save status in playlists, and synchronizing
 * local application state with the user's Spotify library.
 *
 * Usage:
 * ```typescript
 * import {
 *   isTrackInLibrary,
 *   likeTrack,
 *   unlikeTrack
 * } from '@/services/spotify/library';
 *
 * // Check if a track is saved
 * const isSaved = await isTrackInLibrary('spotify:track:id');
 *
 * // Like and unlike tracks
 * await likeTrack('spotify:track:id');
 * await unlikeTrack('spotify:track:id');
 * ```
 *
 * @module SpotifyLibrary
 */

import { AxiosErrorResponse } from "@/types/spotify-api";
import { saveLog } from "../../helpers/storage/logs-store";
import { retryApiCall } from "../api-retry";
import { API_BASE_URL } from "./constants";
import spotifyAxios from "./interceptors";
import { ensureValidToken, getAccessToken } from "./token";

/**
 * Checks if a track is in the user's Spotify library
 *
 * @param trackId Spotify track ID to check
 * @param silent Whether to suppress error logs
 * @returns Promise resolving to true if track is in library
 */
export async function isTrackInLibrary(
  trackId: string,
  silent: boolean = false,
): Promise<boolean> {
  await ensureValidToken();

  try {
    const response = await retryApiCall(async () => {
      return await spotifyAxios.get(
        `${API_BASE_URL}/me/tracks/contains?ids=${trackId}`,
        {
          headers: {
            Authorization: `Bearer ${getAccessToken()}`,
          },
        },
      );
    });

    // Response is an array of booleans, one for each track ID
    return response.data[0] === true;
  } catch (error: unknown) {
    const err = error as Error;
    if (!silent) {
      saveLog(
        `Failed to check if track is in library: ${err.message}`,
        "ERROR",
      );
    }
    return false;
  }
}

/**
 * Adds a track to the user's Spotify library
 *
 * @param trackId Spotify track ID to add
 * @param silent Whether to suppress error logs
 * @returns Promise resolving to true if successful
 */
export async function likeTrack(
  trackId: string,
  silent: boolean = false,
): Promise<boolean> {
  await ensureValidToken();

  try {
    await retryApiCall(async () => {
      await spotifyAxios.put(
        `${API_BASE_URL}/me/tracks?ids=${trackId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${getAccessToken()}`,
          },
        },
      );
    });

    if (!silent) {
      saveLog(`Track ${trackId} saved to library`, "INFO");
    }
    return true;
  } catch (error: unknown) {
    const err = error as Error;
    if (!silent) {
      saveLog(`Failed to save track to library: ${err.message}`, "ERROR");
    }
    return false;
  }
}

/**
 * Removes a track from the user's Spotify library
 *
 * @param trackId Spotify track ID to remove
 * @param silent Whether to suppress error logs
 * @returns Promise resolving to true if successful
 */
export async function unlikeTrack(
  trackId: string,
  silent: boolean = false,
): Promise<boolean> {
  await ensureValidToken();

  try {
    await retryApiCall(async () => {
      await spotifyAxios.delete(`${API_BASE_URL}/me/tracks?ids=${trackId}`, {
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
        },
      });
    });

    if (!silent) {
      saveLog(`Track ${trackId} removed from library`, "INFO");
    }
    return true;
  } catch (error: unknown) {
    const err = error as Error & AxiosErrorResponse;
    if (!silent) {
      saveLog(`Failed to remove track from library: ${err.message}`, "ERROR");
    }
    return false;
  }
}
