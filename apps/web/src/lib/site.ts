import { siteUrlFromEnv } from "@kinwoo/core";

// Browser-only: falls back to the page's own origin when no site URL is configured.
export function siteOrigin(): string {
  return siteUrlFromEnv() ?? window.location.origin;
}
