<div align="center">

![SpotifySkipTrackerIconTransparent](https://github.com/user-attachments/assets/4023e57b-64b6-4b60-a369-42290dc887ab)

# Spotify Skip Tracker

</div>

## What is Spotify Skip Tracker?

Spotify Skip Tracker is a desktop application that analyzes your Spotify listening habits, with a focus on identifying songs you frequently skip. It helps you maintain a cleaner music library by providing insights into which tracks you consistently skip over.

## Key Features

- **Real-time Skip Tracking**: Monitors your Spotify playback in real-time and logs when you skip tracks
- **Skip Pattern Analysis**: Identifies songs you frequently skip based on customizable thresholds
- **Library Management**: Offers tools to remove frequently skipped tracks from your library
- **Auto-Unlike Option**: Automatically removes tracks that exceed your skip threshold
- **Statistics Dashboard**: Visualizes your listening and skipping patterns
- **Now Playing Card**: Displays your current playback with progress bar and controls
- **Activity Logs**: Detailed logging of all application activities

![Dashboard Screenshot](https://github.com/user-attachments/assets/d9ad8827-4e35-4a08-a6d3-9e04c8b750b6)

## How It Works

1. Connect your Spotify account securely via OAuth
2. The app monitors your listening habits in the background
3. When you skip a track, the app records this action
4. Over time, patterns emerge showing which tracks you consistently skip
5. You can review these tracks and decide which to keep or remove

![Skipped Tracks Screenshot](https://github.com/user-attachments/assets/8e8b522e-d1f0-4c4a-ad93-9abc89665c09)

## Getting Started

### Installation

1. Download the latest release for your operating system from the [Releases page](https://github.com/RLAlpha49/spotify-skip-tracker/releases)
2. Install the application by running the installer
3. Launch Spotify Skip Tracker

### Setup

1. Create a Spotify Developer Application:
   - Visit the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/)
   - Create a new application
   - Set the redirect URI to `http://localhost:8888/callback`
   - Note your Client ID and Client Secret

2. Enter your Spotify API credentials in the app settings
3. Authorize the application with your Spotify account
4. Configure your preferences in the Settings page:
   - Skip detection threshold
   - Analysis timeframe
   - Auto-unlike options
   - Log management

![Settings Screenshot](https://github.com/user-attachments/assets/241ec532-b2b3-4a55-b19d-2f365d0581e5)

## Usage Tips

- **Skip Threshold**: Adjust the number of skips that trigger identification (default: 3)
- **Timeframe**: Set the analysis period in days (default: 30 days)
- **Auto-Unlike**: Enable to automatically remove tracks exceeding your skip threshold
- **Skip Progress**: Configure what percentage of a track must be played before skipping counts

## For Developers

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

## License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/RLAlpha49/SpotifySkipTracker/blob/master/LICENSE) file for details.
