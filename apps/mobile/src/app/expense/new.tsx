import { useActiveHouse } from "@kinwoo/client/houses";
import { useEffect } from "react";

import { ExpenseFormScreen } from "@/components/expenses/ExpenseFormScreen";
import { ExpenseFormPageSkeleton } from "@/components/skeleton/skeletons";
import { goHome } from "@/lib/house-navigation";

export default function NewExpenseRoute() {
  const { activeHouse, ready } = useActiveHouse();
  const houseId = activeHouse?.house.id ?? null;

  useEffect(() => {
    if (ready && !activeHouse) goHome();
  }, [ready, activeHouse]);

  if (!houseId) return <ExpenseFormPageSkeleton />;
  return <ExpenseFormScreen houseId={houseId} />;
}
