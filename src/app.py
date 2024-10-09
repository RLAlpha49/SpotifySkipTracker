# pylint: disable=import-error

"""
This module sets up and runs a Flask application for Spotify playback monitoring.
It includes logging configuration, signal handling, and keybind listening.
"""

import os
import webbrowser
import threading
import signal
import platform
from flask import Flask
from auth import login, callback, is_token_valid, refresh_access_token
from playback import main as playback_main
from logging_config import setup_logger

app = Flask(__name__)

# Set up logging
logger = setup_logger()

# Define routes
app.route("/login")(login)
app.route("/callback")(callback)

# Global stop flag
stop_flag = threading.Event()


def signal_handler(sig, frame):  # pylint: disable=unused-argument
    """
    Handle the signal to shut down the application.

    Args:
        sig: The signal number.
        frame: The current stack frame.
    """
    logger.info("Shutting down...")
    stop_flag.set()  # Signal the main function to stop


# Register the signal handler
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)


def main():
    """
    Start the playback monitoring process.
    """
    playback_main(stop_flag)


def run_flask_app():
    """
    Run the Flask application using the appropriate server based on the platform.
    """
    if platform.system() == "Windows":
        from waitress import serve  # pylint: disable=import-outside-toplevel

        serve(app, host="0.0.0.0", port=5000)
    else:
        os.system("gunicorn -w 4 -b 0.0.0.0:5000 app:app")


if __name__ == "__main__":
    try:
        if not is_token_valid():
            logger.info("Access token is invalid or missing. Re-authenticating...")
            if os.getenv("SPOTIFY_REFRESH_TOKEN"):
                refresh_access_token()
            else:
                webbrowser.open("http://localhost:5000/login")
                run_flask_app()
        else:
            logger.info("Access token is valid. No need to re-authenticate.")
            threading.Thread(target=main).start()

        # Keep the main thread alive to listen for the stop flag
        while not stop_flag.is_set():
            pass

    except KeyboardInterrupt:
        logger.info("Keyboard interrupt received. Exiting...")
    finally:
        logger.info("Application has been stopped.")
