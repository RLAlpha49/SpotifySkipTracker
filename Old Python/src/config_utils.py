"""
This module provides functions to load, save, and manage configuration settings.
"""

import json
import os
import logging
from typing import Any, Dict, Optional, Union
from cryptography.fernet import Fernet
from dotenv import load_dotenv, set_key

_CONFIG_FILE: str = "config.json"
_ENV_FILE: str = ".env"
logger: logging.Logger = logging.getLogger("SpotifySkipTracker")

# Define required configuration keys
_REQUIRED_KEYS: list[str] = [
    "SPOTIFY_CLIENT_ID",
    "SPOTIFY_CLIENT_SECRET",
    "SPOTIFY_REDIRECT_URI",
    "SPOTIFY_ACCESS_TOKEN",
    "SPOTIFY_REFRESH_TOKEN",
]

# Load environment variables
load_dotenv(_ENV_FILE)


# Retrieve or generate the encryption key
def _get_encryption_key() -> bytes:
    """
    Retrieve the encryption key from the environment or generate a new one if it does not exist.

    Returns:
        bytes: The encryption key.
    """
    try:
        key: Optional[str] = os.getenv("ENCRYPTION_KEY")
        if not key:
            key = Fernet.generate_key().decode()
            try:
                set_key(_ENV_FILE, "ENCRYPTION_KEY", key)
                logger.info("Generated new encryption key and saved to .env")
            except (OSError, IOError) as e:
                logger.critical("Failed to save encryption key to %s: %s", _ENV_FILE, e)
                raise
            except Exception as e:  # pylint: disable=broad-exception-caught
                logger.critical(
                    "Unexpected error while saving encryption key to %s: %s",
                    _ENV_FILE,
                    e,
                )
                raise
        return key.encode()
    except Exception as e:  # pylint: disable=broad-exception-caught
        logger.critical("Failed to retrieve or generate encryption key: %s", e)
        raise


_ENCRYPTION_KEY: bytes = _get_encryption_key()
_ENCRYPTION_PREFIX: str = "enc:"


def _encrypt_data(data: Union[str, int, float, None]) -> str:
    """
    Encrypt data using Fernet symmetric encryption.

    Args:
        data (Union[str, int, float, None]): Data to encrypt.

    Returns:
        str: Encrypted data.
    """
    try:
        if not data:
            return ""
        if isinstance(data, (int, float)):
            data = str(data)
        fernet: Fernet = Fernet(_ENCRYPTION_KEY)
        encrypted_data: bytes = fernet.encrypt(data.encode())
        return _ENCRYPTION_PREFIX + encrypted_data.decode()
    except Exception as e:  # pylint: disable=broad-exception-caught
        logger.critical("Failed to encrypt data: %s", e)
        raise


def _decrypt_data(encrypted_data: str) -> str:
    """
    Decrypt data using Fernet symmetric encryption.

    Args:
        encrypted_data (str): Data to decrypt.

    Returns:
        str: Decrypted data.
    """
    try:
        if not encrypted_data.startswith(_ENCRYPTION_PREFIX):
            return encrypted_data
        encrypted_data = encrypted_data[len(_ENCRYPTION_PREFIX) :]
        fernet: Fernet = Fernet(_ENCRYPTION_KEY)
        decrypted_data: bytes = fernet.decrypt(encrypted_data.encode())
        return decrypted_data.decode()
    except (ValueError, TypeError) as e:
        logger.error("Decryption failed for data: %s", e)
        return ""  # Return empty string or handle as needed
    except Exception as e:  # pylint: disable=broad-exception-caught
        logger.critical("Unexpected error while decrypting data: %s", e)
        raise


def load_config(decrypt: bool = False) -> Dict[str, Any]:
    """
    Load configuration from the JSON file. If the file does not exist,
    create it with required keys initialized to empty strings.

    Args:
        decrypt (bool, optional): Whether to attempt to decrypt the configuration values.
            Defaults to False.

    Returns:
        Dict[str, Any]: Configuration data.
    """
    try:
        config = _load_or_create_config()
        _ensure_required_keys(config)
        if decrypt:
            _decrypt_config_values(config)
        return config
    except Exception as e:  # pylint: disable=broad-exception-caught
        logger.critical("Critical failure in load_config: %s", e)
        raise


def _load_or_create_config() -> Dict[str, Any]:
    """
    Load the configuration from the JSON file, or create a new one if it doesn't exist.

    Returns:
        Dict[str, Any]: The loaded or newly created configuration data.
    """
    if not os.path.exists(_CONFIG_FILE):
        logger.info("%s not found. Creating a new one with empty values.", _CONFIG_FILE)
        return _create_default_config()
    try:
        with open(_CONFIG_FILE, "r", encoding="utf-8") as file:
            return json.load(file)
    except json.JSONDecodeError as e:
        logger.error("Error decoding %s: %s", _CONFIG_FILE, e)
        return _create_default_config()
    except (OSError, IOError) as e:
        logger.critical("Failed to read %s: %s", _CONFIG_FILE, e)
        raise


def _ensure_required_keys(config: Dict[str, Any]) -> None:
    """
    Ensure that all required keys are present in the configuration.

    Args:
        config (Dict[str, Any]): The configuration data to check and update.
    """
    missing_keys: list[str] = [key for key in _REQUIRED_KEYS if key not in config]
    if missing_keys:
        logger.info(
            "Missing keys in config: %s. Adding them with empty values.", missing_keys
        )
        for key in missing_keys:
            config[key] = ""
        try:
            save_config(config)
            logger.debug("Missing keys added to config: %s.", missing_keys)
        except Exception as e:
            logger.critical("Failed to save config after adding missing keys: %s", e)
            raise


def _decrypt_config_values(config: Dict[str, Any]) -> None:
    """
    Decrypt encrypted configuration values.

    Args:
        config (Dict[str, Any]): The configuration data containing potentially encrypted values.
    """
    for key in _REQUIRED_KEYS:
        if key in config and config[key].startswith(_ENCRYPTION_PREFIX):
            try:
                config[key] = _decrypt_data(config[key])
            except Exception as e:  # pylint: disable=broad-exception-caught
                logger.error("Failed to decrypt key %s: %s", key, e)


def _create_default_config() -> Dict[str, Any]:
    """
    Create a default configuration with required keys set to empty strings.

    Returns:
        Dict[str, Any]: Default configuration data.
    """
    try:
        config: Dict[str, Any] = {key: "" for key in _REQUIRED_KEYS}
        save_config(config)
        logger.debug("Default configuration created and saved to %s.", _CONFIG_FILE)
        return config
    except Exception as e:  # pylint: disable=broad-exception-caught
        logger.critical("Failed to create default configuration: %s", e)
        raise


def save_config(config: Dict[str, Any]) -> None:
    """
    Save configuration to the JSON file.

    Args:
        config (Dict[str, Any]): Configuration data to save.
    """
    try:
        with open(_CONFIG_FILE, "w", encoding="utf-8") as file:
            json.dump(config, file, indent=4)
        logger.debug("Configuration saved successfully to %s.", _CONFIG_FILE)
    except (OSError, IOError) as e:
        logger.error("Failed to save configuration: %s", e)
    except Exception as e:  # pylint: disable=broad-exception-caught
        logger.critical("Unexpected error while saving configuration: %s", e)
        raise


def set_config_variable(
    key: str, value: Union[str, int, float, None], encrypt: bool = False
) -> None:
    """
    Set a configuration variable and save it, optionally encrypting the value.

    Args:
        key (str): Configuration key.
        value (Union[str, int, float, None]): Configuration value.
        encrypt (bool, optional): Whether to encrypt the value. Defaults to False.
    """
    try:
        config: Dict[str, Any] = load_config()
        old_value: Any = config.get(key, "")
        if encrypt:
            try:
                value = _encrypt_data(value)
            except Exception as e:  # pylint: disable=broad-exception-caught
                logger.error("Failed to encrypt value for key %s: %s", key, e)
                return  # Exit the function if encryption fails

        if old_value != value:
            config[key] = value
            try:
                save_config(config)
                logger.debug(
                    "Configuration key '%s' changed and saved to %s.",
                    key,
                    _CONFIG_FILE,
                )
            except Exception as e:
                logger.critical(
                    "Failed to save configuration after setting key '%s': %s", key, e
                )
                raise
    except Exception as e:  # pylint: disable=broad-exception-caught
        logger.critical(
            "Critical failure in set_config_variable for key '%s': %s", key, e
        )
        raise


def get_config_variable(key: str, default: str = "", decrypt: bool = False) -> str:
    """
    Retrieve a configuration variable, optionally decrypting the value.

    Args:
        key (str): Configuration key.
        default (str, optional): Default value if key is not found. Defaults to "".
        decrypt (bool, optional): Whether to decrypt the value. Defaults to False.

    Returns:
        str: Configuration value.
    """
    try:
        config: Dict[str, Any] = load_config()
        value: Any = config.get(key, default)
        if decrypt and value:
            try:
                value = _decrypt_data(value)
            except Exception as e:  # pylint: disable=broad-exception-caught
                logger.error("Failed to decrypt key %s: %s", key, e)
        return value
    except Exception as e:  # pylint: disable=broad-exception-caught
        logger.critical(
            "Critical failure in get_config_variable for key '%s': %s", key, e
        )
        raise
