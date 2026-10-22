import type {
  Expense,
  ExpenseCursor,
  ExpenseErrorCode,
  ExpenseInput,
  HouseBalances,
  MemberNet,
  MonthTotal,
  Settlement,
  SettlementInput,
} from "@kinwoo/core/expenses";

export type {
  Expense,
  ExpenseCursor,
  ExpenseInput,
  HouseBalances,
  MemberNet,
  MonthTotal,
  Settlement,
  SettlementInput,
};

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
  getTotals(houseId: string): Promise<MonthTotal[]>;
  setSimplifyDebts(houseId: string, enabled: boolean): Promise<void>;
  recordSettlement(houseId: string, input: SettlementInput): Promise<string>;
  listSettlements(houseId: string, limit: number): Promise<Settlement[]>;
  updateSettlement(settlementId: string, amountPaise: number): Promise<void>;
  deleteSettlement(settlementId: string): Promise<void>;
}
