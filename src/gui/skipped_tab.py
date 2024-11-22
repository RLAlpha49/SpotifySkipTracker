"""
This module defines the SkippedTab class for the Spotify Skip Tracker GUI.
It provides functionality to display and manage the count of skipped songs,
allowing users to refresh the data and enforce skip threshold settings.
"""

import json
from tkinter import ttk
from datetime import datetime, timedelta
from typing import Any, Dict, List
import customtkinter as ctk
from CTkMessagebox import CTkMessagebox
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
            self._load_configuration()
            delta = self._calculate_timeframe_delta()
            now = datetime.now()
            skip_count = self._load_skip_count_data()

            tracks_to_unlike = self._identify_tracks_to_unlike(skip_count, delta, now)
            if tracks_to_unlike:
                self._unlike_tracks(tracks_to_unlike, skip_count)
                self._notify_user(tracks_to_unlike)

            self._clear_existing_data()
            self._reload_skipped_data()
        except Exception as e:  # pylint: disable=broad-exception-caught
            self.logger.critical("Critical failure in refresh: %s", e)
            raise

    def _load_configuration(self) -> None:
        """
        Load the configuration settings.
        """
        try:
            self.config = load_config(decrypt=True)
        except Exception as e:
            self.logger.critical("Failed to load configuration during refresh: %s", e)
            raise

    def _calculate_timeframe_delta(self) -> timedelta:
        """
        Calculate the timeframe delta based on configuration.
        """
        timeframe_value = self.config.get("TIMEFRAME_VALUE", 1)
        timeframe_unit = self.config.get("TIMEFRAME_UNIT", "weeks")
        if timeframe_unit == "days":
            return timedelta(days=timeframe_value)
        if timeframe_unit == "weeks":
            return timedelta(weeks=timeframe_value)
        if timeframe_unit == "months":
            return timedelta(days=30 * timeframe_value)
        if timeframe_unit == "years":
            return timedelta(days=365 * timeframe_value)
        return timedelta(days=timeframe_value)  # Default to days

    def _load_skip_count_data(self) -> Dict[str, Any]:
        """
        Load the skip count data.

        Returns:
            Dict[str, Any]: The loaded skip count data.
        """
        try:
            return load_skip_count()
        except Exception as e:
            self.logger.critical("Failed to load skip count during refresh: %s", e)
            raise

    def _identify_tracks_to_unlike(
        self, skip_count: Dict[str, Any], delta: timedelta, now: datetime
    ) -> List[str]:
        """
        Identify tracks that exceed the skip threshold within the timeframe.

        Args:
            skip_count (Dict[str, Any]): The skip count data.
            delta (timedelta): The timeframe delta.
            now (datetime): The current date and time.

        Returns:
            List[str]: The list of track IDs to unlike.
        """
        skip_threshold = self.config.get("SKIP_THRESHOLD", 5)
        tracks_to_unlike = []
        for track_id, data in skip_count.items():
            if self._track_exceeds_threshold(data, delta, now, skip_threshold):
                tracks_to_unlike.append(track_id)
        return tracks_to_unlike

    def _track_exceeds_threshold(
        self, data: Dict[str, Any], delta: timedelta, now: datetime, skip_threshold: int
    ) -> bool:
        """
        Check if a track exceeds the skip threshold.

        Args:
            data (Dict[str, Any]): The skip count data for a track.
            delta (timedelta): The timeframe delta.
            now (datetime): The current date and time.
            skip_threshold (int): The skip threshold.

        Returns:
            bool: True if the track exceeds the skip threshold, False otherwise.
        """
        skipped_dates = data.get("skipped_dates", [])
        recent_skips = [
            datetime.strptime(date_str, "%Y-%m-%dT%H:%M:%S")
            for date_str in skipped_dates
            if self._is_recent_skip(date_str, delta, now)
        ]
        return len(recent_skips) >= skip_threshold

    def _is_recent_skip(self, date_str: str, delta: timedelta, now: datetime) -> bool:
        """
        Determine if a skip is recent based on the delta.

        Args:
            date_str (str): The date string to check.
            delta (timedelta): The timeframe delta.
            now (datetime): The current date and time.

        Returns:
            bool: True if the skip is recent, False otherwise.
        """
        try:
            date = datetime.strptime(date_str, "%Y-%m-%dT%H:%M:%S")
            return now - date <= delta
        except ValueError as ve:
            self.logger.error("Invalid date format: %s", ve)
            return False

    def _unlike_tracks(
        self, tracks_to_unlike: List[str], skip_count: Dict[str, Any]
    ) -> None:
        """
        Unlike tracks that exceed the skip threshold.

        Args:
            tracks_to_unlike (List[str]): The list of track IDs to unlike.
            skip_count (Dict[str, Any]): The skip count data.
        """
        for track_id in tracks_to_unlike:
            try:
                self.logger.info(
                    "Unliking track %s due to exceeding skip threshold.", track_id
                )
                unlike_song(track_id)
                del skip_count[track_id]
                self.logger.debug(
                    "Removed track %s from skip_count after unliking.", track_id
                )
            except Exception as e:  # pylint: disable=broad-exception-caught
                self.logger.error("Failed to unlike track %s: %s", track_id, e)
        self._save_updated_skip_count(skip_count)

    def _save_updated_skip_count(self, skip_count: Dict[str, Any]) -> None:
        """
        Save the updated skip count data.

        Args:
            skip_count (Dict[str, Any]): The skip count data.
        """
        try:
            save_skip_count(skip_count)
        except Exception as e:
            self.logger.critical("Failed to save updated skip count: %s", e)
            raise

    def _notify_user(self, tracks_to_unlike: List[str]) -> None:
        """
        Notify the user about the tracks that have been unliked.

        Args:
            tracks_to_unlike (List[str]): The list of track IDs that have been unliked.
        """
        try:
            CTkMessagebox(
                title="Tracks Unliked",
                message=f"{len(tracks_to_unlike)} track(s) have been unliked based on the new skip threshold.",
                icon="info",
                justify="center",
            )
        except Exception as e:  # pylint: disable=broad-exception-caught
            self.logger.error("Failed to show info messagebox: %s", e)

    def _clear_existing_data(self) -> None:
        """
        Clear existing data from the treeview.
        """
        try:
            for item in self.skipped_tree.get_children():
                self.skipped_tree.delete(item)
        except Exception as e:  # pylint: disable=broad-exception-caught
            self.logger.error("Failed to clear existing treeview data: %s", e)

    def _reload_skipped_data(self) -> None:
        """
        Reload the skipped data into the treeview.
        """
        try:
            self.load_skipped_data()
        except Exception as e:  # pylint: disable=broad-exception-caught
            self.logger.error("Failed to reload skipped data after refresh: %s", e)
