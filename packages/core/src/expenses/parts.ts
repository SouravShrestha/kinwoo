import { amountDraftToPaise, paiseToAmountDraft } from "./payers";
import type { SplitMethod } from "./splits";
import type { Expense, ExpenseParts } from "./types";

export function buildExpenseParts({
  splitMethod,
  payerAmounts,
  sharesPaise,
  values,
}: {
  splitMethod: SplitMethod;
  payerAmounts: Readonly<Record<string, string>>;
  sharesPaise: Readonly<Record<string, number>>;
  values: Readonly<Record<string, string>>;
}): ExpenseParts {
  const payers = Object.entries(payerAmounts)
    .map(([userId, text]) => ({ userId, amountPaise: amountDraftToPaise(text) }))
    .filter((payer) => payer.amountPaise > 0);

  // Equal splits list only who is included; the others keep everyone they gave a value to.
  const shares =
    splitMethod === "equal"
      ? Object.entries(sharesPaise).map(([userId, sharePaise]) => ({
          userId,
          sharePaise,
          weight: null,
        }))
      : Object.entries(values)
          .map(([userId, text]) => ({
            userId,
            sharePaise: sharesPaise[userId] ?? 0,
            weight: amountDraftToPaise(text),
          }))
          .filter((share) => share.weight > 0);

  return { splitMethod, payers, shares };
}

export type ExpenseFormSeed = {
  payerAmounts: Record<string, string>;
  splitMethod: SplitMethod;
  excluded: string[];
  values: Record<string, string>;
};

export function expenseFormSeed(expense: Expense, memberIds: readonly string[]): ExpenseFormSeed {
  const shareIds = new Set(expense.shares.map((share) => share.userId));
  return {
    payerAmounts: Object.fromEntries(
      expense.payers.map((payer) => [payer.userId, paiseToAmountDraft(payer.amountPaise)]),
    ),
    splitMethod: expense.splitMethod,
    excluded: expense.splitMethod === "equal" ? memberIds.filter((id) => !shareIds.has(id)) : [],
    values:
      expense.splitMethod === "equal"
        ? {}
        : Object.fromEntries(
            expense.shares.map((share) => [share.userId, paiseToAmountDraft(share.weight ?? 0)]),
          ),
  };
}
