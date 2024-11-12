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
from PIL import Image
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
        base_path = sys._MEIPASS  # pylint: disable=protected-access
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
        try:
            self.parent: ctk.CTkFrame = parent
            self.logger: Any = app_logger
            self.placeholder_image: CTkImage = ctk.CTkImage(
                light_image=Image.open(resource_path("assets/images/black.jpg")),
                dark_image=Image.open(resource_path("assets/images/white.jpg")),
                size=(200, 200),
            )
        except Exception as e:  # pylint: disable=broad-exception-caught
            self.logger.critical("Failed to initialize HomeTab: %s", e)
            raise

        try:
            # Configure grid layout
            self.parent.grid_rowconfigure(0, weight=0)
            self.parent.grid_rowconfigure(1, weight=1)
            self.parent.grid_columnconfigure(0, weight=1)

            # Playback Information Frame
            self.playback_frame: ctk.CTkFrame = ctk.CTkFrame(
                self.parent, width=800, fg_color="transparent"
            )
            self.playback_frame.grid(row=0, column=0, pady=10, padx=10, sticky="nsew")
        except Exception as e:  # pylint: disable=broad-exception-caught
            self.logger.critical(
                "Failed to set up grid layout or playback frame: %s", e
            )
            raise

        try:
            # UI Elements
            self.ui_elements: Dict[str, Any] = {}

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
        except Exception as e:  # pylint: disable=broad-exception-caught
            self.logger.error("Failed to create album art label: %s", e)

        try:
            # Track Information Frame
            self.ui_elements["track_info_frame"] = ctk.CTkFrame(
                self.playback_frame, width=590
            )
            self.ui_elements["track_info_frame"].grid(
                row=0, column=1, columnspan=6, sticky="nsew", padx=10, pady=10
            )

            # Track Information Labels
            self.ui_elements["track_info_labels"]: Dict[str, ctk.CTkLabel] = {  # type: ignore
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
        except Exception as e:  # pylint: disable=broad-exception-caught
            self.logger.error("Failed to create track information labels: %s", e)

        try:
            # Progress Bar Frame
            self.ui_elements["progress_frame"] = ctk.CTkFrame(
                self.playback_frame, width=420
            )
            self.ui_elements["progress_frame"].grid(
                row=1, column=1, sticky="nsew", padx=5, pady=10
            )

            # Progress Bar and Label
            progress_var: ctk.DoubleVar = ctk.DoubleVar(value=0)
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
        except Exception as e:  # pylint: disable=broad-exception-caught
            self.logger.error("Failed to create progress bar and label: %s", e)

        try:
            # Log Text Box
            self.log_text: ctk.CTkTextbox = ctk.CTkTextbox(
                self.parent, width=800, height=250
            )
            self.log_text.grid(row=1, column=0, pady=10, padx=10, sticky="nsew")
            self.log_text.configure(state="disabled")
        except Exception as e:  # pylint: disable=broad-exception-caught
            self.logger.error("Failed to create log text box: %s", e)

        try:
            # Dynamic Variables
            self.dynamic_vars: Dict[str, Optional[Any]] = {
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
                track_name: str = playback["item"]["name"]
                artists: str = ", ".join(
                    [artist["name"] for artist in playback["item"]["artists"]]
                )
                progress: int = playback["progress_ms"] // 1000
                duration: int = playback["item"]["duration_ms"] // 1000
                is_playing: bool = playback["is_playing"]
                status: str = "Playing" if is_playing else "Paused"

                # Update Labels
                try:
                    self.ui_elements["track_info_labels"]["track_name"].configure(
                        text=f"Track: {track_name}"
                    )
                    self.ui_elements["track_info_labels"]["artists"].configure(
                        text=f"Artists: {artists}"
                    )
                    self.ui_elements["track_info_labels"]["status"].configure(
                        text=f"Status: {status}"
                    )
                except KeyError as e:
                    self.logger.error("Track info label not found: %s", e)
                except Exception as e:  # pylint: disable=broad-exception-caught
                    self.logger.error("Failed to update track info labels: %s", e)

                # Update Progress Bar
                try:
                    progress_percentage: float = (
                        (progress / duration) if duration > 0 else 0.0
                    )
                    self.ui_elements["progress"]["var"].set(progress_percentage)
                    self.ui_elements["progress"]["time_label"].configure(
                        text=f"{progress}s / {duration}s"
                    )
                except Exception as e:  # pylint: disable=broad-exception-caught
                    self.logger.error(
                        "Failed to update progress bar or time label: %s", e
                    )

                # Update Album Art
                try:
                    album_art_url: str = playback["item"]["album"]["images"][0]["url"]
                    if (
                        not self.dynamic_vars["current_album_art_url"]
                        or self.dynamic_vars["current_album_art_url"] != album_art_url
                    ):
                        self.dynamic_vars["current_album_art_url"] = album_art_url
                        self.load_album_art_async(album_art_url)
                except KeyError as e:
                    self.logger.error("Album art URL not found in playback data: %s", e)
                except Exception as e:  # pylint: disable=broad-exception-caught
                    self.logger.error("Failed to update album art: %s", e)
            else:
                # Clear Playback Information
                try:
                    self.ui_elements["track_info_labels"]["track_name"].configure(
                        text="Track: "
                    )
                    self.ui_elements["track_info_labels"]["artists"].configure(
                        text="Artists: "
                    )
                    self.ui_elements["track_info_labels"]["status"].configure(
                        text="Status: "
                    )
                    self.ui_elements["progress"]["var"].set(0.0)
                    self.ui_elements["progress"]["time_label"].configure(text="0s / 0s")
                    self.ui_elements["album_art_label"].configure(
                        text="No Playback",
                        image=self.placeholder_image,
                        text_color=get_text_color(),
                    )
                    self.dynamic_vars["current_album_art_url"] = None
                except KeyError as e:
                    self.logger.error("Playback UI element not found: %s", e)
                except Exception as e:  # pylint: disable=broad-exception-caught
                    self.logger.error("Failed to clear playback information: %s", e)
        except Exception as e:  # pylint: disable=broad-exception-caught
            self.logger.critical("Critical failure in update_playback_info: %s", e)
            raise

    def update_logs(self, log_contents: str) -> None:
        """
        Update the log text box with new log contents.

        Args:
            log_contents (str): The contents of the log file.
        """
        try:
            self.log_text.configure(state="normal")
            self.log_text.delete("1.0", "end")
            self.log_text.insert("1.0", log_contents)
            self.log_text.yview_moveto(1.0)
            self.log_text.configure(state="disabled")
        except Exception as e:  # pylint: disable=broad-exception-caught
            self.logger.error("Failed to update logs: %s", e)

    def load_album_art(self, url: str) -> None:
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
            self.dynamic_vars["album_art_image"] = CTkImage(image, size=(200, 200))
            self.ui_elements["album_art_label"].configure(
                text="", image=self.dynamic_vars["album_art_image"]
            )
        except requests.exceptions.RequestException as e:
            self.logger.error("Request failed while loading album art: %s", e)
            self.ui_elements["album_art_label"].configure(image=None)
        except IOError as e:
            self.logger.error("IO error while processing album art image: %s", e)
            self.ui_elements["album_art_label"].configure(image=None)
        except Exception as e:  # pylint: disable=broad-exception-caught
            self.logger.error("Failed to load album art: %s", e)
            self.ui_elements["album_art_label"].configure(image=None)

    def load_album_art_async(self, url: str) -> None:
        """
        Load album art asynchronously from a URL.

        Args:
            url (str): URL of the album art image.
        """
        try:
            threading.Thread(
                target=self.load_album_art, args=(url,), daemon=True
            ).start()
        except Exception as e:  # pylint: disable=broad-exception-caught
            self.logger.error("Failed to start thread for loading album art: %s", e)
