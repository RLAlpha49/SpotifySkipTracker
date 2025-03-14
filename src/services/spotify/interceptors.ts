/**
 * Axios interceptors for Spotify API requests
 *
 * Handles automatic token refresh on 401 responses and other common API scenarios.
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { saveLog } from "../../helpers/storage/logs-store";
import { refreshAccessToken } from "../auth/storage/token-refresh";

// Extend the AxiosRequestConfig type to include our custom properties
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  metadata?: {
    startTime: number;
  };
  _retry?: boolean;
  _retryCount?: number;
}

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
// Queue to store failed requests during token refresh
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

// Maximum number of retries for 5xx errors
const MAX_RETRIES = 3;

const processQueue = (error: Error | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// Helper function to calculate exponential backoff delay
const getBackoffDelay = (retryCount: number): number => {
  return Math.min(1000 * Math.pow(2, retryCount), 10000);
};

// Helper function to determine if an error should be retried
const shouldRetry = (error: AxiosError): boolean => {
  // Retry on network errors
  if (!error.response) {
    return true;
  }

  const status = error.response.status;

  // Retry on 5xx server errors
  if (status >= 500 && status < 600) {
    return true;
  }

  // Retry on 429 (rate limit) errors
  if (status === 429) {
    return true;
  }

  return false;
};

// Create axios instance with interceptors
const spotifyAxios = axios.create({
  timeout: 10000, // 10 second timeout
});

// Request interceptor
spotifyAxios.interceptors.request.use(
  (config: CustomAxiosRequestConfig) => {
    // Add request timestamp for timeout tracking
    config.metadata = { startTime: new Date().getTime() };
    return config;
  },
  (error) => {
    saveLog(`Request interceptor error: ${error.message}`, "ERROR");
    return Promise.reject(error);
  },
);

// Response interceptor
spotifyAxios.interceptors.response.use(
  (response) => {
    // Log request duration
    const config = response.config as CustomAxiosRequestConfig;
    const duration = new Date().getTime() - (config.metadata?.startTime || 0);
    if (duration > 1000) {
      saveLog(
        `Slow request detected: ${config.url} took ${duration}ms`,
        "WARNING",
      );
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as CustomAxiosRequestConfig;

    if (!originalRequest) {
      saveLog("No request config available for error", "ERROR");
      return Promise.reject(error);
    }

    // Handle network errors
    if (!error.response) {
      saveLog(
        `Network error: ${error.message} for request to ${originalRequest.url}`,
        "ERROR",
      );
      return Promise.reject(error);
    }

    const status = error.response.status;

    // Handle 401 Unauthorized
    if (status === 401) {
      if (isRefreshing) {
        // If token refresh is in progress, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            // Retry the original request with the new token
            return spotifyAxios(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt to refresh the token
        const success = await refreshAccessToken();
        if (!success) {
          throw new Error("Failed to refresh token");
        }

        // Process any queued requests
        processQueue();

        // Retry the original request
        return spotifyAxios(originalRequest);
      } catch (refreshError) {
        // If refresh fails, reject all queued requests
        processQueue(refreshError as Error);
        saveLog("Token refresh failed, authentication required", "ERROR");
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle rate limiting (429)
    if (status === 429) {
      const retryAfter = parseInt(error.response.headers["retry-after"] || "1");
      saveLog(
        `Rate limited. Waiting ${retryAfter} seconds before retry...`,
        "WARNING",
      );
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      return spotifyAxios(originalRequest);
    }

    // Handle other errors that should be retried
    if (shouldRetry(error)) {
      const retryCount = (originalRequest._retryCount || 0) + 1;
      originalRequest._retryCount = retryCount;

      if (retryCount <= MAX_RETRIES) {
        const delay = getBackoffDelay(retryCount);
        saveLog(
          `Retrying request to ${originalRequest.url} after ${delay}ms (attempt ${retryCount}/${MAX_RETRIES})`,
          "WARNING",
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        return spotifyAxios(originalRequest);
      }
    }

    // Log error details for debugging
    saveLog(
      `API Error: ${status} ${error.message} for request to ${originalRequest.url}`,
      "ERROR",
    );

    return Promise.reject(error);
  },
);

export default spotifyAxios;
