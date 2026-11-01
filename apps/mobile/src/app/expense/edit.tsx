import { useExpense } from "@kinwoo/client/expenses";
import { usePrivateExpense } from "@kinwoo/client/grocery";
import { useActiveHouse, useHouseMembers } from "@kinwoo/client/houses";
import { useLocalSearchParams } from "expo-router";
import { useEffect } from "react";

import { ExpenseFormScreen } from "@/components/expenses/ExpenseFormScreen";
import { ExpenseFormPageSkeleton } from "@/components/skeleton/skeletons";
import { goHome } from "@/lib/house-navigation";

export default function EditExpenseRoute() {
  const { expenseId, private: privateParam } = useLocalSearchParams<{
    expenseId?: string;
    private?: string;
  }>();
  const isPrivate = privateParam === "1";
  const { activeHouse, ready } = useActiveHouse();
  const houseId = activeHouse?.house.id ?? null;
  const shared = useExpense(houseId, isPrivate ? null : (expenseId ?? null));
  const own = usePrivateExpense(isPrivate ? houseId : null, isPrivate ? (expenseId ?? null) : null);
  const expense = isPrivate ? own.expense : shared.data;
  const isError = isPrivate ? own.isError : shared.isError;
  const { data: members, isError: membersError } = useHouseMembers(houseId);
  const loadFailed = isError || (membersError && !members);

  useEffect(() => {
    if ((ready && !activeHouse) || !expenseId || loadFailed) goHome();
  }, [ready, activeHouse, expenseId, loadFailed]);

  // The form seeds its payer and split state on mount, so it waits for both.
  if (!houseId || !expense || !members) return <ExpenseFormPageSkeleton title="Edit expense" />;
  return (
    <ExpenseFormScreen houseId={houseId} expense={expense} privatePurchase={own.transaction} />
  );
}
