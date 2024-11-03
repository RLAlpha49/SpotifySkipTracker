"""
This module monitors the current playback and tracks the user's song skipping behavior.

It includes functions to fetch user ID, recently played tracks, current playback,
load and save skip counts, unlike songs, and check if a song was skipped early.
"""

import time
import logging
import threading
from typing import Any, Optional, Dict, List, Callable
from utils import (
    get_user_id,
    get_recently_played_tracks,
    get_current_playback,
    load_skip_count,
    save_skip_count,
    unlike_song,
    check_if_skipped_early,
)
from config_utils import load_config

logger = logging.getLogger("SpotifySkipTracker")


def main(
    stop_flag: threading.Event,
    update_callback: Callable[[Optional[Dict[str, Any]]], None],
) -> None:
    """
    Monitor the current playback and track the user's song skipping behavior.

    Args:
        stop_flag (threading.Event): A flag to stop the monitoring loop.
        update_callback (Callable): A callback function to update the GUI with playback info.
    """
    logger.info("Starting playback monitoring...")
    user_id: Optional[str] = get_user_id()
    last_track_id: Optional[str] = None
    last_track_name: Optional[str] = None
    last_artist_names: Optional[str] = None
    last_progress: int = 0
    last_duration_ms: int = 0
    track_order: List[str] = []

    skip_count: Dict[str, int] = load_skip_count()

    while not stop_flag.is_set():
        playback = get_current_playback()
        update_callback(playback)

        if (
            playback
            and playback["is_playing"]
            and playback["context"]["uri"] == f"spotify:user:{user_id}:collection"
        ):
            track_id: str = playback["item"]["id"]
            track_name: str = playback["item"]["name"]
            artist_names: str = ", ".join(
                [artist["name"] for artist in playback["item"]["artists"]]
            )
            progress_ms: int = playback["progress_ms"]
            duration_ms: int = playback["item"]["duration_ms"]

            # Check if it's a new song
            if track_id != last_track_id:
                logger.debug(
                    "New song: %s by %s (%s)", track_name, artist_names, track_id
                )
                if track_id not in skip_count:
                    skip_count[track_id] = {
                        "skipped": 0,
                        "not_skipped": 0,
                        "last_skipped": None,
                    }
                # Check if the track is a forward skip
                if track_id not in track_order:
                    # Fetch recently played tracks
                    recently_played_data = get_recently_played_tracks()
                    recently_played: List[str] = [
                        track["track"]["id"]
                        for track in recently_played_data.get("items", [])
                    ]

                    # Track is not in the order and not recently played, it's a forward skip
                    if track_id not in recently_played:
                        logger.debug(
                            "Track not in recently played: %s by %s (%s)",
                            track_name,
                            artist_names,
                            track_id,
                        )
                        if check_if_skipped_early(last_progress, last_duration_ms):
                            logger.debug(
                                "Track is a skipped early: %s by %s (%s)",
                                track_name,
                                artist_names,
                                track_id,
                            )
                            skip_count[track_id]["skipped"] += 1
                            skip_count[track_id]["last_skipped"] = time.strftime(
                                "%Y-%m-%dT%H:%M:%S", time.localtime()
                            )

                            if last_track_id:
                                logger.info(
                                    "Song %s by %s (%s) skipped %d times.",
                                    last_track_name,
                                    last_artist_names,
                                    last_track_id,
                                    skip_count[last_track_id]["skipped"],
                                )

                            config = load_config(decrypt=True)
                            skip_threshold = config.get("SKIP_THRESHOLD", 5)
                            if (
                                last_track_id
                                and skip_count[last_track_id]["skipped"]
                                >= skip_threshold
                            ):
                                logger.info(
                                    "Unliking song: %s by %s (%s)",
                                    last_track_name,
                                    last_artist_names,
                                    last_track_id,
                                )
                                unlike_song(last_track_id)
                                del skip_count[last_track_id]

                            save_skip_count(skip_count)
                        else:
                            skip_count[track_id]["not_skipped"] += 1
                            logger.debug(
                                "Track is not skipped early: %s by %s (%s)",
                                track_name,
                                artist_names,
                                track_id,
                            )
                            save_skip_count(skip_count)
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

                # Update track order
                track_order.append(track_id)
                if len(track_order) > 5:
                    track_order.pop(0)

                # Update last track details
                last_track_id = track_id
                last_track_name = track_name
                last_artist_names = artist_names
                last_duration_ms = duration_ms

            last_progress = progress_ms

        time.sleep(1)
    logger.info("Playback monitoring stopped.")
