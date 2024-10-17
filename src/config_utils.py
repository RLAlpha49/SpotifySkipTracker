"""
This module provides functions to load, save, and manage configuration settings.
"""

import json
import os
import logging

CONFIG_FILE = "config.json"
logger = logging.getLogger("SpotifySkipTracker")

# Define required configuration keys
REQUIRED_KEYS = [
    "SPOTIFY_CLIENT_ID",
    "SPOTIFY_CLIENT_SECRET",
    "SPOTIFY_REDIRECT_URI",
    "SPOTIFY_ACCESS_TOKEN",
    "SPOTIFY_REFRESH_TOKEN",
]


def load_config() -> dict:
    """
    Load configuration from the JSON file. If the file does not exist,
    create it with required keys initialized to empty strings.

    Returns:
        dict: Configuration data.
    """
    if not os.path.exists(CONFIG_FILE):
        logger.info("%s not found. Creating a new one with empty values.", CONFIG_FILE)
        create_default_config()

    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as file:
            config = json.load(file)
    except json.JSONDecodeError as e:
        logger.error("Error decoding %s: %s", CONFIG_FILE, e)
        config = create_default_config()

    # Ensure all required keys are present
    missing_keys = [key for key in REQUIRED_KEYS if key not in config]
    if missing_keys:
        logger.info(
            "Missing keys in config: %s. Adding them with empty values.", missing_keys
        )
        for key in missing_keys:
            config[key] = ""
        save_config(config)
        logger.debug("Missing keys added to config: %s.", missing_keys)
    return config


def create_default_config() -> dict:
    """
    Create a default configuration with required keys set to empty strings.

    Returns:
        dict: Default configuration data.
    """
    config = {key: "" for key in REQUIRED_KEYS}
    save_config(config)
    logger.debug("Default configuration created and saved to %s.", CONFIG_FILE)
    return config


def save_config(config: dict) -> None:
    """
    Save configuration to the JSON file.

    Args:
        config (dict): Configuration data to save.
    """
    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as file:
            json.dump(config, file, indent=4)
    except (OSError, IOError, json.JSONDecodeError) as e:
        logger.error("Failed to save configuration: %s", e)


def set_config_variable(key: str, value: str) -> None:
    """
    Set a configuration variable and save it.

    Args:
        key (str): Configuration key.
        value (str): Configuration value.
    """
    config = load_config()
    old_value = config.get(key, "")
    if old_value != value:
        config[key] = value
        save_config(config)
        logger.debug(
            "Configuration key '%s' changed from '%s' to '%s' and saved to %s.",
            key,
            old_value,
            value,
            CONFIG_FILE,
        )


def get_config_variable(key: str, default: str = "") -> str:
    """
    Retrieve a configuration variable.

    Args:
        key (str): Configuration key.
        default (str, optional): Default value if key is not found. Defaults to "".

    Returns:
        str: Configuration value.
    """
    config = load_config()
    return config.get(key, default)
