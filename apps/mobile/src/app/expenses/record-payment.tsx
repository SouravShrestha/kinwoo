import { useActiveHouse } from "@kinwoo/client/houses";
import { useLocalSearchParams } from "expo-router";
import { useEffect } from "react";

import { RecordPaymentScreen } from "@/components/expenses/RecordPaymentScreen";
import { goHome } from "@/lib/house-navigation";

export default function RecordPaymentRoute() {
  const { userId } = useLocalSearchParams<{ userId?: string }>();
  const { activeHouse, ready } = useActiveHouse();

  useEffect(() => {
    if (ready && !activeHouse) goHome();
  }, [ready, activeHouse]);

  return activeHouse ? (
    <RecordPaymentScreen
      houseId={activeHouse.house.id}
      simplifyDebts={activeHouse.house.simplifyDebts}
      userId={userId ?? null}
    />
  ) : null;
}
