import { siteUrlFromEnv } from "@kinwoo/core";

// Invite links point at the web app, which also serves the /join fallback page. The API URL is
// that same origin, so it stands in when no dedicated site URL is configured.
export function siteOrigin(): string {
  return siteUrlFromEnv() ?? process.env.EXPO_PUBLIC_API_URL ?? "";
}
