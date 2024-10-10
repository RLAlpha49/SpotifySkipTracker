"""
This module monitors the current playback and tracks the user's song skipping behavior.

It includes functions to fetch user ID, recently played tracks, current playback,
load and save skip counts, unlike songs, and check if a song was skipped early.
"""

import time
import logging
import threading
from typing import Optional, Dict, List
from utils import (
    get_user_id,
    get_recently_played_tracks,
    get_current_playback,
    load_skip_count,
    save_skip_count,
    unlike_song,
    check_if_skipped_early,
)

logger = logging.getLogger("SpotifySkipTracker")


def main(stop_flag: threading.Event) -> None:
    """
    Monitor the current playback and track the user's song skipping behavior.

    Args:
        stop_flag (threading.Event): A flag to stop the monitoring loop.
    """
    logger.info("Starting playback monitoring...")
    user_id: str = get_user_id()
    last_track_id: Optional[str] = None
    last_track_name: Optional[str] = None
    last_artist_names: Optional[str] = None
    last_progress: int = 0
    last_duration_ms: int = 0
    track_order: List[str] = []

    skip_count: Dict[str, int] = load_skip_count()

    while not stop_flag.is_set():
        playback = get_current_playback()
        if (
            playback
            and playback["is_playing"]
            and playback["context"]["uri"] == f"spotify:user:{user_id}:collection"
        ):
            track_id: str = playback["item"]["id"]
            track_name: str = playback["item"]["name"]
            # Extract artist names
            artists: List[str] = [
                artist["name"] for artist in playback["item"]["artists"]
            ]
            artist_names: str = ", ".join(artists)
            progress_ms: int = playback["progress_ms"]
            duration_ms: int = playback["item"]["duration_ms"]

            # Check if it's a new song
            if track_id != last_track_id:
                logger.info(
                    "New song: %s by %s (%s)", track_name, artist_names, track_id
                )
                # Check if the track is a forward skip
                if track_id not in track_order:
                    logger.debug(
                        "Track not in order: %s by %s (%s)",
                        track_name,
                        artist_names,
                        track_id,
                    )
                    # Fetch recently played tracks
                    recently_played_data = get_recently_played_tracks()
                    recently_played: List[str] = recently_played_data.get("tracks", [])

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
                            if last_track_id in skip_count:
                                skip_count[last_track_id] += 1
                            else:
                                skip_count[last_track_id] = 1

                            logger.info(
                                "Song '%s' by %s (%s) skipped %d times.",
                                last_track_name,
                                last_artist_names,
                                last_track_id,
                                skip_count[last_track_id],
                            )

                            # Unlike if skipped 5 times
                            if skip_count[last_track_id] >= 5:
                                logger.info(
                                    "Unliking song: %s by %s (%s)",
                                    last_track_name,
                                    last_artist_names,
                                    last_track_id,
                                )
                                unlike_song(last_track_id)
                                skip_count.pop(last_track_id)

                            save_skip_count(skip_count)
                        else:
                            logger.debug(
                                "Track is not skipped early: %s by %s (%s)",
                                track_name,
                                artist_names,
                                track_id,
                            )
                    else:
                        logger.debug(
                            "Track in recently played: %s by %s (%s)",
                            track_name,
                            artist_names,
                            track_id,
                        )
                else:
                    logger.debug(
                        "Track in order: %s by %s (%s)",
                        track_name,
                        artist_names,
                        track_id,
                    )

                # Update track order
                track_order.append(track_id)
                if len(track_order) > 1000:
                    logger.info("Track order limit reached: %s", track_order)
                    track_order.pop(0)

                # Update last track details
                last_track_id = track_id
                last_track_name = track_name
                last_artist_names = artist_names
                last_duration_ms = duration_ms

            last_progress = progress_ms

        time.sleep(1)
    logger.info("Playback monitoring stopped.")
