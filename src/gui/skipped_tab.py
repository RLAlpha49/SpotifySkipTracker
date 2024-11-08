"""
This module defines the SkippedTab class for the Spotify Skip Tracker GUI.
It provides functionality to display and manage the count of skipped songs,
allowing users to refresh the data and enforce skip threshold settings.
"""

import json
from tkinter import messagebox
import customtkinter as ctk
from CTkTreeview import CTkTreeview
from utils import load_skip_count, save_skip_count, unlike_song
from config_utils import load_config


class SkippedTab:
    """
    A Skipped tab for the Spotify Skip Tracker GUI, displaying skipped songs count.
    """

    def __init__(self, parent, app_config, app_logger):
        """
        Initialize the SkippedTab.

        Args:
            parent (ctk.CTkFrame): The parent frame for the Skipped tab.
            config (dict): The current configuration dictionary.
            logger (logging.Logger): The logger instance for logging activities.
        """
        self.parent = parent
        self.config = app_config
        self.logger = app_logger

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
                (
                    f"{len(tracks_to_unlike)} track(s) have been unliked "
                    "based on the new skip threshold."
                ),
            )

        # Clear existing data
        for item in self.skipped_tree.get_children():
            self.skipped_tree.delete(item)

        # Reload data
        self.load_skipped_data()
