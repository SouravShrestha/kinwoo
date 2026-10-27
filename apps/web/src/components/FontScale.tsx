"use client";

import { useEffect } from "react";

// iOS Dynamic Type "Large" body text is 17px; React Native scales text by size / 17.
const IOS_DEFAULT_BODY_PX = 17;

function readScale(): number {
  if (!CSS.supports("font", "-apple-system-body") || !matchMedia("(pointer: coarse)").matches) {
    return 1;
  }
  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;visibility:hidden;font:-apple-system-body";
  document.body.append(probe);
  const px = parseFloat(getComputedStyle(probe).fontSize);
  probe.remove();
  return px > 0 ? px / IOS_DEFAULT_BODY_PX : 1;
}

export function FontScale() {
  useEffect(() => {
    const apply = () =>
      document.documentElement.style.setProperty("--font-scale", `${readScale()}`);
    apply();
    window.addEventListener("focus", apply);
    window.addEventListener("resize", apply);
    document.addEventListener("visibilitychange", apply);
    return () => {
      window.removeEventListener("focus", apply);
      window.removeEventListener("resize", apply);
      document.removeEventListener("visibilitychange", apply);
    };
  }, []);

  return null;
}
