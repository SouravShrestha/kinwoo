import type { ExpenseCursor, ExpenseErrorCode, ExpensePage } from "@kinwoo/core/expenses";

import type { Expense, ExpenseInput, HouseBalances } from "./IExpensesRepository";

export type ExpensesServiceErrorCode = ExpenseErrorCode | "UNAVAILABLE";

export type ExpensesResult<T> =
  { ok: true; data: T } | { ok: false; code: ExpensesServiceErrorCode; message: string };

export interface IExpensesService {
  listExpenses(houseId: string, after: ExpenseCursor | null): Promise<ExpensesResult<ExpensePage>>;
  getExpense(houseId: string, expenseId: string): Promise<ExpensesResult<Expense>>;
  createExpense(houseId: string, input: ExpenseInput): Promise<ExpensesResult<Expense>>;
  updateExpense(
    houseId: string,
    expenseId: string,
    input: ExpenseInput,
  ): Promise<ExpensesResult<Expense>>;
  deleteExpense(expenseId: string): Promise<ExpensesResult<null>>;
  getBalances(houseId: string): Promise<ExpensesResult<HouseBalances>>;
}
