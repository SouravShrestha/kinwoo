import { useActiveHouse } from "@kinwoo/client/houses";
import { useEffect } from "react";

import { TotalsScreen } from "@/components/expenses/TotalsScreen";
import { goHome } from "@/lib/house-navigation";

export default function TotalsRoute() {
  const { activeHouse, ready } = useActiveHouse();
  const houseId = activeHouse?.house.id ?? null;

  useEffect(() => {
    if (ready && !activeHouse) goHome();
  }, [ready, activeHouse]);

  return houseId ? <TotalsScreen houseId={houseId} /> : null;
}
