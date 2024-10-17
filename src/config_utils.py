"""
This module provides functions to load, save, and manage configuration settings.
"""

import json
import os
import logging
from cryptography.fernet import Fernet
from dotenv import load_dotenv, set_key

CONFIG_FILE = "config.json"
ENV_FILE = ".env"
logger = logging.getLogger("SpotifySkipTracker")

# Define required configuration keys
REQUIRED_KEYS = [
    "SPOTIFY_CLIENT_ID",
    "SPOTIFY_CLIENT_SECRET",
    "SPOTIFY_REDIRECT_URI",
    "SPOTIFY_ACCESS_TOKEN",
    "SPOTIFY_REFRESH_TOKEN",
]

# Load environment variables
load_dotenv(ENV_FILE)


# Retrieve or generate the encryption key
def get_encryption_key() -> bytes:
    key = os.getenv("ENCRYPTION_KEY")
    if not key:
        key = Fernet.generate_key().decode()
        set_key(ENV_FILE, "ENCRYPTION_KEY", key)
        logger.info("Generated new encryption key and saved to .env")
    return key.encode()


ENCRYPTION_KEY = get_encryption_key()
ENCRYPTION_PREFIX = "enc:"


def encrypt_data(data: str) -> str:
    """
    Encrypt data using Fernet symmetric encryption.

    Args:
        data (str): Data to encrypt.

    Returns:
        str: Encrypted data.
    """
    fernet = Fernet(ENCRYPTION_KEY)
    encrypted_data = fernet.encrypt(data.encode())
    return ENCRYPTION_PREFIX + encrypted_data.decode()


def decrypt_data(encrypted_data: str) -> str:
    """
    Decrypt data using Fernet symmetric encryption.

    Args:
        encrypted_data (str): Data to decrypt.

    Returns:
        str: Decrypted data.
    """
    if not encrypted_data.startswith(ENCRYPTION_PREFIX):
        return encrypted_data
    encrypted_data = encrypted_data[len(ENCRYPTION_PREFIX) :]
    fernet = Fernet(ENCRYPTION_KEY)
    decrypted_data = fernet.decrypt(encrypted_data.encode())
    return decrypted_data.decode()


def load_config(decrypt: bool = False) -> dict:
    """
    Load configuration from the JSON file. If the file does not exist,
    create it with required keys initialized to empty strings.

    Args:
        decrypt (bool): Whether to attempt to decrypt the configuration values.

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

    # Decrypt values if requested
    if decrypt:
        for key in REQUIRED_KEYS:
            if key in config and config[key].startswith(ENCRYPTION_PREFIX):
                try:
                    config[key] = decrypt_data(config[key])
                except Exception as e:
                    logger.error("Failed to decrypt key %s: %s", key, e)

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


def set_config_variable(key: str, value: str, encrypt: bool = False) -> None:
    """
    Set a configuration variable and save it, optionally encrypting the value.

    Args:
        key (str): Configuration key.
        value (str): Configuration value.
        encrypt (bool): Whether to encrypt the value.
    """
    config = load_config()
    old_value = config.get(key, "")
    if encrypt:
        value = encrypt_data(value)
    if old_value != value:
        config[key] = value
        save_config(config)
        logger.debug(
            "Configuration key '%s' changed and saved to %s.",
            key,
            CONFIG_FILE,
        )


def get_config_variable(key: str, default: str = "", decrypt: bool = False) -> str:
    """
    Retrieve a configuration variable, optionally decrypting the value.

    Args:
        key (str): Configuration key.
        default (str, optional): Default value if key is not found. Defaults to "".
        decrypt (bool): Whether to decrypt the value.

    Returns:
        str: Configuration value.
    """
    config = load_config()
    value = config.get(key, default)
    if decrypt and value:
        value = decrypt_data(value)
    return value
