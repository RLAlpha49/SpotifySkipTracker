/**
 * Spotify User Profile API
 *
 * Provides functions for retrieving user profile information from Spotify.
 */

import { saveLog } from "../../helpers/storage/logs-store";
import { API_BASE_URL } from "./constants";
import { SpotifyUserProfile } from "@/types/spotify-api";
import { ensureValidToken, getAccessToken } from "./token";
import { retryApiCall } from "../api-retry";
import spotifyAxios from "./interceptors";

/**
 * Retrieves the current user's Spotify profile
 *
 * @returns Promise resolving to user profile object
 * @throws Error if the request fails
 */
export async function getCurrentUser(): Promise<SpotifyUserProfile> {
  await ensureValidToken();

  try {
    const response = await retryApiCall(async () => {
      return await spotifyAxios.get(`${API_BASE_URL}/me`, {
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
        },
      });
    });

    saveLog("Successfully retrieved user profile", "DEBUG");
    return response.data as SpotifyUserProfile;
  } catch (error: unknown) {
    const err = error as Error;
    saveLog(`Failed to get user profile: ${err.message}`, "ERROR");
    throw new Error(`Failed to get user profile: ${err.message}`);
  }
}
