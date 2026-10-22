import type { ItemUrgency, ListVisibility } from "./types";

export const LIST_NAME_MAX_LENGTH = 60;
export const ITEM_NAME_MAX_LENGTH = 100;
export const ITEM_NOTE_MAX_LENGTH = 500;
export const ITEM_QUANTITY_MAX_LENGTH = 5;
export const ITEM_UNIT_MAX_LENGTH = 20;
export const ITEM_STORE_MAX_LENGTH = 100;
export const BATCH_NAME_MAX_LENGTH = 60;

export const LIST_VISIBILITIES = ["shared", "private"] as const satisfies readonly ListVisibility[];
export const ITEM_URGENCIES = [
  "now",
  "soon",
  "today",
  "tomorrow",
  "this_week",
  "whenever",
] as const satisfies readonly ItemUrgency[];

export type ListNameError = "empty" | "too-long" | "invalid-characters";
export type ListNameResult = { ok: true; value: string } | { ok: false; error: ListNameError };

export type ItemNameError = "empty" | "too-long" | "invalid-characters";
export type ItemNameResult = { ok: true; value: string } | { ok: false; error: ItemNameError };

export type BatchNameError = "too-long" | "invalid-characters";
export type BatchNameResult =
  { ok: true; value: string | null } | { ok: false; error: BatchNameError };

export type AmountError = "invalid" | "too-large";
export type AmountResult = { ok: true; value: number | null } | { ok: false; error: AmountError };

// Same lengthOf and collapse helpers as houses/validation.ts
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

function lengthOf(value: string): number {
  return Array.from(value).length;
}

function collapse(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function validateListName(input: string): ListNameResult {
  const value = collapse(input);
  if (lengthOf(value) < 1) return { ok: false, error: "empty" };
  if (lengthOf(value) > LIST_NAME_MAX_LENGTH) return { ok: false, error: "too-long" };
  if (CONTROL_CHARACTERS.test(value)) return { ok: false, error: "invalid-characters" };
  return { ok: true, value };
}

export function validateItemName(input: string): ItemNameResult {
  const value = collapse(input);
  if (lengthOf(value) < 1) return { ok: false, error: "empty" };
  if (lengthOf(value) > ITEM_NAME_MAX_LENGTH) return { ok: false, error: "too-long" };
  if (CONTROL_CHARACTERS.test(value)) return { ok: false, error: "invalid-characters" };
  return { ok: true, value };
}

export function validateBatchName(input: string | null | undefined): BatchNameResult {
  const value = collapse(input ?? "");
  if (lengthOf(value) < 1) return { ok: true, value: null };
  if (lengthOf(value) > BATCH_NAME_MAX_LENGTH) return { ok: false, error: "too-long" };
  if (CONTROL_CHARACTERS.test(value)) return { ok: false, error: "invalid-characters" };
  return { ok: true, value };
}

export function batchNameErrorMessage(error: BatchNameError): string {
  switch (error) {
    case "too-long":
      return `Use ${BATCH_NAME_MAX_LENGTH} characters or fewer.`;
    case "invalid-characters":
      return "That name contains characters we can't use.";
  }
}

const RUPEES_PATTERN = /^\d+(\.\d{1,2})?$/;

// Paise are stored as a Postgres int, so cap well below 2^31.
export const MAX_AMOUNT_PAISE = 1_000_000_000;

export function parseRupeesToPaise(input: string): AmountResult {
  const value = input.trim().replace(/,/g, "");
  if (value === "") return { ok: true, value: null };
  if (!RUPEES_PATTERN.test(value)) return { ok: false, error: "invalid" };
  const [whole, fraction = ""] = value.split(".");
  const paise = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(paise) || paise > MAX_AMOUNT_PAISE) {
    return { ok: false, error: "too-large" };
  }
  return { ok: true, value: paise };
}

export function amountErrorMessage(error: AmountError): string {
  switch (error) {
    case "invalid":
      return "Enter an amount like 450 or 12.50.";
    case "too-large":
      return "That amount is too large.";
  }
}

export function isPaiseAmount(value: unknown): value is number {
  return (
    typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= MAX_AMOUNT_PAISE
  );
}

export function isListVisibility(value: unknown): value is ListVisibility {
  return (LIST_VISIBILITIES as readonly unknown[]).includes(value);
}

export function isItemUrgency(value: unknown): value is ItemUrgency {
  return (ITEM_URGENCIES as readonly unknown[]).includes(value);
}

export function listNameErrorMessage(error: ListNameError): string {
  switch (error) {
    case "empty":
      return "Give your list a name.";
    case "too-long":
      return `Use ${LIST_NAME_MAX_LENGTH} characters or fewer.`;
    case "invalid-characters":
      return "That name contains characters we can't use.";
  }
}

export function itemNameErrorMessage(error: ItemNameError): string {
  switch (error) {
    case "empty":
      return "Enter an item name.";
    case "too-long":
      return `Use ${ITEM_NAME_MAX_LENGTH} characters or fewer.`;
    case "invalid-characters":
      return "That name contains characters we can't use.";
  }
}
