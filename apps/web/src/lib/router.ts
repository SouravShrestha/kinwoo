"use client";

import { useRouter as useNextRouter } from "next/navigation";
import { useMemo } from "react";

import { blockOfflineNavigation } from "./offline-pages";

// Use instead of next/navigation's useRouter, so offline navigation to an unsaved page shows a
// toast instead of the service worker's standalone offline page.
export function useRouter(): ReturnType<typeof useNextRouter> {
  const router = useNextRouter();
  return useMemo(
    () => ({
      ...router,
      push: (href, options) => {
        if (!blockOfflineNavigation(href)) router.push(href, options);
      },
      replace: (href, options) => {
        if (!blockOfflineNavigation(href)) router.replace(href, options);
      },
    }),
    [router],
  );
}
