"use client";

import {
  EXPENSE_CATEGORY_LABELS,
  expensePayersLabel,
  expenseYourShare,
  parseSpentOn,
  type Expense,
} from "@kinwoo/core/expenses";
import { formatPaise, formatPickedDate } from "@kinwoo/core/grocery";

import { cn } from "@/lib/utils";

import { ExpenseCategoryIcon } from "./ExpenseCategoryIcon";

const TONE_CLASS = {
  lent: "text-accent",
  borrowed: "text-destructive",
  neutral: "text-muted-foreground",
} as const;

export function ExpenseRow({
  expense,
  currentUserId,
  onOpen,
}: {
  expense: Expense;
  currentUserId: string | null;
  onOpen: () => void;
}) {
  const share = expenseYourShare(expense, currentUserId);
  const date = formatPickedDate(parseSpentOn(expense.spentOn));
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${expense.title}, ${formatPaise(expense.amountPaise)}, ${date}. ${share.label}`}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:cursor-pointer hover:border-foreground/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
    >
      <span
        aria-hidden
        title={EXPENSE_CATEGORY_LABELS[expense.category]}
        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground"
      >
        <ExpenseCategoryIcon category={expense.category} size={22} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-display text-sm font-medium text-foreground">
          {expense.title}
        </span>
        <span className="truncate font-display text-xs text-muted-foreground">
          {date} · {expensePayersLabel(expense, currentUserId)}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="font-display text-sm font-medium text-foreground">
          {formatPaise(expense.amountPaise)}
        </span>
        <span className={cn("font-display text-xs", TONE_CLASS[share.tone])}>{share.label}</span>
      </span>
    </button>
  );
}
