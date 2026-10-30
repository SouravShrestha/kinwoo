import type { ExpoConfig } from "expo/config";
import { readFileSync } from "fs";
import path from "path";

const pkg = JSON.parse(readFileSync(path.join(__dirname, "../../package.json"), "utf8")) as {
  version: string;
};

export default (): ExpoConfig => ({
  name: "Kinwoo",
  slug: "kinwoo",
  version: pkg.version,
  orientation: "portrait",
  scheme: "kinwoo",
  userInterfaceStyle: "automatic",
  icon: "./assets/icon.png",
  ios: {
    bundleIdentifier: "in.kinwoo.app",
    supportsTablet: false,
    icon: "./assets/kinwoo.icon",
  },
  android: {
    package: "in.kinwoo.app",
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#0e0e0e",
    },
    // Only screens that exist in the app. /auth, /legal, /feedback and /api stay in the browser,
    // and web OAuth finishes on /auth/callback there.
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        category: ["BROWSABLE", "DEFAULT"],
        data: [
          { scheme: "https", host: "app.kinwoo.in", path: "/" },
          ...[
            "/join",
            "/house",
            "/expense",
            "/expenses",
            "/item",
            "/bills",
            "/tasks",
            "/activities",
            "/notifications",
            "/profile",
            "/login",
          ].map((pathPrefix) => ({ scheme: "https", host: "app.kinwoo.in", pathPrefix })),
        ],
      },
    ],
  },
  plugins: [
    "expo-router",
    "expo-font",
    [
      "expo-splash-screen",
      {
        image: "./assets/splash-icon-black.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#fefefe",
        dark: {
          image: "./assets/splash-icon-white.png",
          resizeMode: "contain",
          backgroundColor: "#0e0e0e",
        },
      },
    ],
    "expo-status-bar",
    "expo-web-browser",
    ["expo-image-picker", { photosPermission: "Kinwoo uses your photos to set your avatar." }],
    // Mods run last-registered first, so this must stay before expo-notifications.
    "./plugins/no-aps-entitlement.js",
    [
      "expo-notifications",
      { icon: "./assets/notification-icon.png", color: "#4e8e60", defaultChannel: "default" },
    ],
    [
      "expo-camera",
      {
        cameraPermission: "Kinwoo uses the camera to scan a house invite QR code.",
        recordAudioAndroid: false,
      },
    ],
    // iOS 27 aborts launch without the UIScene lifecycle. Remove on SDK 58, where it is default.
    ["expo-build-properties", { ios: { enableSceneSupport: true, usePrecompiledModules: false } }],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: "4cdd8480-fc5c-46ca-9b18-2b64ccd47297",
    },
  },
});
