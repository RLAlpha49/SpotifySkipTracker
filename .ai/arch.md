# Architecture for Spotify Skip Tracker

Status: Approved

## Technical Summary

Spotify Skip Tracker is a cross-platform desktop application built using Electron and React with TypeScript. The application follows a multi-process architecture with separate main (Electron/Node.js) and renderer (React/Browser) processes. The main process handles Spotify API integration, playback monitoring, and data persistence, while the renderer process manages the user interface and data visualization. Communication between processes is facilitated through Electron's IPC mechanism. The application employs a component-based architecture with React for the UI, and leverages modern libraries such as Tailwind CSS, Radix UI, and Recharts for styling and visualization.

## Technology Table

| Technology      | Description                                      |
| --------------- | ------------------------------------------------ |
| Electron        | Cross-platform desktop application framework     |
| React           | UI library for building the user interface       |
| TypeScript      | Programming language for type-safe JavaScript    |
| Vite            | Build tool and development server                |
| Tailwind CSS    | Utility-first CSS framework for styling          |
| Radix UI        | Accessible component primitives                  |
| shadcn/ui       | Component library built on Radix UI and Tailwind |
| Recharts        | Charting library for data visualization          |
| Spotify Web API | API for Spotify integration                      |
| Electron Store  | Persistent storage for application data          |
| React Router    | Routing library for navigation                   |
| Vitest          | Testing framework                                |
| Zod             | TypeScript-first schema validation               |
| React Hook Form | Form handling library                            |

## Architectural Diagrams

### High-Level Architecture

```mermaid
graph TD
    A[Desktop App] --> B[Electron Main Process]
    A --> C[Electron Renderer Process]
    B --> D[Spotify API Client]
    B --> E[Local Data Storage]
    C --> F[React UI Components]
    F --> G[Dashboard Views]
    F --> H[Settings UI]
    F --> I[Library Management UI]
    D --> J[Spotify Web API]
    E --> K[Skip Analytics Engine]
```

### Process Separation

```mermaid
graph LR
    A[Main Process<br/>Electron/Node.js] <-->|IPC| B[Renderer Process<br/>React/Browser]
    A --> C[System Integration]
    A --> D[Spotify API]
    A --> E[Data Storage]
    B --> F[UI Components]
    B --> G[State Management]
    B --> H[Data Visualization]
```

### Application Flow

```mermaid
sequenceDiagram
    participant U as User
    participant R as Renderer Process
    participant M as Main Process
    participant S as Spotify API
    participant D as Local Database

    U->>R: Launch Application
    R->>M: Request Authentication Status
    M->>D: Check Saved Tokens
    alt No Valid Token
        M->>R: Authentication Required
        R->>U: Display Login Screen
        U->>R: Enter Spotify Credentials
        R->>M: Forward Credentials
        M->>S: Request Authentication
        S->>M: Return Tokens
        M->>D: Store Tokens
    else Token Available
        M->>R: Authentication Successful
    end
    R->>U: Display Dashboard

    loop Playback Monitoring
        M->>S: Poll Current Playback
        S->>M: Return Playback State
        M->>M: Detect Track Changes/Skips
        M->>D: Record Skip Data
        M->>R: Update UI with State
        R->>U: Display Current Track/Stats
    end

    U->>R: Request Skip Statistics
    R->>M: Fetch Skip Data
    M->>D: Query Skip Analytics
    D->>M: Return Analysis
    M->>R: Send Visualization Data
    R->>U: Display Charts and Insights
```

## Data Models, API Specs, Schemas, etc

### Track Skip Data Schema

```json
{
  "track_id": "string",
  "track_name": "string",
  "artist_name": "string",
  "album_name": "string",
  "skip_timestamp": "datetime",
  "play_duration_ms": "number",
  "track_duration_ms": "number",
  "skip_percentage": "number",
  "context": {
    "type": "string",
    "source": "string",
    "device_id": "string"
  }
}
```

### Settings Schema

```json
{
  "skipDetection": {
    "thresholdPercentage": "number",
    "minimumSkips": "number"
  },
  "libraryManagement": {
    "autoRemove": "boolean",
    "analysisTimeframe": "string"
  },
  "userInterface": {
    "theme": "string",
    "chartColors": "string[]"
  },
  "spotify": {
    "clientId": "string",
    "refreshToken": "string"
  }
}
```

### Spotify Authentication Flow

```json
{
  "authorizationUrl": "https://accounts.spotify.com/authorize",
  "tokenUrl": "https://accounts.spotify.com/api/token",
  "redirectUri": "http://localhost:8888/callback",
  "scopes": [
    "user-read-private",
    "user-read-email",
    "user-read-playback-state",
    "user-modify-playback-state",
    "user-library-read",
    "user-library-modify"
  ]
}
```

## Project Structure

```text
spotify-skip-tracker/
├── src/
│   ├── assets/              # Static assets and images
│   ├── components/          # Reusable UI components
│   │   ├── ui/              # shadcn components (Radix UI + Tailwind)
│   │   ├── statistics/      # Components for visualization and statistics
│   │   ├── skippedTracks/   # Components for skipped tracks display
│   │   ├── spotify/         # Spotify-specific UI components
│   │   └── settings/        # Settings form components
│   │
│   ├── electron/            # Electron-specific code
│   │   ├── main/            # Main process modules
│   │   │   ├── spotify-ipc.ts     # IPC handlers for Spotify API
│   │   │   ├── window.ts          # Window management
│   │   │   ├── extensions.ts      # Dev extensions installer
│   │   │   └── installer-events.ts # Windows installer handlers
│   │   └── main.ts          # Main process entry point
│   │
│   ├── helpers/             # Helper utilities
│   │
│   ├── layouts/             # Page layout components
│   │   └── MainLayout.tsx   # Primary application layout
│   │
│   ├── pages/               # Page components (route destinations)
│   │   ├── HomePage.tsx          # Dashboard/main view
│   │   ├── SkippedTracksPage.tsx # Skipped tracks list view
│   │   ├── StatisticsPage.tsx    # Statistics and charts view
│   │   └── SettingsPage.tsx      # Application settings view
│   │
│   ├── routes/              # Routing configuration
│   │   ├── routes.tsx       # Route definitions
│   │   ├── router.tsx       # Router setup
│   │   └── __root.tsx       # Root layout wrapper
│   │
│   ├── services/            # API and business logic services
│   │   ├── auth/            # Authentication services
│   │   ├── playback/        # Playback monitoring modules
│   │   │   ├── monitor.ts       # Playback monitoring logic
│   │   │   ├── track-change.ts  # Track change detection
│   │   │   ├── state.ts         # Playback state management
│   │   │   ├── history.ts       # Playback history tracking
│   │   │   └── index.ts         # Service exports
│   │   ├── spotify/         # Spotify API integration
│   │   ├── spotify.service.ts # Renderer-side Spotify service
│   │   ├── token-storage.ts # Token management service
│   │   └── api-retry.ts     # API retry logic
│   │
│   ├── styles/              # Global styles and Tailwind config
│   │
│   ├── tests/               # Test files
│   │
│   ├── types/               # TypeScript type definitions
│   │
│   ├── utils/               # Utility functions
│   │
│   ├── App.tsx              # Main React component
│   ├── main.ts              # Application entry point
│   ├── preload.ts           # Electron preload script
│   ├── renderer.ts          # Renderer process entry point
│   └── types.d.ts           # Global type definitions
│
├── vite-config/            # Vite configuration files
├── config/                 # Project configuration files
├── test-results/           # Test results output
└── public/                 # Static public assets
```

## Infrastructure

The application is designed to run locally on users' machines and does not require server-side infrastructure. All data processing and storage happen locally on the user's device. The application leverages Electron's cross-platform capabilities to support Windows, macOS, and Linux operating systems.

Key infrastructure considerations include:

1. **Local Storage**: Uses Electron Store for efficient local data persistence
2. **Authentication**: OAuth flow with Spotify, securely storing refresh tokens
3. **Cross-Platform Compatibility**: Ensuring consistent performance across operating systems
4. **Offline Functionality**: Providing access to stored statistics when no internet connection is available
5. **Resource Usage**: Minimizing CPU and memory consumption during background monitoring

## Deployment Plan

The application will be packaged and distributed using Electron Forge, which provides a streamlined way to create installable binaries for different operating systems.

### Build Process

1. **Development**:

   - Use Vite dev server for rapid development
   - Hot module replacement for quick feedback
   - Environment-specific configuration via `.env` files

2. **Testing**:

   - Unit tests with Vitest
   - Component tests with React Testing Library
   - End-to-end tests with Playwright

3. **Packaging**:
   - Electron Forge for creating platform-specific builds
   - Code signing for macOS and Windows distributions
   - Auto-update mechanism for distributing updates

### Distribution Channels

1. **Github Releases**: Primary distribution channel
2. **Website Downloads**: Direct downloads from project website
3. **Package Managers**: Consider distribution via Homebrew, Chocolatey, or Snap

## Change Log

| Change        | Story ID | Description                         |
| ------------- | -------- | ----------------------------------- |
| Initial draft | N/A      | Initial draft architecture document |
