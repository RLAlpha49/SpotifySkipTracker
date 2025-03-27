import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { setupSpotifyInterceptors } from "../../../../services/spotify/interceptors";

// Mock dependencies
vi.mock("axios", () => {
  const mockedAxios = {
    interceptors: {
      request: {
        use: vi.fn(),
        eject: vi.fn(),
      },
      response: {
        use: vi.fn(),
        eject: vi.fn(),
      },
    },
    create: vi.fn().mockReturnThis(),
    defaults: {
      headers: {
        common: {},
      },
    },
  };
  return mockedAxios;
});
vi.mock("../../../../helpers/storage/logs-store", () => ({
  saveLog: vi.fn(),
}));
vi.mock("../../../../services/spotify/token", () => ({
  refreshAccessToken: vi.fn(),
  isTokenValid: vi.fn(),
  getAccessToken: vi.fn().mockReturnValue("mock-access-token"),
  ensureValidToken: vi.fn(),
}));

import { saveLog } from "../../../../helpers/storage/logs-store";
import {
  ensureValidToken,
  getAccessToken,
  isTokenValid,
  refreshAccessToken,
} from "../../../../services/spotify/token";

describe("Spotify Interceptors", () => {
  // Store interceptors for testing
  let requestInterceptor: (config: AxiosRequestConfig) => AxiosRequestConfig;
  let requestErrorInterceptor: (error: any) => Promise<any>;
  let responseInterceptor: (response: AxiosResponse) => AxiosResponse;
  let responseErrorInterceptor: (error: any) => Promise<any>;

  beforeEach(() => {
    vi.resetAllMocks();

    // Capture the interceptors when they're set up
    vi.mocked(axios.interceptors.request.use).mockImplementation(
      (onFulfilled, onRejected) => {
        requestInterceptor = onFulfilled as any;
        requestErrorInterceptor = onRejected as any;
        return 1; // Mock interceptor ID
      },
    );

    vi.mocked(axios.interceptors.response.use).mockImplementation(
      (onFulfilled, onRejected) => {
        responseInterceptor = onFulfilled as any;
        responseErrorInterceptor = onRejected as any;
        return 2; // Mock interceptor ID
      },
    );

    // Set up interceptors
    setupSpotifyInterceptors();
  });

  describe("setup", () => {
    it("should register request and response interceptors", () => {
      expect(axios.interceptors.request.use).toHaveBeenCalled();
      expect(axios.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe("request interceptor", () => {
    it("should add Authorization header with access token for Spotify API requests", async () => {
      // Mock valid token
      vi.mocked(isTokenValid).mockReturnValueOnce(true);
      vi.mocked(getAccessToken).mockReturnValueOnce("valid-token");

      const config: AxiosRequestConfig = {
        url: "https://api.spotify.com/v1/me",
        headers: {},
      };

      const resultConfig = await requestInterceptor(config);

      // Verify token was added to headers
      expect(resultConfig.headers).toHaveProperty(
        "Authorization",
        "Bearer valid-token",
      );
    });

    it("should call ensureValidToken for Spotify API requests", async () => {
      const config: AxiosRequestConfig = {
        url: "https://api.spotify.com/v1/me",
        headers: {},
      };

      await requestInterceptor(config);

      // Verify token validity was checked
      expect(ensureValidToken).toHaveBeenCalled();
    });

    it("should not add Authorization header for non-Spotify API requests", async () => {
      const config: AxiosRequestConfig = {
        url: "https://example.com/api",
        headers: {},
      };

      const resultConfig = await requestInterceptor(config);

      // Verify no token was added
      expect(resultConfig.headers).not.toHaveProperty("Authorization");
      expect(ensureValidToken).not.toHaveBeenCalled();
    });

    it("should pass through request errors", async () => {
      const error = new Error("Request error");

      // This should just pass through the error
      await expect(requestErrorInterceptor(error)).rejects.toThrow(
        "Request error",
      );
    });
  });

  describe("response interceptor", () => {
    it("should pass through successful responses", () => {
      const response: AxiosResponse = {
        data: { success: true },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as any,
      };

      const result = responseInterceptor(response);

      // Verify response was passed through unchanged
      expect(result).toBe(response);
    });

    it("should handle 401 errors by refreshing token and retrying", async () => {
      const originalRequest = {
        headers: {},
        _retry: false,
      };

      // Create 401 error
      const error: Partial<AxiosError> = {
        config: originalRequest as any,
        response: {
          status: 401,
          data: { error: "invalid_token" },
          statusText: "Unauthorized",
          headers: {},
          config: {} as any,
        } as AxiosResponse,
        isAxiosError: true,
        message: "Request failed with status code 401",
      };

      // Mock refreshAccessToken to succeed
      vi.mocked(refreshAccessToken).mockResolvedValueOnce({
        access_token: "new-token",
        refresh_token: "new-refresh-token",
        expires_in: 3600,
      });

      // Mock axios to succeed on retry
      const axiosOriginal = axios as any;
      axiosOriginal.mockResolvedValueOnce({ data: "success", status: 200 });

      // Try to recover from error
      const result = await responseErrorInterceptor(error);

      // Verify token was refreshed
      expect(refreshAccessToken).toHaveBeenCalled();

      // Verify original request was retried with new token
      expect(originalRequest._retry).toBe(true);
      expect(originalRequest.headers["Authorization"]).toBe("Bearer new-token");

      // The retry should return success
      expect(result).toEqual({ data: "success", status: 200 });
    });

    it("should not retry 401 errors that have already been retried", async () => {
      const originalRequest = {
        headers: {},
        _retry: true, // Already retried
      };

      // Create 401 error
      const error: Partial<AxiosError> = {
        config: originalRequest as any,
        response: {
          status: 401,
          data: { error: "invalid_token" },
          statusText: "Unauthorized",
          headers: {},
          config: {} as any,
        } as AxiosResponse,
        isAxiosError: true,
        message: "Request failed with status code 401",
      };

      // Try to recover from error
      await expect(responseErrorInterceptor(error)).rejects.toThrow();

      // Verify token refresh was not attempted again
      expect(refreshAccessToken).not.toHaveBeenCalled();
    });

    it("should pass through non-401 errors", async () => {
      const error: Partial<AxiosError> = {
        response: {
          status: 404,
          data: { error: "not_found" },
          statusText: "Not Found",
          headers: {},
          config: {} as any,
        } as AxiosResponse,
        isAxiosError: true,
        message: "Request failed with status code 404",
      };

      // This should pass through the error
      await expect(responseErrorInterceptor(error)).rejects.toEqual(error);

      // Verify no token refresh was attempted
      expect(refreshAccessToken).not.toHaveBeenCalled();
    });

    it("should handle network errors or errors without response", async () => {
      const error = new Error("Network Error");
      (error as any).isAxiosError = true;

      // This should pass through the error
      await expect(responseErrorInterceptor(error)).rejects.toEqual(error);

      // Verify error was logged
      expect(saveLog).toHaveBeenCalledWith(
        expect.stringContaining("API request error without response:"),
        "ERROR",
      );
    });
  });
});
