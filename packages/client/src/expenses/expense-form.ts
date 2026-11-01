import {
  DEFAULT_EXPENSE_CATEGORY,
  expenseFormSeed,
  paiseToAmountDraft,
  parseSpentOn,
  suggestExpenseCategory,
  type Expense,
  type ExpenseCategory,
} from "@kinwoo/core/expenses";
import {
  amountErrorMessage,
  boughtAtForDate,
  isSameLocalDay,
  parseRupeesToPaise,
  type PrivateTransaction,
} from "@kinwoo/core/grocery";
import { useMemo, useState } from "react";

import { useUpdatePrivatePurchase } from "../grocery/mutations";
import { useHouseMembers } from "../houses/queries";
import { toast } from "../toast";
import { groceryErrorFromCause } from "../grocery/errors";
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
  privatePurchase = null,
  onSaved,
}: {
  houseId: string;
  currentUserId: string | null;
  expense?: Expense | null;
  // Edits a private list's purchase through this form: only amount and date can change.
  privatePurchase?: PrivateTransaction | null;
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
  // Scans a few thousand keywords, so it runs when the title changes rather than on every render.
  const suggestedCategory = useMemo(() => suggestExpenseCategory(title), [title]);
  const category = categoryChoice ?? suggestedCategory ?? DEFAULT_EXPENSE_CATEGORY;
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
  const updatePrivate = useUpdatePrivatePurchase(houseId, privatePurchase?.listId ?? "");
  const submitting = create.isPending || update.isPending || updatePrivate.isPending;

  const submitPrivate = async (purchase: PrivateTransaction) => {
    const parsed = parseRupeesToPaise(amount);
    if (!parsed.ok) {
      setError({ field: "amount", message: amountErrorMessage(parsed.error) });
      return;
    }
    if (parsed.value === null && purchase.lines.length > 0) {
      setError({ field: "amount", message: "Enter the total amount." });
      return;
    }
    const boughtAt = isSameLocalDay(date, new Date(purchase.boughtAt))
      ? purchase.boughtAt
      : (boughtAtForDate(date) ?? new Date().toISOString());

    try {
      await updatePrivate.mutateAsync({
        itemId: purchase.itemId,
        input: { pricePaise: parsed.value, store: purchase.store, boughtAt },
      });
      toast.success("Expense updated");
      if (expense) onSaved(expense);
    } catch (cause) {
      toast.error(groceryErrorFromCause(cause, "Couldn't save that expense. Try again."));
    }
  };

  const submit = async () => {
    if (submitting) return;
    if (privatePurchase) return submitPrivate(privatePurchase);
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
    isPrivate: privatePurchase !== null,
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
    canSubmit:
      !submitting && title.trim() !== "" && (privatePurchase !== null || payers.totalPaise > 0),
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
