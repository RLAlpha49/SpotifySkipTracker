"""
This module creates a GUI application for Spotify Skip Tracker using customtkinter.
It handles user authentication, playback monitoring, and displays logs within the interface.
"""

import os
import sys
import threading
import webbrowser
import time
from typing import Callable, Optional, Dict, Any, List
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
from utils import get_user_id  # pylint: disable=import-error
from config_utils import load_config, set_config_variable  # pylint: disable=import-error


# Initialize logging
logger = setup_logger()
_log_level = load_config().get("LOG_LEVEL", "INFO")
logger.setLevel(_log_level)

# Initialize Flask app for OAuth callback
_flask_app = Flask(__name__)
_flask_app.register_blueprint(login_bp, url_prefix="/login")
_flask_app.register_blueprint(callback_bp, url_prefix="/callback")

_config = load_config()
ctk.set_appearance_mode(_config.get("APPEARANCE_MODE", "System"))
if _config.get("COLOR_THEME", "blue") == "NightTrain":
    ctk.set_default_color_theme("assets/themes/night_train.json")
else:
    ctk.set_default_color_theme(_config.get("COLOR_THEME", "blue"))


class HeaderFrame:
    """
    A header frame containing Login and Logout buttons for the Spotify Skip Tracker GUI.
    """

    def __init__(
        self,
        master: ctk.CTk,
        authenticate_callback: Callable[[], None],
        logout_callback: Callable[[], None],
    ) -> None:
        """
        Initialize the HeaderFrame.

        Args:
            master (ctk.CTk): The parent widget.
            authenticate_callback (Callable[[], None]): Function to call for authentication.
            logout_callback (Callable[[], None]): Function to call for logout.
        """
        self.frame = ctk.CTkFrame(master, height=50)
        self.frame.grid(row=0, column=0, sticky="ew", padx=20, pady=5)

        self._authenticate_callback = authenticate_callback
        self._logout_callback = logout_callback

        self.header_label = ctk.CTkLabel(
            self.frame, text="Spotify Skip Tracker", font=("Arial", 24)
        )
        self.header_label.pack(side="top", pady=(10, 0))

        self.login_button = ctk.CTkButton(
            self.frame, text="Login with Spotify", command=self._authenticate_callback
        )
        self.login_button.pack(side="left", pady=(0, 10), padx=10)

        self.logout_button = ctk.CTkButton(
            self.frame, text="Logout", command=self._logout_callback
        )
        self.logout_button.pack(side="right", pady=(0, 10), padx=10)

    def show_login_button(self) -> None:
        """
        Display the login button and hide the logout button.
        """
        self.login_button.pack(side="left", pady=(0, 10), padx=10)
        self.logout_button.pack_forget()

    def show_logout_button(self) -> None:
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

    def __init__(self) -> None:
        """
        Initialize the SpotifySkipTrackerGUI application.
        """
        super().__init__()

        # Initialize the critical error event
        self._critical_error_event = threading.Event()
        self._error_message = ""

        try:
            self.title("Spotify Skip Tracker")
            self.geometry("730x750")

            # Initialize state groups
            self._auth = self.AuthState()
            self._threads = self.ThreadState()
            self._tabs = self.TabState()

            # Load configuration
            self._auth.config = load_config(decrypt=True)
            self._auth.access_token = self._auth.config.get("SPOTIFY_ACCESS_TOKEN", "")
            self._auth.refresh_token = self._auth.config.get(
                "SPOTIFY_REFRESH_TOKEN", ""
            )
            self._auth.user_id = None

            self._stop_event = threading.Event()

            # Configure grid
            self.grid_columnconfigure(0, weight=1)
            self.grid_rowconfigure(1, weight=1)

            self._create_header()
            self._create_tab_view()

            if self._auth.access_token and is_token_valid():
                self._auth.user_id = get_user_id()
                self._start_playback_monitoring()
            else:
                logger.info("Access token not found or invalid. Please authenticate.")

            # Start loading log file
            self._tabs.log.log_file_path = os.path.join("logs", "spotify_app.log")
            self._tabs.log.update_log_text_box_thread = threading.Thread(
                target=self._update_log_text_box, daemon=True
            )
            self._tabs.log.update_log_text_box_thread.start()
        except Exception as e:  # pylint: disable=broad-exception-caught
            logger.critical("Failed to initialize SpotifySkipTrackerGUI: %s", e)
            self._error_message = str(e)
            self._critical_error_event.set()
            self.terminate_application()
            raise

        # Start the periodic check for critical errors
        self._check_for_critical_errors()

    class AuthState:  # pylint: disable=too-few-public-methods
        """
        Manages authentication state including tokens and user ID.
        """

        def __init__(self) -> None:
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

        def __init__(self) -> None:
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

        def __init__(self) -> None:
            """
            Initialize the TabState with default tabs.
            """
            self.home_tab: Optional[HomeTab] = None
            self.skipped_tab: Optional[SkippedTab] = None
            self.settings_tab: Optional[SettingsTab] = None
            self.log = self.LogState()

        class LogState:  # pylint: disable=too-few-public-methods
            """
            Manages the logging state, including log file path and update thread.
            """

            def __init__(self) -> None:
                """
                Initialize the LogState with default values.
                """
                self.log_file_path: str = ""
                self.update_log_text_box_thread: Optional[threading.Thread] = None

    def _create_header(self) -> None:
        """
        Create the header frame with the login and logout buttons using HeaderFrame class.
        """
        try:
            self.header = HeaderFrame(
                self,
                authenticate_callback=self.authenticate,
                logout_callback=self.logout,
            )
        except Exception as e:  # pylint: disable=broad-exception-caught
            self.logger.error("Failed to create header frame: %s", e)

    def _create_tab_view(self) -> None:
        """
        Create the tabbed interface with Home, Skipped, and Settings tabs.
        """
        try:
            self.tab_view = ctk.CTkTabview(self, width=850, height=600)
            self.tab_view.grid(row=1, column=0, padx=20, pady=20, sticky="nsew")

            # Add tabs
            self.tab_view.add("Home")
            self.tab_view.add("Skipped")
            self.tab_view.add("Settings")

            # Configure each tab
            self._create_home_tab()
            self._create_skipped_tab()
            self._create_settings_tab()
        except Exception as e:  # pylint: disable=broad-exception-caught
            self.logger.critical("Failed to create tab view: %s", e)
            raise

    def _create_home_tab(self) -> None:
        """
        Create the Home tab by instantiating the HomeTab class.
        """
        try:
            home_frame = self.tab_view.tab("Home")
            self._tabs.home_tab = HomeTab(home_frame, logger)
        except Exception as e:  # pylint: disable=broad-exception-caught
            self.logger.critical("Failed to create Home tab: %s", e)
            raise

    def _create_skipped_tab(self) -> None:
        """
        Create the Skipped tab by instantiating the SkippedTab class.
        """
        try:
            skipped_frame = self.tab_view.tab("Skipped")
            self._tabs.skipped_tab = SkippedTab(
                skipped_frame, self._auth.config, logger
            )
        except Exception as e:  # pylint: disable=broad-exception-caught
            self.logger.critical("Failed to create Skipped tab: %s", e)
            raise

    def _create_settings_tab(self) -> None:
        """
        Create the Settings tab by instantiating the SettingsTab class.
        """
        try:
            settings_frame = self.tab_view.tab("Settings")
            self._tabs.settings_tab = SettingsTab(
                settings_frame, self._auth.config, logger
            )
        except Exception as e:  # pylint: disable=broad-exception-caught
            self.logger.critical("Failed to create Settings tab: %s", e)
            raise

    def authenticate(self) -> None:
        """
        Authenticate the user with Spotify by starting the Flask server and opening the login page.
        """
        try:
            # Check for required configuration variables
            missing_vars = self._get_missing_config_variables()
            if missing_vars:
                self._prompt_for_config_variables(missing_vars)
                return

            # Start Flask server in a separate thread
            self._start_flask_server()

            # Open the browser for Spotify login
            logger.info("Starting authentication process...")
            webbrowser.open(f"http://localhost:{self._get_port()}/login")
        except Exception as e:  # pylint: disable=broad-exception-caught
            self.logger.error("Failed during authentication process: %s", e)

    def _get_missing_config_variables(self) -> List[str]:
        """
        Identify missing configuration variables that are required for authentication.

        Returns:
            List[str]: A list of missing configuration keys.
        """
        try:
            required_keys = [
                "SPOTIFY_CLIENT_ID",
                "SPOTIFY_CLIENT_SECRET",
                "SPOTIFY_REDIRECT_URI",
            ]
            self._auth.config = load_config(decrypt=True)
            missing = [key for key in required_keys if not self._auth.config.get(key)]
            return missing
        except Exception as e:  # pylint: disable=broad-exception-caught
            self.logger.error("Failed to get missing configuration variables: %s", e)
            return []

    def _prompt_for_config_variables(self, missing_vars: List[str]) -> None:
        """
        Prompt the user to enter missing configuration variables.

        Args:
            missing_vars (List[str]): A list of missing configuration keys.
        """
        popup = ctk.CTkToplevel(self)
        popup.title("Enter Missing Configuration Variables")
        popup.geometry("500x400")
        popup.grab_set()  # Make the popup modal

        entries: Dict[str, ctk.CTkEntry] = {}
        for var in missing_vars:
            frame = ctk.CTkFrame(popup)
            frame.pack(pady=10, padx=20, fill="x")

            label = ctk.CTkLabel(frame, text=f"{var}:", width=160, anchor="w")
            label.pack(side="left", padx=5, pady=5)

            entry = ctk.CTkEntry(frame, width=300)
            entry.pack(side="left", padx=5, pady=5)
            entries[var] = entry

        def _save_and_close() -> None:
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
                self._auth.config[var] = value

            popup.destroy()
            messagebox.showinfo(
                "Configuration Saved",
                "Configuration variables have been saved. Please click the Login "
                "button again to authenticate.",
            )
            logger.info("Configuration variables saved by the user.")

        save_button = ctk.CTkButton(popup, text="Save", command=_save_and_close)
        save_button.pack(pady=20)

    def _get_port(self) -> int:
        """
        Get the port number from the redirect URI.

        Returns:
            int: The port number.
        """
        redirect_uri = self._auth.config.get(
            "SPOTIFY_REDIRECT_URI", "http://localhost:5000/callback"
        )
        parsed_uri = requests.utils.urlparse(redirect_uri)
        return parsed_uri.port or 5000

    def _start_flask_server(self) -> None:
        """
        Start the Flask server in a separate thread.
        """
        try:
            if (
                not self._threads.flask_thread
                or not self._threads.flask_thread.is_alive()
            ):
                self._threads.flask_thread = threading.Thread(
                    target=self._run_flask, daemon=True
                )
                self._threads.flask_thread.start()
                # Monitor the Flask thread
                self.after(100, self._check_flask_thread)
        except Exception as e:  # pylint: disable=broad-exception-caught
            self.logger.error("Failed to start Flask server thread: %s", e)

    def _run_flask(self) -> None:
        """
        Run the Flask server for handling OAuth callbacks.
        """
        try:
            while not stop_flag.is_set():
                try:
                    _flask_app.run(
                        port=self._get_port(), debug=False, use_reloader=False
                    )
                except Exception as e:  # pylint: disable=broad-exception-caught
                    logger.error("Error running Flask server: %s", e)
                time.sleep(1)
        except Exception as e:  # pylint: disable=broad-exception-caught
            self.logger.critical("Critical failure in run_flask: %s", e)
            raise

    def _check_flask_thread(self) -> None:
        """
        Check the status of the Flask thread and start playback monitoring
        if the thread has stopped.
        """
        try:
            if stop_flag.is_set():
                self._start_playback_monitoring()
                try:
                    if (
                        self._threads.flask_thread
                        and self._threads.flask_thread.is_alive()
                    ):
                        self._threads.flask_thread = None
                except Exception as e:  # pylint: disable=broad-exception-caught
                    logger.error("Error joining Flask thread: %s", e)
            else:
                # Check again after 100ms
                self.after(100, self._check_flask_thread)
        except Exception as e:  # pylint: disable=broad-exception-caught
            self.logger.critical("Critical failure in check_flask_thread: %s", e)
            raise

    def _start_playback_monitoring(self) -> None:
        """
        Start the playback monitoring thread.
        """
        try:
            if (
                self._threads.playback_thread
                and self._threads.playback_thread.is_alive()
            ):
                return
            self._threads.stop_event.clear()
            self._threads.playback_thread = threading.Thread(
                target=self._monitor_playback,
                args=(self._critical_error_event,),
                daemon=True,
            )
            self._threads.playback_thread.start()
        except Exception as e:  # pylint: disable=broad-exception-caught
            self.logger.critical("Failed to start playback monitoring thread: %s", e)
            self._error_message = str(e)
            self._critical_error_event.set()
            self.terminate_application()
            raise

    def _monitor_playback(self, critical_error_event: threading.Event) -> None:
        """
        Monitor playback by running the PlaybackMonitor.
        """
        try:
            self._auth.user_id = get_user_id()
            playback_main(
                self._threads.stop_event,
                self.update_playback_info,
                critical_error_event,
            )
        except Exception as e:  # pylint: disable=broad-exception-caught
            self.logger.critical("Critical failure in monitor_playback: %s", e)
            self._error_message = str(e)
            critical_error_event.set()
            raise

    def update_playback_info(self, playback: Optional[Dict[str, Any]]) -> None:
        """
        Update the playback information in the Home tab.

        Args:
            playback (Optional[Dict[str, Any]]): The current playback information.
        """
        try:
            if self._tabs.home_tab:
                self._tabs.home_tab.update_playback_info(playback)
        except Exception as e:  # pylint: disable=broad-exception-caught
            self.logger.error("Failed to update playback info: %s", e)

    def _update_log_text_box(self) -> None:
        """
        Continuously update the log text box with the contents of the log file.
        """
        previous_log_contents: str = ""

        while True:
            try:
                with open(
                    self._tabs.log.log_file_path, "r", encoding="utf-8"
                ) as log_file:
                    log_contents = log_file.readlines()
            except FileNotFoundError as e:
                self.logger.error("Log file not found: %s", e)
                log_contents = []
            except Exception as e:  # pylint: disable=broad-exception-caught
                self.logger.error("Failed to read log file: %s", e)
                log_contents = []

            # Get the number of log lines to display
            log_line_count_str = self._auth.config.get("LOG_LINE_COUNT", "500")
            try:
                log_line_count = int(log_line_count_str)
            except ValueError as e:
                logger.error(
                    "Invalid LOG_LINE_COUNT value '%s'; defaulting to 500. Error: %s",
                    log_line_count_str,
                    e,
                )
                log_line_count = 500

            # Display the most recent log lines
            recent_logs = log_contents[-log_line_count:]
            display_logs = "".join(recent_logs)

            if display_logs != previous_log_contents:
                try:
                    if self._tabs.home_tab:
                        self._tabs.home_tab.update_logs(display_logs)
                    previous_log_contents = display_logs
                except Exception as e:  # pylint: disable=broad-exception-caught
                    self.logger.error(
                        "Failed to update log text box in Home tab: %s", e
                    )

            time.sleep(1)

    def logout(self) -> None:
        """
        Logout the user by clearing access and refresh tokens from the configuration.
        """
        if self._threads.playback_thread and self._threads.playback_thread.is_alive():
            self._threads.stop_event.set()
            self._threads.playback_thread.join()
            logger.info("Playback monitoring stopped.")

        if self._threads.flask_thread:
            self._threads.flask_thread = None

        set_config_variable("SPOTIFY_ACCESS_TOKEN", "", encrypt=True)
        set_config_variable("SPOTIFY_REFRESH_TOKEN", "", encrypt=True)
        self._auth.config["SPOTIFY_ACCESS_TOKEN"] = ""
        self._auth.config["SPOTIFY_REFRESH_TOKEN"] = ""
        self._auth.access_token = ""
        self._auth.refresh_token = ""
        messagebox.showinfo(
            "Logout Successful", "You have been logged out successfully."
        )
        logger.info("User logged out and tokens cleared.")

        # Clear playback info
        if hasattr(self, "playback_info"):
            self.playback_info.configure(state="normal")
            self.playback_info.delete("1.0", "end")
            self.playback_info.configure(state="disabled")

        # Clear skipped songs display
        if hasattr(self, "skipped_text"):
            self.skipped_text.configure(state="normal")
            self.skipped_text.delete("1.0", "end")
            self.skipped_text.configure(state="disabled")

    def terminate_application(self) -> None:
        """
        Terminate the application gracefully.
        """
        try:
            logger.info("Terminating application due to a critical error.")
            self.destroy()
        except Exception as e:  # pylint: disable=broad-exception-caught
            logger.error("Error while terminating application: %s", e)
            sys.exit(1)

    def _check_for_critical_errors(self) -> None:
        """
        Periodically check if a critical error has been signaled and terminate the app if so.
        """
        if self._critical_error_event.is_set():
            if not self._error_message:
                try:
                    with open(
                        "logs/spotify_app.log", "r", encoding="utf-8"
                    ) as log_file:
                        lines = log_file.readlines()
                    for line in reversed(lines):
                        if (
                            " - CRITICAL - PlaybackMonitor encountered a critical error: "
                            in line
                        ):
                            # Extract the actual error message after the last colon
                            error_part = line.split(":")[-1].strip()
                            self._error_message = error_part
                            break
                    if not self._error_message:
                        self._error_message = "An unknown critical error has occurred."
                except Exception as e:  # pylint: disable=broad-exception-caught
                    self._error_message = f"Unable to retrieve error message: {e}"
            # Show an error message to the user before terminating
            messagebox.showerror(
                "Critical Error",
                f"A critical error occurred: {self._error_message}. The application will now close.",
            )
            self.terminate_application()
        else:
            # Schedule the next check after 1000 ms (1 second)
            self.after(1000, self._check_for_critical_errors)


if __name__ == "__main__":
    try:
        app = SpotifySkipTrackerGUI()
        app.mainloop()
    except Exception as e:  # pylint: disable=broad-exception-caught
        logger.critical("Application terminated due to an unexpected error: %s", e)
        # Show popup to the user before exiting
        messagebox.showerror("Critical Error", f"An unexpected error occurred:\n{e}")
        sys.exit(1)
