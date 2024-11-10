"""
This module monitors the current playback and tracks the user's song skipping behavior.

It includes methods to fetch user ID, recently played tracks, current playback,
load and save skip counts, unlike songs, and check if a song was skipped early.
"""

import time
import logging
import threading
from typing import Any, Optional, Dict, List, Callable
from dataclasses import dataclass, field

from utils import (  # pylint: disable=import-error
    get_user_id,
    get_recently_played_tracks,
    get_current_playback,
    load_skip_count,
    save_skip_count,
    unlike_song,
    check_if_skipped_early,
)
from config_utils import load_config  # pylint: disable=import-error

logger: logging.Logger = logging.getLogger("SpotifySkipTracker")


@dataclass
class TrackInfo:
    """Dataclass to store information about a track."""

    track_id: Optional[str] = None
    track_name: Optional[str] = None
    artist_names: Optional[str] = None
    duration_ms: int = 0


@dataclass
class PlaybackState:
    """Dataclass to manage the playback state."""

    track_order: List[str] = field(default_factory=list)
    skip_count: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    last_track_info: TrackInfo = field(default_factory=TrackInfo)
    last_progress: int = 0


class PlaybackMonitor:
    """
    A class to monitor Spotify playback and track song skipping behavior.
    """

    def __init__(
        self,
        stop_flag: threading.Event,
        update_callback: Callable[[Optional[Dict[str, Any]]], None],
    ) -> None:
        """
        Initialize the PlaybackMonitor.

        Args:
            stop_flag (threading.Event): A flag to stop the monitoring loop.
            update_callback (Callable[[Optional[Dict[str, Any]]], None]):
                A callback function to update the GUI with playback info.
        """
        self.stop_flag: threading.Event = stop_flag
        self.update_callback: Callable[[Optional[Dict[str, Any]]], None] = (
            update_callback
        )

        # Initialize playback state
        self.state: PlaybackState = PlaybackState()
        self.user_id: Optional[str] = None

    def start_monitoring(self) -> None:
        """
        Start the playback monitoring loop.
        """
        logger.info("Starting playback monitoring...")
        self.user_id = get_user_id()
        if not self.user_id:
            logger.error("Unable to retrieve user ID. Stopping playback monitoring.")
            return

        self.state.skip_count = load_skip_count()

        while not self.stop_flag.is_set():
            playback: Optional[Dict[str, Any]] = get_current_playback()
            self.update_callback(playback)

            if (
                playback
                and playback.get("is_playing")
                and playback.get("context", {}).get("uri")
                == f"spotify:user:{self.user_id}:collection"
            ):
                self.process_playback(playback)

            time.sleep(1)

        logger.info("Playback monitoring stopped.")

    def process_playback(self, playback: Dict[str, Any]) -> None:
        """
        Process the current playback information.

        Args:
            playback (Dict[str, Any]): Current playback information.
        """
        item: Dict[str, Any] = playback.get("item", {})
        track_id: str = item.get("id", "")
        track_name: str = item.get("name", "")
        artist_names: str = ", ".join(
            [artist.get("name", "") for artist in item.get("artists", [])]
        )
        progress_ms: int = playback.get("progress_ms", 0)
        duration_ms: int = item.get("duration_ms", 0)

        # Check if it's a new song
        if track_id != self.state.last_track_info.track_id:
            logger.debug("New song: %s by %s (%s)", track_name, artist_names, track_id)
            if track_id not in self.state.skip_count:
                self.state.skip_count[track_id] = {
                    "skipped": 0,
                    "not_skipped": 0,
                    "last_skipped": None,
                    "skipped_dates": [],
                }

            # Check if the track is a forward skip
            if track_id not in self.state.track_order:
                recently_played: List[str] = self.fetch_recently_played_tracks()

                # Track is not in the order and not recently played, it's a forward skip
                if track_id not in recently_played:
                    logger.debug(
                        "Track not in recently played: %s by %s (%s)",
                        track_name,
                        artist_names,
                        track_id,
                    )
                    if check_if_skipped_early(
                        self.state.last_progress, self.state.last_track_info.duration_ms
                    ):
                        logger.debug(
                            "Track is a skipped early: %s by %s (%s)",
                            track_name,
                            artist_names,
                            track_id,
                        )
                        self.handle_skipped_track()
                    else:
                        self.state.skip_count[track_id]["not_skipped"] += 1
                        logger.debug(
                            "Track is not skipped early: %s by %s (%s)",
                            track_name,
                            artist_names,
                            track_id,
                        )
                        save_skip_count(self.state.skip_count)
                else:
                    logger.debug(
                        "Track in recently played: %s by %s (%s)",
                        track_name,
                        artist_names,
                        track_id,
                    )
            else:
                logger.debug(
                    "Track in the last 5 played: %s by %s (%s)",
                    track_name,
                    artist_names,
                    track_id,
                )

            # Update track order and last track details
            self.update_track_order(track_id)
            self.update_last_track_details(
                track_id, track_name, artist_names, duration_ms
            )

        self.state.last_progress = progress_ms

    def fetch_recently_played_tracks(self) -> List[str]:
        """
        Fetch the list of recently played track IDs.

        Returns:
            List[str]: List of recently played track IDs.
        """
        recently_played_data: Dict[str, Any] = get_recently_played_tracks()
        return [track["track"]["id"] for track in recently_played_data.get("items", [])]

    def handle_skipped_track(self) -> None:
        """
        Handle the logic when a track is identified as skipped early.
        """
        current_time: str = time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime())
        if self.state.last_track_info.track_id:
            self.state.skip_count[self.state.last_track_info.track_id].setdefault(
                "skipped_dates", []
            ).append(current_time)
            self.state.skip_count[self.state.last_track_info.track_id]["skipped"] += 1
            self.state.skip_count[self.state.last_track_info.track_id][
                "last_skipped"
            ] = current_time
            logger.info(
                "Song %s by %s (%s) skipped %d times.",
                self.state.last_track_info.track_name,
                self.state.last_track_info.artist_names,
                self.state.last_track_info.track_id,
                self.state.skip_count[self.state.last_track_info.track_id]["skipped"],
            )

        config: Dict[str, Any] = load_config(decrypt=True)
        skip_threshold: int = config.get("SKIP_THRESHOLD", 5)
        if (
            self.state.last_track_info.track_id
            and self.state.skip_count[self.state.last_track_info.track_id]["skipped"]
            >= skip_threshold
        ):
            logger.info(
                "Unliking song: %s by %s (%s)",
                self.state.last_track_info.track_name,
                self.state.last_track_info.artist_names,
                self.state.last_track_info.track_id,
            )
            unlike_song(self.state.last_track_info.track_id)
            del self.state.skip_count[self.state.last_track_info.track_id]

        save_skip_count(self.state.skip_count)

    def update_track_order(self, track_id: str) -> None:
        """
        Update the track order list.

        Args:
            track_id (str): The ID of the current track.
        """
        self.state.track_order.append(track_id)
        if len(self.state.track_order) > 5:
            removed_track = self.state.track_order.pop(0)
            logger.debug("Removed track from order: %s", removed_track)

    def update_last_track_details(
        self, track_id: str, track_name: str, artist_names: str, duration_ms: int
    ) -> None:
        """
        Update the last track details.

        Args:
            track_id (str): The ID of the current track.
            track_name (str): The name of the current track.
            artist_names (str): Comma-separated artist names.
            duration_ms (int): Duration of the current track in milliseconds.
        """
        self.state.last_track_info = TrackInfo(
            track_id=track_id,
            track_name=track_name,
            artist_names=artist_names,
            duration_ms=duration_ms,
        )


def main(
    stop_flag: threading.Event,
    update_callback: Callable[[Optional[Dict[str, Any]]], None],
) -> None:
    """
    Monitor the current playback and track the user's song skipping behavior.

    Args:
        stop_flag (threading.Event): A flag to stop the monitoring loop.
        update_callback (Callable[[Optional[Dict[str, Any]]], None]):
            A callback function to update the GUI with playback info.
    """
    monitor = PlaybackMonitor(stop_flag, update_callback)
    monitor.start_monitoring()
