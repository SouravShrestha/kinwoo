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
        image: "./assets/splash-icon.png",
        resizeMode: "contain",
        backgroundColor: "#fefefe",
        dark: {
          image: "./assets/splash-icon.png",
          resizeMode: "contain",
          backgroundColor: "#0e0e0e",
        },
      },
    ],
    "expo-status-bar",
    "expo-web-browser",
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: "YOUR_EAS_PROJECT_ID",
    },
  },
});
