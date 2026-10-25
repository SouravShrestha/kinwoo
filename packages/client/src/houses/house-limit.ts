import { canAddHouse, houseErrorMessage } from "@kinwoo/core/houses";
import { useState } from "react";

import { useBusyWhile } from "../activity";
import { useActiveHouse } from "./active-house-provider";

// Decided once, when the houses list first loads, and then kept. Creating or joining a house
// fills the limit, and re-deciding would swap the screen for the limit notice mid-navigation.
export function useHouseLimit() {
  const { houses, ready } = useActiveHouse();
  const [blocked, setBlocked] = useState<boolean | null>(null);

  if (ready && blocked === null) setBlocked(!canAddHouse(houses.length));

  const checking = blocked === null;
  useBusyWhile(checking);

  return { checking, blocked: blocked === true, message: houseErrorMessage("HOUSE_LIMIT_REACHED") };
}
