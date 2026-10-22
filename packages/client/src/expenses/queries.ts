"use client";

import { memberBalanceRows } from "@kinwoo/core/expenses";
import { TRANSACTION_UNAVAILABLE } from "@kinwoo/core/grocery";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import { useBusyWhile } from "../activity";
import { toast } from "../toast";
import {
  fetchBalances,
  fetchExpense,
  fetchExpenses,
  fetchExpenseTotals,
  fetchMemberNets,
  fetchSettlements,
} from "./api";
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

// Navigates only when the expense still exists; a deleted or unreachable one shows a toast.
export function useOpenExpense(houseId: string | null) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  useBusyWhile(pending);

  return useCallback(
    async (expenseId: string | null, navigate: (expenseId: string) => void) => {
      if (!houseId || !expenseId) return toast.error(TRANSACTION_UNAVAILABLE);
      setPending(true);
      try {
        await queryClient.fetchQuery({
          queryKey: expenseKeys.detail(houseId, expenseId),
          queryFn: () => fetchExpense(houseId, expenseId),
          staleTime: 0,
        });
      } catch {
        return toast.error(TRANSACTION_UNAVAILABLE);
      } finally {
        setPending(false);
      }
      navigate(expenseId);
    },
    [houseId, queryClient],
  );
}

// Navigates only when the payment still exists; a deleted one shows a toast.
export function useOpenSettlement(houseId: string | null) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  useBusyWhile(pending);

  return useCallback(
    async (settlementId: string | null, navigate: (settlementId: string) => void) => {
      if (!houseId || !settlementId) return toast.error(TRANSACTION_UNAVAILABLE);
      setPending(true);
      try {
        const settlements = await queryClient.fetchQuery({
          queryKey: expenseKeys.settlements(houseId),
          queryFn: () => fetchSettlements(houseId),
          staleTime: 0,
        });
        if (!settlements.some((settlement) => settlement.id === settlementId)) {
          return toast.error(TRANSACTION_UNAVAILABLE);
        }
      } catch {
        return toast.error(TRANSACTION_UNAVAILABLE);
      } finally {
        setPending(false);
      }
      navigate(settlementId);
    },
    [houseId, queryClient],
  );
}

export function useMemberBalances(houseId: string | null) {
  return useQuery({
    queryKey: expenseKeys.memberNets(houseId ?? ""),
    queryFn: () => fetchMemberNets(houseId as string),
    select: memberBalanceRows,
    enabled: houseId !== null,
  });
}

export function useSettlements(houseId: string | null) {
  return useQuery({
    queryKey: expenseKeys.settlements(houseId ?? ""),
    queryFn: () => fetchSettlements(houseId as string),
    enabled: houseId !== null,
  });
}

export function useExpenseTotals(houseId: string | null) {
  return useQuery({
    queryKey: expenseKeys.totals(houseId ?? ""),
    queryFn: () => fetchExpenseTotals(houseId as string),
    enabled: houseId !== null,
  });
}

export function useHouseBalances(houseId: string | null, simplify = false) {
  return useQuery({
    queryKey: expenseKeys.balancesView(houseId ?? "", simplify),
    queryFn: () => fetchBalances(houseId as string, simplify),
    enabled: houseId !== null,
    // Toggling simplify keeps the other view on screen until it loads, but never across houses.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === houseId ? previous : undefined,
  });
}
