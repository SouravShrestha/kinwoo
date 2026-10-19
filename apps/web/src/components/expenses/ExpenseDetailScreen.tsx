"use client";

import { useAuth } from "@kinwoo/client/auth";
import { expenseErrorFromCause, useDeleteExpense, useExpense } from "@kinwoo/client/expenses";
import { useActiveHouse, useHouseMembers } from "@kinwoo/client/houses";
import { toast } from "@kinwoo/client/toast";
import { CONFIRM_COPY } from "@kinwoo/core/confirm";
import {
  canManageExpense,
  EXPENSE_CATEGORY_LABELS,
  expenseSourceLabel,
  expenseYourShare,
  parseSpentOn,
  shareWeightLabel,
  SPLIT_METHOD_TITLES,
  type Expense,
} from "@kinwoo/core/expenses";
import { formatFullDate, formatPaise } from "@kinwoo/core/grocery";
import { memberDisplayName } from "@kinwoo/core/houses";
import { ArrowRightIcon } from "@kinwoo/icons";
import { useRouter } from "next/navigation";
import { useEffect, useState, type AnimationEvent } from "react";

import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Avatar } from "@/components/houses/Avatar";
import { editExpensePath, useHouseNavigation } from "@/lib/house-navigation";
import { cn } from "@/lib/utils";

import { ExpenseCategoryIcon } from "./ExpenseCategoryIcon";

const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

type PersonRow = { userId: string; name: string | null; amountPaise: number; detail?: string };

function PeopleSection({
  title,
  rows,
  avatars,
  currentUserId,
}: {
  title: string;
  rows: readonly PersonRow[];
  avatars: ReadonlyMap<string, string | null>;
  currentUserId: string | null;
}) {
  return (
    <section aria-label={title} className="space-y-3">
      <h2 className="font-display text-sm font-medium text-muted-foreground">{title}</h2>
      <ul className="space-y-2.5">
        {rows.map((row) => (
          <li key={row.userId} className="flex items-center gap-3">
            <Avatar name={row.name} url={avatars.get(row.userId) ?? null} size={32} />
            <span className="min-w-0 flex-1 truncate font-display text-base text-foreground">
              {row.userId === currentUserId ? "You" : memberDisplayName(row.name)}
              {row.detail ? (
                <span className="ml-2 text-sm text-muted-foreground">{row.detail}</span>
              ) : null}
            </span>
            <span className="font-display text-base font-medium text-foreground">
              {formatPaise(row.amountPaise)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ExpenseDetails({
  expense,
  currentUserId,
  avatars,
}: {
  expense: Expense;
  currentUserId: string | null;
  avatars: ReadonlyMap<string, string | null>;
}) {
  const share = expenseYourShare(expense, currentUserId);
  const source = expenseSourceLabel(expense);
  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-foreground">
          <ExpenseCategoryIcon category={expense.category} size={30} />
        </span>
        <h1 className="font-display text-xl font-medium text-foreground">{expense.title}</h1>
        <p className="font-display text-[34px] font-medium leading-none text-foreground">
          {formatPaise(expense.amountPaise)}
        </p>
        <p className="font-display text-sm text-muted-foreground">
          {EXPENSE_CATEGORY_LABELS[expense.category]} ·{" "}
          {formatFullDate(parseSpentOn(expense.spentOn).getTime())}
        </p>
        <p
          className={cn(
            "font-display text-sm",
            share.tone === "lent"
              ? "text-accent"
              : share.tone === "borrowed"
                ? "text-destructive"
                : "text-muted-foreground",
          )}
        >
          {share.label}
        </p>
      </div>

      {expense.note ? (
        <p className="whitespace-pre-wrap rounded-xl bg-muted px-4 py-3 font-display text-base text-foreground">
          {expense.note}
        </p>
      ) : null}

      <PeopleSection
        title="Paid by"
        rows={expense.payers}
        avatars={avatars}
        currentUserId={currentUserId}
      />
      <PeopleSection
        title={SPLIT_METHOD_TITLES[expense.splitMethod]}
        rows={expense.shares.map((entry) => ({
          userId: entry.userId,
          name: entry.name,
          amountPaise: entry.sharePaise,
          detail: shareWeightLabel(expense, entry.weight) ?? undefined,
        }))}
        avatars={avatars}
        currentUserId={currentUserId}
      />

      <p className="font-display text-xs text-muted-foreground">
        {source ? `${source}. ` : ""}Added by{" "}
        {expense.createdBy === currentUserId ? "you" : memberDisplayName(expense.createdByName)}.
      </p>
    </div>
  );
}

export function ExpenseDetailScreen({ expenseId }: { expenseId: string | null }) {
  const router = useRouter();
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;
  const { activeHouse, ready } = useActiveHouse();
  const { goBack, goHome } = useHouseNavigation();
  const houseId = activeHouse?.house.id ?? null;
  const [closing, setClosing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: expense, isError } = useExpense(houseId, expenseId);
  const { data: members } = useHouseMembers(houseId);
  const deleteExpense = useDeleteExpense(houseId ?? "");

  useEffect(() => {
    if ((ready && !activeHouse) || !expenseId) goHome();
  }, [ready, activeHouse, expenseId, goHome]);

  const onAnimationEnd = (event: AnimationEvent<HTMLElement>) => {
    if (closing && event.target === event.currentTarget) goBack();
  };

  const avatars = new Map((members ?? []).map((member) => [member.userId, member.avatarUrl]));
  const canManage =
    !!expense && canManageExpense(expense, currentUserId, activeHouse?.role === "admin");

  const handleDelete = async () => {
    if (!expense) return;
    try {
      await deleteExpense.mutateAsync(expense.id);
      toast.success(`Deleted "${expense.title}"`);
      setConfirmDelete(false);
      setClosing(true);
    } catch (cause) {
      toast.error(expenseErrorFromCause(cause, "Couldn't delete that expense. Try again."));
    }
  };

  return (
    <main
      onAnimationEnd={onAnimationEnd}
      className={cn(
        "flex h-dvh flex-col overflow-hidden bg-background",
        closing ? "sheet-panel-out" : "sheet-panel-in",
      )}
    >
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col overflow-y-auto px-6 pb-10">
        <header className="flex items-center justify-between pb-6 pt-[calc(1.25rem+env(safe-area-inset-top))]">
          <button
            type="button"
            aria-label="Back"
            disabled={closing}
            onClick={() => setClosing(true)}
            className={cn(
              "flex size-10 items-center justify-start hover:cursor-pointer",
              FOCUS_RING,
            )}
          >
            <ArrowRightIcon size={28} className="rotate-90" />
          </button>
        </header>

        {expense ? (
          <>
            <ExpenseDetails expense={expense} currentUserId={currentUserId} avatars={avatars} />
            {canManage ? (
              <div className="mt-10 flex gap-3">
                <Button
                  label="Edit"
                  variant="outline"
                  disabled={closing}
                  onClick={() => router.push(editExpensePath(expense.id))}
                />
                <Button
                  label="Delete"
                  variant="destructive"
                  disabled={closing}
                  onClick={() => setConfirmDelete(true)}
                />
              </div>
            ) : null}
          </>
        ) : isError ? (
          <p className="pt-16 text-center font-display text-base text-muted-foreground">
            We couldn&apos;t find that expense. It may have been deleted.
          </p>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        copy={CONFIRM_COPY.deleteExpense}
        isPending={deleteExpense.isPending}
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
    </main>
  );
}
