"use client";

import { useActiveHouse } from "@kinwoo/client/houses";
import { routeRequiresHouse } from "@kinwoo/core/app";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Renders nothing on house-only routes once it is known there is no house, so blocked content
// never flashes before HouseGate redirects. While the house is still loading the screen renders
// and shows its own skeleton. A failed house fetch still shows the page.
export function HouseRequired({ children }: { children: ReactNode }) {
  const { activeHouse, ready, loadFailed } = useActiveHouse();
  const pathname = usePathname();

  if (routeRequiresHouse(pathname) && ready && !activeHouse && !loadFailed) return null;
  return children;
}
