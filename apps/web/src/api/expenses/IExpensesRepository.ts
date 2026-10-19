import type {
  Expense,
  ExpenseCursor,
  ExpenseErrorCode,
  ExpenseInput,
  HouseBalances,
  MemberNet,
} from "@kinwoo/core/expenses";

export type { Expense, ExpenseCursor, ExpenseInput, HouseBalances, MemberNet };

export class ExpensesRepositoryError extends Error {
  constructor(
    message: string,
    readonly code: ExpenseErrorCode | null,
  ) {
    super(message);
    this.name = "ExpensesRepositoryError";
  }
}

export interface IExpensesRepository {
  listExpenses(houseId: string, limit: number, after: ExpenseCursor | null): Promise<Expense[]>;
  findExpense(houseId: string, expenseId: string): Promise<Expense | null>;
  createExpense(houseId: string, input: ExpenseInput): Promise<string>;
  updateExpense(expenseId: string, input: ExpenseInput): Promise<void>;
  deleteExpense(expenseId: string): Promise<void>;
  getBalances(houseId: string): Promise<HouseBalances>;
  getMemberNets(houseId: string): Promise<MemberNet[]>;
  setSimplifyDebts(houseId: string, enabled: boolean): Promise<void>;
}
