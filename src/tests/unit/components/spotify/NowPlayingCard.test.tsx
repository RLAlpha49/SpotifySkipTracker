import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NowPlayingCard } from "../../../../components/spotify/NowPlayingCard";
import { PlaybackInfo } from "../../../../types/spotify";

describe("NowPlayingCard Component", () => {
  // Mock functions for props
  const mockPlayPause = vi.fn().mockResolvedValue(undefined);
  const mockPreviousTrack = vi.fn().mockResolvedValue(undefined);
  const mockNextTrack = vi.fn().mockResolvedValue(undefined);

  // Sample playback info
  const samplePlaybackInfo: PlaybackInfo = {
    albumArt: "https://example.com/album-art.jpg",
    trackName: "Test Track",
    artist: "Test Artist",
    album: "Test Album",
    progress: 45, // 45% progress
    duration: 180, // 3 minutes
    currentTimeSeconds: 81, // 1:21
    isPlaying: true,
    isInPlaylist: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render correctly when authenticated and playing", () => {
    render(
      <NowPlayingCard
        isAuthenticated={true}
        isMonitoring={true}
        playbackInfo={samplePlaybackInfo}
        onPlayPause={mockPlayPause}
        onPreviousTrack={mockPreviousTrack}
        onNextTrack={mockNextTrack}
      />,
    );

    // Test that track info is displayed
    expect(screen.getByText("Test Track")).toBeInTheDocument();
    expect(screen.getByText("Test Artist")).toBeInTheDocument();
    expect(screen.getByText("Test Album")).toBeInTheDocument();

    // Test that album art is displayed
    const albumArt = screen.getByAltText("Album Artwork");
    expect(albumArt).toBeInTheDocument();
    expect(albumArt).toHaveAttribute(
      "src",
      "https://example.com/album-art.jpg",
    );

    // Test that control buttons are enabled
    const pauseButton = screen.getByTitle("Pause");
    expect(pauseButton).toBeInTheDocument();
    expect(pauseButton).not.toBeDisabled();

    // Test that track progress is displayed
    expect(screen.getByText("1:21")).toBeInTheDocument(); // Current time
    expect(screen.getByText("3:00")).toBeInTheDocument(); // Duration

    // Test that in-library status is displayed
    expect(screen.getByText("In Library")).toBeInTheDocument();
  });

  it("should render correctly when authenticated but not playing", () => {
    const pausedPlaybackInfo = {
      ...samplePlaybackInfo,
      isPlaying: false,
    };

    render(
      <NowPlayingCard
        isAuthenticated={true}
        isMonitoring={true}
        playbackInfo={pausedPlaybackInfo}
        onPlayPause={mockPlayPause}
        onPreviousTrack={mockPreviousTrack}
        onNextTrack={mockNextTrack}
      />,
    );

    // Play button should be visible instead of pause
    const playButton = screen.getByTitle("Play");
    expect(playButton).toBeInTheDocument();
  });

  it("should render a placeholder when not authenticated", () => {
    render(
      <NowPlayingCard
        isAuthenticated={false}
        isMonitoring={false}
        playbackInfo={null}
        onPlayPause={mockPlayPause}
        onPreviousTrack={mockPreviousTrack}
        onNextTrack={mockNextTrack}
      />,
    );

    // Test placeholder message
    expect(
      screen.getByText("Connect to Spotify to see playback information"),
    ).toBeInTheDocument();
  });

  it("should render a placeholder when authenticated but no track is playing", () => {
    render(
      <NowPlayingCard
        isAuthenticated={true}
        isMonitoring={true}
        playbackInfo={null}
        onPlayPause={mockPlayPause}
        onPreviousTrack={mockPreviousTrack}
        onNextTrack={mockNextTrack}
      />,
    );

    // Test placeholder message
    expect(screen.getByText("No track currently playing")).toBeInTheDocument();
  });

  it("should call onPlayPause when play/pause button is clicked", async () => {
    render(
      <NowPlayingCard
        isAuthenticated={true}
        isMonitoring={true}
        playbackInfo={samplePlaybackInfo}
        onPlayPause={mockPlayPause}
        onPreviousTrack={mockPreviousTrack}
        onNextTrack={mockNextTrack}
      />,
    );

    const pauseButton = screen.getByTitle("Pause");
    fireEvent.click(pauseButton);

    expect(mockPlayPause).toHaveBeenCalledTimes(1);
  });

  it("should call onPreviousTrack when previous button is clicked", async () => {
    render(
      <NowPlayingCard
        isAuthenticated={true}
        isMonitoring={true}
        playbackInfo={samplePlaybackInfo}
        onPlayPause={mockPlayPause}
        onPreviousTrack={mockPreviousTrack}
        onNextTrack={mockNextTrack}
      />,
    );

    const previousButton = screen.getByTitle("Previous Track");
    fireEvent.click(previousButton);

    expect(mockPreviousTrack).toHaveBeenCalledTimes(1);
  });

  it("should call onNextTrack when next button is clicked", async () => {
    render(
      <NowPlayingCard
        isAuthenticated={true}
        isMonitoring={true}
        playbackInfo={samplePlaybackInfo}
        onPlayPause={mockPlayPause}
        onPreviousTrack={mockPreviousTrack}
        onNextTrack={mockNextTrack}
      />,
    );

    const nextButton = screen.getByTitle("Next Track");
    fireEvent.click(nextButton);

    expect(mockNextTrack).toHaveBeenCalledTimes(1);
  });

  it("should have disabled controls when not monitoring", () => {
    render(
      <NowPlayingCard
        isAuthenticated={true}
        isMonitoring={false}
        playbackInfo={samplePlaybackInfo}
        onPlayPause={mockPlayPause}
        onPreviousTrack={mockPreviousTrack}
        onNextTrack={mockNextTrack}
      />,
    );

    // All control buttons should be disabled
    const pauseButton = screen.getByTitle("Pause");
    const previousButton = screen.getByTitle("Previous Track");
    const nextButton = screen.getByTitle("Next Track");

    expect(pauseButton).toBeDisabled();
    expect(previousButton).toBeDisabled();
    expect(nextButton).toBeDisabled();
  });

  it("should correctly format play time", () => {
    const playbackInfoWithDifferentTimes: PlaybackInfo = {
      ...samplePlaybackInfo,
      currentTimeSeconds: 65, // 1:05
      duration: 360, // 6 minutes
    };

    render(
      <NowPlayingCard
        isAuthenticated={true}
        isMonitoring={true}
        playbackInfo={playbackInfoWithDifferentTimes}
        onPlayPause={mockPlayPause}
        onPreviousTrack={mockPreviousTrack}
        onNextTrack={mockNextTrack}
      />,
    );

    // Check if times are correctly formatted
    expect(screen.getByText("1:05")).toBeInTheDocument(); // Current time
    expect(screen.getByText("6:00")).toBeInTheDocument(); // Duration
  });
});
