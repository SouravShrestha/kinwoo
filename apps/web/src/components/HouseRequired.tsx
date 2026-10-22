"use client";

import { useActiveHouse } from "@kinwoo/client/houses";
import { routeRequiresHouse } from "@kinwoo/core/app";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Renders nothing on house-only routes until a house is confirmed, so blocked content never
// flashes before HouseGate redirects. A failed house fetch still shows the page.
export function HouseRequired({ children }: { children: ReactNode }) {
  const { activeHouse, loadFailed } = useActiveHouse();
  const pathname = usePathname();

  if (routeRequiresHouse(pathname) && !activeHouse && !loadFailed) return null;
  return children;
}
