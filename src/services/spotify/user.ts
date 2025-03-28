/**
 * Spotify User Profile Service
 *
 * This module provides functionality for retrieving and managing user profile information
 * from the Spotify API. It handles fetching profile details such as display name,
 * profile image, country, and subscription level.
 *
 * Features:
 * - User profile information retrieval
 * - Automatic token validation before API calls
 * - Comprehensive error handling
 * - Automatic retry for failed API requests
 *
 * The user profile information is essential for personalizing the application
 * experience and displaying user-specific content throughout the interface.
 *
 * Usage:
 * ```typescript
 * import { getCurrentUser } from '@/services/spotify/user';
 *
 * // Fetch the current user's profile information
 * try {
 *   const profile = await getCurrentUser();
 *   console.log(`Hello, ${profile.display_name}!`);
 * } catch (error) {
 *   console.error('Failed to fetch user profile:', error);
 * }
 * ```
 *
 * @module SpotifyUserProfile
 */

import { SpotifyUserProfile } from "@/types/spotify-api";
import { saveLog } from "../../helpers/storage/logs-store";
import { retryApiCall } from "../api-retry";
import { API_BASE_URL } from "./constants";
import spotifyAxios from "./interceptors";
import { ensureValidToken, getAccessToken } from "./token";

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
