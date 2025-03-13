/**
 * API retry utility module
 *
 * Provides functionality for retrying failed API requests with
 * exponential backoff and jitter strategies to improve reliability.
 */

import { saveLog } from "../helpers/storage/store";

/**
 * Retries an API call with exponential backoff and jitter
 *
 * @param apiCallFn - Function that makes the API request to retry
 * @param maxRetries - Maximum number of retry attempts
 * @param initialDelayMs - Initial delay between retries in milliseconds
 * @returns Promise resolving to the API call result
 * @throws Error when all retry attempts are exhausted
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
