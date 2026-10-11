import { rejectHouseRequired, useHouseAccess } from "@kinwoo/client/houses";
import { routeRequiresHouse } from "@kinwoo/core/app";
import { router, usePathname } from "expo-router";
import { useEffect } from "react";

export function HouseGate() {
  const { hasNoHouse } = useHouseAccess();
  const pathname = usePathname();

  const blocked = hasNoHouse && routeRequiresHouse(pathname);

  useEffect(() => {
    if (blocked) rejectHouseRequired(pathname, () => router.navigate("/"));
  }, [blocked, pathname]);

  return null;
}
