"use client";

import { rejectHouseRequired, useHouseAccess } from "@kinwoo/client/houses";
import { routeRequiresHouse } from "@kinwoo/core/app";
import { usePathname } from "next/navigation";
import { useRouter } from "@/lib/router";
import { useEffect } from "react";

export function HouseGate() {
  const { hasNoHouse } = useHouseAccess();
  const pathname = usePathname();
  const router = useRouter();

  const blocked = hasNoHouse && routeRequiresHouse(pathname);

  useEffect(() => {
    if (blocked) rejectHouseRequired(pathname, () => router.replace("/"));
  }, [blocked, pathname, router]);

  return null;
}
