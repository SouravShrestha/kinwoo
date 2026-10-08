import { APP_NAME } from "@kinwoo/core/app";
import type { MetadataRoute } from "next";

/**
 * Generated rather than a static file so the colours stay tied to the tokens.
 * No service worker: this makes the app installable and chrome-free, not
 * offline-capable.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: "Everything shared. Nothing forgotten.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fefefe",
    theme_color: "#fefefe",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
