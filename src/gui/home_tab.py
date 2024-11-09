"""
This module defines the HomeTab class for the Spotify Skip Tracker GUI.
It provides functionality to display playback information and logs.
"""

import io
import threading
from typing import Optional, Dict, Any
import customtkinter as ctk
from PIL import Image
import requests
from customtkinter import CTkImage, get_appearance_mode


def get_text_color():
    """
    Determine the text color based on the current appearance mode.
    """
    return "black" if get_appearance_mode() == "Dark" else "white"


class HomeTab:
    """
    A Home tab for the Spotify Skip Tracker GUI, displaying playback information and logs.
    """

    def __init__(self, parent, app_logger):
        """
        Initialize the HomeTab.

        Args:
            parent (ctk.CTkFrame): The parent frame for the Home tab.
        """
        self.parent = parent
        self.logger = app_logger
        self.placeholder_image = ctk.CTkImage(
            light_image=Image.open("assets/images/black.jpg"),
            dark_image=Image.open("assets/images/white.jpg"),
            size=(200, 200),
        )

        # Configure grid layout
        self.parent.grid_rowconfigure(0, weight=0)
        self.parent.grid_rowconfigure(1, weight=1)
        self.parent.grid_columnconfigure(0, weight=1)

        # Playback Information Frame
        self.playback_frame = ctk.CTkFrame(
            self.parent, width=800, fg_color="transparent"
        )
        self.playback_frame.grid(row=0, column=0, pady=10, padx=10, sticky="nsew")

        # UI Elements
        self.ui_elements = {}

        # Album Art
        self.ui_elements["album_art_label"] = ctk.CTkLabel(
            self.playback_frame,
            text="No Playback",
            image=self.placeholder_image,
            width=200,
            height=200,
            text_color=get_text_color(),
        )
        self.ui_elements["album_art_label"].grid(
            row=0, column=0, rowspan=3, padx=10, pady=10
        )

        # Track Information Frame
        self.ui_elements["track_info_frame"] = ctk.CTkFrame(
            self.playback_frame, width=590
        )
        self.ui_elements["track_info_frame"].grid(
            row=0, column=1, columnspan=6, sticky="nsew", padx=10, pady=10
        )

        # Track Information Labels
        self.ui_elements["track_info_labels"] = {
            "track_name": ctk.CTkLabel(
                self.ui_elements["track_info_frame"],
                text="Track: ",
                font=("Arial", 16, "bold"),
                anchor="w",
                width=590,
            ),
            "artists": ctk.CTkLabel(
                self.ui_elements["track_info_frame"],
                text="Artists: ",
                font=("Arial", 14),
                anchor="w",
                width=590,
            ),
            "status": ctk.CTkLabel(
                self.ui_elements["track_info_frame"],
                text="Status: ",
                font=("Arial", 14),
                anchor="w",
                width=590,
            ),
        }

        for label in self.ui_elements["track_info_labels"].values():
            label.pack(fill="both", pady=2, expand=True)

        # Progress Bar Frame
        self.ui_elements["progress_frame"] = ctk.CTkFrame(
            self.playback_frame, width=420
        )
        self.ui_elements["progress_frame"].grid(
            row=1, column=1, sticky="nsew", padx=5, pady=10
        )

        # Progress Bar and Label
        progress_var = ctk.DoubleVar(value=0)
        self.ui_elements["progress"] = {
            "var": progress_var,
            "bar": ctk.CTkProgressBar(
                self.ui_elements["progress_frame"], variable=progress_var, width=420
            ),
            "time_label": ctk.CTkLabel(
                self.ui_elements["progress_frame"],
                text="0s / 0s",
                font=("Arial", 12),
                anchor="w",
                width=575,
            ),
        }

        self.ui_elements["progress"]["bar"].grid(
            row=0, column=0, pady=5, padx=(0, 5), sticky="w"
        )
        self.ui_elements["progress"]["time_label"].grid(
            row=1, column=0, pady=5, sticky="ew"
        )

        # Log Text Box
        self.log_text = ctk.CTkTextbox(self.parent, width=800, height=250)
        self.log_text.grid(row=1, column=0, pady=10, padx=10, sticky="nsew")
        self.log_text.configure(state="disabled")

        # Dynamic Variables
        self.dynamic_vars = {"album_art_image": None, "current_album_art_url": None}

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
            self.ui_elements["track_info_labels"]["track_name"].configure(
                text=f"Track: {track_name}"
            )
            self.ui_elements["track_info_labels"]["artists"].configure(
                text=f"Artists: {artists}"
            )
            self.ui_elements["track_info_labels"]["status"].configure(
                text=f"Status: {status}"
            )

            # Update Progress Bar
            progress_percentage = (progress / duration) if duration > 0 else 0
            self.ui_elements["progress"]["var"].set(progress_percentage)
            self.ui_elements["progress"]["time_label"].configure(
                text=f"{progress}s / {duration}s"
            )

            # Update Album Art
            album_art_url = playback["item"]["album"]["images"][0]["url"]
            if (
                not self.dynamic_vars["current_album_art_url"]
                or self.dynamic_vars["current_album_art_url"] != album_art_url
            ):
                self.dynamic_vars["current_album_art_url"] = album_art_url
                self.load_album_art_async(album_art_url)
        else:
            # Clear Playback Information
            self.ui_elements["track_info_labels"]["track_name"].configure(
                text="Track: "
            )
            self.ui_elements["track_info_labels"]["artists"].configure(text="Artists: ")
            self.ui_elements["track_info_labels"]["status"].configure(text="Status: ")
            self.ui_elements["progress"]["var"].set(0)
            self.ui_elements["progress"]["time_label"].configure(text="0s / 0s")
            self.ui_elements["album_art_label"].configure(
                text="No Playback",
                image=self.placeholder_image,
                text_color=get_text_color(),
            )
            self.dynamic_vars["current_album_art_url"] = None

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
            self.dynamic_vars["album_art_image"] = CTkImage(image, size=(200, 200))
            self.ui_elements["album_art_label"].configure(
                text="", image=self.dynamic_vars["album_art_image"]
            )
        except Exception as e:  # pylint: disable=broad-except
            self.logger.error("Failed to load album art: %s", e)
            self.ui_elements["album_art_label"].configure(image=None)

    def load_album_art_async(self, url: str):
        """
        Load album art asynchronously from a URL.

        Args:
            url (str): URL of the album art image.
        """
        threading.Thread(target=self.load_album_art, args=(url,), daemon=True).start()
