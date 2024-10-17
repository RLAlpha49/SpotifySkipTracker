# pylint: disable=import-error

"""
This module provides utility functions for interacting with the Spotify API,
managing skip counts, and checking if a song was skipped early.
"""

import logging
import json
import time
from typing import Optional, Dict, Any
import requests
from auth import refresh_access_token
from config_utils import get_config_variable

SPOTIFY_ACCESS_TOKEN = get_config_variable("SPOTIFY_ACCESS_TOKEN", "")
logger = logging.getLogger("SpotifySkipTracker")


def auth_reload():
    """
    Reload the authentication configuration variables from the config file.
    """
    global SPOTIFY_ACCESS_TOKEN  # pylint: disable=global-statement
    SPOTIFY_ACCESS_TOKEN = get_config_variable("SPOTIFY_ACCESS_TOKEN", "")


def get_user_id(retries: int = 3) -> Optional[str]:
    """
    Get the Spotify user ID of the current user.

    Args:
        retries (int, optional): The number of retries if the request fails. Defaults to 3.

    Returns:
        Optional[str]: The Spotify user ID if the request is successful, None otherwise.
    """
    auth_reload()

    try:
        for attempt in range(retries):
            auth_reload()
            access_token = SPOTIFY_ACCESS_TOKEN
            headers = {"Authorization": f"Bearer {access_token}"}
            url = "https://api.spotify.com/v1/me"
            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code == 200:
                return response.json()["id"]
            if response.status_code == 401:
                time.sleep(5)
                refresh_access_token()
                auth_reload()
            else:
                logger.error(
                    "Failed to fetch user ID, attempt %d/%d", attempt + 1, retries
                )
                time.sleep(2)
    except requests.exceptions.RequestException as e:
        logger.error("Failed to fetch user ID: %s", str(e))
        time.sleep(2)
    return None


def get_current_playback(retries: int = 3) -> Optional[Dict[str, Any]]:
    """
    Get the current playback information of the user.

    Args:
        retries (int, optional): The number of retries if the request fails.
            Defaults to 3.

    Returns:
        Optional[Dict[str, Any]]: The current playback information if the request
            is successful, None otherwise.
    """
    auth_reload()

    headers = {"Authorization": f"Bearer {SPOTIFY_ACCESS_TOKEN}"}
    url = "https://api.spotify.com/v1/me/player"

    try:
        for _ in range(retries):
            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code == 200:
                return response.json()
            if response.status_code == 401:
                refresh_access_token()
                time.sleep(5)
                auth_reload()
                headers["Authorization"] = f"Bearer {SPOTIFY_ACCESS_TOKEN}"
                continue
            if response.status_code == 429:
                if "Retry-After" in response.headers:
                    retry_after = int(response.headers["Retry-After"])
                    logger.error(
                        "Rate limit exceeded, waiting for %d seconds", retry_after
                    )
                    time.sleep(retry_after)
                else:
                    logger.error("Rate limit exceeded, waiting for 10 seconds")
                    time.sleep(10)
                continue
            if response.status_code == 204:
                return None
            logger.error("Failed to fetch current playback")
            time.sleep(2)
    except requests.exceptions.RequestException as e:
        logger.error("Failed to fetch current playback: %s", str(e))
        time.sleep(2)
    return None


def get_recently_played_tracks(retries: int = 3) -> Dict[str, Any]:
    """
    Get the recently played tracks of the user.

    Args:
        retries (int, optional): The number of retries if the request fails. Defaults to 3.

    Returns:
        Dict[str, Any]: The recently played tracks data.
    """
    auth_reload()

    headers = {"Authorization": f"Bearer {SPOTIFY_ACCESS_TOKEN}"}
    url = "https://api.spotify.com/v1/me/player/recently-played?limit=50"

    try:
        for attempt in range(retries):
            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code == 200:
                return response.json()
            if response.status_code == 401:
                refresh_access_token()
                time.sleep(5)
                auth_reload()
                headers["Authorization"] = f"Bearer {SPOTIFY_ACCESS_TOKEN}"
                continue
            if response.status_code == 429:
                if "Retry-After" in response.headers:
                    retry_after = int(response.headers["Retry-After"])
                    logger.error(
                        "Rate limit exceeded, waiting for %d seconds", retry_after
                    )
                    time.sleep(retry_after)
                else:
                    logger.error("Rate limit exceeded, waiting for 10 seconds")
                    time.sleep(10)
                continue
            logger.error(
                "Failed to fetch recently played tracks, attempt %d/%d",
                attempt + 1,
                retries,
            )
            time.sleep(2)
    except requests.exceptions.RequestException as e:
        logger.error("Failed to fetch recently played tracks: %s", str(e))
        time.sleep(2)
    return {}


def load_skip_count() -> Dict[str, int]:
    """
    Load the skip count from a JSON file.

    Returns:
        Dict[str, int]: The skip count data if the file exists, an empty dictionary otherwise.
    """
    try:
        with open("skip_count.json", "r", encoding="utf-8") as file:
            skip_count = json.load(file)
        return skip_count
    except FileNotFoundError:
        return {}


def save_skip_count(skip_count: Dict[str, int]) -> None:
    """
    Save the skip count to a JSON file.

    Args:
        skip_count (Dict[str, int]): The skip count data to save.
    """
    with open("skip_count.json", "w", encoding="utf-8") as file:
        json.dump(skip_count, file)


def check_if_skipped_early(progress_ms: int, duration_ms: int) -> bool:
    """
    Check if a song was skipped early.

    Args:
        progress_ms (int): The progress of the song in milliseconds.
        duration_ms (int): The total duration of the song in milliseconds.

    Returns:
        bool: True if the song was skipped early, False otherwise.
    """
    if duration_ms <= 2 * 60 * 1000:
        return progress_ms < duration_ms / 2
    return progress_ms < duration_ms / 3


def unlike_song(track_id: str, retries: int = 3) -> None:
    """
    Unlike a song on Spotify.

    Args:
        track_id (str): The ID of the track to unlike.
        retries (int): The number of retry attempts if the request fails.
    """
    auth_reload()

    headers = {"Authorization": f"Bearer {SPOTIFY_ACCESS_TOKEN}"}
    url = f"https://api.spotify.com/v1/me/tracks?ids={track_id}"

    try:
        for attempt in range(retries):
            response = requests.delete(url, headers=headers, timeout=10)
            if response.status_code == 200:
                logger.debug("Unliked song: %s", track_id)
                return
            logger.error(
                "Failed to unlike song: %s (Attempt %d/%d)",
                track_id,
                attempt + 1,
                retries,
            )

        logger.error("Failed to unlike song after %d attempts: %s", retries, track_id)
    except requests.exceptions.RequestException as e:
        logger.error("Failed to unlike song: %s", str(e))
        time.sleep(2)
