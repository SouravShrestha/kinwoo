"use client";

import type { ExpenseInput } from "@kinwoo/core/expenses";
import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";

import { groceryKeys } from "../grocery/keys";
import { createExpense, deleteExpense, updateExpense } from "./api";
import { expenseKeys } from "./keys";

export function invalidateExpenses(queryClient: QueryClient, houseId: string) {
  void queryClient.invalidateQueries({ queryKey: expenseKeys.list(houseId) });
  void queryClient.invalidateQueries({ queryKey: expenseKeys.balances(houseId) });
  void queryClient.invalidateQueries({ queryKey: groceryKeys.recentActivity(houseId) });
}

export function useCreateExpense(houseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ExpenseInput) => createExpense(houseId, input),
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
    },
  });
}

export function useDeleteExpense(houseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (expenseId: string) => deleteExpense(houseId, expenseId),
    onSuccess: () => invalidateExpenses(queryClient, houseId),
  });
}
