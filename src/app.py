"""
This module creates a GUI application for Spotify Skip Tracker using customtkinter.
It handles user authentication, playback monitoring, and displays logs within the interface.
"""

import os
import threading
import webbrowser
import time
from typing import Optional, Dict, Any
from tkinter import messagebox
import json
import requests
import customtkinter as ctk
from flask import Flask
from auth import login_bp, callback_bp, is_token_valid, stop_flag
from playback import main as playback_main
from logging_config import setup_logger
from utils import get_user_id
from config_utils import load_config, set_config_variable

# Initialize logging
logger = setup_logger()
log_level = load_config().get("LOG_LEVEL", "INFO")
logger.setLevel(log_level)

# Initialize Flask app for OAuth callback
flask_app = Flask(__name__)
flask_app.register_blueprint(login_bp, url_prefix="/login")
flask_app.register_blueprint(callback_bp, url_prefix="/callback")


class HeaderFrame(ctk.CTkFrame):
    """
    A header frame containing Login and Logout buttons for the Spotify Skip Tracker GUI.
    """

    def __init__(self, master, authenticate_callback, logout_callback):
        """
        Initialize the HeaderFrame.

        Args:
            master (ctk.CTk): The parent widget.
            authenticate_callback (callable): Function to call for authentication.
            logout_callback (callable): Function to call for logout.
        """
        super().__init__(master, height=50)
        self.grid(row=0, column=0, sticky="ew", padx=20, pady=5)

        self.authenticate_callback = authenticate_callback
        self.logout_callback = logout_callback

        self.header_label = ctk.CTkLabel(
            self, text="Spotify Skip Tracker", font=("Arial", 24)
        )
        self.header_label.pack(side="top", pady=(10, 0))

        self.login_button = ctk.CTkButton(
            self, text="Login with Spotify", command=self.authenticate_callback
        )
        self.login_button.pack(side="left", pady=(0, 10), padx=10)

        self.logout_button = ctk.CTkButton(
            self, text="Logout", command=self.logout_callback
        )
        self.logout_button.pack(side="right", pady=(0, 10), padx=10)


class HomeTab:
    """
    A Home tab for the Spotify Skip Tracker GUI, displaying playback information and logs.
    """

    def __init__(self, parent):
        """
        Initialize the HomeTab.

        Args:
            parent (ctk.CTkFrame): The parent frame for the Home tab.
        """
        self.parent = parent

        # Playback Information Text Box
        self.playback_info = ctk.CTkTextbox(parent, width=800, height=250)
        self.playback_info.pack(pady=10, padx=10)
        self.playback_info.configure(state="disabled")

        # Log Text Box
        self.log_text = ctk.CTkTextbox(parent, width=800, height=250)
        self.log_text.pack(pady=10, padx=10)
        self.log_text.configure(state="disabled")

    def update_playback_info(self, playback: Optional[Dict[str, Any]]):
        """
        Update the playback information text box with the current playback details.

        Args:
            playback (Optional[Dict[str, Any]]): The current playback information.
        """
        if playback:
            track_name = playback["item"]["name"]
            artists = ", ".join(
                [artist["name"] for artist in playback["item"]["artists"]]
            )
            progress = playback["progress_ms"] // 1000
            duration = playback["item"]["duration_ms"] // 1000
            is_playing = playback["is_playing"]
            status = "Playing" if is_playing else "Paused"

            info = (
                f"Track: {track_name}\n"
                f"Artists: {artists}\n"
                f"Progress: {progress}s / {duration}s\n"
                f"Status: {status}\n"
            )
        else:
            info = "No playback information available."

        self.playback_info.configure(state="normal")
        self.playback_info.delete("1.0", "end")
        self.playback_info.insert("1.0", info)
        self.playback_info.configure(state="disabled")

    def update_logs(self, log_contents: str):
        """
        Update the log text box with new log contents.

        Args:
            log_contents (str): The contents of the log file.
        """
        self.log_text.configure(state="normal")
        self.log_text.delete("1.0", "end")
        self.log_text.insert("1.0", log_contents)
        self.log_text.yview_moveto(1.0)
        self.log_text.configure(state="disabled")


class SkippedTab:
    """
    A Skipped tab for the Spotify Skip Tracker GUI, displaying skipped songs count.
    """

    def __init__(self, parent):
        """
        Initialize the SkippedTab.

        Args:
            parent (ctk.CTkFrame): The parent frame for the Skipped tab.
        """
        self.parent = parent

        # Title Label
        self.skipped_label = ctk.CTkLabel(
            parent, text="Skipped Songs Count", font=("Arial", 16)
        )
        self.skipped_label.pack(pady=10)

        # Skipped Songs Text Box
        self.skipped_text = ctk.CTkTextbox(parent, width=800, height=450)
        self.skipped_text.pack(pady=10, padx=10)
        self.skipped_text.configure(state="disabled")

        # Refresh Button
        self.refresh_button = ctk.CTkButton(
            parent, text="Refresh", command=self.refresh
        )
        self.refresh_button.pack(pady=10)

        # Load skipped songs data initially
        self.load_skipped_data()

    def load_skipped_data(self):
        """
        Load and display the skipped songs data from skip_count.json.
        """
        skipped_file = "skip_count.json"
        try:
            with open(skipped_file, "r", encoding="utf-8") as file:
                skip_data = json.load(file)
            if skip_data:
                display_text = "\n".join(
                    [f"{track}: {count}" for track, count in skip_data.items()]
                )
            else:
                display_text = "No skipped songs recorded."
        except FileNotFoundError:
            display_text = "Skip count file not found."
        except json.JSONDecodeError:
            display_text = "Error decoding skip count file."

        self.skipped_text.configure(state="normal")
        self.skipped_text.delete("1.0", "end")
        self.skipped_text.insert("1.0", display_text)
        self.skipped_text.configure(state="disabled")

    def refresh(self):
        """
        Refresh the skipped songs data.
        """
        self.load_skipped_data()


class SettingsTab:
    """
    A Settings tab for the Spotify Skip Tracker GUI, allows users to configure application settings.
    """

    def __init__(self, parent, config, logger):  # pylint: disable=redefined-outer-name
        """
        Initialize the SettingsTab.

        Args:
            parent (ctk.CTkFrame): The parent frame for the Settings tab.
            config (dict): The current configuration dictionary.
            logger (logging.Logger): The logger instance for logging activities.
        """
        self.parent = parent
        self.config = config
        self.logger = logger

        # Title Label
        self.settings_label = ctk.CTkLabel(
            parent, text="Application Settings", font=("Arial", 16)
        )
        self.settings_label.pack(pady=10)

        # Configuration Variables
        self.settings_entries = {}
        required_keys = [
            "SPOTIFY_CLIENT_ID",
            "SPOTIFY_CLIENT_SECRET",
            "SPOTIFY_REDIRECT_URI",
        ]

        for key in required_keys:
            frame = ctk.CTkFrame(parent)
            frame.pack(pady=5, padx=20, fill="x")

            formatted_key = " ".join(
                word.capitalize() for word in key.lower().split("_")
            )
            label = ctk.CTkLabel(frame, text=f"{formatted_key}:", width=160, anchor="w")
            label.pack(side="left", padx=5, pady=5)

            entry = ctk.CTkEntry(frame, width=500)
            entry.pack(side="left", padx=5, pady=5)
            entry.insert(0, self.config.get(key, ""))
            self.settings_entries[key] = entry

        # Log Level Dropdown
        log_level_frame = ctk.CTkFrame(parent)
        log_level_frame.pack(pady=5, padx=20, fill="x")

        log_level_label = ctk.CTkLabel(
            log_level_frame, text="Log Level:", width=160, anchor="w"
        )
        log_level_label.pack(side="left", padx=5, pady=5)

        self.log_level_var = ctk.StringVar(value=self.config.get("LOG_LEVEL", "INFO"))
        self.log_level_dropdown = ctk.CTkOptionMenu(
            log_level_frame,
            variable=self.log_level_var,
            values=["DEBUG", "INFO", "WARNING", "ERROR"],
        )
        self.log_level_dropdown.pack(side="left", padx=5, pady=5)

        # Log Line Count Textbox
        log_line_count_frame = ctk.CTkFrame(parent)
        log_line_count_frame.pack(pady=5, padx=20, fill="x")

        log_line_count_label = ctk.CTkLabel(
            log_line_count_frame, text="Log Lines:", width=160, anchor="w"
        )
        log_line_count_label.pack(side="left", padx=5, pady=5)

        self.log_line_count_var = ctk.StringVar(
            value=self.config.get("LOG_LINE_COUNT", "500")
        )
        self.log_line_count_entry = ctk.CTkEntry(
            log_line_count_frame, textvariable=self.log_line_count_var, width=500
        )
        self.log_line_count_entry.pack(side="left", padx=5, pady=5)

        # Save Settings Button
        self.save_button = ctk.CTkButton(
            parent, text="Save Settings", command=self.save_settings
        )
        self.save_button.pack(pady=20)

    def save_settings(self):
        """
        Save the settings entered in the Settings tab.
        """
        for key, entry in self.settings_entries.items():
            value = entry.get().strip()
            if not value:
                messagebox.showerror("Input Error", f"{key} cannot be empty.")
                return
            if key == "SPOTIFY_CLIENT_ID" or key == "SPOTIFY_CLIENT_SECRET":
                set_config_variable(key, value, encrypt=True)
            else:
                set_config_variable(key, value)
            self.config[key] = value

        # Save log level setting
        log_level = self.log_level_var.get()  # pylint: disable=redefined-outer-name
        set_config_variable("LOG_LEVEL", log_level)
        self.config["LOG_LEVEL"] = log_level
        self.logger.setLevel(log_level)

        # Save log line count setting
        log_line_count = self.log_line_count_var.get()
        set_config_variable("LOG_LINE_COUNT", log_line_count)
        self.config["LOG_LINE_COUNT"] = log_line_count

        messagebox.showinfo("Settings Saved", "Settings have been saved successfully.")
        self.logger.info("Settings saved by the user.")


class SpotifySkipTrackerGUI(ctk.CTk):
    """
    A GUI application for tracking Spotify skips using customtkinter.

    This class handles user authentication, playback monitoring, and displays logs
    within the interface.
    """

    def __init__(self):
        """
        Initialize the SpotifySkipTrackerGUI application.
        """
        super().__init__()

        self.title("Spotify Skip Tracker")
        self.geometry("900x700")

        # Load configuration
        self.config = load_config(decrypt=True)
        self.access_token = self.config.get("SPOTIFY_ACCESS_TOKEN", "")
        self.refresh_token = self.config.get("SPOTIFY_REFRESH_TOKEN", "")
        self.user_id: Optional[str] = None
        self.playback_thread: Optional[threading.Thread] = None
        self.flask_thread: Optional[threading.Thread] = None
        self.stop_event = threading.Event()

        # Configure grid
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(1, weight=1)

        # Create header using HeaderFrame
        self.create_header()

        # Create tab view
        self.create_tab_view()

        if self.access_token and is_token_valid():
            self.user_id = get_user_id()
            self.start_playback_monitoring()
        else:
            logger.info("Access token not found or invalid. Please authenticate.")

        # Start loading log file
        self.log_file_path = os.path.join("logs", "spotify_app.log")
        self.update_log_text_box_thread = threading.Thread(
            target=self.update_log_text_box, daemon=True
        )
        self.update_log_text_box_thread.start()

    def create_header(self):
        """
        Create the header frame with the login and logout buttons using HeaderFrame class.
        """
        self.header = HeaderFrame(
            self, authenticate_callback=self.authenticate, logout_callback=self.logout
        )

    def create_tab_view(self):
        """
        Create the tabbed interface with Home, Skipped, and Settings tabs.
        """
        self.tab_view = ctk.CTkTabview(self, width=850, height=600)
        self.tab_view.grid(row=1, column=0, padx=20, pady=20, sticky="nsew")

        # Add tabs
        self.tab_view.add("Home")
        self.tab_view.add("Skipped")
        self.tab_view.add("Settings")

        # Configure each tab
        self.create_home_tab()
        self.create_skipped_tab()
        self.create_settings_tab()

    def create_home_tab(self):
        """
        Create the Home tab by instantiating the HomeTab class.
        """
        home_frame = self.tab_view.tab("Home")
        self.home_tab = HomeTab(home_frame)  # pylint: disable=attribute-defined-outside-init

    def create_skipped_tab(self):
        """
        Create the Skipped tab by instantiating the SkippedTab class.
        """
        skipped_frame = self.tab_view.tab("Skipped")
        self.skipped_tab = SkippedTab(skipped_frame)  # pylint: disable=attribute-defined-outside-init

    def create_settings_tab(self):
        """
        Create the Settings tab by instantiating the SettingsTab class.
        """
        settings_frame = self.tab_view.tab("Settings")
        self.settings_tab = SettingsTab(settings_frame, self.config, logger)  # pylint: disable=attribute-defined-outside-init

    def authenticate(self):
        """
        Authenticate the user with Spotify by starting the Flask server and opening the login page.
        """
        # Check for required configuration variables
        missing_vars = self.get_missing_config_variables()
        if missing_vars:
            self.prompt_for_config_variables(missing_vars)
            return

        # Start Flask server in a separate thread
        self.start_flask_server()

        # Open the browser for Spotify login
        logger.info("Starting authentication process...")
        webbrowser.open(f"http://localhost:{self.get_port()}/login")

    def get_missing_config_variables(self) -> list:
        """
        Identify missing configuration variables that are required for authentication.

        Returns:
            list: A list of missing configuration keys.
        """
        required_keys = [
            "SPOTIFY_CLIENT_ID",
            "SPOTIFY_CLIENT_SECRET",
            "SPOTIFY_REDIRECT_URI",
        ]
        self.config = load_config(decrypt=True)
        missing = [key for key in required_keys if not self.config.get(key)]
        return missing

    def prompt_for_config_variables(self, missing_vars: list):
        """
        Prompt the user to enter missing configuration variables.

        Args:
            missing_vars (list): A list of missing configuration keys.
        """
        popup = ctk.CTkToplevel(self)
        popup.title("Enter Missing Configuration Variables")
        popup.geometry("500x400")
        popup.grab_set()  # Make the popup modal

        entries = {}
        for var in missing_vars:
            frame = ctk.CTkFrame(popup)
            frame.pack(pady=10, padx=20, fill="x")

            label = ctk.CTkLabel(frame, text=f"{var}:", width=160, anchor="w")
            label.pack(side="left", padx=5, pady=5)

            entry = ctk.CTkEntry(frame, width=300)
            entry.pack(side="left", padx=5, pady=5)
            entries[var] = entry

        def save_and_close():
            """
            Save the entered configuration variables and close the popup.
            """
            for var, entry in entries.items():
                value = entry.get().strip()
                if not value:
                    messagebox.showerror("Input Error", f"{var} cannot be empty.")
                    return
                if var == "SPOTIFY_CLIENT_ID" or var == "SPOTIFY_CLIENT_SECRET":
                    set_config_variable(var, value, encrypt=True)
                else:
                    set_config_variable(var, value)
                self.config[var] = value

            popup.destroy()
            messagebox.showinfo(
                "Configuration Saved",
                "Configuration variables have been saved. Please click the Login "
                "button again to authenticate.",
            )
            logger.info("Configuration variables saved by the user.")

        save_button = ctk.CTkButton(popup, text="Save", command=save_and_close)
        save_button.pack(pady=20)

    def get_port(self) -> int:
        """
        Get the port number from the redirect URI.

        Returns:
            int: The port number.
        """
        redirect_uri = self.config.get(
            "SPOTIFY_REDIRECT_URI", "http://localhost:5000/callback"
        )
        parsed_uri = requests.utils.urlparse(redirect_uri)
        return parsed_uri.port or 5000

    def start_flask_server(self):
        """
        Start the Flask server in a separate thread.
        """
        if not self.flask_thread or not self.flask_thread.is_alive():
            self.flask_thread = threading.Thread(target=self.run_flask, daemon=True)
            self.flask_thread.start()
            # Monitor the Flask thread
            self.after(100, self.check_flask_thread)

    def run_flask(self):
        """
        Run the Flask server for handling OAuth callbacks.
        """
        while not stop_flag.is_set():
            try:
                flask_app.run(port=self.get_port(), debug=False, use_reloader=False)
            except Exception as e:  # pylint: disable=broad-except
                logger.error("Error running Flask server: %s", e)
            time.sleep(1)

    def check_flask_thread(self):
        """
        Check the status of the Flask thread and start playback monitoring
        if the thread has stopped.
        """
        if stop_flag.is_set():
            self.start_playback_monitoring()
            try:
                if self.flask_thread and self.flask_thread.is_alive():
                    self.flask_thread = None
            except Exception as e:  # pylint: disable=broad-except
                logger.error("Error joining Flask thread: %s", e)
        else:
            # Check again after 100ms
            self.after(100, self.check_flask_thread)

    def start_playback_monitoring(self):
        """
        Start the playback monitoring thread.
        """
        if self.playback_thread and self.playback_thread.is_alive():
            return
        self.stop_event.clear()
        self.playback_thread = threading.Thread(
            target=self.monitor_playback, daemon=True
        )
        self.playback_thread.start()

    def monitor_playback(self):
        """
        Monitor the playback information and update the playback info text box.
        """
        self.user_id = get_user_id()
        playback_main(self.stop_event, self.update_playback_info)

    def update_playback_info(self, playback: Optional[Dict[str, Any]]):
        """
        Update the playback information in the Home tab.

        Args:
            playback (Optional[Dict[str, Any]]): The current playback information.
        """
        self.home_tab.update_playback_info(playback)

    def update_log_text_box(self):
        """
        Continuously update the log text box with the contents of the log file.
        """
        previous_log_contents = ""

        while True:
            try:
                with open(self.log_file_path, "r", encoding="utf-8") as log_file:
                    log_contents = log_file.readlines()
            except FileNotFoundError:
                log_contents = []

            # Get the number of log lines to display
            log_line_count = int(self.config.get("LOG_LINE_COUNT", "500"))

            # Display the most recent log lines
            recent_logs = log_contents[-log_line_count:]
            display_logs = "".join(recent_logs)

            if display_logs != previous_log_contents:
                self.home_tab.update_logs(display_logs)
                previous_log_contents = display_logs

            time.sleep(1)

    def logout(self):
        """
        Logout the user by clearing access and refresh tokens from the configuration.
        """
        if self.playback_thread and self.playback_thread.is_alive():
            self.stop_event.set()
            self.playback_thread.join()
            logger.info("Playback monitoring stopped.")

        if self.flask_thread:
            self.flask_thread = None

        set_config_variable("SPOTIFY_ACCESS_TOKEN", "", encrypt=True)
        set_config_variable("SPOTIFY_REFRESH_TOKEN", "", encrypt=True)
        self.config["SPOTIFY_ACCESS_TOKEN"] = ""
        self.config["SPOTIFY_REFRESH_TOKEN"] = ""
        self.access_token = ""
        self.refresh_token = ""
        messagebox.showinfo(
            "Logout Successful", "You have been logged out successfully."
        )
        logger.info("User logged out and tokens cleared.")

        # Clear playback info
        self.playback_info.configure(state="normal")
        self.playback_info.delete("1.0", "end")
        self.playback_info.configure(state="disabled")

        # Clear skipped songs display
        self.skipped_text.configure(state="normal")
        self.skipped_text.delete("1.0", "end")
        self.skipped_text.configure(state="disabled")


if __name__ == "__main__":
    app = SpotifySkipTrackerGUI()
    app.mainloop()
