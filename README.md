<div align="center">

![SpotifySkipTrackerIconTransparent](https://github.com/user-attachments/assets/4023e57b-64b6-4b60-a369-42290dc887ab)

# Spotify Skip Tracker

Track, analyze, and refine your music library automatically

[![GitHub license](https://img.shields.io/github/license/RLAlpha49/SpotifySkipTracker?style=flat-square)](https://github.com/RLAlpha49/SpotifySkipTracker/blob/master/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/RLAlpha49/SpotifySkipTracker?style=flat-square)](https://github.com/RLAlpha49/SpotifySkipTracker/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/RLAlpha49/SpotifySkipTracker?style=flat-square)](https://github.com/RLAlpha49/SpotifySkipTracker/issues)

</div>

## 🎵 Overview

Spotify Skip Tracker is a desktop application that analyzes your Spotify listening habits, with a focus on identifying songs you frequently skip. It helps you maintain a cleaner music library by providing insights into which tracks you consistently skip over and offers tools to help manage your library based on your actual listening behavior.

![Dashboard Screenshot](https://github.com/user-attachments/assets/7eac6386-d99e-4191-8f2c-9f8c659f3ad8)

## ✨ Key Features

- **Real-time Skip Tracking**: Monitors your Spotify playback in real-time and detects when you skip tracks
- **Skip Pattern Analysis**: Identifies songs you frequently skip based on customizable thresholds
- **Library Management**: Offers tools to remove frequently skipped tracks from your library
- **Auto-Unlike Option**: Automatically removes tracks that exceed your skip threshold
- **Statistics Dashboard**: Visualizes your listening and skipping patterns with beautiful charts
- **Now Playing Integration**: Control your Spotify playback directly from the app
- **Advanced Analytics**: Track listening time, discovery rate, repeat rate, and more
- **Modern UI/UX**: Clean, responsive interface with light and dark themes

![Skipped Tracks Screenshot](https://github.com/user-attachments/assets/83a4245e-c89e-45b8-9a29-4616886f7b46)

## 📊 Analytics & Insights

Spotify Skip Tracker doesn't just track skips - it provides comprehensive analytics on your listening habits:

- **Skip Rate Analysis**: Understand which tracks, artists, and genres you skip most frequently
- **Listening Patterns**: Visualize your listening habits by time of day, day of week, and more
- **Artist & Track Insights**: See detailed statistics for your most-played artists and tracks
- **Device Usage**: Track which devices you use most frequently for listening

![Statistics Dashboard](https://github.com/user-attachments/assets/2dd977ba-6d09-4122-8d71-02f24edaa816)

## 🚀 Getting Started

### Installation

Download the latest release for your operating system from the [Releases page](https://github.com/RLAlpha49/spotify-skip-tracker/releases).

#### Windows

- Download `Spotify-Skip-Tracker-Setup.exe` or `Spotify-Skip-Tracker-Setup.msi`
- Run the installer and follow the prompts
- Once installed, launch Spotify Skip Tracker from the Start Menu or desktop shortcut

#### macOS

- Download `Spotify-Skip-Tracker.dmg` (recommended)
  - Open the DMG file
  - Drag the application to your Applications folder
  - Right-click the app and select "Open" (required the first time to bypass Gatekeeper security)
- Or download `Spotify Skip Tracker-darwin-arm64.zip` (alternative)
  - Extract the ZIP file
  - Move the extracted application to your Applications folder
  - Right-click the app and select "Open" (required the first time to bypass Gatekeeper security)

#### Linux

- Download `spotify-skip-tracker_1.0.0_amd64.deb` for Debian-based distributions (Ubuntu, Mint, etc.)
- Install using your package manager:

  ```bash
  sudo dpkg -i spotify-skip-tracker_1.0.0_amd64.deb
  sudo apt-get install -f  # Install dependencies if needed
  ```

- Launch from your applications menu or run `spotify-skip-tracker` in the terminal

### Platform Notes

> ⚠️ **Important**: This application was primarily developed and tested on Windows. The Linux and macOS versions may have platform-specific issues that haven't been identified yet. If you encounter any bugs or unexpected behavior on any platform (especially macOS or Linux), please [open an issue](https://github.com/RLAlpha49/spotify-skip-tracker/issues) with details about your operating system and the problem you're experiencing.

## 🔧 Setup

1. Create a Spotify Developer Application:
   - Visit the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/)
   - Create a new application
   - Set the redirect URI to `http://localhost:8888/callback`
   - Note your Client ID and Client Secret

2. Enter your Spotify API credentials in the app settings
3. Authorize the application with your Spotify account
4. Configure your preferences in the Settings page

![Settings Screenshot](https://github.com/user-attachments/assets/13e2f2cd-050b-484b-824a-11d3def54a0e)

## ⚙️ Customization Options

Spotify Skip Tracker offers various configuration options to tailor the experience to your preferences:

- **Skip Detection**:
  - Set the threshold percentage of a track that must be played before skipping counts
  - Configure the minimum number of skips before a track is flagged
  
- **Library Management**:
  - Enable/disable automatic removal of frequently skipped tracks
  - Set the analysis timeframe for determining skip patterns

- **User Interface**:
  - Choose between light and dark themes
  - Customize the home screen layout

- **Logging**:
  - Configure log retention settings
  - Set log level detail (DEBUG, INFO, WARNING, etc.)
  - View and search detailed activity logs

## 🤔 How It Works

1. **Authentication**: Securely connect to your Spotify account via OAuth
2. **Monitoring**: The app runs in the background, monitoring your Spotify playback
3. **Skip Detection**: When you skip a track, the app records this action along with contextual data
4. **Pattern Analysis**: Over time, algorithms identify which tracks you consistently skip
5. **Insights Generation**: Statistics and visualizations help you understand your listening habits
6. **Library Management**: Tools allow you to review and manage frequently skipped tracks

## 💻 For Developers

If you want to contribute to the project or run it in development mode:

### Prerequisites

- Node.js (v22 or later)
- npm or yarn
- Spotify Developer credentials

### Development Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/RLAlpha49/spotify-skip-tracker.git
   cd spotify-skip-tracker
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start in development mode:

   ```bash
   npm run start
   ```

### Building for Production

```bash
npm run make
```

## 📝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add some amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/RLAlpha49/spotify-skip-tracker/blob/master/LICENSE) file for details.
