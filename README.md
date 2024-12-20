<div align="center">

![SpotifySkipTrackerIconTransparent](https://github.com/user-attachments/assets/4023e57b-64b6-4b60-a369-42290dc887ab)

# Spotify Skip Tracker

</div>

**Note:** This application is compiled using PyInstaller. Which is known for false positives for antivirus programs and firewalls. Some antivirus programs and firewalls may block the application from running. If this happens, try to add the application to the exceptions list of your firewall and antivirus.

**Spotify Skip Tracker** is a Python-based GUI application that monitors your Spotify playback, tracks your song-skipping behavior, and automatically unlikes songs that you skip more than a specified threshold. Enhance your Spotify experience by keeping track of the tracks you frequently skip and manage your liked songs efficiently.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
  - [Prerequisites](#prerequisites)
  - [Setup](#setup)
- [Usage](#usage)
  - [Running the Application](#running-the-application)
  - [Authenticating with Spotify](#authenticating-with-spotify)
  - [Monitoring Playback](#monitoring-playback)
- [Configuration](#configuration)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)
- [Additional Information](#additional-information)
  - [Logging](#logging)
  - [Themes](#themes)

## Features

- **Real-Time Playback Monitoring:** Keeps track of your current Spotify playback, including track name, artist(s), and progress.
- **Automatic Unliking:** Automatically unlikes songs that you skip more than a configurable number of times.
- **Comprehensive Logging:** Logs playback events and application activities for real-time feedback and troubleshooting.
- **Customizable Settings:** Allows you to configure various settings such as skip thresholds, appearance modes, and log levels.
- **User-Friendly GUI:** Built with `customtkinter` for an intuitive and responsive user interface.

## Installation

### Prerequisites

- **Spotify Developer Account(Free):** Required to obtain API credentials (Client ID and Client Secret) for accessing Spotify's API.
- **Python 3.10 or higher:** Ensure you have the appropriate version of Python installed.

### Setup

Follow these steps to set up the Spotify Skip Tracker on your local machine:

1. **Clone the Repository**

   ```bash
   git clone https://github.com/RLAlpha49/SpotifySkipTracker.git
   cd SpotifySkipTracker
   ```

2. **Create a Virtual Environment**

   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```

3. **Install Dependencies**

   Install the required packages using `pip`:

   ```bash
   pip install -r requirements.txt
   ```

4. **Configuration File**

   The application uses a `config.json` file to store configuration settings. If it does not exist, the application will create one automatically with required keys initialized to empty strings.

   **Filling Configuration Variables:**

   - Run the application.
   - Click on the "Login with Spotify" button.
   - If any required configuration variables (`SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI`) are missing, a popup will appear prompting you to enter them.
   - Fill in the required information and click "Save".
   - Click the "Login with Spotify" button again to proceed with authentication.

## Usage

### Running the Application

Start the GUI application by executing the following command:

```bash
python src/app.py
```

### Authenticating with Spotify

1. Click on the "Login with Spotify" button in the GUI.
2. If prompted, enter the missing configuration variables.
3. Your default browser will open; log in with your Spotify account to grant access.
4. After successful authentication, the GUI will start monitoring your playback.
   - It is possible that the application will not start due to a firewall or antivirus blocking the network access. If this happens, try to add the application to the exceptions list of your firewall and antivirus.

### Monitoring Playback

- **Playback Information:** The application displays current playback details, including track name, artist(s), album art, and playback progress.
- **Logs:** Real-time logs are displayed within the GUI to provide feedback on application activities.
- **Automatic Unliking:** Songs skipped more than the configured threshold (default is 5 times) are automatically unliked.

## Configuration

Customize the application's behavior by adjusting settings in the **Settings** tab within the GUI. You can modify:

- **API Credentials:** `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI`
- **Log Level:** Adjust the verbosity of logs (`DEBUG`, `INFO`, `WARNING`, `ERROR`).
- **Skip Threshold:** Set the number of skips allowed before a song is automatically unliked.
- **Skip Progress Threshold:** Define the progress percentage at which a skip is considered early.
- **Appearance Mode:** Choose between `System`, `Dark`, or `Light` modes.
- **Color Theme:** Select from available themes, including the custom `NightTrain` theme.

## Project Structure

This overview also outlines the files and directories generated by the project which are not part of the source code.

```text
SpotifySkipTracker
├── .github
│   └── workflows
│       ├── codeql.yml
│       └── ruff.yml
├── logs
│   └── spotify_app.log
├── src
│   ├── gui
│   │   ├── home_tab.py
│   │   ├── skipped_tab.py
│   │   └── settings_tab.py
│   ├── app.py
│   ├── auth.py
│   ├── config_utils.py
│   ├── logging_config.py
│   ├── playback.py
│   └── utils.py
├── config.json
├── .gitignore
├── LICENSE
├── mypy.ini
├── README.md
├── requirements.txt
├── setup.py
└── skip_count.json
```

## Contributing

Contributions are welcome! To contribute to Spotify Skip Tracker:

1. **Fork the Repository:** Click the "Fork" button on the repository page.
2. **Create a Feature Branch:** `git checkout -b feature/YourFeatureName`
3. **Commit Your Changes:** `git commit -m "Add some feature"`
4. **Push to the Branch:** `git push origin feature/YourFeatureName`
5. **Open a Pull Request:** Submit a pull request explaining your changes.

## License

This project is licensed under the [MIT License](LICENSE). You are free to use, modify, and distribute this software as per the license terms.

## Additional Information

### Logging

- **Log Files:** Playback events and application logs are stored in `logs/spotify_app.log`.
- **Log Levels:** Configure the verbosity of logs through the settings (`DEBUG`, `INFO`, `WARNING`, `ERROR`).

### Themes

- **Default Themes:** The application comes with several built-in color themes.
- **Custom Themes:** You can create and apply custom themes by modifying the JSON files in `assets/themes/`.
- **NightTrain Theme:** A custom-built dark theme offering a sleek and modern look.

To apply a theme:

1. Navigate to the **Settings** tab.
2. Select your desired **Color Theme** from the dropdown menu.
3. Click **Save Settings**. Note that some theme changes may require restarting the application to take full effect.

---

Feel free to reach out with any questions or suggestions. Enjoy tracking your Spotify skips!
