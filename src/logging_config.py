"""
This module provides a function to set up a logger with both file and stream handlers.
The logger is configured to write logs to a specified file and to the console, with
support for rotating log files and UTF-8 encoding to handle a wide range of characters.
"""

import logging
from logging.handlers import RotatingFileHandler


def setup_logger(
    name="SpotifySkipTracker", log_file="logs/spotify_app.log", level=logging.DEBUG
):
    """
    Set up a logger with a file and stream handler.

    Args:
        name: The name of the logger.
        log_file: The file path for the log file.
        level: The logging level.
    """
    logger = logging.getLogger(name)
    logger.setLevel(level)

    # File handler for logging to a file
    file_handler = RotatingFileHandler(
        log_file, maxBytes=10 * 1024 * 1024, backupCount=10, encoding="utf-8"
    )
    file_formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
    file_handler.setFormatter(file_formatter)
    file_handler.setLevel(level)

    # Stream handler for logging to the terminal
    stream_handler = logging.StreamHandler()
    stream_formatter = logging.Formatter("%(levelname)s - %(message)s")
    stream_handler.setFormatter(stream_formatter)
    stream_handler.setLevel(logging.INFO)
    stream_handler.setStream(open(1, "w", encoding="utf-8", closefd=False))

    # Add handlers to the logger
    logger.addHandler(file_handler)
    logger.addHandler(stream_handler)

    return logger
