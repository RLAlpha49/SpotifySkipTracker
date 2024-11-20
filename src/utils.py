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
from config_utils import get_config_variable, load_config

_SPOTIFY_ACCESS_TOKEN: Optional[str] = get_config_variable(
    "SPOTIFY_ACCESS_TOKEN", "", decrypt=True
)
_logger: logging.Logger = logging.getLogger("SpotifySkipTracker")


def _auth_reload() -> None:
    """
    Reload the authentication configuration variables from the config file.
    """
    global _SPOTIFY_ACCESS_TOKEN  # pylint: disable=global-statement
    try:
        _SPOTIFY_ACCESS_TOKEN = get_config_variable(
            "SPOTIFY_ACCESS_TOKEN", "", decrypt=True
        )
    except FileNotFoundError as e:
        _logger.critical("Configuration file not found while reloading auth: %s", e)
        raise
    except json.JSONDecodeError as e:
        _logger.critical("JSON decode error while reloading auth: %s", e)
        raise
    except Exception as e:  # pylint: disable=broad-exception-caught
        _logger.critical("Unexpected error while reloading auth: %s", e)
        raise


def get_user_id(retries: int = 3) -> Optional[str]:
    """
    Get the Spotify user ID of the current user.

    Args:
        retries (int, optional): The number of retries if the request fails. Defaults to 3.

    Returns:
        Optional[str]: The Spotify user ID if the request is successful, None otherwise.
    """
    try:
        for attempt in range(retries):
            try:
                _auth_reload()
                access_token: Optional[str] = _SPOTIFY_ACCESS_TOKEN
                if not access_token:
                    _logger.error("Access token is not available.")
                    return None
                headers: Dict[str, str] = {"Authorization": f"Bearer {access_token}"}
                url: str = "https://api.spotify.com/v1/me"
                response: requests.Response = requests.get(
                    url, headers=headers, timeout=10
                )
                if response.status_code == 200:
                    return response.json().get("id")
                if response.status_code == 401:
                    _logger.debug("Access token expired. Refreshing token...")
                    time.sleep(5)
                    refresh_access_token()
                    _auth_reload()
                else:
                    _logger.error(
                        "Failed to fetch user ID, attempt %d/%d", attempt + 1, retries
                    )
                    time.sleep(2)
            except requests.exceptions.RequestException as e:
                _logger.error("Request exception while fetching user ID: %s", e)
                time.sleep(2)
            except Exception as e:  # pylint: disable=broad-exception-caught
                _logger.critical("Unexpected error while fetching user ID: %s", e)
                raise
    except Exception as e:  # Catching potential exceptions from re-raising
        _logger.critical("Critical failure in get_user_id: %s", e)
        raise
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
    try:
        for _ in range(retries):
            try:
                _auth_reload()
                headers: Dict[str, str] = {
                    "Authorization": f"Bearer {_SPOTIFY_ACCESS_TOKEN}"
                }
                url: str = "https://api.spotify.com/v1/me/player"

                response: requests.Response = requests.get(
                    url, headers=headers, timeout=10
                )
                if response.status_code == 200:
                    return response.json()
                if response.status_code == 401:
                    _logger.debug("Access token expired. Refreshing token...")
                    refresh_access_token()
                    time.sleep(5)
                    _auth_reload()
                    headers["Authorization"] = f"Bearer {_SPOTIFY_ACCESS_TOKEN}"
                    continue
                if response.status_code == 429:
                    retry_after: int = int(response.headers.get("Retry-After", "10"))
                    _logger.error(
                        "Rate limit exceeded, waiting for %d seconds", retry_after
                    )
                    time.sleep(retry_after)
                    continue
                if response.status_code == 204:
                    return None
                _logger.error("Failed to fetch current playback")
                time.sleep(2)
            except requests.exceptions.RequestException as e:
                _logger.error(
                    "Request exception while fetching current playback: %s", e
                )
                time.sleep(2)
            except Exception as e:  # pylint: disable=broad-exception-caught
                _logger.critical(
                    "Unexpected error while fetching current playback: %s", e
                )
                raise
    except Exception as e:
        _logger.critical("Critical failure in get_current_playback: %s", e)
        raise
    return None


def get_recently_played_tracks(retries: int = 3) -> Dict[str, Any]:
    """
    Get the recently played tracks of the user.

    Args:
        retries (int, optional): The number of retries if the request fails. Defaults to 3.

    Returns:
        Dict[str, Any]: The recently played tracks data.
    """
    recently_played_tracks: Dict[str, Any] = {}
    try:
        for attempt in range(retries):
            try:
                _auth_reload()
                headers: Dict[str, str] = {
                    "Authorization": f"Bearer {_SPOTIFY_ACCESS_TOKEN}"
                }
                url: str = (
                    "https://api.spotify.com/v1/me/player/recently-played?limit=5"
                )

                response: requests.Response = requests.get(
                    url, headers=headers, timeout=10
                )
                if response.status_code == 200:
                    return response.json()
                if response.status_code == 401:
                    _logger.debug("Access token expired. Refreshing token...")
                    refresh_access_token()
                    time.sleep(5)
                    _auth_reload()
                    headers["Authorization"] = f"Bearer {_SPOTIFY_ACCESS_TOKEN}"
                    continue
                if response.status_code == 429:
                    retry_after: int = int(response.headers.get("Retry-After", "10"))
                    _logger.error(
                        "Rate limit exceeded, waiting for %d seconds", retry_after
                    )
                    time.sleep(retry_after)
                    continue
                _logger.error(
                    "Failed to fetch recently played tracks, attempt %d/%d",
                    attempt + 1,
                    retries,
                )
                time.sleep(2)
            except requests.exceptions.RequestException as e:
                _logger.error(
                    "Request exception while fetching recently played tracks: %s", e
                )
                time.sleep(2)
            except Exception as e:  # pylint: disable=broad-exception-caught
                _logger.critical(
                    "Unexpected error while fetching recently played tracks: %s", e
                )
                raise
    except Exception as e:
        _logger.critical("Critical failure in get_recently_played_tracks: %s", e)
        raise
    return recently_played_tracks


def load_skip_count() -> Dict[str, Dict[str, Any]]:
    """
    Load the skip count from a JSON file.

    Returns:
        Dict[str, Dict[str, Any]]: The skip count data if the file exists.
    """
    try:
        with open("skip_count.json", "r", encoding="utf-8") as file:
            skip_count: Dict[str, Dict[str, Any]] = json.load(file)
            # Update old format to new format
            for track_id, count in skip_count.items():
                if isinstance(count, int):
                    skip_count[track_id] = {
                        "skipped": count,
                        "not_skipped": 0,
                        "last_skipped": None,
                    }
            # Sort the skip count by the number of skips in descending order
            sorted_skip_count: Dict[str, Dict[str, Any]] = dict(
                sorted(
                    skip_count.items(),
                    key=lambda item: item[1]["skipped"],
                    reverse=True,
                )
            )
            save_skip_count(sorted_skip_count)
        return sorted_skip_count
    except FileNotFoundError:
        _logger.info("skip_count.json not found. Returning empty skip count.")
        return {}
    except json.JSONDecodeError as e:
        _logger.critical("JSON decode error while loading skip count: %s", e)
        raise
    except Exception as e:  # pylint: disable=broad-exception-caught
        _logger.critical("Unexpected error while loading skip count: %s", e)
        raise


def save_skip_count(skip_count: Dict[str, Dict[str, Any]]) -> None:
    """
    Save the skip count to a JSON file.

    Args:
        skip_count (Dict[str, Dict[str, Any]]): The skip count data to save.
    """
    try:
        with open("skip_count.json", "w", encoding="utf-8") as file:
            json.dump(skip_count, file, indent=4)
        _logger.debug("Skip count saved successfully.")
    except (OSError, IOError) as e:
        _logger.error("Failed to save skip count: %s", e)
    except Exception as e:  # pylint: disable=broad-exception-caught
        _logger.critical("Unexpected error while saving skip count: %s", e)
        raise


def check_if_skipped_early(progress_ms: int, duration_ms: int) -> bool:
    """
    Check if a song was skipped early.

    Args:
        progress_ms (int): The progress of the song in milliseconds.
        duration_ms (int): The total duration of the song in milliseconds.

    Returns:
        bool: True if the song was skipped early, False otherwise.
    """
    try:
        config: Dict[str, Any] = load_config(decrypt=True)
    except FileNotFoundError:
        _logger.critical("Configuration file not found while checking skip threshold.")
        raise
    except json.JSONDecodeError as e:
        _logger.critical(
            "JSON decode error while loading config for skip threshold: %s", e
        )
        raise
    except Exception as e:  # pylint: disable=broad-exception-caught
        _logger.critical(
            "Unexpected error while loading config for skip threshold: %s", e
        )
        raise

    try:
        skip_progress_threshold: float = float(
            config.get("SKIP_PROGRESS_THRESHOLD", 0.42)
        )
    except (TypeError, ValueError) as e:
        _logger.error("Invalid SKIP_PROGRESS_THRESHOLD in config: %s", e)
        skip_progress_threshold = 0.42  # Default value
    except Exception as e:  # pylint: disable=broad-exception-caught
        _logger.error("Unexpected error while parsing skip progress threshold: %s", e)
        skip_progress_threshold = 0.42  # Default value

    try:
        if duration_ms <= 2 * 60 * 1000:
            return progress_ms < duration_ms * skip_progress_threshold
        return progress_ms < duration_ms * skip_progress_threshold
    except Exception as e:  # pylint: disable=broad-exception-caught
        _logger.error("Error while checking if skipped early: %s", e)
        return False


def unlike_song(track_id: str, retries: int = 3) -> None:
    """
    Unlike a song on Spotify.

    Args:
        track_id (str): The ID of the track to unlike.
        retries (int, optional): The number of retry attempts if the request fails. Defaults to 3.
    """
    try:
        for attempt in range(retries):
            try:
                _auth_reload()
                headers: Dict[str, str] = {
                    "Authorization": f"Bearer {_SPOTIFY_ACCESS_TOKEN}"
                }
                url: str = f"https://api.spotify.com/v1/me/tracks?ids={track_id}"

                response: requests.Response = requests.delete(
                    url, headers=headers, timeout=10
                )
                if response.status_code == 200:
                    _logger.debug("Unliked song: %s", track_id)
                    return
                _logger.error(
                    "Failed to unlike song: %s (Attempt %d/%d)",
                    track_id,
                    attempt + 1,
                    retries,
                )
                time.sleep(2)
            except requests.exceptions.RequestException as e:
                _logger.error(
                    "Request exception while unliking song '%s': %s", track_id, e
                )
                time.sleep(2)
            except Exception as e:  # pylint: disable=broad-exception-caught
                _logger.critical(
                    "Unexpected error while unliking song '%s': %s", track_id, e
                )
                raise
        _logger.error("Failed to unlike song after %d attempts: %s", retries, track_id)
    except Exception as e:
        _logger.critical(
            "Critical failure in unlike_song for track '%s': %s", track_id, e
        )
        raise
