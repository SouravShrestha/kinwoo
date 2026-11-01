"use client";

import { useExpense } from "@kinwoo/client/expenses";
import { usePrivateExpense } from "@kinwoo/client/grocery";
import { useActiveHouse, useHouseMembers } from "@kinwoo/client/houses";
import { useEffect } from "react";

import { ExpenseFormPageSkeleton } from "@/components/skeleton/skeletons";
import { useHouseNavigation } from "@/lib/house-navigation";

import { ExpenseFormScreen } from "./ExpenseFormScreen";

export function EditExpenseScreen({
  expenseId,
  isPrivate = false,
}: {
  expenseId: string | null;
  isPrivate?: boolean;
}) {
  const { activeHouse, ready } = useActiveHouse();
  const { goHome } = useHouseNavigation();
  const houseId = activeHouse?.house.id ?? null;
  const shared = useExpense(houseId, isPrivate ? null : expenseId);
  const own = usePrivateExpense(isPrivate ? houseId : null, isPrivate ? expenseId : null);
  const expense = isPrivate ? own.expense : shared.data;
  const isError = isPrivate ? own.isError : shared.isError;
  const { data: members, isError: membersError } = useHouseMembers(houseId);
  const loadFailed = isError || (membersError && !members);

  useEffect(() => {
    if ((ready && !activeHouse) || !expenseId || loadFailed) goHome();
  }, [ready, activeHouse, expenseId, loadFailed, goHome]);

  // The form seeds its payer and split state on mount, so it waits for both.
  if (!houseId || !expense || !members) return <ExpenseFormPageSkeleton title="Edit expense" />;
  return (
    <ExpenseFormScreen houseId={houseId} expense={expense} privatePurchase={own.transaction} />
  );
}
