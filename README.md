# Spotify Skip Tracker

A desktop application that tracks your Spotify listening habits and identifies songs you frequently skip. Make data-driven decisions about which tracks to keep in your library.

## Features

- **Spotify Integration**: Securely connects to your Spotify account using OAuth
- **Real-time Monitoring**: Tracks your listening behavior as you use Spotify
- **Skip Detection**: Identifies when you skip tracks and records statistics
- **Configurable Thresholds**: Set custom thresholds for what counts as a skip
- **Library Management**: Optionally remove frequently skipped tracks from your library
- **Statistics Dashboard**: View your listening patterns over time
- **Cross-platform**: Works on Windows, macOS, and Linux

## Installation

### Prerequisites

- Node.js (v16 or later)
- npm or yarn
- A Spotify account
- Spotify Developer credentials (see below)

### Setup

1. Clone the repository:
   ```
   git clone https://github.com/RLAlpha49/spotify-skip-tracker.git
   cd spotify-skip-tracker
   ```

2. Install dependencies:
   ```
   npm install
   ```
   
3. Create a Spotify Developer Application:
   - Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/)
   - Create a new application
   - Set the redirect URI to `http://localhost:8888/callback`
   - Note your Client ID and Client Secret

4. Build the application:
   ```
   npm run make
   ```

5. Find the built application in the `out` directory

## Development

### Start in Development Mode

```
npm run start
```

This will run the application in development mode with hot reloading.

### Building for Production

```
npm run make
```

This will build the application for your current platform.

## Usage

1. Launch the application
2. Enter your Spotify Developer credentials (Client ID and Client Secret)
3. Authorize the application with your Spotify account
4. Configure your skip threshold settings
5. Start monitoring your Spotify playback
6. View statistics and make decisions about your library

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
