import { TOAST_MESSAGES } from "@kinwoo/core/toast";
import { toast } from "@kinwoo/client/toast";
import { onlineManager } from "@tanstack/react-query";

// Offline, Next falls back to a full page load, which public/sw.js answers from its cache by path
// (ignoring the query string) or else replaces the app with a standalone offline page.
let savedPaths = new Set<string>();

async function readSavedPaths(): Promise<void> {
  if (typeof caches === "undefined") return;
  const paths = new Set<string>();
  for (const name of await caches.keys()) {
    for (const request of await (await caches.open(name)).keys()) {
      paths.add(new URL(request.url).pathname);
    }
  }
  savedPaths = paths;
}

// The cache only grows while online, so a copy taken on going offline stays accurate.
export function trackSavedPages(): () => void {
  const refresh = () => void readSavedPaths().catch(() => {});
  refresh();
  return onlineManager.subscribe((online) => {
    if (!online) refresh();
  });
}

export function isOffline(): boolean {
  return !navigator.onLine || !onlineManager.isOnline();
}

/** Shows the offline toast and returns true when `href` cannot be opened offline. */
export function blockOfflineNavigation(href: string): boolean {
  if (!isOffline()) return false;
  const url = new URL(href, window.location.href);
  if (url.origin !== window.location.origin) return false;
  if (url.pathname === window.location.pathname && url.search === window.location.search) {
    return false;
  }
  if (savedPaths.has(url.pathname)) return false;
  // Navigation is not blocked because the service worker will handle it by redirecting to home.
  // Show the toast immediately so the user sees it before the redirect happens.
  toast.warning(TOAST_MESSAGES.offlineNoData);
  return true;
}
