import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as playbackStateModule from "../../../../services/playback/state";
import { PlaybackState } from "../../../../types/playback";

describe("Playback State Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the state before each test
    playbackStateModule.resetPlaybackState();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("getPlaybackState", () => {
    it("should return the initial state when no updates have been made", () => {
      const state = playbackStateModule.getPlaybackState();

      // Check that state has the expected initial values
      expect(state.isPlaying).toBe(false);
      expect(state.currentTrackId).toBeNull();
      expect(state.currentTrackName).toBeNull();
      expect(state.currentArtistName).toBeNull();
      expect(state.currentAlbumName).toBeNull();
      expect(state.recentTracks).toEqual([]);
      expect(state.isInLibrary).toBe(false);
    });
  });

  describe("updatePlaybackState", () => {
    it("should update the state with new values", () => {
      // Create a partial state update
      const update: Partial<PlaybackState> = {
        isPlaying: true,
        currentTrackId: "test-track-123",
        currentTrackName: "Test Track",
        currentArtistName: "Test Artist",
        currentAlbumName: "Test Album",
        isInLibrary: true,
        lastProgress: 30000,
      };

      // Update the state
      playbackStateModule.updatePlaybackState(update);

      // Get the updated state
      const state = playbackStateModule.getPlaybackState();

      // Verify the state was updated correctly
      expect(state.isPlaying).toBe(update.isPlaying);
      expect(state.currentTrackId).toBe(update.currentTrackId);
      expect(state.currentTrackName).toBe(update.currentTrackName);
      expect(state.currentArtistName).toBe(update.currentArtistName);
      expect(state.currentAlbumName).toBe(update.currentAlbumName);
      expect(state.isInLibrary).toBe(update.isInLibrary);
      expect(state.lastProgress).toBe(update.lastProgress);
    });

    it("should merge updates with existing state", () => {
      // First update
      playbackStateModule.updatePlaybackState({
        isPlaying: true,
        currentTrackId: "track-1",
        currentTrackName: "Track One",
      });

      // Second update - only change some properties
      playbackStateModule.updatePlaybackState({
        currentArtistName: "Artist Name",
        currentAlbumName: "Album Name",
      });

      // Get the updated state
      const state = playbackStateModule.getPlaybackState();

      // Verify both updates were applied correctly
      expect(state.isPlaying).toBe(true);
      expect(state.currentTrackId).toBe("track-1");
      expect(state.currentTrackName).toBe("Track One");
      expect(state.currentArtistName).toBe("Artist Name");
      expect(state.currentAlbumName).toBe("Album Name");
    });
  });

  describe("resetPlaybackState", () => {
    it("should reset the state to initial values", () => {
      // First make some updates
      playbackStateModule.updatePlaybackState({
        isPlaying: true,
        currentTrackId: "test-track",
        currentTrackName: "Test Track",
        currentArtistName: "Test Artist",
        isInLibrary: true,
      });

      // Verify the state was updated
      let state = playbackStateModule.getPlaybackState();
      expect(state.isPlaying).toBe(true);
      expect(state.currentTrackId).toBe("test-track");

      // Reset the state
      playbackStateModule.resetPlaybackState();

      // Get the state again
      state = playbackStateModule.getPlaybackState();

      // Verify it was reset to initial values
      expect(state.isPlaying).toBe(false);
      expect(state.currentTrackId).toBeNull();
      expect(state.currentTrackName).toBeNull();
      expect(state.currentArtistName).toBeNull();
      expect(state.isInLibrary).toBe(false);
    });
  });

  describe("getTrackLastLogged", () => {
    it("should return 0 for a track that has not been logged", () => {
      const trackId = "never-logged-track";
      const result = playbackStateModule.getTrackLastLogged(trackId);
      expect(result).toBe(0);
    });
  });

  describe("setTrackLastLogged", () => {
    it("should set the last logged time for a track", () => {
      const trackId = "test-track";
      const now = Date.now();

      // Set the track as logged
      playbackStateModule.setTrackLastLogged(trackId, now);

      // Get the logged time
      const loggedTime = playbackStateModule.getTrackLastLogged(trackId);

      // Verify it was set correctly
      expect(loggedTime).toBe(now);
    });

    it("should update the timestamp when called multiple times", () => {
      const trackId = "test-track";
      const firstTime = 100000;
      const secondTime = 200000;

      // Set the track as logged with first timestamp
      playbackStateModule.setTrackLastLogged(trackId, firstTime);
      expect(playbackStateModule.getTrackLastLogged(trackId)).toBe(firstTime);

      // Update with second timestamp
      playbackStateModule.setTrackLastLogged(trackId, secondTime);
      expect(playbackStateModule.getTrackLastLogged(trackId)).toBe(secondTime);
    });
  });

  describe("setCredentials", () => {
    it("should store the client credentials", () => {
      const clientId = "test-client-id";
      const clientSecret = "test-client-secret";

      // Set the credentials
      playbackStateModule.setCredentials(clientId, clientSecret);

      // Indirectly verify by checking if getCredentials returns true
      const hasCredentials = playbackStateModule.getCredentials() !== null;
      expect(hasCredentials).toBe(true);
    });
  });

  describe("getCredentials", () => {
    it("should return an object with empty strings when no credentials are set", () => {
      // Reset credentials
      playbackStateModule.resetPlaybackState();

      // Check credentials
      const credentials = playbackStateModule.getCredentials();
      expect(credentials).toEqual({
        clientId: "",
        clientSecret: "",
      });
    });

    it("should return credentials when they have been set", () => {
      const clientId = "client-id-123";
      const clientSecret = "client-secret-456";

      // Set credentials
      playbackStateModule.setCredentials(clientId, clientSecret);

      // Get credentials
      const credentials = playbackStateModule.getCredentials();

      // Verify credentials were returned
      expect(credentials).toEqual({
        clientId: clientId,
        clientSecret: clientSecret,
      });
    });
  });

  describe("setRecentTracks", () => {
    it("should update the recent tracks list", () => {
      const recentTracks = ["track1", "track2", "track3"];

      // Set recent tracks
      playbackStateModule.setRecentTracks(recentTracks);

      // Verify the state was updated
      const state = playbackStateModule.getPlaybackState();
      expect(state.recentTracks).toEqual(recentTracks);
    });

    it("should replace the existing recent tracks list", () => {
      // Set initial list
      playbackStateModule.setRecentTracks(["track1", "track2"]);

      // Replace with new list
      const newTracks = ["track3", "track4", "track5"];
      playbackStateModule.setRecentTracks(newTracks);

      // Verify the state was updated correctly
      const state = playbackStateModule.getPlaybackState();
      expect(state.recentTracks).toEqual(newTracks);
      expect(state.recentTracks).not.toContain("track1");
    });
  });
});
