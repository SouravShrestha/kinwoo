import {
  DEFAULT_EXPENSE_CATEGORY,
  expenseFormSeed,
  paiseToAmountDraft,
  parseSpentOn,
  suggestExpenseCategory,
  type Expense,
  type ExpenseCategory,
} from "@kinwoo/core/expenses";
import { useState } from "react";

import { useHouseMembers } from "../houses/queries";
import { toast } from "../toast";
import { expenseErrorFromCause } from "./errors";
import { useExpenseSplit } from "./expense-split";
import { expenseInputFromForm, expensePartsFromForms, type ExpenseFormField } from "./form-input";
import { useCreateExpense, useUpdateExpense } from "./mutations";
import { usePayerSplit } from "./payer-split";

// When editing, mount this only once the expense and house members have loaded: the payer and
// split state is seeded from them on the first render.
export function useExpenseForm({
  houseId,
  currentUserId,
  expense,
  onSaved,
}: {
  houseId: string;
  currentUserId: string | null;
  expense?: Expense | null;
  onSaved: (expense: Expense) => void;
}) {
  const members = useHouseMembers(houseId || null);
  const [seed] = useState(() =>
    expense
      ? expenseFormSeed(
          expense,
          (members.data ?? []).map((member) => member.userId),
        )
      : null,
  );

  const [title, setTitleText] = useState(expense?.title ?? "");
  const [amount, setAmountText] = useState(expense ? paiseToAmountDraft(expense.amountPaise) : "");
  // undefined follows the category suggested from the title; once picked (or when editing) it sticks.
  const [categoryChoice, setCategory] = useState<ExpenseCategory | undefined>(expense?.category);
  const category = categoryChoice ?? suggestExpenseCategory(title) ?? DEFAULT_EXPENSE_CATEGORY;
  const [note, setNoteText] = useState(expense?.note ?? "");
  const [date, setDate] = useState(() => (expense ? parseSpentOn(expense.spentOn) : new Date()));
  const [error, setError] = useState<{ field: ExpenseFormField; message: string } | null>(null);

  const payers = usePayerSplit({
    houseId,
    currentUserId,
    price: amount,
    initialAmounts: seed?.payerAmounts,
  });
  const split = useExpenseSplit({
    members: payers.members,
    totalPaise: payers.totalPaise,
    initial: seed
      ? { method: seed.splitMethod, excluded: seed.excluded, values: seed.values }
      : undefined,
  });

  const create = useCreateExpense(houseId);
  const update = useUpdateExpense(houseId, expense?.id ?? "");
  const submitting = create.isPending || update.isPending;

  const submit = async () => {
    if (submitting) return;
    const result = expenseInputFromForm({
      title,
      amount,
      category,
      note,
      date,
      parts: expensePartsFromForms(payers, split),
    });
    if (!result.ok) {
      setError({ field: result.field, message: result.message });
      if (result.field === "split") toast.error(result.message);
      return;
    }

    try {
      const saved = expense
        ? await update.mutateAsync(result.input)
        : await create.mutateAsync(result.input);
      toast.success(expense ? "Expense updated" : `Added "${saved.title}"`);
      onSaved(saved);
    } catch (cause) {
      toast.error(expenseErrorFromCause(cause, "Couldn't save that expense. Try again."));
    }
  };

  const errorFor = (field: ExpenseFormField) => (error?.field === field ? error.message : null);
  const clearError = (field: ExpenseFormField) =>
    setError((current) => (current?.field === field ? null : current));

  return {
    isEditing: !!expense,
    title,
    amount,
    category,
    note,
    date,
    payers,
    split,
    titleError: errorFor("title"),
    amountError: errorFor("amount"),
    noteError: errorFor("note"),
    submitting,
    canSubmit: !submitting && payers.totalPaise > 0 && title.trim() !== "",
    setTitle: (value: string) => {
      setTitleText(value);
      clearError("title");
    },
    setAmount: (value: string) => {
      setAmountText(value);
      clearError("amount");
      clearError("split");
    },
    setCategory,
    setNote: (value: string) => {
      setNoteText(value);
      clearError("note");
    },
    setDate,
    submit,
  };
}

export type ExpenseForm = ReturnType<typeof useExpenseForm>;
