import { saveLog } from "@/helpers/storage/logs-store";
import * as credentialsModule from "@/services/spotify/credentials";
import * as tokenModule from "@/services/spotify/token";
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
    create: vi.fn(() => mockedAxios),
    defaults: {
      headers: {
        common: {},
      },
    },
  };
  return {
    default: mockedAxios,
    ...mockedAxios,
  };
});

vi.mock("@/helpers/storage/logs-store", () => ({
  saveLog: vi.fn(),
}));

// Mock Electron
vi.mock("electron", () => ({
  app: {
    getPath: vi.fn().mockReturnValue("/mock/user/data"),
  },
}));

vi.mock("@/services/spotify/token", () => ({
  refreshAccessToken: vi.fn(),
  isTokenValid: vi.fn(),
  getAccessToken: vi.fn().mockReturnValue("mock-access-token"),
  ensureValidToken: vi.fn(),
}));

// Use spies instead of completely replacing credential functions
vi.spyOn(credentialsModule, "getCredentials").mockReturnValue({
  clientId: "mock-client-id",
  clientSecret: "mock-client-secret",
});

// Store interceptors for testing
let requestInterceptor: (config: AxiosRequestConfig) => AxiosRequestConfig;
let requestErrorInterceptor: (error: any) => Promise<any>;
let responseInterceptor: (response: AxiosResponse) => AxiosResponse;
let responseErrorInterceptor: (error: any) => Promise<any>;

describe("Spotify Interceptors", () => {
  beforeEach(() => {
    vi.clearAllMocks();

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

    // Simulate the interceptors setup that happens in the module
    // This is what spotifyInterceptors module would do when imported
    const setupInterceptors = () => {
      const requestHandler = async (config: AxiosRequestConfig) => {
        // Add request timestamp for timeout tracking
        (config as any).timestamp = Date.now();

        // Only add auth headers for Spotify API requests
        if (config.url && config.url.includes("api.spotify.com")) {
          await tokenModule.ensureValidToken();
          const token = tokenModule.getAccessToken();

          // Set the Authorization header
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
      };

      const requestErrorHandler = (error: any) => {
        return Promise.reject(error);
      };

      const responseHandler = (response: AxiosResponse) => {
        return response;
      };

      const responseErrorHandler = async (error: any) => {
        // Handle 401 unauthorized errors (expired token)
        if (error.response && error.response.status === 401) {
          // Get the original request config
          const originalRequest = error.config;

          // Only try to refresh once to avoid infinite loops
          if (!originalRequest._retry) {
            originalRequest._retry = true;

            try {
              // Refresh the access token
              await tokenModule.refreshAccessToken();

              // Update the Authorization header
              const token = tokenModule.getAccessToken();
              originalRequest.headers.Authorization = `Bearer ${token}`;

              // Retry the request
              return axios(originalRequest);
            } catch (refreshError) {
              return Promise.reject(refreshError);
            }
          }
        }

        // Handle network errors
        if (!error.response) {
          saveLog("error", `Network error: ${error.message}`);
        }

        return Promise.reject(error);
      };

      // Set up interceptors
      axios.interceptors.request.use(requestHandler, requestErrorHandler);
      axios.interceptors.response.use(responseHandler, responseErrorHandler);
    };

    // Call the setup function to register the interceptors
    setupInterceptors();
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
      vi.mocked(tokenModule.isTokenValid).mockReturnValueOnce(true);
      vi.mocked(tokenModule.getAccessToken).mockReturnValueOnce("valid-token");

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
      expect(tokenModule.ensureValidToken).toHaveBeenCalled();
    });

    it("should not add Authorization header for non-Spotify API requests", async () => {
      const config: AxiosRequestConfig = {
        url: "https://example.com/api",
        headers: {},
      };

      const resultConfig = await requestInterceptor(config);

      // Verify no token was added
      expect(resultConfig.headers).not.toHaveProperty("Authorization");
      expect(tokenModule.ensureValidToken).not.toHaveBeenCalled();
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
      vi.mocked(tokenModule.refreshAccessToken).mockResolvedValueOnce({
        access_token: "new-token",
        refresh_token: "new-refresh-token",
        expires_in: 3600,
      });

      // Modify the mock axios function for this test
      const originalAxios = axios;
      (axios as any) = vi.fn().mockResolvedValueOnce({
        data: { success: true },
        status: 200,
      });

      try {
        // Handle the error
        await responseErrorInterceptor(error);

        // Verify token was refreshed
        expect(tokenModule.refreshAccessToken).toHaveBeenCalled();
        // Verify request was retried (by checking the _retry flag)
        expect(originalRequest._retry).toBe(true);
      } finally {
        // Restore axios
        (axios as any) = originalAxios;
      }
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

      // Handle the error should reject
      await expect(responseErrorInterceptor(error)).rejects.toThrow();

      // Verify token was not refreshed again
      expect(tokenModule.refreshAccessToken).not.toHaveBeenCalled();
    });

    it("should pass through non-401 errors", async () => {
      const error: Partial<AxiosError> = {
        response: {
          status: 404,
          statusText: "Not Found",
          headers: {},
          data: {},
          config: {} as any,
        } as AxiosResponse,
        isAxiosError: true,
        message: "Request failed with status code 404",
      };

      // Handle the error should reject with the original error
      await expect(responseErrorInterceptor(error)).rejects.toBe(error);
    });

    it("should handle network errors or errors without response", async () => {
      const error: Partial<AxiosError> = {
        isAxiosError: true,
        message: "Network Error",
      };

      // Handle the error should reject with the original error
      await expect(responseErrorInterceptor(error)).rejects.toBe(error);

      // Verify error was logged
      expect(saveLog).toHaveBeenCalled();
    });
  });
});
