import {
  EXPENSE_NOTE_MAX,
  EXPENSE_PAGE_SIZE,
  encodeExpenseCursor,
  expenseErrorMessage,
  expenseTitleErrorMessage,
  isExpenseCategory,
  isSpentOn,
  isValidExpenseAmount,
  validateExpenseNote,
  validateExpenseParts,
  validateExpenseTitle,
  type ExpenseCursor,
  type ExpensePage,
} from "@kinwoo/core/expenses";

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

function ok<T>(data: T): ExpensesResult<T> {
  return { ok: true, data };
}

function failure(code: ExpensesServiceErrorCode, message?: string): ExpensesResult<never> {
  return { ok: false, code, message: message ?? expenseErrorMessage(code) };
}

function invalidInput(message: string): ExpensesResult<never> {
  return failure("INVALID_INPUT", message);
}

function fromError(cause: unknown): ExpensesResult<never> {
  if (cause instanceof ExpensesRepositoryError && cause.code) return failure(cause.code);
  return failure("UNAVAILABLE", "Something went wrong. Please try again.");
}

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
    return this.run(async () => {
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
    return this.run(async () => {
      await this.repository.deleteExpense(expenseId);
      return null;
    });
  }

  async getBalances(houseId: string): Promise<ExpensesResult<HouseBalances>> {
    return this.run(() => this.repository.getBalances(houseId));
  }

  private async run<T>(work: () => Promise<T>): Promise<ExpensesResult<T>> {
    try {
      return ok(await work());
    } catch (cause) {
      return fromError(cause);
    }
  }
}
