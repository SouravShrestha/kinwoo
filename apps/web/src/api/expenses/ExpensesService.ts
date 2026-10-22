import {
  EXPENSE_NOTE_MAX,
  EXPENSE_PAGE_SIZE,
  encodeExpenseCursor,
  expenseErrorMessage,
  expenseTitleErrorMessage,
  isExpenseCategory,
  isSpentOn,
  isValidExpenseAmount,
  simplifiedBalances,
  validateExpenseNote,
  validateExpenseParts,
  validateExpenseTitle,
  type ExpenseCursor,
  type ExpensePage,
  type MemberNet,
  type MonthTotal,
  type Settlement,
  type SettlementInput,
} from "@kinwoo/core/expenses";

import { serviceResults } from "../_shared/result";

import {
  ExpensesRepositoryError,
  type Expense,
  type ExpenseInput,
  type HouseBalances,
  type IExpensesRepository,
} from "./IExpensesRepository";
import type {
  ExpensesResult,
  ExpensesServiceErrorCode,
  IExpensesService,
} from "./IExpensesService";

const { ok, failure, invalidInput, fromError, run } = serviceResults<ExpensesServiceErrorCode>({
  messageFor: expenseErrorMessage,
  codeOf: (cause) => (cause instanceof ExpensesRepositoryError ? cause.code : null),
  invalidInputCode: "INVALID_INPUT",
  unavailableCode: "UNAVAILABLE",
});

// shortcut: the list holds the latest payments only; page it if a house ever records more.
const SETTLEMENT_LIST_LIMIT = 500;

function normalize(input: ExpenseInput): ExpensesResult<ExpenseInput> {
  const title = validateExpenseTitle(input.title);
  if (!title.ok) return invalidInput(expenseTitleErrorMessage(title.error));
  if (!isValidExpenseAmount(input.amountPaise)) return invalidInput("Enter the amount spent.");
  if (!isExpenseCategory(input.category)) return invalidInput("Pick a category.");
  if (!isSpentOn(input.spentOn)) return invalidInput("Pick the day it was spent.");
  const note = validateExpenseNote(input.note);
  if (!note.ok) return invalidInput(`Keep the note to ${EXPENSE_NOTE_MAX} characters or fewer.`);
  if (!validateExpenseParts(input.amountPaise, input.parts)) {
    return invalidInput("Who paid and how it's split must both add up to the amount.");
  }
  return ok({ ...input, title: title.value, note: note.value });
}

export class ExpensesService implements IExpensesService {
  constructor(private readonly repository: IExpensesRepository) {}

  async listExpenses(
    houseId: string,
    after: ExpenseCursor | null,
  ): Promise<ExpensesResult<ExpensePage>> {
    return run(async () => {
      const expenses = await this.repository.listExpenses(houseId, EXPENSE_PAGE_SIZE + 1, after);
      const page = expenses.slice(0, EXPENSE_PAGE_SIZE);
      const last = page[page.length - 1];
      return {
        expenses: page,
        nextCursor: expenses.length > EXPENSE_PAGE_SIZE && last ? encodeExpenseCursor(last) : null,
      };
    });
  }

  async getExpense(houseId: string, expenseId: string): Promise<ExpensesResult<Expense>> {
    try {
      const expense = await this.repository.findExpense(houseId, expenseId);
      return expense ? ok(expense) : failure("NOT_FOUND");
    } catch (cause) {
      return fromError(cause);
    }
  }

  async createExpense(houseId: string, input: ExpenseInput): Promise<ExpensesResult<Expense>> {
    const normalized = normalize(input);
    if (!normalized.ok) return normalized;
    try {
      const id = await this.repository.createExpense(houseId, normalized.data);
      return this.getExpense(houseId, id);
    } catch (cause) {
      return fromError(cause);
    }
  }

  async updateExpense(
    houseId: string,
    expenseId: string,
    input: ExpenseInput,
  ): Promise<ExpensesResult<Expense>> {
    const normalized = normalize(input);
    if (!normalized.ok) return normalized;
    try {
      await this.repository.updateExpense(expenseId, normalized.data);
      return this.getExpense(houseId, expenseId);
    } catch (cause) {
      return fromError(cause);
    }
  }

  async deleteExpense(expenseId: string): Promise<ExpensesResult<null>> {
    return run(async () => {
      await this.repository.deleteExpense(expenseId);
      return null;
    });
  }

  async getBalances(houseId: string, simplify: boolean): Promise<ExpensesResult<HouseBalances>> {
    if (!simplify) return run(() => this.repository.getBalances(houseId));
    return run(async () => simplifiedBalances(await this.repository.getMemberNets(houseId)));
  }

  async getMemberNets(houseId: string): Promise<ExpensesResult<MemberNet[]>> {
    return run(() => this.repository.getMemberNets(houseId));
  }

  async getTotals(houseId: string): Promise<ExpensesResult<MonthTotal[]>> {
    return run(() => this.repository.getTotals(houseId));
  }

  async listSettlements(houseId: string): Promise<ExpensesResult<Settlement[]>> {
    return run(() => this.repository.listSettlements(houseId, SETTLEMENT_LIST_LIMIT));
  }

  async updateSettlement(settlementId: string, amountPaise: number): Promise<ExpensesResult<null>> {
    if (!isValidExpenseAmount(amountPaise)) return invalidInput("Enter the amount paid.");
    return run(async () => {
      await this.repository.updateSettlement(settlementId, amountPaise);
      return null;
    });
  }

  async deleteSettlement(settlementId: string): Promise<ExpensesResult<null>> {
    return run(async () => {
      await this.repository.deleteSettlement(settlementId);
      return null;
    });
  }

  async recordSettlement(
    houseId: string,
    input: SettlementInput,
  ): Promise<ExpensesResult<{ id: string }>> {
    if (!isValidExpenseAmount(input.amountPaise)) return invalidInput("Enter the amount paid.");
    if (input.payerId === input.payeeId) return invalidInput("Pick someone else to pay.");
    return run(async () => ({ id: await this.repository.recordSettlement(houseId, input) }));
  }

  async setSimplifyDebts(houseId: string, enabled: boolean): Promise<ExpensesResult<null>> {
    return run(async () => {
      await this.repository.setSimplifyDebts(houseId, enabled);
      return null;
    });
  }
}
