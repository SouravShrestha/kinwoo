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
    bundleIdentifier: "me.cbsdev.kinwoo",
    supportsTablet: false,
    icon: "./assets/kinwoo.icon",
  },
  android: {
    package: "me.cbsdev.kinwoo",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#0e0e0e",
    },
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
