/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock window.spotify
const mockSpotify = {
  isAuthenticated: vi.fn().mockResolvedValue(true),
  authenticate: vi.fn().mockResolvedValue(true),
  startMonitoring: vi.fn().mockResolvedValue(true),
  stopMonitoring: vi.fn().mockResolvedValue(true),
  isMonitoring: vi.fn().mockResolvedValue(false),
  getCurrentPlayback: vi.fn().mockResolvedValue(null),
  onPlaybackUpdate: vi.fn().mockReturnValue(() => {}), // Returns cleanup function
};

// Apply mock
vi.stubGlobal("window", {
  spotify: mockSpotify,
});

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Simple test component to test window.spotify API
const TestHomeComponent = () => {
  return (
    <div>
      <button
        data-testid="auth-btn"
        onClick={() => window.spotify.authenticate()}
      >
        Authenticate
      </button>
      <button
        data-testid="is-auth-btn"
        onClick={() => window.spotify.isAuthenticated()}
      >
        Check Authentication
      </button>
      <button
        data-testid="start-btn"
        onClick={() => window.spotify.startMonitoring()}
      >
        Start Monitoring
      </button>
      <button
        data-testid="stop-btn"
        onClick={() => window.spotify.stopMonitoring()}
      >
        Stop Monitoring
      </button>
      <button
        data-testid="is-monitoring-btn"
        onClick={() => window.spotify.isMonitoring()}
      >
        Check Monitoring
      </button>
      <button
        data-testid="get-playback-btn"
        onClick={() => window.spotify.getCurrentPlayback()}
      >
        Get Playback
      </button>
      <button
        data-testid="subscribe-btn"
        onClick={() => {
          const unsubscribe = window.spotify.onPlaybackUpdate(() => {});
          return unsubscribe;
        }}
      >
        Subscribe to Updates
      </button>
    </div>
  );
};

describe("Home Functionality", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("should call authenticate", async () => {
    // Arrange
    const { getByTestId } = render(<TestHomeComponent />);

    // Act
    fireEvent.click(getByTestId("auth-btn"));

    // Assert
    expect(mockSpotify.authenticate).toHaveBeenCalledTimes(1);
  });

  it("should call isAuthenticated", async () => {
    // Arrange
    const { getByTestId } = render(<TestHomeComponent />);

    // Act
    fireEvent.click(getByTestId("is-auth-btn"));

    // Assert
    expect(mockSpotify.isAuthenticated).toHaveBeenCalledTimes(1);
  });

  it("should call startMonitoring", async () => {
    // Arrange
    const { getByTestId } = render(<TestHomeComponent />);

    // Act
    fireEvent.click(getByTestId("start-btn"));

    // Assert
    expect(mockSpotify.startMonitoring).toHaveBeenCalledTimes(1);
  });

  it("should call stopMonitoring", async () => {
    // Arrange
    const { getByTestId } = render(<TestHomeComponent />);

    // Act
    fireEvent.click(getByTestId("stop-btn"));

    // Assert
    expect(mockSpotify.stopMonitoring).toHaveBeenCalledTimes(1);
  });

  it("should call isMonitoring", async () => {
    // Arrange
    const { getByTestId } = render(<TestHomeComponent />);

    // Act
    fireEvent.click(getByTestId("is-monitoring-btn"));

    // Assert
    expect(mockSpotify.isMonitoring).toHaveBeenCalledTimes(1);
  });

  it("should call getCurrentPlayback", async () => {
    // Arrange
    const { getByTestId } = render(<TestHomeComponent />);

    // Act
    fireEvent.click(getByTestId("get-playback-btn"));

    // Assert
    expect(mockSpotify.getCurrentPlayback).toHaveBeenCalledTimes(1);
  });

  it("should call onPlaybackUpdate and get unsubscribe function", async () => {
    // Arrange
    const { getByTestId } = render(<TestHomeComponent />);

    // Act
    fireEvent.click(getByTestId("subscribe-btn"));

    // Assert
    expect(mockSpotify.onPlaybackUpdate).toHaveBeenCalledTimes(1);
    expect(mockSpotify.onPlaybackUpdate).toHaveBeenCalledWith(
      expect.any(Function),
    );
  });
});
