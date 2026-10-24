"use client";

import { useEffect } from "react";

import { CATEGORY_IMAGE_SRCS } from "@/lib/category-images";

// Warms the HTTP cache once the page is idle so pickers and lists open without images popping in,
// without competing with the critical path the way <link rel="preload"> would.
export function PreloadCategoryImages() {
  useEffect(() => {
    const load = () =>
      CATEGORY_IMAGE_SRCS.forEach((src) => {
        new window.Image().src = src;
      });
    if (!("requestIdleCallback" in window)) {
      const timer = setTimeout(load, 1500);
      return () => clearTimeout(timer);
    }
    const handle = window.requestIdleCallback(load);
    return () => window.cancelIdleCallback(handle);
  }, []);

  return null;
}
