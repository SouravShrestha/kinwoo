"use client";

import { useActiveHouse } from "@kinwoo/client/houses";
import { useEffect } from "react";

import { useHouseNavigation } from "@/lib/house-navigation";

import { ExpenseFormScreen } from "./ExpenseFormScreen";

export function NewExpenseScreen() {
  const { activeHouse, ready } = useActiveHouse();
  const { goHome } = useHouseNavigation();
  const houseId = activeHouse?.house.id ?? null;

  useEffect(() => {
    if (ready && !activeHouse) goHome();
  }, [ready, activeHouse, goHome]);

  if (!houseId) return null;
  return <ExpenseFormScreen houseId={houseId} />;
}
