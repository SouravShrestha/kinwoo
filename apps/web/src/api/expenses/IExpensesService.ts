import type {
  ExpenseCursor,
  ExpenseErrorCode,
  ExpensePage,
  MemberNet,
  MonthTotal,
} from "@kinwoo/core/expenses";

import type {
  Expense,
  ExpenseInput,
  HouseBalances,
  Settlement,
  SettlementInput,
} from "./IExpensesRepository";
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
  getMemberNets(houseId: string): Promise<ExpensesResult<MemberNet[]>>;
  getTotals(houseId: string): Promise<ExpensesResult<MonthTotal[]>>;
  setSimplifyDebts(houseId: string, enabled: boolean): Promise<ExpensesResult<null>>;
  listSettlements(houseId: string): Promise<ExpensesResult<Settlement[]>>;
  updateSettlement(settlementId: string, amountPaise: number): Promise<ExpensesResult<null>>;
  deleteSettlement(settlementId: string): Promise<ExpensesResult<null>>;
  recordSettlement(
    houseId: string,
    input: SettlementInput,
  ): Promise<ExpensesResult<{ id: string }>>;
}
