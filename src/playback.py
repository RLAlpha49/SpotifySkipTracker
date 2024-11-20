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
import json
import requests

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
        critical_error_event: threading.Event,
    ) -> None:
        """
        Initialize the PlaybackMonitor.

        Args:
            stop_flag (threading.Event): A flag to stop the monitoring loop.
            update_callback (Callable[[Optional[Dict[str, Any]]], None]):
                A callback function to update the GUI with playback info.
            critical_error_event (threading.Event): An event to signal critical errors.
        """
        self.stop_flag: threading.Event = stop_flag
        self.update_callback: Callable[[Optional[Dict[str, Any]]], None] = (
            update_callback
        )
        self.critical_error_event = critical_error_event

        # Initialize playback state
        self.state: PlaybackState = PlaybackState()
        self.user_id: Optional[str] = None

    def start_monitoring(self) -> None:
        """
        Start the playback monitoring loop.
        """
        logger.info("Starting playback monitoring...")
        self._initialize_user_id()
        self._initialize_skip_count()

        try:
            while not self.stop_flag.is_set():
                playback = self._fetch_playback()
                self._handle_playback(playback)
                time.sleep(1)
        except KeyboardInterrupt:
            logger.info("Playback monitoring interrupted by user.")
        except Exception as e:  # pylint: disable=broad-exception-caught
            logger.critical("PlaybackMonitor encountered a critical error: %s", e)
            raise
        finally:
            logger.info("Playback monitoring stopped.")

    def _initialize_user_id(self) -> None:
        try:
            self.user_id = get_user_id()
            if not self.user_id:
                raise RuntimeError("User ID retrieval failed.")
        except requests.exceptions.RequestException as e:
            logger.critical("Network error while fetching user ID: %s", e)
            raise
        except Exception as e:  # pylint: disable=broad-exception-caught
            logger.critical("Unexpected error while fetching user ID: %s", e)
            raise

    def _initialize_skip_count(self) -> None:
        try:
            self.state.skip_count = load_skip_count()
        except FileNotFoundError:
            logger.warning(
                "Skip count file not found. Initializing with empty skip counts."
            )
            self.state.skip_count = {}
        except json.JSONDecodeError as e:
            logger.critical("Error decoding skip count file: %s", e)
            raise
        except Exception as e:  # pylint: disable=broad-exception-caught
            logger.critical("Unexpected error while loading skip counts: %s", e)
            raise

    def _fetch_playback(self) -> Optional[Dict[str, Any]]:
        try:
            return get_current_playback()
        except requests.exceptions.RequestException as e:
            logger.error("Network error while fetching current playback: %s", e)
            time.sleep(5)
            return None
        except Exception as e:  # pylint: disable=broad-exception-caught
            logger.critical("Unexpected error while fetching current playback: %s", e)
            raise

    def _handle_playback(self, playback: Optional[Dict[str, Any]]) -> None:
        try:
            self.update_callback(playback)
        except Exception as e:  # pylint: disable=broad-exception-caught
            logger.error("Error in update_callback: %s", e)

        if playback and self._is_valid_playback(playback):
            self._process_playback_safe(playback)

    def _is_valid_playback(self, playback: Optional[Dict[str, Any]]) -> bool:
        return bool(
            playback.get("is_playing")
            and playback.get("context", {}).get("uri")
            == f"spotify:user:{self.user_id}:collection"
        )

    def _process_playback_safe(self, playback: Dict[str, Any]) -> None:
        try:
            self.process_playback(playback)
        except KeyError as e:
            logger.error("Missing key in playback data: %s", e)
        except Exception as e:  # pylint: disable=broad-exception-caught
            logger.critical("Unexpected error while processing playback: %s", e)
            raise

    def process_playback(self, playback: Dict[str, Any]) -> None:
        """
        Process the current playback information.

        Args:
            playback (Dict[str, Any]): Current playback information.
        """
        try:
            item: Dict[str, Any] = playback.get("item", {})
            track_id: str = item.get("id", "")
            track_name: str = item.get("name", "")
            artist_names: str = ", ".join(
                [artist.get("name", "") for artist in item.get("artists", [])]
            )
            progress_ms: int = playback.get("progress_ms", 0)
            duration_ms: int = item.get("duration_ms", 0)
        except (AttributeError, Exception) as e:  # pylint: disable=broad-exception-caught
            logger.error("Error extracting playback data: %s", e)
            return

        if track_id == self.state.last_track_info.track_id:
            self.state.last_progress = progress_ms
            return

        logger.debug("New song: %s by %s (%s)", track_name, artist_names, track_id)
        self._initialize_skip_count_for_track(track_id)

        if track_id not in self.state.track_order:
            recently_played = self._get_recently_played_tracks()
            self._handle_forward_skip(
                track_id, track_name, artist_names, recently_played
            )
        else:
            logger.debug(
                "Track in the last 5 played: %s by %s (%s)",
                track_name,
                artist_names,
                track_id,
            )

        self._update_track_info(track_id, track_name, artist_names, duration_ms)
        self.state.last_progress = progress_ms

    def _initialize_skip_count_for_track(self, track_id: str) -> None:
        """
        Initialize the skip count for a track.

        Args:
            track_id (str): The ID of the track.
        """
        if track_id not in self.state.skip_count:
            self.state.skip_count[track_id] = {
                "skipped": 0,
                "not_skipped": 0,
                "last_skipped": None,
                "skipped_dates": [],
            }

    def _get_recently_played_tracks(self) -> List[str]:
        try:
            return self._fetch_recently_played_tracks()
        except Exception as e:  # pylint: disable=broad-exception-caught
            logger.error("Error fetching recently played tracks: %s", e)
            return []

    def _handle_forward_skip(
        self,
        track_id: str,
        track_name: str,
        artist_names: str,
        recently_played: List[str],
    ) -> None:
        """
        Handle the logic when a track is identified as skipped early.

        Args:
            track_id (str): The ID of the track.
            track_name (str): The name of the track.
            artist_names (str): Comma-separated artist names.
            recently_played (List[str]): List of recently played track IDs.
        """
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
                    "Track is skipped early: %s by %s (%s)",
                    track_name,
                    artist_names,
                    track_id,
                )
                self._handle_skipped_track()
            else:
                self.state.skip_count[track_id]["not_skipped"] += 1
                logger.debug(
                    "Track is not skipped early: %s by %s (%s)",
                    track_name,
                    artist_names,
                    track_id,
                )
                self._save_skip_count()
        else:
            logger.debug(
                "Track in recently played: %s by %s (%s)",
                track_name,
                artist_names,
                track_id,
            )

    def _save_skip_count(self) -> None:
        try:
            save_skip_count(self.state.skip_count)
        except Exception as e:  # pylint: disable=broad-exception-caught
            logger.error("Error saving skip count: %s", e)

    def _update_track_info(
        self, track_id: str, track_name: str, artist_names: str, duration_ms: int
    ) -> None:
        """
        Update the track order and last track details.

        Args:
            track_id (str): The ID of the current track.
            track_name (str): The name of the current track.
            artist_names (str): Comma-separated artist names.
            duration_ms (int): Duration of the current track in milliseconds.
        """
        try:
            self._update_track_order(track_id)
        except Exception as e:  # pylint: disable=broad-exception-caught
            logger.error("Error updating track order: %s", e)

        try:
            self._update_last_track_details(
                track_id, track_name, artist_names, duration_ms
            )
        except Exception as e:  # pylint: disable=broad-exception-caught
            logger.error("Error updating last track details: %s", e)

    def _fetch_recently_played_tracks(self) -> List[str]:
        """
        Fetch the list of recently played track IDs.

        Returns:
            List[str]: List of recently played track IDs.
        """
        try:
            recently_played_data: Dict[str, Any] = get_recently_played_tracks()
            return [
                track["track"]["id"] for track in recently_played_data.get("items", [])
            ]
        except requests.exceptions.RequestException as e:
            logger.error("Network error while fetching recently played tracks: %s", e)
            return []
        except KeyError as e:
            logger.error("Missing key while fetching recently played tracks: %s", e)
            return []
        except Exception as e:  # pylint: disable=broad-exception-caught
            logger.error(
                "Unexpected error while fetching recently played tracks: %s", e
            )
            return []

    def _handle_skipped_track(self) -> None:
        """
        Handle the logic when a track is identified as skipped early.
        """
        try:
            current_time: str = time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime())
            if self.state.last_track_info.track_id:
                self.state.skip_count[self.state.last_track_info.track_id].setdefault(
                    "skipped_dates", []
                ).append(current_time)
                self.state.skip_count[self.state.last_track_info.track_id][
                    "skipped"
                ] += 1
                self.state.skip_count[self.state.last_track_info.track_id][
                    "last_skipped"
                ] = current_time
                logger.info(
                    "Song %s by %s (%s) skipped %d times.",
                    self.state.last_track_info.track_name,
                    self.state.last_track_info.artist_names,
                    self.state.last_track_info.track_id,
                    self.state.skip_count[self.state.last_track_info.track_id][
                        "skipped"
                    ],
                )
        except KeyError as e:
            logger.error("Missing key while handling skipped track: %s", e)
            return  # Skip further processing
        except Exception as e:  # pylint: disable=broad-exception-caught
            logger.error("Unexpected error while handling skipped track: %s", e)
            return  # Skip further processing

        try:
            config: Dict[str, Any] = load_config(decrypt=True)
        except FileNotFoundError:
            logger.critical("Configuration file not found.")
            raise
        except json.JSONDecodeError as e:
            logger.critical("Error decoding configuration file: %s", e)
            raise
        except Exception as e:  # pylint: disable=broad-exception-caught
            logger.critical("Unexpected error while loading configuration: %s", e)
            raise

        skip_threshold: int = config.get("SKIP_THRESHOLD", 5)
        if (
            self.state.last_track_info.track_id
            and self.state.skip_count[self.state.last_track_info.track_id]["skipped"]
            >= skip_threshold
        ):
            try:
                logger.info(
                    "Unliking song: %s by %s (%s)",
                    self.state.last_track_info.track_name,
                    self.state.last_track_info.artist_names,
                    self.state.last_track_info.track_id,
                )
                unlike_song(self.state.last_track_info.track_id)
                del self.state.skip_count[self.state.last_track_info.track_id]
            except requests.exceptions.RequestException as e:
                logger.error("Network error while unliking song: %s", e)
                # Decide whether to retry, skip, or escalate
            except Exception as e:  # pylint: disable=broad-exception-caught
                logger.critical("Unexpected error while unliking song: %s", e)
                raise

        try:
            save_skip_count(self.state.skip_count)
        except IOError as e:
            logger.error("IO error while saving skip count: %s", e)
        except Exception as e:  # pylint: disable=broad-exception-caught
            logger.critical("Unexpected error while saving skip count: %s", e)
            raise

    def _update_track_order(self, track_id: str) -> None:
        """
        Update the track order list.

        Args:
            track_id (str): The ID of the current track.
        """
        try:
            self.state.track_order.append(track_id)
            if len(self.state.track_order) > 5:
                removed_track = self.state.track_order.pop(0)
                logger.debug("Removed track from order: %s", removed_track)
        except Exception as e:  # pylint: disable=broad-exception-caught
            logger.error("Error updating track order: %s", e)

    def _update_last_track_details(
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
        try:
            self.state.last_track_info = TrackInfo(
                track_id=track_id,
                track_name=track_name,
                artist_names=artist_names,
                duration_ms=duration_ms,
            )
        except Exception as e:  # pylint: disable=broad-exception-caught
            logger.error("Error updating last track details: %s", e)


def main(
    stop_flag: threading.Event,
    update_callback: Callable[[Optional[Dict[str, Any]]], None],
    critical_error_event: threading.Event,
) -> None:
    """
    Monitor the current playback and track the user's song skipping behavior.

    Args:
        stop_flag (threading.Event): A flag to stop the monitoring loop.
        update_callback (Callable[[Optional[Dict[str, Any]]], None]):
            A callback function to update the GUI with playback info.
    """
    try:
        monitor = PlaybackMonitor(stop_flag, update_callback, critical_error_event)
        monitor.start_monitoring()
    except Exception as e:  # pylint: disable=broad-exception-caught
        logger.critical("PlaybackMonitor encountered a critical error: %s", e)
        critical_error_event.set()
