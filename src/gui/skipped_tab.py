"""
This module defines the SkippedTab class for the Spotify Skip Tracker GUI.
It provides functionality to display and manage the count of skipped songs,
allowing users to refresh the data and enforce skip threshold settings.
"""

import json
from tkinter import messagebox
from tkinter import ttk
from datetime import datetime, timedelta
from typing import Any, Dict, List
import customtkinter as ctk
from utils import load_skip_count, save_skip_count, unlike_song  # pylint: disable=import-error  # type: ignore
from config_utils import load_config  # pylint: disable=import-error  # type: ignore


class SkippedTab:
    """
    A Skipped tab for the Spotify Skip Tracker GUI, displaying skipped songs count.
    """

    def __init__(
        self,
        parent: ctk.CTkFrame,
        app_config: Dict[str, Any],
        app_logger: Any,
    ) -> None:
        """
        Initialize the SkippedTab.

        Args:
            parent (ctk.CTkFrame): The parent frame for the Skipped tab.
            app_config (Dict[str, Any]): The current configuration dictionary.
            app_logger (Any): The logger instance for logging activities.
        """
        try:
            self.parent: ctk.CTkFrame = parent
            self.config: Dict[str, Any] = app_config
            self.logger: Any = app_logger

            # Configure grid layout
            self.parent.grid_rowconfigure(1, weight=1)
            self.parent.grid_columnconfigure(0, weight=1)
            self.parent.grid_columnconfigure(1, weight=0)

            # Title Label
            self.skipped_label: ctk.CTkLabel = ctk.CTkLabel(
                parent, text="Skipped Songs Details", font=("Arial", 16)
            )
            self.skipped_label.grid(row=0, column=0, columnspan=2, pady=10, sticky="n")

            # Skipped Songs Treeview using ttk
            columns: tuple[str, ...] = (
                "Track ID",
                "Skipped",
                "Not Skipped",
                "Last Skipped",
            )
            self.skipped_tree: ttk.Treeview = ttk.Treeview(
                parent,
                columns=columns,
                show="headings",
                selectmode="browse",
            )
            self.skipped_tree.heading("Track ID", text="Track ID")
            self.skipped_tree.heading("Skipped", text="Skipped Count")
            self.skipped_tree.heading("Not Skipped", text="Not Skipped Count")
            self.skipped_tree.heading("Last Skipped", text="Last Skipped")
            self.skipped_tree.column(
                "Track ID", anchor="center", minwidth=100, width=100
            )
            self.skipped_tree.column(
                "Skipped", anchor="center", minwidth=100, width=100
            )
            self.skipped_tree.column(
                "Not Skipped", anchor="center", minwidth=100, width=100
            )
            self.skipped_tree.column(
                "Last Skipped", anchor="center", minwidth=150, width=150
            )
            self.skipped_tree.grid(
                row=1, column=0, pady=10, padx=(10, 0), sticky="nsew"
            )

            # Add a scrollbar
            self.scrollbar: ctk.CTkScrollbar = ctk.CTkScrollbar(
                parent, orientation="vertical", command=self.skipped_tree.yview
            )
            self.skipped_tree.configure(yscrollcommand=self.scrollbar.set)
            self.scrollbar.grid(row=1, column=1, pady=10, sticky="ns")

            # Refresh Button
            self.refresh_button: ctk.CTkButton = ctk.CTkButton(
                parent, text="Refresh", command=self.refresh
            )
            self.refresh_button.grid(row=2, column=0, columnspan=2, pady=10, sticky="s")

            # Bind the resize event
            self.parent.bind("<Configure>", self.on_resize)

            # Load skipped songs data initially
            self.load_skipped_data()

        except Exception as e:  # pylint: disable=broad-exception-caught
            self.logger.critical("Critical failure in SkippedTab __init__: %s", e)
            raise

    def on_resize(self, _: Any) -> None:
        """
        Adjust the treeview height based on the window size.

        Args:
            event (Any): The event object containing information about the resize.
        """
        try:
            # Calculate the available height for the treeview
            available_height: int = self.parent.winfo_height() - 100
            row_height: int = 20
            num_rows: int = max(5, available_height // row_height)

            # Update the treeview height
            self.skipped_tree.configure(height=num_rows)
        except Exception as e:  # pylint: disable=broad-exception-caught
            self.logger.error("Failed to adjust treeview on resize: %s", e)

    def load_skipped_data(self) -> None:
        """
        Load and display the skipped songs data from skip_count.json.
        """
        try:
            skip_data: Dict[str, Any] = load_skip_count()
            if skip_data:
                for track_id, data in skip_data.items():
                    try:
                        skipped_count: int = data.get("skipped", 0)
                        not_skipped_count: int = data.get("not_skipped", 0)
                        last_skipped: str = data.get("last_skipped", "N/A")
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
                    except Exception as e:  # pylint: disable=broad-exception-caught
                        self.logger.error(
                            "Failed to insert track data for %s: %s", track_id, e
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
        except Exception as e:  # pylint: disable=broad-exception-caught
            self.logger.critical("Critical failure in load_skipped_data: %s", e)
            raise

    def refresh(self) -> None:
        """
        Refresh the skipped songs data and enforce skip threshold settings.
        """
        try:
            # Load current configuration
            try:
                self.config = load_config(decrypt=True)
            except Exception as e:
                self.logger.critical(
                    "Failed to load configuration during refresh: %s", e
                )
                raise

            skip_threshold: int = self.config.get("SKIP_THRESHOLD", 5)
            timeframe_value: int = self.config.get("TIMEFRAME_VALUE", 1)
            timeframe_unit: str = self.config.get("TIMEFRAME_UNIT", "weeks")

            # Calculate the timeframe delta
            if timeframe_unit == "days":
                delta: timedelta = timedelta(days=timeframe_value)
            elif timeframe_unit == "weeks":
                delta = timedelta(weeks=timeframe_value)
            elif timeframe_unit == "months":
                delta = timedelta(days=30 * timeframe_value)
            elif timeframe_unit == "years":
                delta = timedelta(days=365 * timeframe_value)
            else:
                delta = timedelta(days=timeframe_value)  # Default to days

            now: datetime = datetime.now()

            # Load current skip_count
            try:
                skip_count: Dict[str, Any] = load_skip_count()
            except Exception as e:
                self.logger.critical("Failed to load skip count during refresh: %s", e)
                raise

            # Identify tracks that exceed the skip threshold within the timeframe
            tracks_to_unlike: List[str] = []
            for track_id, data in skip_count.items():
                skipped_dates: List[str] = data.get("skipped_dates", [])
                recent_skips: List[datetime] = []
                for date_str in skipped_dates:
                    try:
                        date = datetime.strptime(date_str, "%Y-%m-%dT%H:%M:%S")
                        if now - date <= delta:
                            recent_skips.append(date)
                    except ValueError as ve:
                        self.logger.error(
                            "Invalid date format for track %s: %s", track_id, ve
                        )
                if len(recent_skips) >= skip_threshold:
                    tracks_to_unlike.append(track_id)

            if tracks_to_unlike:
                for track_id in tracks_to_unlike:
                    try:
                        self.logger.info(
                            "Unliking track %s due to exceeding skip threshold.",
                            track_id,
                        )
                        unlike_song(track_id)
                        del skip_count[track_id]
                        self.logger.debug(
                            "Removed track %s from skip_count after unliking.", track_id
                        )
                    except Exception as e:  # pylint: disable=broad-exception-caught
                        self.logger.error("Failed to unlike track %s: %s", track_id, e)

                # Save the updated skip_count
                try:
                    save_skip_count(skip_count)
                except Exception as e:
                    self.logger.critical("Failed to save updated skip count: %s", e)
                    raise

                # Notify the user
                try:
                    messagebox.showinfo(
                        "Tracks Unliked",
                        (
                            f"{len(tracks_to_unlike)} track(s) have been unliked "
                            "based on the new skip threshold."
                        ),
                    )
                except Exception as e:  # pylint: disable=broad-exception-caught
                    self.logger.error("Failed to show info messagebox: %s", e)

            # Clear existing data
            try:
                for item in self.skipped_tree.get_children():
                    self.skipped_tree.delete(item)
            except Exception as e:  # pylint: disable=broad-exception-caught
                self.logger.error("Failed to clear existing treeview data: %s", e)

            # Reload data
            try:
                self.load_skipped_data()
            except Exception as e:  # pylint: disable=broad-exception-caught
                self.logger.error("Failed to reload skipped data after refresh: %s", e)
        except Exception as e:  # pylint: disable=broad-exception-caught
            self.logger.critical("Critical failure in refresh: %s", e)
            raise
