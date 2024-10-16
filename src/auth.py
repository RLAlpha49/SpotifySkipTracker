# pylint: disable=import-error

"""
This module handles Spotify authentication, including login, token refresh, and
token validation. It uses a JSON configuration file to store sensitive information
such as client ID, client secret, and tokens.
"""

import logging
import requests
from flask import Blueprint, request, redirect, jsonify
from typing import Optional
from config_utils import set_config_variable, get_config_variable
import threading

# Define a global stop flag
stop_flag = threading.Event()

CLIENT_ID: str = get_config_variable("SPOTIFY_CLIENT_ID", "")
CLIENT_SECRET: str = get_config_variable("SPOTIFY_CLIENT_SECRET", "")
REDIRECT_URI: str = get_config_variable("SPOTIFY_REDIRECT_URI", "")
AUTH_URL: str = "https://accounts.spotify.com/authorize"
TOKEN_URL: str = "https://accounts.spotify.com/api/token"
SCOPE: str = "user-read-playback-state user-library-modify user-read-recently-played"

logger: logging.Logger = logging.getLogger("SpotifySkipTracker")

# Define global variables
ACCESS_TOKEN: Optional[str] = get_config_variable("SPOTIFY_ACCESS_TOKEN", "")
REFRESH_TOKEN: Optional[str] = get_config_variable("SPOTIFY_REFRESH_TOKEN", "")

# Define Flask Blueprints
login_bp = Blueprint("login", __name__)
callback_bp = Blueprint("callback", __name__)
shutdown_bp = Blueprint("shutdown", __name__)


def auth_reload():
    global CLIENT_ID, CLIENT_SECRET, REDIRECT_URI
    CLIENT_ID = get_config_variable("SPOTIFY_CLIENT_ID", "")
    CLIENT_SECRET = get_config_variable("SPOTIFY_CLIENT_SECRET", "")
    REDIRECT_URI = get_config_variable("SPOTIFY_REDIRECT_URI", "")


@login_bp.route("/")
def spotify_login():
    auth_reload()
    auth_query = {
        "response_type": "code",
        "redirect_uri": REDIRECT_URI,
        "scope": SCOPE,
        "client_id": CLIENT_ID,
    }
    url_args = "&".join(
        [f"{key}={requests.utils.quote(val)}" for key, val in auth_query.items()]
    )
    auth_url_complete = f"{AUTH_URL}?{url_args}"
    logger.debug(f"Redirecting to Spotify Auth URL: {auth_url_complete}")
    return redirect(auth_url_complete)


@callback_bp.route("/")
def oauth_callback():
    auth_reload()
    global ACCESS_TOKEN
    global REFRESH_TOKEN

    code = request.args.get("code")
    if code:
        payload = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": REDIRECT_URI,
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
        }
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        response = requests.post(TOKEN_URL, data=payload, headers=headers)
        if response.status_code == 200:
            tokens = response.json()
            ACCESS_TOKEN = tokens.get("access_token")
            REFRESH_TOKEN = tokens.get("refresh_token")

            # Save tokens to config.json
            set_config_variable("SPOTIFY_ACCESS_TOKEN", ACCESS_TOKEN)
            set_config_variable("SPOTIFY_REFRESH_TOKEN", REFRESH_TOKEN)

            logger.info("Authentication successful.")
            # Signal the GUI to stop the Flask server and start playback
            shutdown_flask_server()
            return "Authentication successful. Server shutting down..."
        else:
            logger.error("Failed to obtain tokens.")
            return jsonify({"error": "Failed to obtain tokens."}), 400
    else:
        logger.error("No code found in callback.")
        return jsonify({"error": "No code found."}), 400


def is_token_valid() -> bool:
    """
    Check if the current access token is valid.

    Returns:
        bool: True if valid, False otherwise.
    """
    auth_reload()
    headers = {"Authorization": f"Bearer {ACCESS_TOKEN}"}
    response = requests.get("https://api.spotify.com/v1/me", headers=headers)
    return response.status_code == 200


def refresh_access_token() -> None:
    """
    Refresh the Spotify access token using the refresh token.
    """
    auth_reload()
    global ACCESS_TOKEN
    global REFRESH_TOKEN
    payload = {
        "grant_type": "refresh_token",
        "refresh_token": REFRESH_TOKEN,
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
    }
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    response = requests.post(TOKEN_URL, data=payload, headers=headers)
    if response.status_code == 200:
        tokens = response.json()
        ACCESS_TOKEN = tokens.get("access_token")
        set_config_variable("SPOTIFY_ACCESS_TOKEN", ACCESS_TOKEN)
        auth_reload()
        logger.info("Access Token Refreshed")
    else:
        logger.error("Failed to refresh access token.")


def shutdown_flask_server():
    logger.info("Flask server shutting down...")
    stop_flag.set()
