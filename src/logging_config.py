"""
This module provides a function to set up a logger with both file and stream handlers.
The logger is configured to write logs to a specified file and to the console, with
support for rotating log files and UTF-8 encoding to handle a wide range of characters.
"""

import logging
from logging import Logger
from logging.handlers import RotatingFileHandler
import os


def setup_logger(
    name: str = "SpotifySkipTracker",
    log_file: str = "logs/spotify_app.log",
    level: int = logging.DEBUG,
) -> Logger:
    """
    Set up a logger with a file and stream handler.

    Args:
        name: The name of the logger.
        log_file: The file path for the log file.
        level: The logging level.

    Returns:
        Logger: Configured logger instance.
    """
    logger = logging.getLogger(name)
    logger.setLevel(level)

    if not logger.handlers:
        # Create logs directory if it doesn't exist
        log_dir = os.path.dirname(log_file)
        if not os.path.exists(log_dir):
            os.makedirs(log_dir)

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

    # Prevent log messages from being propagated to the root logger
    logger.propagate = False

    return logger
