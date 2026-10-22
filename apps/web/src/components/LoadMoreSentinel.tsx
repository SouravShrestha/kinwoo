"use client";

import { useEffect, useRef } from "react";

const LOAD_MORE_MARGIN = "400px 0px";

// Re-observing on every change makes the observer report again, so a page that still leaves the
// sentinel on screen keeps loading.
export function LoadMoreSentinel({
  active,
  onLoadMore,
}: {
  active: boolean;
  onLoadMore: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || !active) return;

    const observer = new IntersectionObserver(
      (observed) => {
        if (observed.some((entry) => entry.isIntersecting)) onLoadMore();
      },
      { rootMargin: LOAD_MORE_MARGIN },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [active, onLoadMore]);

  return active ? <div ref={ref} aria-hidden="true" className="h-px" /> : null;
}
