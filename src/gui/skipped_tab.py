"""
This module defines the SkippedTab class for the Spotify Skip Tracker GUI.
It provides functionality to display and manage the count of skipped songs,
allowing users to refresh the data and enforce skip threshold settings.
"""

import json
from tkinter import messagebox, ttk
import customtkinter as ctk
from utils import load_skip_count, save_skip_count, unlike_song
from config_utils import load_config
from datetime import datetime, timedelta


class SkippedTab:
    """
    A Skipped tab for the Spotify Skip Tracker GUI, displaying skipped songs count.
    """

    def __init__(self, parent, app_config, app_logger):
        """
        Initialize the SkippedTab.

        Args:
            parent (ctk.CTkFrame): The parent frame for the Skipped tab.
            app_config (dict): The current configuration dictionary.
            app_logger (logging.Logger): The logger instance for logging activities.
        """
        self.parent = parent
        self.config = app_config
        self.logger = app_logger

        # Configure grid layout
        self.parent.grid_rowconfigure(1, weight=1)
        self.parent.grid_columnconfigure(0, weight=1)
        self.parent.grid_columnconfigure(1, weight=0)

        # Title Label
        self.skipped_label = ctk.CTkLabel(
            parent, text="Skipped Songs Details", font=("Arial", 16)
        )
        self.skipped_label.grid(row=0, column=0, columnspan=2, pady=10, sticky="n")

        # Skipped Songs Treeview using ttk
        columns = ("Track ID", "Skipped", "Not Skipped", "Last Skipped")
        self.skipped_tree = ttk.Treeview(
            parent,
            columns=columns,
            show="headings",
            selectmode="browse",
        )
        self.skipped_tree.heading("Track ID", text="Track ID")
        self.skipped_tree.heading("Skipped", text="Skipped Count")
        self.skipped_tree.heading("Not Skipped", text="Not Skipped Count")
        self.skipped_tree.heading("Last Skipped", text="Last Skipped")
        self.skipped_tree.column("Track ID", anchor="center", minwidth=100, width=100)
        self.skipped_tree.column("Skipped", anchor="center", minwidth=100, width=100)
        self.skipped_tree.column(
            "Not Skipped", anchor="center", minwidth=100, width=100
        )
        self.skipped_tree.column(
            "Last Skipped", anchor="center", minwidth=150, width=150
        )
        self.skipped_tree.grid(row=1, column=0, pady=10, padx=(10, 0), sticky="nsew")

        # Add a scrollbar
        scrollbar = ctk.CTkScrollbar(
            parent, orientation="vertical", command=self.skipped_tree.yview
        )
        self.skipped_tree.configure(yscroll=scrollbar.set)
        scrollbar.grid(row=1, column=1, pady=10, sticky="ns")

        # Refresh Button
        self.refresh_button = ctk.CTkButton(
            parent, text="Refresh", command=self.refresh
        )
        self.refresh_button.grid(row=2, column=0, columnspan=2, pady=10, sticky="s")

        # Bind the resize event
        self.parent.bind("<Configure>", self.on_resize)

        # Load skipped songs data initially
        self.load_skipped_data()

    def on_resize(self, _):
        """
        Adjust the treeview height based on the window size.
        """
        # Calculate the available height for the treeview
        available_height = (
            self.parent.winfo_height() - 100
        )  # Adjust for padding and other widgets
        row_height = 20  # Approximate height of a row in pixels
        num_rows = max(5, available_height // row_height)  # Ensure a minimum of 5 rows

        # Update the treeview height
        self.skipped_tree.configure(height=num_rows)

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
        timeframe_value = self.config.get("TIMEFRAME_VALUE", 1)
        timeframe_unit = self.config.get("TIMEFRAME_UNIT", "weeks")

        # Calculate the timeframe delta
        if timeframe_unit == "days":
            delta = timedelta(days=timeframe_value)
        elif timeframe_unit == "weeks":
            delta = timedelta(weeks=timeframe_value)
        elif timeframe_unit == "months":
            delta = timedelta(days=30 * timeframe_value)
        elif timeframe_unit == "years":
            delta = timedelta(days=365 * timeframe_value)
        else:
            delta = timedelta(days=timeframe_value)  # Default to days

        now = datetime.now()

        # Load current skip_count
        skip_count = load_skip_count()

        # Identify tracks that exceed the skip threshold within the timeframe
        tracks_to_unlike = []
        for track_id, data in skip_count.items():
            skipped_dates = data.get("skipped_dates", [])
            recent_skips = [
                datetime.strptime(date, "%Y-%m-%dT%H:%M:%S")
                for date in skipped_dates
                if now - datetime.strptime(date, "%Y-%m-%dT%H:%M:%S") <= delta
            ]
            if len(recent_skips) >= skip_threshold:
                tracks_to_unlike.append(track_id)

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
