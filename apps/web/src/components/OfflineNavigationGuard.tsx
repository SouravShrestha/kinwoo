"use client";

import { useEffect } from "react";

import { blockOfflineNavigation, trackSavedPages } from "@/lib/offline-pages";

// Link clicks to a page with no saved copy are stopped before Next starts navigating: once its
// full-page fallback begins, the router stays suspended even if the load is cancelled.
export function OfflineNavigationGuard() {
  useEffect(() => {
    const stopTracking = trackSavedPages();
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || !(event.target instanceof Element)) return;
      const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || (anchor.target && anchor.target !== "_self")) return;
      if (anchor.hasAttribute("download")) return;
      if (!blockOfflineNavigation(anchor.href)) return;
      event.preventDefault();
      event.stopPropagation();
    };

    document.addEventListener("click", onClick, true);
    return () => {
      stopTracking();
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  return null;
}
