"use client";

import {
  EXPENSE_CATEGORY_LABELS,
  expensePayersLabel,
  expenseShareSummary,
  parseSpentOn,
  spentOnParts,
  type Expense,
} from "@kinwoo/core/expenses";
import { formatPaise, formatPickedDate } from "@kinwoo/core/grocery";

import { ExpenseCategoryIcon } from "@kinwoo/icons";

import { cn } from "@/lib/utils";

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
  const share = expenseShareSummary(expense, currentUserId);
  const shareAmount = share.amountPaise === null ? null : formatPaise(share.amountPaise);
  const { month, day } = spentOnParts(expense.spentOn);
  const payers = expensePayersLabel(expense, currentUserId);
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${expense.title}, ${formatPickedDate(parseSpentOn(expense.spentOn))}. ${payers}. ${share.label}${shareAmount ? ` ${shareAmount}` : ""}`}
      className="flex w-full items-center px-4 py-5 text-left transition-colors hover:cursor-pointer hover:bg-muted/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground"
    >
      <span aria-hidden className="flex w-8 shrink-0 flex-col items-center font-display">
        <span className="text-xs text-muted-foreground">{month}</span>
        <span className="text-lg leading-6 text-muted-foreground">{day}</span>
      </span>
      <span
        aria-hidden
        title={EXPENSE_CATEGORY_LABELS[expense.category]}
        className="ml-3 mr-4 flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground"
      >
        <ExpenseCategoryIcon category={expense.category} size={22} />
      </span>
      <span className="mr-3 flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-display text-base text-foreground">{expense.title}</span>
        <span className="truncate font-display text-xs text-muted-foreground">{payers}</span>
      </span>
      <span className={cn("flex shrink-0 flex-col items-end gap-0.5", TONE_CLASS[share.tone])}>
        <span className="font-display text-[11px]">{share.label}</span>
        {shareAmount ? (
          <span className="font-display text-base font-medium">{shareAmount}</span>
        ) : null}
      </span>
    </button>
  );
}
