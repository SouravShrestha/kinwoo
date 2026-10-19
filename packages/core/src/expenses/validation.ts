import { isPaiseAmount } from "../grocery/validation";
import { SPLIT_METHODS, type SplitMethod } from "./splits";
import type { ExpenseParts } from "./types";

export const EXPENSE_TITLE_MAX = 80;
export const EXPENSE_NOTE_MAX = 500;
// Mirrors the cap in the expense RPCs.
export const MAX_EXPENSE_PARTICIPANTS = 100;

export type ExpenseTitleError = "empty" | "too-long" | "invalid-characters";
export type ExpenseTitleResult =
  { ok: true; value: string } | { ok: false; error: ExpenseTitleError };

export type ExpenseNoteResult = { ok: true; value: string | null } | { ok: false };

// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

function lengthOf(value: string): number {
  return Array.from(value).length;
}

export function validateExpenseTitle(input: string): ExpenseTitleResult {
  const value = input.trim().replace(/\s+/g, " ");
  if (lengthOf(value) < 1) return { ok: false, error: "empty" };
  if (lengthOf(value) > EXPENSE_TITLE_MAX) return { ok: false, error: "too-long" };
  if (CONTROL_CHARACTERS.test(value)) return { ok: false, error: "invalid-characters" };
  return { ok: true, value };
}

export function expenseTitleErrorMessage(error: ExpenseTitleError): string {
  switch (error) {
    case "empty":
      return "Give the expense a title.";
    case "too-long":
      return `Use ${EXPENSE_TITLE_MAX} characters or fewer.`;
    case "invalid-characters":
      return "That title contains characters we can't use.";
  }
}

export function validateExpenseNote(input: string | null | undefined): ExpenseNoteResult {
  const value = (input ?? "").trim();
  if (value === "") return { ok: true, value: null };
  if (lengthOf(value) > EXPENSE_NOTE_MAX) return { ok: false };
  return { ok: true, value };
}

export function isSplitMethod(value: unknown): value is SplitMethod {
  return (SPLIT_METHODS as readonly unknown[]).includes(value);
}

export function isSpentOn(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.toISOString().slice(0, 10) === value;
}

function uniqueIds(ids: readonly string[]): boolean {
  return new Set(ids).size === ids.length;
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function isValidExpenseAmount(amountPaise: unknown): amountPaise is number {
  return isPaiseAmount(amountPaise) && amountPaise > 0;
}

// The same rules are enforced by the expense RPCs; checking here gives a clear 400 first.
export function validateExpenseParts(amountPaise: number, parts: ExpenseParts): boolean {
  const { splitMethod, payers, shares } = parts;
  if (!isValidExpenseAmount(amountPaise) || !isSplitMethod(splitMethod)) return false;
  if (payers.length === 0 || payers.length > MAX_EXPENSE_PARTICIPANTS) return false;
  if (shares.length === 0 || shares.length > MAX_EXPENSE_PARTICIPANTS) return false;
  if (!uniqueIds(payers.map((payer) => payer.userId))) return false;
  if (!uniqueIds(shares.map((share) => share.userId))) return false;
  if (!payers.every((payer) => isPaiseAmount(payer.amountPaise) && payer.amountPaise > 0)) {
    return false;
  }
  if (!shares.every((share) => isPaiseAmount(share.sharePaise))) return false;
  const weightsOk = shares.every((share) =>
    splitMethod === "equal"
      ? share.weight === null
      : isPaiseAmount(share.weight) && share.weight > 0,
  );
  if (!weightsOk) return false;
  if (!shares.some((share) => share.sharePaise > 0)) return false;
  return (
    sum(payers.map((payer) => payer.amountPaise)) === amountPaise &&
    sum(shares.map((share) => share.sharePaise)) === amountPaise
  );
}
