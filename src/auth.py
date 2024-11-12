# pylint: disable=import-error

"""
This module handles Spotify authentication, including login, token refresh, and
token validation. It uses a JSON configuration file to store sensitive information
such as client ID, client secret, and tokens.
"""

# pylint: disable=global-variable-not-assigned

import logging
from typing import Optional, Any, Dict
import threading
import requests
from flask import Blueprint, request, redirect, jsonify
from config_utils import set_config_variable, get_config_variable

# Define a global stop flag
stop_flag: threading.Event = threading.Event()

logger: logging.Logger = logging.getLogger("SpotifySkipTracker")


def auth_reload() -> None:
    """
    Reload the authentication configuration variables from the config file.
    """
    global CLIENT_ID, CLIENT_SECRET, REDIRECT_URI  # pylint: disable=global-statement
    try:
        CLIENT_ID = get_config_variable("SPOTIFY_CLIENT_ID", "", decrypt=True)
        CLIENT_SECRET = get_config_variable("SPOTIFY_CLIENT_SECRET", "", decrypt=True)
        REDIRECT_URI = get_config_variable("SPOTIFY_REDIRECT_URI", "")
        logger.debug("Authentication variables reloaded successfully.")
    except Exception as e:  # pylint: disable=broad-exception-caught
        logger.critical("Failed to reload authentication variables: %s", e)
        raise


# Initialize configuration variables
try:
    CLIENT_ID: str = get_config_variable("SPOTIFY_CLIENT_ID", "", decrypt=True)
    CLIENT_SECRET: str = get_config_variable("SPOTIFY_CLIENT_SECRET", "", decrypt=True)
    REDIRECT_URI: str = get_config_variable("SPOTIFY_REDIRECT_URI", "")
except Exception as e:  # pylint: disable=broad-exception-caught
    logger.critical("Failed to initialize authentication variables: %s", e)
    raise

AUTH_URL: str = "https://accounts.spotify.com/authorize"
TOKEN_URL: str = "https://accounts.spotify.com/api/token"
SCOPE: str = "user-read-playback-state user-library-modify user-read-recently-played"

# Define global variables
try:
    ACCESS_TOKEN: Optional[str] = get_config_variable(
        "SPOTIFY_ACCESS_TOKEN", "", decrypt=True
    )
    REFRESH_TOKEN: Optional[str] = get_config_variable(
        "SPOTIFY_REFRESH_TOKEN", "", decrypt=True
    )
except Exception as e:  # pylint: disable=broad-exception-caught
    logger.critical("Failed to initialize tokens: %s", e)
    raise

# Define Flask Blueprints
login_bp: Blueprint = Blueprint("login", __name__)
callback_bp: Blueprint = Blueprint("callback", __name__)
shutdown_bp: Blueprint = Blueprint("shutdown", __name__)


@login_bp.route("/")
def spotify_login() -> Any:
    """
    Redirect the user to the Spotify login page for authentication.

    Returns:
        Any: A redirect response to the Spotify authentication URL.
    """
    try:
        auth_reload()
        auth_query: Dict[str, str] = {
            "response_type": "code",
            "redirect_uri": REDIRECT_URI,
            "scope": SCOPE,
            "client_id": CLIENT_ID,
        }
        url_args: str = "&".join(
            [f"{key}={requests.utils.quote(val)}" for key, val in auth_query.items()]
        )
        auth_url_complete: str = f"{AUTH_URL}?{url_args}"
        logger.debug("Redirecting to Spotify Auth URL: %s", auth_url_complete)
        return redirect(auth_url_complete)
    except Exception as e:  # pylint: disable=broad-exception-caught
        logger.critical("Failed during Spotify login redirection: %s", e)
        raise


@callback_bp.route("/")
def oauth_callback() -> Any:
    """
    Handle the OAuth callback from Spotify and exchange the authorization code for tokens.

    Returns:
        Any: A message indicating the success or failure of the authentication process.
    """
    try:
        auth_reload()
        global ACCESS_TOKEN  # pylint: disable=global-statement
        global REFRESH_TOKEN  # pylint: disable=global-statement

        code: Optional[str] = request.args.get("code")
        if code:
            payload: Dict[str, Any] = {
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": REDIRECT_URI,
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET,
            }
            headers: Dict[str, str] = {
                "Content-Type": "application/x-www-form-urlencoded"
            }
            try:
                response: requests.Response = requests.post(
                    TOKEN_URL, data=payload, headers=headers, timeout=10
                )
                response.raise_for_status()  # Raise an error for bad responses
                tokens: Dict[str, Any] = response.json()
                ACCESS_TOKEN = tokens.get("access_token")
                REFRESH_TOKEN = tokens.get("refresh_token")

                # Save tokens to config.json
                try:
                    set_config_variable(
                        "SPOTIFY_ACCESS_TOKEN", ACCESS_TOKEN, encrypt=True
                    )
                    set_config_variable(
                        "SPOTIFY_REFRESH_TOKEN", REFRESH_TOKEN, encrypt=True
                    )
                    logger.info("Authentication successful.")
                except Exception as e:  # pylint: disable=broad-exception-caught
                    logger.critical("Failed to save tokens after authentication: %s", e)
                    raise

                # Signal the GUI to stop the Flask server and start playback
                shutdown_flask_server()
                return "Authentication successful. Server shutting down..."
            except requests.exceptions.RequestException as e:
                logger.error("Failed to obtain tokens: %s", e)
                if "response" in locals():
                    logger.debug("Response content: %s", response.content)
                return jsonify({"error": "Failed to obtain tokens."}), 400
            except Exception as e:  # pylint: disable=broad-exception-caught
                logger.critical("Unexpected error during token exchange: %s", e)
                raise
        else:
            logger.error("No code found in callback.")
            return jsonify({"error": "No code found."}), 400
    except Exception as e:  # pylint: disable=broad-exception-caught
        logger.critical("Critical failure in oauth_callback: %s", e)
        raise


def is_token_valid() -> bool:
    """
    Check if the current access token is valid.

    Returns:
        bool: True if valid, False otherwise.
    """
    try:
        auth_reload()
        headers: Dict[str, str] = {"Authorization": f"Bearer {ACCESS_TOKEN}"}
        try:
            response: requests.Response = requests.get(
                "https://api.spotify.com/v1/me", headers=headers, timeout=10
            )
        except requests.exceptions.RequestException as e:
            logger.error("Request exception while validating token: %s", e)
            return False
        except Exception as e:  # pylint: disable=broad-exception-caught
            logger.critical("Unexpected error while validating token: %s", e)
            raise

        if response.status_code != 200:
            logger.error("Token is invalid.")
            logger.debug("Attempting to refresh token...")
            try:
                refresh_access_token()
                headers = {"Authorization": f"Bearer {ACCESS_TOKEN}"}
                try:
                    response = requests.get(
                        "https://api.spotify.com/v1/me", headers=headers, timeout=10
                    )
                except requests.exceptions.RequestException as e:
                    logger.error("Request exception after token refresh: %s", e)
                    return False
                except Exception as e:  # pylint: disable=broad-exception-caught
                    logger.critical("Unexpected error after token refresh: %s", e)
                    raise
            except Exception as e:
                logger.critical("Failed to refresh access token: %s", e)
                raise

        return response.status_code == 200
    except Exception as e:  # pylint: disable=broad-exception-caught
        logger.critical("Critical failure in is_token_valid: %s", e)
        raise


def refresh_access_token() -> None:
    """
    Refresh the Spotify access token using the refresh token.
    """
    try:
        auth_reload()
        global ACCESS_TOKEN  # pylint: disable=global-statement
        global REFRESH_TOKEN  # pylint: disable=global-statement
        payload: Dict[str, Any] = {
            "grant_type": "refresh_token",
            "refresh_token": REFRESH_TOKEN,
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
        }
        headers: Dict[str, str] = {"Content-Type": "application/x-www-form-urlencoded"}
        try:
            response: requests.Response = requests.post(
                TOKEN_URL, data=payload, headers=headers, timeout=10
            )
            response.raise_for_status()
            tokens: Dict[str, Any] = response.json()
            ACCESS_TOKEN = tokens.get("access_token")
            set_config_variable("SPOTIFY_ACCESS_TOKEN", ACCESS_TOKEN, encrypt=True)
            auth_reload()
            logger.info("Access Token Refreshed")
        except requests.exceptions.RequestException as e:
            logger.error("Failed to refresh access token: %s", e)
        except Exception as e:  # pylint: disable=broad-exception-caught
            logger.critical("Unexpected error while refreshing access token: %s", e)
            raise
    except Exception as e:  # pylint: disable=broad-exception-caught
        logger.critical("Critical failure in refresh_access_token: %s", e)
        raise


def shutdown_flask_server() -> None:
    """
    Signal the Flask server to shut down.
    """
    try:
        logger.info("Flask server shutting down...")
        stop_flag.set()
    except Exception as e:  # pylint: disable=broad-exception-caught
        logger.error("Failed to shut down Flask server: %s", e)
