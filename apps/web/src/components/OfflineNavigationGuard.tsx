"use client";

import { TOAST_MESSAGES } from "@kinwoo/core/toast";
import { onlineManager } from "@tanstack/react-query";
import { useEffect } from "react";

import { toast } from "@kinwoo/client/toast";

const INTERACTIVE_LINK = "a[href]";

export function isOffline(): boolean {
  return (typeof navigator !== "undefined" && !navigator.onLine) || !onlineManager.isOnline();
}

function isSameOriginNavigation(anchor: HTMLAnchorElement): boolean {
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;

  const url = new URL(anchor.href, window.location.href);
  return (
    url.origin === window.location.origin &&
    (url.pathname !== window.location.pathname || url.search !== window.location.search)
  );
}

/**
 * Prevents an offline click from becoming a document navigation. Without this, the service
 * worker's last-resort offline response replaces the current app with a standalone error page.
 */
export function OfflineNavigationGuard() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!isOffline() || !(event.target instanceof Element)) return;
      const anchor = event.target.closest<HTMLAnchorElement>(INTERACTIVE_LINK);
      if (!anchor || !isSameOriginNavigation(anchor)) return;

      event.preventDefault();
      event.stopPropagation();
      toast.warning(TOAST_MESSAGES.offline);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
