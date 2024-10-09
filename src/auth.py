# pylint: disable=import-error

"""
This module handles Spotify authentication, including login, token refresh, and
token validation. It uses environment variables to store sensitive information
such as client ID, client secret, and tokens.
"""

import os
import logging
import requests
from dotenv import load_dotenv, set_key
from flask import request, redirect

load_dotenv()

CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")
REDIRECT_URI = os.getenv("SPOTIFY_REDIRECT_URI")
AUTH_URL = "https://accounts.spotify.com/authorize"
TOKEN_URL = "https://accounts.spotify.com/api/token"
SCOPE = "user-read-playback-state user-library-modify user-read-recently-played"

logger = logging.getLogger("SpotifySkipTracker")

# Define global variables
ACCESS_TOKEN = None
REFRESH_TOKEN = None


def reload_env():
    """
    Reload environment variables from the .env file.
    """
    load_dotenv(override=True)


def save_access_token(token):
    """
    Save the access token to the .env file.

    Args:
        token (str): The access token to be saved.
    """
    set_key(".env", "SPOTIFY_ACCESS_TOKEN", token)
    reload_env()


def save_refresh_token(token):
    """
    Save the refresh token to the .env file.

    Args:
        token (str): The refresh token to be saved.
    """
    set_key(".env", "SPOTIFY_REFRESH_TOKEN", token)
    reload_env()


def refresh_access_token():
    """
    Refresh the Spotify access token using the refresh token.

    This function updates the global ACCESS_TOKEN variable and saves the new token
    to the .env file. Logs an error if the token refresh fails.
    """
    global ACCESS_TOKEN  # pylint: disable=global-statement
    token_data = {
        "grant_type": "refresh_token",
        "refresh_token": os.getenv("SPOTIFY_REFRESH_TOKEN"),
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
    }
    response = requests.post(TOKEN_URL, data=token_data, timeout=10)
    if response.status_code == 200:
        ACCESS_TOKEN = response.json()["access_token"]
        save_access_token(ACCESS_TOKEN)
        logger.info("Access Token Refreshed")
    else:
        logger.error("Failed to refresh access token")


def login():
    """
    Redirect the user to the Spotify authorization URL.

    Returns:
        A redirect response to the Spotify authorization URL.
    """
    auth_url = (
        f"{AUTH_URL}?response_type=code&client_id={CLIENT_ID}&scope={SCOPE}"
        f"&redirect_uri={REDIRECT_URI}"
    )
    return redirect(auth_url)


def callback():
    """
    Handle the callback from Spotify after user authorization.

    This function exchanges the authorization code for access and refresh tokens,
    saves them to the .env file, and logs the success or failure.

    Returns:
        str: A success message if the tokens are obtained successfully.
        tuple: An error message and status code if the token exchange fails.
    """
    global ACCESS_TOKEN, REFRESH_TOKEN  # pylint: disable=global-statement
    auth_code = request.args.get("code")
    token_data = {
        "grant_type": "authorization_code",
        "code": auth_code,
        "redirect_uri": REDIRECT_URI,
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
    }
    response = requests.post(TOKEN_URL, data=token_data, timeout=10)
    if response.status_code == 200:
        token_json = response.json()
        ACCESS_TOKEN = token_json["access_token"]
        REFRESH_TOKEN = token_json["refresh_token"]
        save_refresh_token(REFRESH_TOKEN)
        save_access_token(ACCESS_TOKEN)
        logger.info("Access Token Obtained")
        return "Login successful! You can now close this tab."
    logger.error("Failed to get access token")
    return "Failed to get access token", 400


def is_token_valid():
    """
    Check if the current Spotify access token is valid.

    Returns:
        bool: True if the access token is valid, False otherwise.
    """
    headers = {"Authorization": f"Bearer {os.getenv('SPOTIFY_ACCESS_TOKEN')}"}
    url = "https://api.spotify.com/v1/me"
    response = requests.get(url, headers=headers, timeout=10)
    return response.status_code == 200
