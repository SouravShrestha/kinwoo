import { useActiveHouse } from "@kinwoo/client/houses";
import { useEffect } from "react";

import { PrivateSpending } from "@/components/expenses/PrivateSpending";
import { goHome } from "@/lib/house-navigation";

export default function PrivateSpendingRoute() {
  const { activeHouse, ready } = useActiveHouse();
  const houseId = activeHouse?.house.id ?? null;

  useEffect(() => {
    if (ready && !activeHouse) goHome();
  }, [ready, activeHouse]);

  return houseId ? <PrivateSpending houseId={houseId} /> : null;
}
