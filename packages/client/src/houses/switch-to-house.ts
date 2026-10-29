import { useCallback, useEffect, useMemo, useRef } from "react";

import { useActiveHouse } from "./active-house-provider";

// For notifications, which can come from any of the person's houses. A house they have left is
// ignored, so the current one stays. Stable across renders, so push handlers don't re-run.
export function useSwitchToHouse() {
  const { houses, setActiveHouse } = useActiveHouse();
  const housesRef = useRef(houses);

  useEffect(() => {
    housesRef.current = houses;
  }, [houses]);

  return useCallback(
    (houseId: string | null | undefined) => {
      if (houseId && housesRef.current.some((membership) => membership.house.id === houseId)) {
        setActiveHouse(houseId);
      }
    },
    [setActiveHouse],
  );
}

// Only with several houses, so a one-house list stays unlabelled.
export function useHouseNames(): Map<string, string> | undefined {
  const { houses } = useActiveHouse();
  return useMemo(
    () =>
      houses.length < 2 ? undefined : new Map(houses.map(({ house }) => [house.id, house.name])),
    [houses],
  );
}
