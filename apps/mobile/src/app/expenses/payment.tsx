import { useActiveHouse } from "@kinwoo/client/houses";
import { useLocalSearchParams } from "expo-router";
import { useEffect } from "react";

import { PaymentDetailScreen } from "@/components/expenses/PaymentDetailScreen";
import { goHome } from "@/lib/house-navigation";

export default function PaymentRoute() {
  const { settlementId } = useLocalSearchParams<{ settlementId?: string }>();
  const { activeHouse, ready } = useActiveHouse();

  useEffect(() => {
    if (ready && !activeHouse) goHome();
  }, [ready, activeHouse]);

  return activeHouse ? (
    <PaymentDetailScreen houseId={activeHouse.house.id} settlementId={settlementId ?? null} />
  ) : null;
}
