# pylint: disable=import-error

"""
This module provides utility functions for interacting with the Spotify API,
managing skip counts, and checking if a song was skipped early.
"""

import os
import logging
import json
import requests

from auth import refresh_access_token

logger = logging.getLogger("SpotifySkipTracker")


def get_user_id():
    """
    Get the Spotify user ID of the current user.

    Returns:
        str: The Spotify user ID if the request is successful, None otherwise.
    """
    headers = {"Authorization": f"Bearer {os.getenv('SPOTIFY_ACCESS_TOKEN')}"}
    url = "https://api.spotify.com/v1/me"
    response = requests.get(url, headers=headers, timeout=10)
    if response.status_code == 200:
        return response.json()["id"]
    return None


def get_current_playback():
    """
    Get the current playback information of the user.

    Returns:
        dict: The current playback information if the request is successful, None otherwise.
    """
    headers = {"Authorization": f"Bearer {os.getenv('SPOTIFY_ACCESS_TOKEN')}"}
    url = "https://api.spotify.com/v1/me/player"
    response = requests.get(url, headers=headers, timeout=10)
    if response.status_code == 200:
        return response.json()
    if response.status_code == 401:
        refresh_access_token()
        return get_current_playback()
    return None


def get_recently_played_tracks(limit=10, after=None, before=None):
    """
    Get the recently played tracks of the user.

    Args:
        limit (int, optional): The number of tracks to return. Defaults to 10.
        after (int, optional): A Unix timestamp in milliseconds.
            Returns all items after this timestamp.
        before (int, optional): A Unix timestamp in milliseconds.
            Returns all items before this timestamp.

    Returns:
        dict: A dictionary containing recently played tracks and metadata if the
            request is successful, an empty dictionary otherwise.
    """
    headers = {"Authorization": f"Bearer {os.getenv('SPOTIFY_ACCESS_TOKEN')}"}
    url = f"https://api.spotify.com/v1/me/player/recently-played?limit={limit}"

    if after:
        url += f"&after={after}"
    if before:
        url += f"&before={before}"

    response = requests.get(url, headers=headers, timeout=10)
    if response.status_code == 200:
        data = response.json()
        tracks = [item["track"]["id"] for item in data["items"]]
        return {
            "href": data.get("href"),
            "limit": data.get("limit"),
            "next": data.get("next"),
            "cursors": data.get("cursors"),
            "total": data.get("total"),
            "tracks": tracks,
        }
    if response.status_code == 403:
        error_message = response.json().get("error", {}).get("message", "Unknown error")
        logger.error("Failed to fetch recently played tracks: %s", error_message)
        return {}
    logger.error("Failed to fetch recently played tracks")
    return {}


def load_skip_count():
    """
    Load the skip count from a JSON file.

    Returns:
        dict: The skip count data if the file exists, an empty dictionary otherwise.
    """
    try:
        with open("skip_count.json", "r", encoding="utf-8") as file:
            skip_count = json.load(file)
        return skip_count
    except FileNotFoundError:
        skip_count = {}


def save_skip_count(skip_count):
    """
    Save the skip count to a JSON file.

    Args:
        skip_count (dict): The skip count data to save.
    """
    with open("skip_count.json", "w", encoding="utf-8") as file:
        json.dump(skip_count, file)


def check_if_skipped_early(progress_ms, duration_ms):
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


def unlike_song(track_id):
    """
    Unlike a song on Spotify.

    Args:
        track_id (str): The ID of the track to unlike.
    """
    headers = {"Authorization": f"Bearer {os.getenv('SPOTIFY_ACCESS_TOKEN')}"}
    url = f"https://api.spotify.com/v1/me/tracks?ids={track_id}"
    response = requests.delete(url, headers=headers, timeout=10)
    if response.status_code == 200:
        logger.info("Unliked song: %s", track_id)
    else:
        logger.error("Failed to unlike song: %s", track_id)
