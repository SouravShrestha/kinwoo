"use client";

import { useEffect } from "react";

const INTERACTIVE = "button, a[href], summary, [role='button'], [role='radio'], [role='tab']";
const OPT_OUT = "[data-allow-double-click]";

// Capture phase on document so the repeat click is dropped before React handlers or Next's
// Link see it. `detail` is the OS click count; keyboard activation reports 0 and is unaffected.
export function DoubleClickGuard() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.detail < 2 || !(event.target instanceof Element)) return;
      if (!event.target.closest(INTERACTIVE) || event.target.closest(OPT_OUT)) return;
      event.preventDefault();
      event.stopPropagation();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
