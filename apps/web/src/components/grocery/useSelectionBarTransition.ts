"use client";

import { useEffect, useState } from "react";

const EXIT_MS = 200;

// Keeps the bar mounted through its exit transition so it can fade out before unmounting.
export function useSelectionBarTransition(visible: boolean) {
  const [mounted, setMounted] = useState(visible);
  const [entered, setEntered] = useState(false);
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      // Two frames so the hidden state paints first and the transition has something to run from.
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setEntered(true));
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }

    const timer = setTimeout(() => {
      setMounted(false);
      setEntered(false);
    }, EXIT_MS);
    return () => clearTimeout(timer);
  }, [visible]);

  return { mounted, shown: visible && entered };
}
