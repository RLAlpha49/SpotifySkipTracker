"""
This module creates a GUI application for Spotify Skip Tracker using customtkinter.
It handles user authentication, playback monitoring, and displays logs within the interface.
"""

import io
import os
import threading
import webbrowser
import time
from typing import Optional, Dict, Any
from tkinter import messagebox
import json
from PIL import Image
import requests
import customtkinter as ctk
from customtkinter import CTkImage, get_appearance_mode
from CTkTreeview import CTkTreeview
from flask import Flask
from CTkToolTip import CTkToolTip
from auth import login_bp, callback_bp, is_token_valid, stop_flag
from playback import main as playback_main, unlike_song
from logging_config import setup_logger
from utils import get_user_id, load_skip_count, save_skip_count
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


def get_text_color():
    """
    Determine the text color based on the current appearance mode.
    """
    return "black" if get_appearance_mode() == "Dark" else "white"


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
        self.placeholder_image = ctk.CTkImage(
            light_image=Image.open("assets/images/black.jpg"),
            dark_image=Image.open("assets/images/white.jpg"),
            size=(200, 200),
        )

        # Playback Information Frame
        self.playback_frame = ctk.CTkFrame(parent, width=800, fg_color="transparent")
        self.playback_frame.pack(pady=10, padx=10, fill="x", expand=True)

        # Album Art
        self.album_art_label = ctk.CTkLabel(
            self.playback_frame,
            text="No Playback",
            image=self.placeholder_image,
            width=200,
            height=200,
            text_color=get_text_color(),
        )
        self.album_art_label.grid(row=0, column=0, rowspan=3, padx=10, pady=10)

        # Track Information Frame
        self.track_info_frame = ctk.CTkFrame(self.playback_frame, width=590)
        self.track_info_frame.grid(
            row=0, column=1, columnspan=6, sticky="nsew", padx=10, pady=10
        )

        # Track Name Label
        self.track_name_label = ctk.CTkLabel(
            self.track_info_frame,
            text="Track: ",
            font=("Arial", 16, "bold"),
            anchor="w",
            width=590,
        )
        self.track_name_label.pack(fill="both", pady=2, expand=True)

        # Artists Label
        self.artists_label = ctk.CTkLabel(
            self.track_info_frame,
            text="Artists: ",
            font=("Arial", 14),
            anchor="w",
            width=590,
        )
        self.artists_label.pack(fill="both", pady=2, expand=True)

        # Status Label
        self.status_label = ctk.CTkLabel(
            self.track_info_frame,
            text="Status: ",
            font=("Arial", 14),
            anchor="w",
            width=590,
        )
        self.status_label.pack(fill="both", pady=2, expand=True)

        # Progress Bar Frame
        self.progress_frame = ctk.CTkFrame(self.playback_frame, width=420)
        self.progress_frame.grid(row=1, column=1, sticky="nsew", padx=5, pady=10)

        # Progress Bar
        self.progress_var = ctk.DoubleVar(value=0)
        self.progress_bar = ctk.CTkProgressBar(
            self.progress_frame, variable=self.progress_var, width=420
        )
        self.progress_bar.grid(row=0, column=0, pady=5, padx=(0, 5), sticky="w")

        # Progress Labels
        self.progress_time_label = ctk.CTkLabel(
            self.progress_frame,
            text="0s / 0s",
            font=("Arial", 12),
            anchor="w",
            width=575,
        )
        self.progress_time_label.grid(row=1, column=0, pady=5, sticky="ew")

        # Log Text Box
        self.log_text = ctk.CTkTextbox(parent, width=800, height=250)
        self.log_text.pack(pady=10, padx=10, fill="both", expand=True)
        self.log_text.configure(state="disabled")

    def update_playback_info(self, playback: Optional[Dict[str, Any]]):
        """
        Update the playback information in the Home tab.

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

            # Update Labels
            self.track_name_label.configure(text=f"Track: {track_name}")
            self.artists_label.configure(text=f"Artists: {artists}")
            self.status_label.configure(text=f"Status: {status}")

            # Update Progress Bar
            progress_percentage = (progress / duration) if duration > 0 else 0
            self.progress_var.set(progress_percentage)
            self.progress_time_label.configure(text=f"{progress}s / {duration}s")

            # Update Album Art
            album_art_url = playback["item"]["album"]["images"][0]["url"]
            if (
                not hasattr(self, "current_album_art_url")
                or self.current_album_art_url != album_art_url  # pylint: disable=access-member-before-definition
            ):
                self.current_album_art_url = album_art_url  # pylint: disable=attribute-defined-outside-init
                self.load_album_art_async(album_art_url)
        else:
            # Clear Playback Information
            self.track_name_label.configure(text="Track: ")
            self.artists_label.configure(text="Artists: ")
            self.status_label.configure(text="Status: ")
            self.progress_var.set(0)
            self.progress_time_label.configure(text="0s / 0s")
            self.album_art_label.configure(
                text="No Playback",
                image=self.placeholder_image,
                text_color=get_text_color(),
            )
            self.current_album_art_url = None  # pylint: disable=attribute-defined-outside-init

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

    def load_album_art(self, url: str):
        """
        Load and display album art from a URL.

        Args:
            url (str): URL of the album art image.
        """
        try:
            response = requests.get(url, timeout=5)
            response.raise_for_status()
            image_data = response.content
            image = Image.open(io.BytesIO(image_data))
            image = image.resize((200, 200), Image.Resampling.LANCZOS)  # type: ignore
            self.album_art_image = CTkImage(image, size=(200, 200))  # pylint: disable=attribute-defined-outside-init
            self.album_art_label.configure(text="", image=self.album_art_image)
        except Exception as e:  # pylint: disable=broad-except
            logger.error("Failed to load album art: %s", e)
            self.album_art_label.configure(image=None)

    def load_album_art_async(self, url: str):
        """
        Load album art asynchronously from a URL.

        Args:
            url (str): URL of the album art image.
        """
        threading.Thread(target=self.load_album_art, args=(url,), daemon=True).start()


class SkippedTab:
    """
    A Skipped tab for the Spotify Skip Tracker GUI, displaying skipped songs count.
    """

    def __init__(self, parent, config, logger):
        """
        Initialize the SkippedTab.

        Args:
            parent (ctk.CTkFrame): The parent frame for the Skipped tab.
            config (dict): The current configuration dictionary.
            logger (logging.Logger): The logger instance for logging activities.
        """
        self.parent = parent
        self.config = config
        self.logger = logger

        # Title Label
        self.skipped_label = ctk.CTkLabel(
            parent, text="Skipped Songs Details", font=("Arial", 16)
        )
        self.skipped_label.pack(pady=10)

        # Skipped Songs Treeview
        self.skipped_tree = CTkTreeview(
            parent,
            columns=("Track ID", "Skipped", "Not Skipped", "Last Skipped"),
            show="headings",
        )
        self.skipped_tree.heading("Track ID", text="Track ID")
        self.skipped_tree.heading("Skipped", text="Skipped Count")
        self.skipped_tree.heading("Not Skipped", text="Not Skipped Count")
        self.skipped_tree.heading("Last Skipped", text="Last Skipped")
        self.skipped_tree.column("Track ID", anchor="center", stretch=True)
        self.skipped_tree.column("Skipped", anchor="center", stretch=True)
        self.skipped_tree.column("Not Skipped", anchor="center", stretch=True)
        self.skipped_tree.column("Last Skipped", anchor="center", stretch=True)
        self.skipped_tree.pack(pady=10, padx=10, fill="both", expand=True)

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
        try:
            skip_data = load_skip_count()
            if skip_data:
                for track_id, data in skip_data.items():
                    skipped_count = data.get("skipped", 0)
                    not_skipped_count = data.get("not_skipped", 0)
                    last_skipped = data.get("last_skipped", "N/A")
                    self.skipped_tree.insert(
                        "",
                        "end",
                        iid=track_id,
                        values=(
                            track_id,
                            skipped_count,
                            not_skipped_count,
                            last_skipped,
                        ),
                    )
            else:
                self.skipped_tree.insert("", "end", values=("No data", "", "", ""))
        except FileNotFoundError:
            self.skipped_tree.insert(
                "", "end", values=("Skip count file not found.", "", "", "")
            )
        except json.JSONDecodeError:
            self.skipped_tree.insert(
                "", "end", values=("Error decoding skip count file.", "", "", "")
            )

    def refresh(self):
        """
        Refresh the skipped songs data and enforce skip threshold settings.
        """
        # Load current configuration
        self.config = load_config(decrypt=True)
        skip_threshold = self.config.get("SKIP_THRESHOLD", 5)

        # Load current skip_count
        skip_count = load_skip_count()

        # Identify tracks that exceed the skip threshold
        tracks_to_unlike = [
            track_id
            for track_id, data in skip_count.items()
            if data.get("skipped", 0) >= skip_threshold
        ]

        if tracks_to_unlike:
            for track_id in tracks_to_unlike:
                self.logger.info(
                    f"Unliking track {track_id} due to exceeding skip threshold."
                )
                unlike_song(track_id)
                del skip_count[track_id]
                self.logger.debug(
                    f"Removed track {track_id} from skip_count after unliking."
                )

            # Save the updated skip_count
            save_skip_count(skip_count)

            # Notify the user
            messagebox.showinfo(
                "Tracks Unliked",
                f"{len(tracks_to_unlike)} track(s) have been unliked based on the new skip threshold.",
            )

        # Clear existing data
        for item in self.skipped_tree.get_children():
            self.skipped_tree.delete(item)

        # Reload data
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
            frame.pack(pady=3, padx=20, fill="x")

            formatted_key = " ".join(
                word.capitalize() for word in key.lower().split("_")
            )
            label = ctk.CTkLabel(frame, text=f"{formatted_key}:", width=160, anchor="w")
            label.pack(side="left", padx=5, pady=3)

            entry = ctk.CTkEntry(frame, width=500)
            entry.pack(side="left", padx=5, pady=3)
            entry.insert(0, self.config.get(key, ""))
            self.settings_entries[key] = entry

        # Log Level Dropdown
        log_level_frame = ctk.CTkFrame(parent)
        log_level_frame.pack(pady=3, padx=20, fill="x")

        log_level_label = ctk.CTkLabel(
            log_level_frame, text="Log Level:", width=160, anchor="w"
        )
        log_level_label.pack(side="left", padx=5, pady=3)

        self.log_level_var = ctk.StringVar(value=self.config.get("LOG_LEVEL", "INFO"))
        self.log_level_dropdown = ctk.CTkOptionMenu(
            log_level_frame,
            variable=self.log_level_var,
            values=["DEBUG", "INFO", "WARNING", "ERROR"],
        )
        self.log_level_dropdown.pack(side="left", padx=5, pady=3)

        # Log Line Count Textbox
        log_line_count_frame = ctk.CTkFrame(parent)
        log_line_count_frame.pack(pady=3, padx=20, fill="x")

        log_line_count_label = ctk.CTkLabel(
            log_line_count_frame, text="Log Lines:", width=160, anchor="w"
        )
        log_line_count_label.pack(side="left", padx=5, pady=3)

        self.log_line_count_var = ctk.StringVar(
            value=self.config.get("LOG_LINE_COUNT", "500")
        )
        self.log_line_count_entry = ctk.CTkEntry(
            log_line_count_frame, textvariable=self.log_line_count_var, width=500
        )
        self.log_line_count_entry.pack(side="left", padx=5, pady=3)

        # Appearance Mode Dropdown
        appearance_mode_frame = ctk.CTkFrame(parent)
        appearance_mode_frame.pack(pady=3, padx=20, fill="x")

        appearance_mode_label = ctk.CTkLabel(
            appearance_mode_frame, text="Appearance Mode:", width=160, anchor="w"
        )
        appearance_mode_label.pack(side="left", padx=5, pady=3)

        self.appearance_mode_var = ctk.StringVar(
            value=self.config.get("APPEARANCE_MODE", "System")
        )
        self.appearance_mode_dropdown = ctk.CTkOptionMenu(
            appearance_mode_frame,
            variable=self.appearance_mode_var,
            values=["System", "Dark", "Light"],
        )
        self.appearance_mode_dropdown.pack(side="left", padx=5, pady=3)

        # Color Theme Dropdown
        theme_frame = ctk.CTkFrame(parent)
        theme_frame.pack(pady=3, padx=20, fill="x")

        theme_label = ctk.CTkLabel(
            theme_frame, text="Color Theme:", width=160, anchor="w"
        )
        theme_label.pack(side="left", padx=5, pady=3)

        self.theme_var = ctk.StringVar(value=self.config.get("COLOR_THEME", "blue"))
        self.theme_dropdown = ctk.CTkOptionMenu(
            theme_frame,
            variable=self.theme_var,
            values=["blue", "green", "dark-blue", "NightTrain"],
        )
        self.theme_dropdown.pack(side="left", padx=5, pady=3)

        # Skip Threshold Setting
        skip_threshold_frame = ctk.CTkFrame(parent)
        skip_threshold_frame.pack(pady=3, padx=20, fill="x")

        skip_threshold_label = ctk.CTkLabel(
            skip_threshold_frame, text="Skip Threshold:", width=160, anchor="w"
        )
        skip_threshold_label.pack(side="left", padx=5, pady=3)

        self.skip_threshold_var = ctk.IntVar(value=self.config.get("SKIP_THRESHOLD", 5))
        self.skip_threshold_entry = ctk.CTkEntry(
            skip_threshold_frame, textvariable=self.skip_threshold_var, width=500
        )
        self.skip_threshold_entry.pack(side="left", padx=5, pady=3)

        # Skip Progress Threshold Setting
        skip_progress_frame = ctk.CTkFrame(parent)
        skip_progress_frame.pack(pady=3, padx=20, fill="x")

        skip_progress_label = ctk.CTkLabel(
            skip_progress_frame, text="Skip Progress Threshold:", width=160, anchor="w"
        )
        skip_progress_label.pack(side="left", padx=5, pady=3)

        self.skip_progress_var = ctk.DoubleVar(
            value=self.config.get("SKIP_PROGRESS_THRESHOLD", 0.42)
        )

        # Slider for skip progress
        self.skip_progress_slider = ctk.CTkSlider(
            skip_progress_frame,
            from_=0.01,
            to=0.99,
            variable=self.skip_progress_var,
            command=self.update_skip_progress_label,
        )
        self.skip_progress_slider.pack(
            side="left", padx=5, pady=3, fill="x", expand=True
        )

        # Tooltip for slider
        self.skip_progress_tooltip = CTkToolTip(
            self.skip_progress_slider,
            message=f"{self.skip_progress_var.get() * 100:.0f}%",
            delay=0.2,
        )

        # Label to show percentage
        self.skip_progress_percentage_label = ctk.CTkLabel(
            skip_progress_frame,
            text=f"{self.skip_progress_var.get() * 100:.0f}%",
            width=50,
            anchor="w",
        )
        self.skip_progress_percentage_label.pack(side="left", padx=5, pady=3)

        # Entry for manual input
        self.skip_progress_entry = ctk.CTkEntry(
            skip_progress_frame, textvariable=self.skip_progress_var, width=50
        )
        self.skip_progress_entry.pack(side="left", padx=5, pady=3)

        # Trace changes to the skip progress variable
        self.skip_progress_var.trace("w", self.on_skip_progress_var_change)

        # Save Button
        self.save_button = ctk.CTkButton(
            parent, text="Save Settings", command=self.save_settings
        )
        self.save_button.pack(pady=20)

    def update_skip_progress_label(self, value):
        """
        Update the skip progress percentage label and tooltip.
        """
        percentage = float(value) * 100
        self.skip_progress_percentage_label.configure(text=f"{percentage:.0f}%")
        self.skip_progress_tooltip.configure(message=f"{percentage:.0f}%")

        # Update the entry box to show only two decimal points
        self.skip_progress_var.set(f"{float(value):.2f}")

    def on_skip_progress_var_change(self, *args):
        """
        Update the skip progress label when the skip progress variable changes.
        """
        value = self.skip_progress_var.get()
        try:
            # Ensure the value is a valid float
            float_value = float(value)
            # Check if the value is within the allowed range
            if 0.00 <= float_value <= 0.99:
                self.update_skip_progress_label(float_value)
            else:
                raise ValueError("Value out of range")
        except ValueError:
            # Reset to the default value if input is invalid or out of range
            self.skip_progress_var.set("0.42")
            self.update_skip_progress_label(0.42)

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
        log_line_count = self.log_line_count_var.get().strip()
        if not log_line_count.isdigit():
            messagebox.showerror("Input Error", "Log Lines must be an integer.")
            return
        set_config_variable("LOG_LINE_COUNT", log_line_count)
        self.config["LOG_LINE_COUNT"] = log_line_count

        # Save appearance mode setting
        appearance_mode = self.appearance_mode_var.get()
        set_config_variable("APPEARANCE_MODE", appearance_mode)
        self.config["APPEARANCE_MODE"] = appearance_mode

        # Apply appearance mode
        ctk.set_appearance_mode(self.config["APPEARANCE_MODE"])

        # Check if color theme was changed
        if self.theme_var.get() != self.config.get("COLOR_THEME"):
            messagebox.showinfo(
                "Settings Saved",
                "Settings have been saved successfully. A restart is required "
                "for Color Theme setting to take effect.",
            )
        else:
            messagebox.showinfo(
                "Settings Saved", "Settings have been saved successfully."
            )

        # Save color theme setting
        color_theme = self.theme_var.get()
        set_config_variable("COLOR_THEME", color_theme)
        self.config["COLOR_THEME"] = color_theme

        # Apply color theme
        if self.config["COLOR_THEME"] == "NightTrain":
            ctk.set_default_color_theme("assets/themes/night_train.json")
        else:
            ctk.set_default_color_theme(self.config["COLOR_THEME"])

        # Save skip threshold setting
        skip_threshold = self.skip_threshold_var.get()
        if not isinstance(skip_threshold, int):
            messagebox.showerror("Input Error", "Skip Threshold must be an integer.")
            return
        set_config_variable("SKIP_THRESHOLD", skip_threshold)
        self.config["SKIP_THRESHOLD"] = skip_threshold

        # Save skip progress threshold setting
        skip_progress_threshold = self.skip_progress_var.get()
        if not (0.01 <= skip_progress_threshold <= 0.99):
            messagebox.showerror(
                "Input Error", "Skip Progress Threshold must be between 0.01 and 0.99."
            )
            return
        set_config_variable("SKIP_PROGRESS_THRESHOLD", skip_progress_threshold)
        self.config["SKIP_PROGRESS_THRESHOLD"] = skip_progress_threshold

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
        self.geometry("730x700")

        # Load configuration
        self.config = load_config(decrypt=True)
        self.access_token = self.config.get("SPOTIFY_ACCESS_TOKEN", "")
        self.refresh_token = self.config.get("SPOTIFY_REFRESH_TOKEN", "")
        self.user_id = None
        self.playback_thread = None
        self.flask_thread = None
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
        self.skipped_tab = SkippedTab(
            skipped_frame, self.config, logger
        )

    def create_settings_tab(self):
        """
        Create the Settings tab by instantiating the SettingsTab class.
        """
        settings_frame = self.tab_view.tab("Settings")
        self.settings_tab = SettingsTab(
            settings_frame, self.config, logger
        )

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
