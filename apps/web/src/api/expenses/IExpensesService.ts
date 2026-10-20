import type { ExpenseCursor, ExpenseErrorCode, ExpensePage } from "@kinwoo/core/expenses";

import type { Expense, ExpenseInput, HouseBalances } from "./IExpensesRepository";
import type { ServiceResult } from "../_shared/result";

export type ExpensesServiceErrorCode = ExpenseErrorCode | "UNAVAILABLE";

export type ExpensesResult<T> = ServiceResult<T, ExpensesServiceErrorCode>;

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
  getBalances(houseId: string, simplify: boolean): Promise<ExpensesResult<HouseBalances>>;
  setSimplifyDebts(houseId: string, enabled: boolean): Promise<ExpensesResult<null>>;
}
