"""
This module defines the SettingsTab class for the Spotify Skip Tracker GUI.
It allows users to configure various application settings such as Spotify credentials,
log level, appearance mode, color theme, and skip thresholds.
"""

from tkinter import messagebox
from typing import Any, Dict
import customtkinter as ctk
from CTkToolTip import CTkToolTip
from config_utils import set_config_variable  # pylint: disable=import-error


class SettingsTab:
    """
    A Settings tab for the Spotify Skip Tracker GUI, allows users to configure application settings.
    """

    def __init__(
        self,
        parent: ctk.CTkFrame,
        app_config: Dict[str, Any],
        app_logger: Any,
    ) -> None:
        """
        Initialize the SettingsTab.

        Args:
            parent (ctk.CTkFrame): The parent frame for the Settings tab.
            app_config (Dict[str, Any]): The current configuration dictionary.
            app_logger (Any): The logger instance for logging activities.
        """
        self.parent: ctk.CTkFrame = parent
        self.config: Dict[str, Any] = app_config
        self.logger: Any = app_logger

        # Configure grid layout
        self.parent.grid_rowconfigure(1, weight=1)
        self.parent.grid_columnconfigure(0, weight=1)

        # Title Label
        ctk.CTkLabel(parent, text="Application Settings", font=("Arial", 16)).grid(
            row=0, column=0, pady=10, sticky="n"
        )

        # Create a scrollable frame for settings
        self.scrollable_frame: ctk.CTkScrollableFrame = ctk.CTkScrollableFrame(
            parent, width=600, height=460
        )
        self.scrollable_frame.grid(row=1, column=0, pady=10, padx=20, sticky="n")

        # Configuration Variables
        self.settings_entries: Dict[str, ctk.CTkEntry] = {}
        required_keys: list[str] = [
            "SPOTIFY_CLIENT_ID",
            "SPOTIFY_CLIENT_SECRET",
            "SPOTIFY_REDIRECT_URI",
        ]

        for key in required_keys:
            frame: ctk.CTkFrame = ctk.CTkFrame(self.scrollable_frame)
            frame.pack(pady=3, padx=20, fill="x")

            formatted_key: str = " ".join(
                word.capitalize() for word in key.lower().split("_")
            )
            ctk.CTkLabel(frame, text=f"{formatted_key}:", width=160, anchor="w").pack(
                side="left", padx=5, pady=3
            )

            entry: ctk.CTkEntry = ctk.CTkEntry(frame, width=500)
            entry.pack(side="left", padx=5, pady=3)
            entry.insert(0, self.config.get(key, ""))
            self.settings_entries[key] = entry

        # Variables Dictionary
        self.variables: Dict[str, Any] = {
            "log_level": ctk.StringVar(value=self.config.get("LOG_LEVEL", "INFO")),
            "log_line_count": ctk.StringVar(
                value=self.config.get("LOG_LINE_COUNT", "500")
            ),
            "appearance_mode": ctk.StringVar(
                value=self.config.get("APPEARANCE_MODE", "System")
            ),
            "color_theme": ctk.StringVar(value=self.config.get("COLOR_THEME", "blue")),
            "skip_threshold": ctk.IntVar(value=self.config.get("SKIP_THRESHOLD", 5)),
            "skip_progress": ctk.DoubleVar(
                value=self.config.get("SKIP_PROGRESS_THRESHOLD", 0.42)
            ),
            "timeframe_value": ctk.IntVar(value=self.config.get("TIMEFRAME_VALUE", 1)),
            "timeframe_unit": ctk.StringVar(
                value=self.config.get("TIMEFRAME_UNIT", "weeks")
            ),
        }

        # Initialize skip progress widgets dictionary
        self.skip_progress_widgets: Dict[str, Any] = {}

        # Create Settings Widgets
        self._create_settings_widgets(self.scrollable_frame)

        # Save Button
        self.save_button: ctk.CTkButton = ctk.CTkButton(
            parent, text="Save Settings", command=self.save_settings
        )
        self.save_button.grid(row=2, column=0, pady=20, sticky="s")

    def _create_settings_widgets(self, parent: ctk.CTkScrollableFrame) -> None:
        """
        Create and arrange all settings widgets within the parent frame.

        Args:
            parent (ctk.CTkScrollableFrame): The parent frame to add the settings widgets to.
        """
        # Log Level Dropdown
        self._create_dropdown(
            parent,
            "Log Level:",
            self.variables["log_level"],
            ["DEBUG", "INFO", "WARNING", "ERROR"],
        )

        # Log Line Count Textbox
        self._create_entry(parent, "Log Lines:", self.variables["log_line_count"])

        # Appearance Mode Dropdown
        self._create_dropdown(
            parent,
            "Appearance Mode:",
            self.variables["appearance_mode"],
            ["System", "Dark", "Light"],
        )

        # Color Theme Dropdown
        self._create_dropdown(
            parent,
            "Color Theme:",
            self.variables["color_theme"],
            ["blue", "green", "dark-blue", "NightTrain"],
        )

        # Skip Threshold Setting
        self._create_entry(parent, "Skip Threshold:", self.variables["skip_threshold"])

        # Skip Progress Threshold Setting
        self._create_skip_progress_slider(parent)

        # Timeframe Setting
        self._create_entry(
            parent, "Timeframe Value:", self.variables["timeframe_value"]
        )
        self._create_dropdown(
            parent,
            "Timeframe Unit:",
            self.variables["timeframe_unit"],
            ["days", "weeks", "months", "years"],
        )

    def _create_dropdown(
        self,
        parent: ctk.CTkScrollableFrame,
        label_text: str,
        variable: ctk.StringVar,
        values: list[str],
    ) -> None:
        """
        Create a dropdown menu with a label.

        Args:
            parent (ctk.CTkScrollableFrame): The parent frame to add the dropdown to.
            label_text (str): The text for the label.
            variable (ctk.StringVar): The variable associated with the dropdown.
            values (List[str]): The list of values for the dropdown options.
        """
        frame: ctk.CTkFrame = ctk.CTkFrame(parent)
        frame.pack(pady=3, padx=20, fill="x")

        ctk.CTkLabel(frame, text=label_text, width=160, anchor="w").pack(
            side="left", padx=5, pady=3
        )

        option_menu: ctk.CTkOptionMenu = ctk.CTkOptionMenu(
            frame, variable=variable, values=values
        )
        option_menu.pack(side="left", padx=5, pady=3)

    def _create_entry(
        self,
        parent: ctk.CTkScrollableFrame,
        label_text: str,
        variable: Any,
    ) -> None:
        """
        Create an entry widget with a label.

        Args:
            parent (ctk.CTkScrollableFrame): The parent frame to add the entry to.
            label_text (str): The text for the label.
            variable (Any): The variable associated with the entry.
        """
        frame: ctk.CTkFrame = ctk.CTkFrame(parent)
        frame.pack(pady=3, padx=20, fill="x")

        ctk.CTkLabel(frame, text=label_text, width=160, anchor="w").pack(
            side="left", padx=5, pady=3
        )

        entry: ctk.CTkEntry = ctk.CTkEntry(frame, textvariable=variable, width=500)
        entry.pack(side="left", padx=5, pady=3)

    def _create_skip_progress_slider(self, parent: ctk.CTkScrollableFrame) -> None:
        """
        Create a slider for configuring the skip progress threshold, including a tooltip and entry.

        Args:
            parent (ctk.CTkScrollableFrame): The parent frame to add the slider to.
        """
        skip_progress_frame: ctk.CTkFrame = ctk.CTkFrame(parent)
        skip_progress_frame.pack(pady=3, padx=20, fill="x")

        ctk.CTkLabel(
            skip_progress_frame, text="Skip Progress Threshold:", width=160, anchor="w"
        ).pack(side="left", padx=5, pady=3)

        slider: ctk.CTkSlider = ctk.CTkSlider(
            skip_progress_frame,
            from_=0.01,
            to=0.99,
            variable=self.variables["skip_progress"],
            command=self.update_skip_progress_label,
        )
        slider.pack(side="left", padx=5, pady=3, fill="x", expand=True)

        # Tooltip for slider
        tooltip: CTkToolTip = CTkToolTip(
            slider,
            message=f"{self.variables['skip_progress'].get() * 100:.0f}%",
            delay=0.2,
        )

        # Label to show percentage
        percentage_label: ctk.CTkLabel = ctk.CTkLabel(
            skip_progress_frame,
            text=f"{self.variables['skip_progress'].get() * 100:.0f}%",
            width=50,
            anchor="w",
        )
        percentage_label.pack(side="left", padx=5, pady=3)

        # Entry for manual input
        skip_progress_entry: ctk.CTkEntry = ctk.CTkEntry(
            skip_progress_frame, textvariable=self.variables["skip_progress"], width=50
        )
        skip_progress_entry.pack(side="left", padx=5, pady=3)

        # Trace changes to the skip progress variable
        self.variables["skip_progress"].trace("w", self.on_skip_progress_var_change)

        # Store references in a dictionary to avoid multiple instance attributes
        self.skip_progress_widgets = {
            "slider": slider,
            "percentage_label": percentage_label,
            "entry": skip_progress_entry,
            "tooltip": tooltip,
        }

    def update_skip_progress_label(self, value: float) -> None:
        """
        Update the skip progress percentage label and tooltip.

        Args:
            value (float): The current value of the skip progress slider.
        """
        percentage: float = float(value) * 100
        self.skip_progress_widgets["percentage_label"].configure(
            text=f"{percentage:.0f}%"
        )
        # Update the tooltip message
        self.skip_progress_widgets["tooltip"].configure(message=f"{percentage:.0f}%")
        # Update the entry box to show only two decimal points
        self.variables["skip_progress"].set(float(f"{float(value):.2f}"))

    def on_skip_progress_var_change(self, *_: Any) -> None:
        """
        Update the skip progress label when the skip progress variable changes.
        """
        value: Any = self.variables["skip_progress"].get()
        try:
            # Ensure the value is a valid float
            float_value: float = float(value)
            # Check if the value is within the allowed range
            if 0.00 <= float_value <= 0.99:
                self.update_skip_progress_label(float_value)
            else:
                raise ValueError("Value out of range")
        except (ValueError, TypeError):
            # Reset to the default value if input is invalid or out of range
            self.variables["skip_progress"].set(0.42)
            self.update_skip_progress_label(0.42)

    def save_settings(self) -> None:
        """
        Save the settings entered in the Settings tab.
        """
        for key, entry in self.settings_entries.items():
            value: str = entry.get().strip()
            if not value:
                messagebox.showerror("Input Error", f"{key} cannot be empty.")
                return
            encrypt: bool = key in {"SPOTIFY_CLIENT_ID", "SPOTIFY_CLIENT_SECRET"}
            set_config_variable(key, value, encrypt=encrypt)
            self.config[key] = value

        # Save and apply log level
        log_level: str = self.variables["log_level"].get()
        set_config_variable("LOG_LEVEL", log_level)
        self.config["LOG_LEVEL"] = log_level
        self.logger.setLevel(log_level)

        # Save and validate log line count
        log_line_count: str = self.variables["log_line_count"].get().strip()
        if not log_line_count.isdigit():
            messagebox.showerror("Input Error", "Log Lines must be an integer.")
            return
        set_config_variable("LOG_LINE_COUNT", log_line_count)
        self.config["LOG_LINE_COUNT"] = log_line_count

        # Save and apply appearance mode
        appearance_mode: str = self.variables["appearance_mode"].get()
        set_config_variable("APPEARANCE_MODE", appearance_mode)
        self.config["APPEARANCE_MODE"] = appearance_mode
        ctk.set_appearance_mode(appearance_mode)

        # Save and apply color theme
        color_theme: str = self.variables["color_theme"].get()
        previous_color_theme: str = self.config.get("COLOR_THEME", "blue")
        if color_theme != previous_color_theme:
            set_config_variable("COLOR_THEME", color_theme)
            self.config["COLOR_THEME"] = color_theme
            message: str = (
                "Settings have been saved successfully. A restart is required "
                "for Color Theme setting to take effect."
                if color_theme != previous_color_theme
                else "Settings have been saved successfully."
            )
            messagebox.showinfo("Settings Saved", message)
        else:
            messagebox.showinfo(
                "Settings Saved", "Settings have been saved successfully."
            )

        if self.config["COLOR_THEME"] == "NightTrain":
            ctk.set_default_color_theme("assets/themes/night_train.json")
        else:
            ctk.set_default_color_theme(self.config["COLOR_THEME"])

        # Save and validate skip threshold
        skip_threshold: int = self.variables["skip_threshold"].get()
        if not isinstance(skip_threshold, int):
            messagebox.showerror("Input Error", "Skip Threshold must be an integer.")
            return
        set_config_variable("SKIP_THRESHOLD", skip_threshold)
        self.config["SKIP_THRESHOLD"] = skip_threshold

        # Save and validate skip progress threshold
        skip_progress_threshold: float = self.variables["skip_progress"].get()
        if not 0.01 <= skip_progress_threshold <= 0.99:
            messagebox.showerror(
                "Input Error", "Skip Progress Threshold must be between 0.01 and 0.99."
            )
            return
        set_config_variable("SKIP_PROGRESS_THRESHOLD", skip_progress_threshold)
        self.config["SKIP_PROGRESS_THRESHOLD"] = skip_progress_threshold

        # Save and validate timeframe settings
        timeframe_value: int = self.variables["timeframe_value"].get()
        timeframe_unit: str = self.variables["timeframe_unit"].get()
        set_config_variable("TIMEFRAME_VALUE", timeframe_value)
        set_config_variable("TIMEFRAME_UNIT", timeframe_unit)
        self.config["TIMEFRAME_VALUE"] = timeframe_value
        self.config["TIMEFRAME_UNIT"] = timeframe_unit

        self.logger.info("Settings saved by the user.")
