# pylint: disable=import-error

"""
This module sets up and runs a Flask application for Spotify playback monitoring.
It includes logging configuration, signal handling, and keybind listening.
"""

import os
import time
import webbrowser
import threading
import signal
import platform
from typing import Optional
from types import FrameType
from urllib.parse import urlparse
from flask import Flask
from auth import login, callback, is_token_valid, refresh_access_token
from playback import main as playback_main
from logging_config import setup_logger

if platform.system() == "Linux":
    src_path = os.path.dirname(os.path.abspath(__file__))
    os.system(f"export PYTHONPATH=$PYTHONPATH:{src_path}")
    os.environ["PYTHONPATH"] = f"{os.environ.get('PYTHONPATH', '')}:{src_path}"

# Set up logging
logger = setup_logger()

# Check for required environment variables
required_env_vars = [
    "SPOTIFY_CLIENT_ID",
    "SPOTIFY_CLIENT_SECRET",
    "SPOTIFY_REDIRECT_URI",
]
missing_vars = [var for var in required_env_vars if not os.getenv(var)]

if missing_vars:
    logger.error("Missing required environment variables: %s", ", ".join(missing_vars))
    raise SystemExit("Exiting due to missing environment variables.")

app: Flask = Flask(__name__)

# Define routes
app.route("/login")(login)
app.route("/callback")(callback)

port: int = (
    urlparse(os.getenv("SPOTIFY_REDIRECT_URI", "http://localhost:5000/callback")).port
    or 5000
)

# Global stop flags
main_stop_flag: threading.Event = threading.Event()
flask_stop_flag: threading.Event = threading.Event()


def signal_handler(sig: int, frame: Optional[FrameType]) -> None:  # pylint: disable=unused-argument
    """
    Handle the signal to shut down the application.

    Args:
        sig: The signal number.
        frame: The current stack frame.
    """
    logger.info("Shutting down...")
    main_stop_flag.set()
    flask_stop_flag.set()


# Register the signal handler
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)


def main() -> None:
    """
    Start the playback monitoring process.
    """
    playback_main(main_stop_flag)


def run_flask_app() -> None:
    """
    Run the Flask application using the appropriate server based on the platform.
    """

    if platform.system() == "Windows":
        from waitress import serve  # pylint: disable=import-outside-toplevel

        serve(app, host="0.0.0.0", port=port)
    else:
        os.system(f"gunicorn -w 1 -b 0.0.0.0:{port} src.app:app")


if __name__ == "__main__":
    try:
        ATTEMPTS: int = 0
        WEBBROWSER_OPENED: bool = False
        FLASK_THREAD: Optional[threading.Thread] = None
        MAIN_THREAD: Optional[threading.Thread] = None
        while not is_token_valid() and ATTEMPTS < 10 and not WEBBROWSER_OPENED:
            logger.info("Access token is invalid or missing. Re-authenticating...")
            if os.getenv("SPOTIFY_REFRESH_TOKEN"):
                refresh_access_token()
            else:
                if not WEBBROWSER_OPENED:
                    webbrowser.open(f"http://localhost:{port}/login")
                    FLASK_THREAD = threading.Thread(target=run_flask_app)
                    FLASK_THREAD.start()
                    WEBBROWSER_OPENED = True
            ATTEMPTS += 1

        if is_token_valid():
            logger.info("Access token is valid. No need to re-authenticate.")

        # Continually check if the token is valid every second
        while not main_stop_flag.is_set():
            if FLASK_THREAD and FLASK_THREAD.is_alive():
                if is_token_valid():
                    logger.info(
                        "Access token is valid. Stopping Flask app and starting main thread."
                    )
                    flask_stop_flag.set()
                    MAIN_THREAD = threading.Thread(target=main)
                    MAIN_THREAD.start()
                    break
            else:
                MAIN_THREAD = threading.Thread(target=main)
                MAIN_THREAD.start()
                break
            time.sleep(1)

        # Wait for the stop flags to be set
        flask_stop_flag.wait()
        main_stop_flag.wait()
        if MAIN_THREAD and MAIN_THREAD.is_alive():
            logger.info("Stopping main thread.")
            MAIN_THREAD.join()

    except KeyboardInterrupt:
        logger.info("Keyboard interrupt received. Exiting...")
    finally:
        logger.info("Application has been stopped.")
