import { useActiveHouse } from "@kinwoo/client/houses";
import { useLocalSearchParams } from "expo-router";
import { useEffect } from "react";

import { RecordPaymentScreen } from "@/components/expenses/RecordPaymentScreen";
import { goHome } from "@/lib/house-navigation";

export default function RecordPaymentRoute() {
  const { payerId, payeeId, amountPaise } = useLocalSearchParams<{
    payerId?: string;
    payeeId?: string;
    amountPaise?: string;
  }>();
  const { activeHouse, ready } = useActiveHouse();
  const suggested = Number.parseInt(amountPaise ?? "", 10);

  useEffect(() => {
    if (ready && !activeHouse) goHome();
  }, [ready, activeHouse]);

  return activeHouse ? (
    <RecordPaymentScreen
      houseId={activeHouse.house.id}
      payerId={payerId ?? null}
      payeeId={payeeId ?? null}
      amountPaise={Number.isSafeInteger(suggested) ? suggested : 0}
    />
  ) : null;
}
