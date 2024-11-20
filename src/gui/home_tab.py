"""
This module defines the HomeTab class for the Spotify Skip Tracker GUI.
It provides functionality to display playback information and logs.
"""

import io
import threading
from typing import Optional, Dict, Any
import os
import sys
import customtkinter as ctk
from PIL import Image, ImageOps, ImageDraw
import requests
from customtkinter import CTkImage, get_appearance_mode


def get_text_color() -> str:
    """
    Determine the text color based on the current appearance mode.

    Returns:
        str: "black" if in Dark mode, otherwise "white".
    """
    return "black" if get_appearance_mode() == "Dark" else "white"


def resource_path(relative_path: str) -> str:
    """
    Get the absolute path to a resource, works for dev and for PyInstaller.

    Args:
        relative_path (str): The relative path to the resource.

    Returns:
        str: The absolute path to the resource.
    """
    try:
        # PyInstaller creates a temp folder and stores path in _MEIPASS
        base_path = getattr(sys, "_MEIPASS", os.path.abspath("."))
    except AttributeError:
        base_path = os.path.abspath(".")

    return os.path.join(base_path, relative_path)


class HomeTab:
    """
    A Home tab for the Spotify Skip Tracker GUI, displaying playback information and logs.
    """

    def __init__(self, parent: ctk.CTkFrame, app_logger: Any) -> None:
        """
        Initialize the HomeTab.

        Args:
            parent (ctk.CTkFrame): The parent frame for the Home tab.
            app_logger (Any): Logger instance for logging purposes.
        """
        self.parent: ctk.CTkFrame = parent
        self.logger: Any = app_logger

        self._initialize_placeholder_image()
        self._configure_grid_layout()
        self._create_ui_elements()
        self._initialize_dynamic_vars()

    def _initialize_placeholder_image(self) -> None:
        """Initialize the placeholder image."""
        try:
            self._placeholder_image: CTkImage = ctk.CTkImage(
                light_image=Image.open(resource_path("assets/images/black.jpg")),
                dark_image=Image.open(resource_path("assets/images/white.jpg")),
                size=(200, 200),
            )
        except Exception as e:  # pylint: disable=broad-exception-caught
            self.logger.critical("Failed to initialize placeholder image: %s", e)
            raise

    def _configure_grid_layout(self) -> None:
        """Configure the grid layout for the parent frame."""
        try:
            self.parent.grid_rowconfigure(0, weight=0)
            self.parent.grid_rowconfigure(1, weight=1)
            self.parent.grid_columnconfigure(0, weight=1)

            self._playback_frame: ctk.CTkFrame = ctk.CTkFrame(
                self.parent, fg_color="transparent"
            )
            self._playback_frame.grid(row=0, column=0, pady=10, padx=10, sticky="nsew")
            self._playback_frame.grid_columnconfigure(1, weight=1)
        except Exception as e:  # pylint: disable=broad-exception-caught
            self.logger.critical(
                "Failed to set up grid layout or playback frame: %s", e
            )
            raise

    def _create_ui_elements(self) -> None:
        """Create UI elements for the HomeTab."""
        self._ui_elements: Dict[str, Any] = {}
        self._create_album_art_label()
        self._create_track_info_frame()
        self._create_progress_frame()
        self._create_log_text_box()

    def _create_album_art_label(self) -> None:
        """Create the album art label."""
        try:
            self._ui_elements["album_art_label"] = ctk.CTkLabel(
                self._playback_frame,
                text="No Playback",
                image=self._placeholder_image,
                width=200,
                height=200,
                text_color=get_text_color(),
            )
            self._ui_elements["album_art_label"].grid(
                row=0, column=0, rowspan=3, padx=10, pady=10
            )
        except Exception as e:  # pylint: disable=broad-exception-caught
            self.logger.error("Failed to create album art label: %s", e)

    def _create_track_info_frame(self) -> None:
        """Create the track information frame and labels."""
        try:
            self._ui_elements["track_info_frame"] = ctk.CTkFrame(self._playback_frame)
            self._ui_elements["track_info_frame"].grid(
                row=0, column=1, columnspan=6, sticky="nsew", padx=10, pady=10
            )

            self._ui_elements["track_info_labels"]: Dict[str, ctk.CTkLabel] = {  # type: ignore
                "track_name": ctk.CTkLabel(
                    self._ui_elements["track_info_frame"],
                    text="Track: ",
                    font=("Arial", 16, "bold"),
                    anchor="w",
                ),
                "artists": ctk.CTkLabel(
                    self._ui_elements["track_info_frame"],
                    text="Artists: ",
                    font=("Arial", 14),
                    anchor="w",
                ),
                "status": ctk.CTkLabel(
                    self._ui_elements["track_info_frame"],
                    text="Status: ",
                    font=("Arial", 14),
                    anchor="w",
                ),
            }

            for label in self._ui_elements["track_info_labels"].values():
                label.pack(fill="both", pady=2, expand=True)
        except Exception as e:  # pylint: disable=broad-exception-caught
            self.logger.error("Failed to create track information labels: %s", e)

    def _create_progress_frame(self) -> None:
        """Create the progress bar frame and its elements."""
        try:
            self._ui_elements["progress_frame"] = ctk.CTkFrame(
                self._playback_frame, fg_color="transparent"
            )
            self._ui_elements["progress_frame"].grid(
                row=1, column=1, sticky="nsew", padx=5, pady=10
            )
            self._ui_elements["progress_frame"].grid_columnconfigure(0, weight=1)

            _progress_var: ctk.DoubleVar = ctk.DoubleVar(value=0)
            self._ui_elements["progress"] = {
                "var": _progress_var,
                "bar": ctk.CTkProgressBar(
                    self._ui_elements["progress_frame"], variable=_progress_var
                ),
                "time_label": ctk.CTkLabel(
                    self._ui_elements["progress_frame"],
                    text="0s / 0s",
                    font=("Arial", 12),
                    anchor="w",
                ),
            }

            self._ui_elements["progress"]["bar"].grid(
                row=0, column=0, pady=5, padx=(0, 5), sticky="ew"
            )
            self._ui_elements["progress"]["time_label"].grid(
                row=1, column=0, pady=5, sticky="ew"
            )
        except Exception as e:  # pylint: disable=broad-exception-caught
            self.logger.error("Failed to create progress bar and label: %s", e)

    def _create_log_text_box(self) -> None:
        """Create the log text box."""
        try:
            self._log_text: ctk.CTkTextbox = ctk.CTkTextbox(  # pylint: disable=attribute-defined-outside-init
                self.parent, width=800, height=250
            )
            self._log_text.grid(row=1, column=0, pady=10, padx=10, sticky="nsew")
            self._log_text.configure(state="disabled")
        except Exception as e:  # pylint: disable=broad-exception-caught
            self.logger.error("Failed to create log text box: %s", e)

    def _initialize_dynamic_vars(self) -> None:
        """Initialize dynamic variables."""
        try:
            self._dynamic_vars: Dict[str, Optional[Any]] = {
                "album_art_image": None,
                "current_album_art_url": None,
            }
        except Exception as e:  # pylint: disable=broad-exception-caught
            self.logger.error("Failed to initialize dynamic variables: %s", e)

    def update_playback_info(self, playback: Optional[Dict[str, Any]]) -> None:
        """
        Update the playback information in the Home tab.

        Args:
            playback (Optional[Dict[str, Any]]): The current playback information.
        """
        try:
            if playback:
                self._update_playback_labels(playback)
                self._update_progress_bar(playback)
                self._update_album_art(playback)
            else:
                self._clear_playback_information()
        except Exception as e:  # pylint: disable=broad-exception-caught
            self.logger.critical("Critical failure in update_playback_info: %s", e)
            raise

    def _truncate_text(self, text: str, max_length: int = 30) -> str:
        """
        Truncate the text to fit within the maximum length, adding ellipses if necessary.

        Args:
            text (str): The text to truncate.
            max_length (int, optional): The maximum allowed length. Defaults to 30.

        Returns:
            str: The truncated text with ellipses if it was too long.
        """
        return text if len(text) <= max_length else text[: max_length - 3] + "..."

    def _update_playback_labels(self, playback: Dict[str, Any]) -> None:
        """
        Update the playback labels with the current playback information.

        Args:
            playback (Dict[str, Any]): The current playback information.
        """
        try:
            track_name: str = playback["item"]["name"]
            artists: str = ", ".join(
                [artist["name"] for artist in playback["item"]["artists"]]
            )
            is_playing: bool = playback["is_playing"]
            status: str = "Playing" if is_playing else "Paused"

            truncated_track_name = self._truncate_text(track_name)
            truncated_artists = self._truncate_text(artists)

            self._ui_elements["track_info_labels"]["track_name"].configure(
                text=f"Track: {truncated_track_name}"
            )
            self._ui_elements["track_info_labels"]["artists"].configure(
                text=f"Artists: {truncated_artists}"
            )
            self._ui_elements["track_info_labels"]["status"].configure(
                text=f"Status: {status}"
            )
        except KeyError as e:
            self.logger.error("Track info label not found: %s", e)
        except Exception as e:  # pylint: disable=broad-exception-caught
            self.logger.error("Failed to update track info labels: %s", e)

    def _update_progress_bar(self, playback: Dict[str, Any]) -> None:
        """
        Update the progress bar and time label with the current playback information.

        Args:
            playback (Dict[str, Any]): The current playback information.
        """
        try:
            progress: int = playback["progress_ms"] // 1000
            duration: int = playback["item"]["duration_ms"] // 1000
            progress_percentage: float = (progress / duration) if duration > 0 else 0.0
            self._ui_elements["progress"]["var"].set(progress_percentage)
            self._ui_elements["progress"]["time_label"].configure(
                text=f"{progress}s / {duration}s"
            )
        except Exception as e:  # pylint: disable=broad-exception-caught
            self.logger.error("Failed to update progress bar or time label: %s", e)

    def _update_album_art(self, playback: Dict[str, Any]) -> None:
        """
        Update the album art with the current playback information.

        Args:
            playback (Dict[str, Any]): The current playback information.
        """
        try:
            album_art_url: str = playback["item"]["album"]["images"][0]["url"]
            if (
                not self._dynamic_vars["current_album_art_url"]
                or self._dynamic_vars["current_album_art_url"] != album_art_url
            ):
                self._dynamic_vars["current_album_art_url"] = album_art_url
                self.load_album_art_async(album_art_url)
        except KeyError as e:
            self.logger.error("Album art URL not found in playback data: %s", e)
        except Exception as e:  # pylint: disable=broad-exception-caught
            self.logger.error("Failed to update album art: %s", e)

    def _clear_playback_information(self) -> None:
        """
        Clear the playback information in the Home tab.
        """
        try:
            self._ui_elements["track_info_labels"]["track_name"].configure(
                text="Track: "
            )
            self._ui_elements["track_info_labels"]["artists"].configure(
                text="Artists: "
            )
            self._ui_elements["track_info_labels"]["status"].configure(text="Status: ")
            self._ui_elements["progress"]["var"].set(0.0)
            self._ui_elements["progress"]["time_label"].configure(text="0s / 0s")
            self._ui_elements["album_art_label"].configure(
                text="No Playback",
                image=self._placeholder_image,
                text_color=get_text_color(),
            )
            self._dynamic_vars["current_album_art_url"] = None
        except KeyError as e:
            self.logger.error("Playback UI element not found: %s", e)
        except Exception as e:  # pylint: disable=broad-exception-caught
            self.logger.error("Failed to clear playback information: %s", e)

    def update_logs(self, log_contents: str) -> None:
        """
        Update the log text box with new log contents.

        Args:
            log_contents (str): The contents of the log file.
        """
        try:
            self._log_text.configure(state="normal")
            self._log_text.delete("1.0", "end")
            self._log_text.insert("1.0", log_contents)
            self._log_text.yview_moveto(1.0)
            self._log_text.configure(state="disabled")
        except Exception as e:  # pylint: disable=broad-exception-caught
            self.logger.error("Failed to update logs: %s", e)

    def _load_album_art(self, url: str) -> None:
        """
        Load and display album art from a URL.

        Args:
            url (str): URL of the album art image.
        """
        try:
            response: requests.Response = requests.get(url, timeout=5)
            response.raise_for_status()
            image_data: bytes = response.content
            image: Image.Image = Image.open(io.BytesIO(image_data))
            image = image.resize((200, 200), Image.Resampling.LANCZOS)  # type: ignore

            radius = 20
            mask = Image.new("L", image.size, 0)
            draw = ImageDraw.Draw(mask)
            draw.rounded_rectangle((0, 0) + image.size, radius=radius, fill=255)
            rounded_image = ImageOps.fit(image, mask.size, centering=(0.5, 0.5))
            rounded_image.putalpha(mask)

            self._dynamic_vars["album_art_image"] = CTkImage(
                rounded_image, size=(200, 200)
            )
            self._ui_elements["album_art_label"].configure(
                text="", image=self._dynamic_vars["album_art_image"]
            )
        except requests.exceptions.RequestException as e:
            self.logger.error("Request failed while loading album art: %s", e)
            self._ui_elements["album_art_label"].configure(image=None)
        except IOError as e:
            self.logger.error("IO error while processing album art image: %s", e)
            self._ui_elements["album_art_label"].configure(image=None)
        except Exception as e:  # pylint: disable=broad-exception-caught
            self.logger.error("Failed to load album art: %s", e)
            self._ui_elements["album_art_label"].configure(image=None)

    def load_album_art_async(self, url: str) -> None:
        """
        Load album art asynchronously from a URL.

        Args:
            url (str): URL of the album art image.
        """
        try:
            threading.Thread(
                target=self._load_album_art, args=(url,), daemon=True
            ).start()
        except Exception as e:  # pylint: disable=broad-exception-caught
            self.logger.error("Failed to start thread for loading album art: %s", e)
