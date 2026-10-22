import {
  buildExpenseParts,
  EXPENSE_NOTE_MAX,
  expenseTitleErrorMessage,
  spentOnFor,
  validateExpenseNote,
  validateExpenseParts,
  validateExpenseTitle,
  type ExpenseCategory,
  type ExpenseInput,
  type ExpenseParts,
} from "@kinwoo/core/expenses";
import { amountErrorMessage, parseRupeesToPaise } from "@kinwoo/core/grocery";

import type { ExpenseSplitForm } from "./expense-split";
import type { PayerSplitForm } from "./payer-split";

export type ExpenseFormField = "title" | "amount" | "note" | "split";

export type ExpenseFormResult =
  { ok: true; input: ExpenseInput } | { ok: false; field: ExpenseFormField; message: string };

export function expensePartsFromForms(
  payers: Pick<PayerSplitForm, "amounts">,
  split: Pick<ExpenseSplitForm, "method" | "sharesPaise" | "values">,
): ExpenseParts {
  return buildExpenseParts({
    splitMethod: split.method,
    payerAmounts: payers.amounts,
    sharesPaise: split.sharesPaise,
    values: split.values,
  });
}

export function expenseInputFromForm({
  title,
  amount,
  category,
  note,
  date,
  parts,
}: {
  title: string;
  amount: string;
  category: ExpenseCategory;
  note: string;
  date: Date;
  parts: ExpenseParts;
}): ExpenseFormResult {
  const titleResult = validateExpenseTitle(title);
  if (!titleResult.ok) {
    return { ok: false, field: "title", message: expenseTitleErrorMessage(titleResult.error) };
  }

  const amountResult = parseRupeesToPaise(amount);
  if (!amountResult.ok) {
    return { ok: false, field: "amount", message: amountErrorMessage(amountResult.error) };
  }
  if (!amountResult.value) return { ok: false, field: "amount", message: "Enter the amount." };

  const noteResult = validateExpenseNote(note);
  if (!noteResult.ok) {
    return {
      ok: false,
      field: "note",
      message: `Keep the note to ${EXPENSE_NOTE_MAX} characters or fewer.`,
    };
  }

  if (!validateExpenseParts(amountResult.value, parts)) {
    return {
      ok: false,
      field: "split",
      message: "Who paid and how it's split must both add up to the amount.",
    };
  }

  return {
    ok: true,
    input: {
      title: titleResult.value,
      amountPaise: amountResult.value,
      category,
      note: noteResult.value,
      spentOn: spentOnFor(date),
      parts,
    },
  };
}
