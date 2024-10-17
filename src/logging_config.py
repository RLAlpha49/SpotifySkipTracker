"""
This module provides a function to set up a logger with both file and stream handlers.
The logger is configured to write logs to a specified file and to the console, with
support for rotating log files and UTF-8 encoding to handle a wide range of characters.
"""

import logging
from logging import Logger
from logging.handlers import RotatingFileHandler
import os


def setup_logger() -> Logger:
    """
    Set up a logger with file and stream handlers.

    Returns:
        Logger: Configured logger instance.
    """
    logger = logging.getLogger("SpotifySkipTracker")

    # Create logs directory if it doesn't exist
    if not os.path.exists("logs"):
        os.makedirs("logs")

    # File handler with rotation
    file_handler = RotatingFileHandler(
        "logs/spotify_app.log",
        maxBytes=10 * 1024 * 1024,
        backupCount=10,
        encoding="utf-8",
    )
    file_formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
    file_handler.setFormatter(file_formatter)

    # Stream handler for console
    stream_handler = logging.StreamHandler()
    stream_formatter = logging.Formatter("%(levelname)s - %(message)s")
    stream_handler.setFormatter(stream_formatter)

    # Add handlers to the logger
    logger.addHandler(file_handler)
    logger.addHandler(stream_handler)

    return logger
