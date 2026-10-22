import type { HouseMembership } from "@kinwoo/core/houses";
import { useEffect, useRef } from "react";

import { useActiveHouse } from "./active-house-provider";

// For screens that only make sense inside a house. Returns the membership once it is known to
// qualify; otherwise calls `onMissing` (a redirect) after the houses list has loaded, so a cold
// deep link is not bounced while the list is still in flight.
export function useRequireHouse(
  onMissing: () => void,
  { adminOnly = false }: { adminOnly?: boolean } = {},
): HouseMembership | null {
  const { activeHouse, ready } = useActiveHouse();

  const onMissingRef = useRef(onMissing);
  useEffect(() => {
    onMissingRef.current = onMissing;
  }, [onMissing]);

  const qualifies = activeHouse !== null && (!adminOnly || activeHouse.role === "admin");

  useEffect(() => {
    if (ready && !qualifies) onMissingRef.current();
  }, [ready, qualifies]);

  return qualifies ? activeHouse : null;
}
