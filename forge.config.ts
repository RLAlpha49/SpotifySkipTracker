import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerDMG } from "@electron-forge/maker-dmg";
import { MakerDeb } from "@electron-forge/maker-deb";
import { VitePlugin } from "@electron-forge/plugin-vite";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { FuseV1Options, FuseVersion } from "@electron/fuses";
import { MakerZIP } from "@electron-forge/maker-zip";

const config: ForgeConfig = {
  packagerConfig: {
    executableName: "spotify-skip-tracker",
    asar: true,
    appCopyright: `Copyright © ${new Date().getFullYear()}`,
    icon: "./src/assets/SpotifySkipTrackerIconTransparent",
    appVersion: "1.0.0",
    buildVersion: "1.0.0",
    appBundleId: "com.rlapps.spotifyskiptracker",
    name: "Spotify Skip Tracker",
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      setupIcon: "./src/assets/SpotifySkipTrackerIconTransparent.ico",
      iconUrl:
        "https://raw.githubusercontent.com/RLAlpha49/SpotifySkipTracker/refs/heads/master/src/assets/SpotifySkipTrackerIconTransparent.ico",
      setupExe: "Spotify-Skip-Tracker-Setup.exe",
      noMsi: false,
      name: "SpotifySkipTracker",
      setupMsi: "Spotify-Skip-Tracker-Setup.msi",
    }),
    new MakerDMG(
      {
        name: "Spotify-Skip-Tracker",
        icon: "./src/assets/SpotifySkipTrackerIconTransparent.icns",
        format: "ULFO",
      },
      ["darwin"],
    ),
    new MakerZIP({}, ["darwin"]),
    new MakerDeb({
      options: {
        name: "spotify-skip-tracker",
        productName: "Spotify Skip Tracker",
        maintainer: "Alex Pettigrew",
        homepage: "https://github.com/RLAlpha49/spotify-skip-tracker",
        icon: "./src/assets/SpotifySkipTrackerIconTransparent.png",
        version: "1.0.0",
      },
    }),
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: "src/main.ts",
          config: "vite-config/vite.main.config.ts",
        },
        {
          entry: "src/preload.ts",
          config: "vite-config/vite.preload.config.ts",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite-config/vite.renderer.config.ts",
        },
      ],
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
