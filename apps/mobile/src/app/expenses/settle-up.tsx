import { useActiveHouse } from "@kinwoo/client/houses";
import { useEffect } from "react";

import { SettleUpScreen } from "@/components/expenses/SettleUpScreen";
import { goHome } from "@/lib/house-navigation";

export default function SettleUpRoute() {
  const { activeHouse, ready } = useActiveHouse();

  useEffect(() => {
    if (ready && !activeHouse) goHome();
  }, [ready, activeHouse]);

  return activeHouse ? (
    <SettleUpScreen
      houseId={activeHouse.house.id}
      simplifyDebts={activeHouse.house.simplifyDebts}
    />
  ) : null;
}
