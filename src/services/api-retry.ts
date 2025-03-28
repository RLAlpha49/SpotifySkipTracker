/**
 * API Retry Utility Module
 *
 * This module provides robust functionality for retrying failed API requests with
 * configurable strategies to improve application reliability in unreliable network
 * conditions or when dealing with service instabilities.
 *
 * Features:
 * - Configurable maximum retry attempts with sensible defaults
 * - Exponential backoff algorithm for progressively increasing wait time
 * - Random jitter to prevent thundering herd problems during service recovery
 * - Comprehensive error logging with attempt tracking and history
 * - Configurable initial delay to customize retry timing
 * - Automatic failure propagation after maximum attempts
 * - Intelligent delay capping to prevent excessive waits
 *
 * The retry system is particularly valuable for Spotify API interactions where
 * temporary rate limiting, network instabilities, or service hiccups can occur.
 * The exponential backoff approach ensures the application doesn't flood the API
 * with retry attempts during outages while still providing resilience.
 *
 * @module APIRetryService
 */

import { saveLog } from "../helpers/storage/store";

/**
 * Retries an API call with exponential backoff and jitter
 *
 * Executes an API call and automatically retries it with increasing delay
 * on failure, using a combination of exponential backoff and random jitter
 * to avoid overwhelming the API during recovery periods.
 *
 * The backoff algorithm works as follows:
 * 1. Initial delay starts at initialDelayMs
 * 2. After each failure, delay increases by ~1.5x (with small random variation)
 * 3. Maximum delay is capped at 10 seconds regardless of retry count
 * 4. Random jitter of ±10% is applied to prevent synchronized retries
 *
 * @param apiCallFn - Function that makes the API request to retry
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param initialDelayMs - Initial delay between retries in milliseconds (default: 1000)
 * @returns Promise resolving to the API call result
 * @throws Error when all retry attempts are exhausted
 *
 * @example
 * // Retry a Spotify API call up to 5 times
 * const playbackState = await retryApiCall(
 *   () => spotifyApi.getMyCurrentPlaybackState(),
 *   5,
 *   500
 * );
 */
export async function retryApiCall<T>(
  apiCallFn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000,
): Promise<T> {
  let lastError: Error | null = null;
  let currentDelay = initialDelayMs;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCallFn();
    } catch (error: unknown) {
      lastError = error as Error;
      const errorMessage = lastError.message || String(lastError);

      // If this is the last attempt, log as ERROR
      if (attempt === maxRetries) {
        saveLog(
          `API request failed after ${maxRetries} attempts: ${errorMessage}`,
          "ERROR",
        );
        // Let the error propagate to be handled by the caller
        throw new Error(
          `API request failed after ${maxRetries} attempts: ${errorMessage}`,
        );
      }

      // Otherwise log as WARNING and retry
      saveLog(
        `API request failed (attempt ${attempt}/${maxRetries}): ${errorMessage}. Retrying in ${Math.round(currentDelay)}ms...`,
        "WARNING",
      );

      // Wait before retrying with exponential backoff
      await new Promise((resolve) => setTimeout(resolve, currentDelay));

      // Implement exponential backoff with jitter
      currentDelay =
        Math.min(currentDelay * 1.5, 10000) * (0.9 + Math.random() * 0.2);
    }
  }

  // This should never be reached due to the throw in the last iteration
  throw lastError;
}
