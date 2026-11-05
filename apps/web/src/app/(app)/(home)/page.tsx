import type { Viewport } from "next";
import { resolve } from "@kinwoo/tokens";
import { HomeScreen } from "./HomeScreen";

// The home header is bg-muted, so the status bar should match it instead of the root background.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: resolve("muted", "light") },
    { media: "(prefers-color-scheme: dark)", color: resolve("muted", "dark") },
  ],
};

export default function HomePage() {
  return <HomeScreen />;
}
