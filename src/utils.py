# pylint: disable=import-error

"""
This module provides utility functions for interacting with the Spotify API,
managing skip counts, and checking if a song was skipped early.
"""

import os
import logging
import json
import time
import requests
from auth import refresh_access_token

logger = logging.getLogger("SpotifySkipTracker")


def get_user_id(retries=3):
    """
    Get the Spotify user ID of the current user.

    Args:
        retries (int, optional): The number of retries if the request fails. Defaults to 3.

    Returns:
        str: The Spotify user ID if the request is successful, None otherwise.
    """
    headers = {"Authorization": f"Bearer {os.getenv('SPOTIFY_ACCESS_TOKEN')}"}
    url = "https://api.spotify.com/v1/me"

    try:
        for attempt in range(retries):
            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code == 200:
                return response.json()["id"]
            if response.status_code == 401:
                time.sleep(5)
                refresh_access_token()
            else:
                logger.error(
                    "Failed to fetch user ID, attempt %d/%d", attempt + 1, retries
                )
                time.sleep(2)
    except requests.exceptions.RequestException as e:
        logger.error("Failed to fetch user ID: %s", str(e))
        time.sleep(2)
    return None


def get_current_playback(retries=3):
    """
    Get the current playback information of the user.

    Args:
        retries (int, optional): The number of retries if the request fails. Defaults to 3.

    Returns:
        dict: The current playback information if the request is successful, None otherwise.
    """
    headers = {"Authorization": f"Bearer {os.getenv('SPOTIFY_ACCESS_TOKEN')}"}
    url = "https://api.spotify.com/v1/me/player"

    try:
        for _ in range(retries):
            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code == 200:
                return response.json()
            if response.status_code == 401:
                refresh_access_token()
                time.sleep(5)
                continue
            if response.status_code == 429:
                logger.debug(response.json())
                logger.error("Rate limit exceeded, waiting for 10 seconds")
                time.sleep(10)
                continue
            if response.status_code == 204:
                return None
            logger.debug(response)
            logger.error("Failed to fetch current playback")
            time.sleep(2)
    except requests.exceptions.RequestException as e:
        logger.error("Failed to fetch current playback: %s", str(e))
        time.sleep(2)
    return None


def get_recently_played_tracks(limit=10, after=None, before=None, retries=3):
    """
    Get the recently played tracks of the user.

    Args:
        limit (int, optional): The number of tracks to return. Defaults to 10.
        after (int, optional): A Unix timestamp in milliseconds.
            Returns all items after this timestamp.
        before (int, optional): A Unix timestamp in milliseconds.
            Returns all items before this timestamp.
        retries (int, optional): The number of retries if the request fails. Defaults to 3.

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

    try:
        for attempt in range(retries):
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
                error_message = (
                    response.json().get("error", {}).get("message", "Unknown error")
                )
                logger.error(
                    "Failed to fetch recently played tracks: %s", error_message
                )
                return {}
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
        return {}


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


def unlike_song(track_id, retries=3):
    """
    Unlike a song on Spotify.

    Args:
        track_id (str): The ID of the track to unlike.
        retries (int): The number of retry attempts if the request fails.
    """
    headers = {"Authorization": f"Bearer {os.getenv('SPOTIFY_ACCESS_TOKEN')}"}
    url = f"https://api.spotify.com/v1/me/tracks?ids={track_id}"

    try:
        for attempt in range(retries):
            response = requests.delete(url, headers=headers, timeout=10)
            if response.status_code == 200:
                logger.info("Unliked song: %s", track_id)
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
