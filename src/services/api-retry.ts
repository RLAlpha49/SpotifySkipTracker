/**
 * API Retry Utility
 *
 * This module provides utilities for handling retries of API requests.
 * It implements exponential backoff with jitter for more efficient retries.
 */

import { saveLog } from "../helpers/storage/store";

/**
 * Retry an API call with exponential backoff and jitter
 *
 * @param apiCallFn - The API call function to retry
 * @param maxRetries - Maximum number of retry attempts (default: 5)
 * @param initialDelayMs - Initial delay between retries in milliseconds (default: 1000)
 * @returns The result of the successful API call
 * @throws Error after all retry attempts fail
 */
export async function retryApiCall<T>(
  apiCallFn: () => Promise<T>,
  maxRetries: number = 5,
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
