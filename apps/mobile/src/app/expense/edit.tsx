import { useExpense } from "@kinwoo/client/expenses";
import { useActiveHouse, useHouseMembers } from "@kinwoo/client/houses";
import { useLocalSearchParams } from "expo-router";
import { useEffect } from "react";

import { ExpenseFormScreen } from "@/components/expenses/ExpenseFormScreen";
import { ExpenseFormPageSkeleton } from "@/components/skeleton/skeletons";
import { goHome } from "@/lib/house-navigation";

export default function EditExpenseRoute() {
  const { expenseId } = useLocalSearchParams<{ expenseId?: string }>();
  const { activeHouse, ready } = useActiveHouse();
  const houseId = activeHouse?.house.id ?? null;
  const { data: expense, isError } = useExpense(houseId, expenseId ?? null);
  const { data: members } = useHouseMembers(houseId);

  useEffect(() => {
    if ((ready && !activeHouse) || !expenseId || isError) goHome();
  }, [ready, activeHouse, expenseId, isError]);

  // The form seeds its payer and split state on mount, so it waits for both.
  if (!houseId || !expense || !members) return <ExpenseFormPageSkeleton title="Edit expense" />;
  return <ExpenseFormScreen houseId={houseId} expense={expense} />;
}
