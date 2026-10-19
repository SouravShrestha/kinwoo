import type { Expense, ExpenseInput, ExpensePage, HouseBalances } from "@kinwoo/core/expenses";

import { apiRequest } from "../api/request";

const segment = encodeURIComponent;
const base = (houseId: string) => `/api/houses/${segment(houseId)}/expenses`;
const expenseBase = (houseId: string, expenseId: string) =>
  `${base(houseId)}/${segment(expenseId)}`;

export async function fetchExpenses(houseId: string, cursor: string | null): Promise<ExpensePage> {
  const query = cursor ? `?cursor=${segment(cursor)}` : "";
  const body = await apiRequest<{ page: ExpensePage }>(`${base(houseId)}${query}`);
  return body.page;
}

export async function fetchExpense(houseId: string, expenseId: string): Promise<Expense> {
  const body = await apiRequest<{ expense: Expense }>(expenseBase(houseId, expenseId));
  return body.expense;
}

export async function createExpense(houseId: string, input: ExpenseInput): Promise<Expense> {
  const body = await apiRequest<{ expense: Expense }>(base(houseId), {
    method: "POST",
    body: input,
  });
  return body.expense;
}

export async function updateExpense(
  houseId: string,
  expenseId: string,
  input: ExpenseInput,
): Promise<Expense> {
  const body = await apiRequest<{ expense: Expense }>(expenseBase(houseId, expenseId), {
    method: "PATCH",
    body: input,
  });
  return body.expense;
}

export async function deleteExpense(houseId: string, expenseId: string): Promise<void> {
  await apiRequest(expenseBase(houseId, expenseId), { method: "DELETE" });
}

export async function setSimplifyDebts(houseId: string, enabled: boolean): Promise<void> {
  await apiRequest(`${base(houseId)}/simplify-debts`, { method: "PUT", body: { enabled } });
}

export async function fetchBalances(houseId: string, simplify = false): Promise<HouseBalances> {
  const query = simplify ? "?simplify=1" : "";
  const body = await apiRequest<{ balances: HouseBalances }>(`${base(houseId)}/balances${query}`);
  return body.balances;
}
