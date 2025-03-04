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
    try:
        logger: Logger = logging.getLogger("SpotifySkipTracker")

        # Prevent adding multiple handlers if the logger already has handlers
        if not logger.hasHandlers():
            try:
                # Create logs directory if it doesn't exist
                _logs_directory: str = "logs"
                if not os.path.exists(_logs_directory):
                    os.makedirs(_logs_directory)
                    logger.debug("Created logs directory at %s", _logs_directory)
            except OSError as e:
                logger.critical(
                    "Failed to create logs directory '%s': %s", _logs_directory, e
                )
                raise
            except Exception as e:  # pylint: disable=broad-exception-caught
                logger.critical(
                    "Unexpected error while creating logs directory '%s': %s",
                    _logs_directory,
                    e,
                )
                raise

            try:
                # File handler with rotation
                _log_file_path: str = os.path.join(_logs_directory, "spotify_app.log")
                _file_handler: RotatingFileHandler = RotatingFileHandler(
                    _log_file_path,
                    maxBytes=10 * 1024 * 1024,  # 10 MB
                    backupCount=10,
                    encoding="utf-8",
                )
                _file_formatter: logging.Formatter = logging.Formatter(
                    "%(asctime)s - %(levelname)s - %(message)s"
                )
                _file_handler.setFormatter(_file_formatter)
                _file_handler.setLevel(logging.DEBUG)  # Capture all levels to file

                # Add file handler to the logger
                logger.addHandler(_file_handler)
                logger.debug("File handler added with path %s", _log_file_path)
            except (OSError, IOError) as e:
                logger.error("Failed to set up file handler: %s", e)
            except Exception as e:  # pylint: disable=broad-exception-caught
                logger.critical("Unexpected error while setting up file handler: %s", e)
                raise

            try:
                # Stream handler for console
                _stream_handler: logging.StreamHandler = logging.StreamHandler()
                _stream_formatter: logging.Formatter = logging.Formatter(
                    "%(levelname)s - %(message)s"
                )
                _stream_handler.setFormatter(_stream_formatter)
                _stream_handler.setLevel(
                    logging.INFO
                )  # Capture INFO and above to console

                # Add stream handler to the logger
                logger.addHandler(_stream_handler)
                logger.debug("Stream handler added for console output.")
            except Exception as e:  # pylint: disable=broad-exception-caught
                logger.critical("Failed to set up stream handler: %s", e)
                raise

        logger.setLevel(logging.DEBUG)  # Set the base logger level
        return logger

    except Exception as e:  # pylint: disable=broad-exception-caught
        # If any unexpected error occurs during logger setup, log it as critical and re-raise
        logging.critical("Failed to set up logger: %s", e)
        raise
