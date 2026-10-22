import { useActiveHouse } from "@kinwoo/client/houses";
import { useEffect } from "react";

import { MemberBalances } from "@/components/expenses/MemberBalances";
import { goHome } from "@/lib/house-navigation";

export default function BalancesRoute() {
  const { activeHouse, ready } = useActiveHouse();
  const houseId = activeHouse?.house.id ?? null;

  useEffect(() => {
    if (ready && !activeHouse) goHome();
  }, [ready, activeHouse]);

  return houseId ? <MemberBalances houseId={houseId} /> : null;
}
