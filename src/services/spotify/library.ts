/**
 * Spotify Library Management
 *
 * Provides functions for interacting with the user's Spotify library,
 * including checking and manipulating saved tracks.
 */

import axios from "axios";
import { saveLog } from "../../helpers/storage/logs-store";
import { API_BASE_URL } from "./constants";
import { AxiosErrorResponse } from "@/types/spotify-api";
import { ensureValidToken, getAccessToken } from "./token";
import { retryApiCall } from "../api-retry";

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
      return await axios.get(
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
      await axios.put(
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
      await axios.delete(`${API_BASE_URL}/me/tracks?ids=${trackId}`, {
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
