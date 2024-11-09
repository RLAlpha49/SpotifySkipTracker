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
from gui.home_tab import HomeTab
from gui.skipped_tab import SkippedTab
from gui.settings_tab import SettingsTab
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

config = load_config()
ctk.set_appearance_mode(config.get("APPEARANCE_MODE", "System"))
if config.get("COLOR_THEME", "blue") == "NightTrain":
    ctk.set_default_color_theme("assets/themes/night_train.json")
else:
    ctk.set_default_color_theme(config.get("COLOR_THEME", "blue"))


class HeaderFrame:
    """
    A header frame containing Login and Logout buttons for the Spotify Skip Tracker GUI.
    """

    def __init__(
        self,
        master: ctk.CTk,
        authenticate_callback: callable,
        logout_callback: callable,
    ):
        """
        Initialize the HeaderFrame.

        Args:
            master (ctk.CTk): The parent widget.
            authenticate_callback (callable): Function to call for authentication.
            logout_callback (callable): Function to call for logout.
        """
        self.frame = ctk.CTkFrame(master, height=50)
        self.frame.grid(row=0, column=0, sticky="ew", padx=20, pady=5)

        self.authenticate_callback = authenticate_callback
        self.logout_callback = logout_callback

        self.header_label = ctk.CTkLabel(
            self.frame, text="Spotify Skip Tracker", font=("Arial", 24)
        )
        self.header_label.pack(side="top", pady=(10, 0))

        self.login_button = ctk.CTkButton(
            self.frame, text="Login with Spotify", command=self.authenticate_callback
        )
        self.login_button.pack(side="left", pady=(0, 10), padx=10)

        self.logout_button = ctk.CTkButton(
            self.frame, text="Logout", command=self.logout_callback
        )
        self.logout_button.pack(side="right", pady=(0, 10), padx=10)

    def show_login_button(self):
        """
        Display the login button and hide the logout button.
        """
        self.login_button.pack(side="left", pady=(0, 10), padx=10)
        self.logout_button.pack_forget()

    def show_logout_button(self):
        """
        Display the logout button and hide the login button.
        """
        self.logout_button.pack(side="right", pady=(0, 10), padx=10)
        self.login_button.pack_forget()


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
        self.geometry("730x750")

        # Initialize state groups
        self.auth = self.AuthState()
        self.threads = self.ThreadState()
        self.tabs = self.TabState()

        # Load configuration
        self.auth.config = load_config(decrypt=True)
        self.auth.access_token = self.auth.config.get("SPOTIFY_ACCESS_TOKEN", "")
        self.auth.refresh_token = self.auth.config.get("SPOTIFY_REFRESH_TOKEN", "")
        self.auth.user_id = None

        self.stop_event = threading.Event()

        # Configure grid
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(1, weight=1)

        # Create header using HeaderFrame
        self.create_header()

        # Create tab view and tabs
        self.create_tab_view()

        if self.auth.access_token and is_token_valid():
            self.auth.user_id = get_user_id()
            self.start_playback_monitoring()
        else:
            logger.info("Access token not found or invalid. Please authenticate.")

        # Start loading log file
        self.tabs.log.log_file_path = os.path.join("logs", "spotify_app.log")
        self.tabs.log.update_log_text_box_thread = threading.Thread(
            target=self.update_log_text_box, daemon=True
        )
        self.tabs.log.update_log_text_box_thread.start()

    class AuthState:  # pylint: disable=too-few-public-methods
        """
        Manages authentication state including tokens and user ID.
        """

        def __init__(self):
            """
            Initialize the AuthState with default values.
            """
            self.config: Dict[str, Any] = {}
            self.access_token: str = ""
            self.refresh_token: str = ""
            self.user_id: Optional[str] = None

    class ThreadState:  # pylint: disable=too-few-public-methods
        """
        Manages threads for playback monitoring and Flask server.
        """

        def __init__(self):
            """
            Initialize the ThreadState with default threads and stop event.
            """
            self.playback_thread: Optional[threading.Thread] = None
            self.flask_thread: Optional[threading.Thread] = None
            self.stop_event: threading.Event = threading.Event()

    class TabState:  # pylint: disable=too-few-public-methods
        """
        Manages the different tabs within the GUI.
        """

        def __init__(self):
            """
            Initialize the TabState with default tabs.
            """
            self.home_tab: Optional[HomeTab] = None
            self.skipped_tab: Optional[SkippedTab] = None
            self.settings_tab: Optional[SettingsTab] = None
            self.log: SpotifySkipTrackerGUI.LogState = self.LogState()

        class LogState:  # pylint: disable=too-few-public-methods
            """
            Manages the logging state, including log file path and update thread.
            """

            def __init__(self):
                """
                Initialize the LogState with default values.
                """
                self.log_file_path: str = ""
                self.update_log_text_box_thread: Optional[threading.Thread] = None

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
        self.tabs.home_tab = HomeTab(home_frame, logger)

    def create_skipped_tab(self):
        """
        Create the Skipped tab by instantiating the SkippedTab class.
        """
        skipped_frame = self.tab_view.tab("Skipped")
        self.tabs.skipped_tab = SkippedTab(skipped_frame, self.auth.config, logger)

    def create_settings_tab(self):
        """
        Create the Settings tab by instantiating the SettingsTab class.
        """
        settings_frame = self.tab_view.tab("Settings")
        self.tabs.settings_tab = SettingsTab(settings_frame, self.auth.config, logger)

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
        self.auth.config = load_config(decrypt=True)
        missing = [key for key in required_keys if not self.auth.config.get(key)]
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
                if var in ["SPOTIFY_CLIENT_ID", "SPOTIFY_CLIENT_SECRET"]:
                    set_config_variable(var, value, encrypt=True)
                else:
                    set_config_variable(var, value)
                self.auth.config[var] = value

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
        redirect_uri = self.auth.config.get(
            "SPOTIFY_REDIRECT_URI", "http://localhost:5000/callback"
        )
        parsed_uri = requests.utils.urlparse(redirect_uri)
        return parsed_uri.port or 5000

    def start_flask_server(self):
        """
        Start the Flask server in a separate thread.
        """
        if not self.threads.flask_thread or not self.threads.flask_thread.is_alive():
            self.threads.flask_thread = threading.Thread(
                target=self.run_flask, daemon=True
            )
            self.threads.flask_thread.start()
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
                if self.threads.flask_thread and self.threads.flask_thread.is_alive():
                    self.threads.flask_thread = None
            except Exception as e:  # pylint: disable=broad-except
                logger.error("Error joining Flask thread: %s", e)
        else:
            # Check again after 100ms
            self.after(100, self.check_flask_thread)

    def start_playback_monitoring(self):
        """
        Start the playback monitoring thread.
        """
        if self.threads.playback_thread and self.threads.playback_thread.is_alive():
            return
        self.threads.stop_event.clear()
        self.threads.playback_thread = threading.Thread(
            target=self.monitor_playback, daemon=True
        )
        self.threads.playback_thread.start()

    def monitor_playback(self):
        """
        Monitor the playback information and update the playback info text box.
        """
        self.auth.user_id = get_user_id()
        playback_main(self.threads.stop_event, self.update_playback_info)

    def update_playback_info(self, playback: Optional[Dict[str, Any]]):
        """
        Update the playback information in the Home tab.

        Args:
            playback (Optional[Dict[str, Any]]): The current playback information.
        """
        self.tabs.home_tab.update_playback_info(playback)

    def update_log_text_box(self):
        """
        Continuously update the log text box with the contents of the log file.
        """
        previous_log_contents = ""

        while True:
            try:
                with open(
                    self.tabs.log.log_file_path, "r", encoding="utf-8"
                ) as log_file:
                    log_contents = log_file.readlines()
            except FileNotFoundError:
                log_contents = []

            # Get the number of log lines to display
            log_line_count = int(self.auth.config.get("LOG_LINE_COUNT", "500"))

            # Display the most recent log lines
            recent_logs = log_contents[-log_line_count:]
            display_logs = "".join(recent_logs)

            if display_logs != previous_log_contents:
                self.tabs.home_tab.update_logs(display_logs)
                previous_log_contents = display_logs

            time.sleep(1)

    def logout(self):
        """
        Logout the user by clearing access and refresh tokens from the configuration.
        """
        if self.threads.playback_thread and self.threads.playback_thread.is_alive():
            self.threads.stop_event.set()
            self.threads.playback_thread.join()
            logger.info("Playback monitoring stopped.")

        if self.threads.flask_thread:
            self.threads.flask_thread = None

        set_config_variable("SPOTIFY_ACCESS_TOKEN", "", encrypt=True)
        set_config_variable("SPOTIFY_REFRESH_TOKEN", "", encrypt=True)
        self.auth.config["SPOTIFY_ACCESS_TOKEN"] = ""
        self.auth.config["SPOTIFY_REFRESH_TOKEN"] = ""
        self.auth.access_token = ""
        self.auth.refresh_token = ""
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
