"use client";

import { useExpense } from "@kinwoo/client/expenses";
import { useActiveHouse, useHouseMembers } from "@kinwoo/client/houses";
import { useEffect } from "react";

import { ExpenseFormPageSkeleton } from "@/components/skeleton/skeletons";
import { useHouseNavigation } from "@/lib/house-navigation";

import { ExpenseFormScreen } from "./ExpenseFormScreen";

export function EditExpenseScreen({ expenseId }: { expenseId: string | null }) {
  const { activeHouse, ready } = useActiveHouse();
  const { goHome } = useHouseNavigation();
  const houseId = activeHouse?.house.id ?? null;
  const { data: expense, isError } = useExpense(houseId, expenseId);
  const { data: members } = useHouseMembers(houseId);

  useEffect(() => {
    if ((ready && !activeHouse) || !expenseId || isError) goHome();
  }, [ready, activeHouse, expenseId, isError, goHome]);

  // The form seeds its payer and split state on mount, so it waits for both.
  if (!houseId || !expense || !members) return <ExpenseFormPageSkeleton title="Edit expense" />;
  return <ExpenseFormScreen houseId={houseId} expense={expense} />;
}
