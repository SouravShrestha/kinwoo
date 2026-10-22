"use client";

import type { ExpenseInput, SettlementInput } from "@kinwoo/core/expenses";
import type { HouseMembership } from "@kinwoo/core/houses";
import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";

import { groceryKeys } from "../grocery/keys";
import { patchHouseInCache } from "../houses/cache";
import { houseKeys } from "../houses/keys";
import {
  createExpense,
  deleteExpense,
  deleteSettlement,
  recordSettlement,
  setSimplifyDebts,
  updateExpense,
  updateSettlement,
} from "./api";
import { expenseKeys } from "./keys";

export function invalidateExpenses(queryClient: QueryClient, houseId: string) {
  void queryClient.invalidateQueries({ queryKey: expenseKeys.list(houseId) });
  void queryClient.invalidateQueries({ queryKey: expenseKeys.balances(houseId) });
  void queryClient.invalidateQueries({ queryKey: expenseKeys.totals(houseId) });
  void queryClient.invalidateQueries({ queryKey: expenseKeys.settlements(houseId) });
  void queryClient.invalidateQueries({ queryKey: groceryKeys.recentActivity(houseId) });
}

// Bought items carry their linked expense's id and amount; lists and categories do not change.
function invalidateBoughtItems(queryClient: QueryClient, houseId: string) {
  void queryClient.invalidateQueries({
    queryKey: groceryKeys.lists(houseId),
    predicate: ({ queryKey }) => queryKey[4] === "items" || queryKey[4] === "bought-history",
  });
  void queryClient.invalidateQueries({ queryKey: groceryKeys.overview(houseId) });
}

export function useCreateExpense(houseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ExpenseInput) => createExpense(houseId, input),
    onSuccess: () => invalidateExpenses(queryClient, houseId),
  });
}

export function useRecordSettlement(houseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SettlementInput) => recordSettlement(houseId, input),
    onSuccess: () => invalidateExpenses(queryClient, houseId),
  });
}

export function useUpdateSettlement(houseId: string, settlementId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (amountPaise: number) => updateSettlement(houseId, settlementId, amountPaise),
    onSuccess: () => invalidateExpenses(queryClient, houseId),
  });
}

export function useDeleteSettlement(houseId: string, settlementId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteSettlement(houseId, settlementId),
    onSuccess: () => invalidateExpenses(queryClient, houseId),
  });
}

export function useUpdateExpense(houseId: string, expenseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ExpenseInput) => updateExpense(houseId, expenseId, input),
    onSuccess: (expense) => {
      queryClient.setQueryData(expenseKeys.detail(houseId, expenseId), expense);
      invalidateExpenses(queryClient, houseId);
      invalidateBoughtItems(queryClient, houseId);
    },
  });
}

export function useDeleteExpense(houseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (expenseId: string) => deleteExpense(houseId, expenseId),
    onSuccess: () => {
      invalidateExpenses(queryClient, houseId);
      invalidateBoughtItems(queryClient, houseId);
    },
  });
}

// Optimistic so the switch moves and the balances re-read the moment it is tapped. Other members
// pick the change up over the houses realtime channel.
export function useSetSimplifyDebts(houseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (enabled: boolean) => setSimplifyDebts(houseId, enabled),
    onMutate: async (enabled) => {
      await queryClient.cancelQueries({ queryKey: houseKeys.list() });
      await queryClient.cancelQueries({ queryKey: houseKeys.detail(houseId), exact: true });
      const list = queryClient.getQueryData<HouseMembership[]>(houseKeys.list());
      const detail = queryClient.getQueryData<HouseMembership>(houseKeys.detail(houseId));
      patchHouseInCache(queryClient, houseId, { simplifyDebts: enabled });
      return { list, detail };
    },
    onError: (_error, _enabled, context) => {
      queryClient.setQueryData(houseKeys.list(), context?.list);
      queryClient.setQueryData(houseKeys.detail(houseId), context?.detail);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: houseKeys.list() });
      void queryClient.invalidateQueries({ queryKey: houseKeys.detail(houseId), exact: true });
      void queryClient.invalidateQueries({ queryKey: groceryKeys.recentActivity(houseId) });
    },
  });
}
