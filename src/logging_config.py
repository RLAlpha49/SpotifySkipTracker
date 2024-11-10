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
    logger: Logger = logging.getLogger("SpotifySkipTracker")

    # Prevent adding multiple handlers if the logger already has handlers
    if not logger.hasHandlers():
        # Create logs directory if it doesn't exist
        logs_directory: str = "logs"
        if not os.path.exists(logs_directory):
            os.makedirs(logs_directory)

        # File handler with rotation
        log_file_path: str = os.path.join(logs_directory, "spotify_app.log")
        file_handler: RotatingFileHandler = RotatingFileHandler(
            log_file_path,
            maxBytes=10 * 1024 * 1024,  # 10 MB
            backupCount=10,
            encoding="utf-8",
        )
        file_formatter: logging.Formatter = logging.Formatter(
            "%(asctime)s - %(levelname)s - %(message)s"
        )
        file_handler.setFormatter(file_formatter)
        file_handler.setLevel(logging.DEBUG)  # Capture all levels to file

        # Stream handler for console
        stream_handler: logging.StreamHandler = logging.StreamHandler()
        stream_formatter: logging.Formatter = logging.Formatter(
            "%(levelname)s - %(message)s"
        )
        stream_handler.setFormatter(stream_formatter)
        stream_handler.setLevel(logging.INFO)  # Capture INFO and above to console

        # Add handlers to the logger
        logger.addHandler(file_handler)
        logger.addHandler(stream_handler)

    return logger
