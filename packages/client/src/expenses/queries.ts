"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { fetchBalances, fetchExpense, fetchExpenses } from "./api";
import { expenseKeys } from "./keys";

export function useExpenses(houseId: string | null) {
  return useInfiniteQuery({
    queryKey: expenseKeys.list(houseId ?? ""),
    queryFn: ({ pageParam }) => fetchExpenses(houseId as string, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    select: (data) => data.pages.flatMap((page) => page.expenses),
    enabled: houseId !== null,
  });
}

export function useExpense(houseId: string | null, expenseId: string | null) {
  return useQuery({
    queryKey: expenseKeys.detail(houseId ?? "", expenseId ?? ""),
    queryFn: () => fetchExpense(houseId as string, expenseId as string),
    enabled: houseId !== null && expenseId !== null,
  });
}

export function useHouseBalances(houseId: string | null) {
  return useQuery({
    queryKey: expenseKeys.balances(houseId ?? ""),
    queryFn: () => fetchBalances(houseId as string),
    enabled: houseId !== null,
  });
}
