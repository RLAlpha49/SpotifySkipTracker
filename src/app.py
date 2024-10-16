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

# Initialize Flask app for OAuth callback
flask_app = Flask(__name__)
flask_app.register_blueprint(login_bp, url_prefix="/login")
flask_app.register_blueprint(callback_bp, url_prefix="/callback")


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
        self.geometry("800x600")

        # Load configuration
        self.config = load_config()
        self.access_token = self.config.get("SPOTIFY_ACCESS_TOKEN", "")
        self.refresh_token = self.config.get("SPOTIFY_REFRESH_TOKEN", "")
        self.user_id: Optional[str] = None
        self.playback_thread: Optional[threading.Thread] = None
        self.flask_thread: Optional[threading.Thread] = None
        self.stop_event = threading.Event()

        # Configure grid
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(1, weight=1)

        # Create header
        self.create_header()

        # Create frames
        self.create_content_frame()

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
        Create the header frame with the login button.
        """
        self.header_frame = ctk.CTkFrame(self, height=50)
        self.header_frame.grid(row=0, column=0, sticky="ew")

        self.login_button = ctk.CTkButton(
            self.header_frame, text="Login with Spotify", command=self.authenticate
        )
        self.login_button.pack(pady=10, padx=10)

    def create_content_frame(self):
        """
        Create the content frame with playback information and log text boxes.
        """
        self.content_frame = ctk.CTkFrame(self)
        self.content_frame.grid(row=1, column=0, sticky="nsew")

        # Playback Information Text Box
        self.playback_info = ctk.CTkTextbox(self.content_frame, width=600, height=300)
        self.playback_info.pack(pady=20, padx=20)
        self.playback_info.configure(state="disabled")

        # Log Text Box
        self.log_text = ctk.CTkTextbox(self.content_frame, width=600, height=200)
        self.log_text.pack(pady=20, padx=20)
        self.log_text.configure(state="disabled")

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
        self.config = load_config()
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
        popup.geometry("400x300")
        popup.grab_set()  # Make the popup modal

        entries = {}
        for var in missing_vars:
            frame = ctk.CTkFrame(popup)
            frame.pack(pady=5, padx=10, fill="x")

            label = ctk.CTkLabel(frame, text=f"{var}:")
            label.pack(side="left", padx=5, pady=5)

            entry = ctk.CTkEntry(frame, width=250)
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
                set_config_variable(var, value)
                self.config[var] = value  # Update the current config

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

    def append_log(self, message: str):
        """
        Append a log message to the log text box.

        Args:
            message (str): The log message to append.
        """
        self.log_text.configure(state="normal")
        self.log_text.insert("end", message + "\n")
        self.log_text.configure(state="disabled")

    def update_log_text_box(self):
        """
        Continuously update the log text box with the contents of the log file.
        """
        previous_log_contents = ""

        while True:
            try:
                with open(self.log_file_path, "r", encoding="utf-8") as log_file:
                    log_contents = log_file.read()
            except FileNotFoundError:
                log_contents = ""

            if log_contents != previous_log_contents:
                self.log_text.configure(state="normal")
                self.log_text.delete("1.0", "end")
                self.log_text.insert("1.0", log_contents)
                self.log_text.yview_moveto(1.0)
                self.log_text.configure(state="disabled")
                previous_log_contents = log_contents

            time.sleep(1)  # Update every second


if __name__ == "__main__":
    app = SpotifySkipTrackerGUI()
    app.mainloop()
