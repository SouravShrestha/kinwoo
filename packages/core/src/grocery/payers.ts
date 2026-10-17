import { formatPaise } from "./bought-groups";
import { parseRupeesToPaise } from "./validation";

export type PayerSplitState = "short" | "balanced" | "over";

export type PayerSplit = {
  assignedPaise: number;
  remainingPaise: number;
  state: PayerSplitState;
};

const AMOUNT_DRAFT = /^\d*(\.\d{0,2})?$/;

export function isAmountDraft(text: string): boolean {
  return AMOUNT_DRAFT.test(text);
}

export function paiseToAmountDraft(paise: number): string {
  if (paise <= 0) return "";
  const whole = Math.floor(paise / 100);
  const fraction = paise % 100;
  return fraction === 0 ? String(whole) : `${whole}.${String(fraction).padStart(2, "0")}`;
}

export function amountDraftToPaise(text: string): number {
  const result = parseRupeesToPaise(text);
  return result.ok ? (result.value ?? 0) : 0;
}

export function payerSplit(totalPaise: number, assignedPaise: number): PayerSplit {
  const remainingPaise = totalPaise - assignedPaise;
  return {
    assignedPaise,
    remainingPaise,
    state: remainingPaise > 0 ? "short" : remainingPaise < 0 ? "over" : "balanced",
  };
}

export function payerRemainingLabel(split: PayerSplit): string {
  return split.state === "over"
    ? `${formatPaise(-split.remainingPaise)} over`
    : `${formatPaise(split.remainingPaise)} left`;
}

export function payerNamesLabel(names: readonly string[]): string {
  if (names.length === 0) return "No one";
  if (names.length === 1) return names[0];
  return "Multiple";
}
