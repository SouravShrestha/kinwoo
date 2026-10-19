import type { Expense } from "./types";

export const EXPENSE_PAGE_SIZE = 30;

export type ExpenseCursor = { spentOn: string; createdAt: string; id: string };

// Timestamps stay strings end to end so Postgres microseconds survive the round trip.
const CURSOR_PATTERN =
  /^(\d{4}-\d{2}-\d{2})\|(\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|[+-]\d{2}:\d{2}))\|([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export function encodeExpenseCursor(expense: Pick<Expense, "spentOn" | "createdAt" | "id">) {
  return `${expense.spentOn}|${expense.createdAt}|${expense.id}`;
}

export function parseExpenseCursor(value: string): ExpenseCursor | null {
  const match = CURSOR_PATTERN.exec(value);
  return match ? { spentOn: match[1], createdAt: match[2], id: match[3] } : null;
}
