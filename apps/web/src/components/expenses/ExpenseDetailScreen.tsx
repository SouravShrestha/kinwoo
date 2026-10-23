"use client";

import { useAuth } from "@kinwoo/client/auth";
import { expenseErrorFromCause, useDeleteExpense, useExpense } from "@kinwoo/client/expenses";
import { useActiveHouse, useHouseMembers } from "@kinwoo/client/houses";
import { toast } from "@kinwoo/client/toast";
import { CONFIRM_COPY } from "@kinwoo/core/confirm";
import { canManageExpense, type Expense } from "@kinwoo/core/expenses";
import { formatFullDate, formatPaise } from "@kinwoo/core/grocery";
import { memberDisplayName } from "@kinwoo/core/houses";
import { ArrowRightIcon, EditIcon, ExpenseCategoryIcon, NoteIcon, TrashIcon } from "@kinwoo/icons";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type AnimationEvent } from "react";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Avatar } from "@/components/houses/Avatar";
import { editExpensePath, useHouseNavigation } from "@/lib/house-navigation";
import { useSwipeToClose } from "@/lib/use-swipe-to-close";
import { cn } from "@/lib/utils";

const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

const ROOT_AVATAR = 36;
const SHARE_ROW_HEIGHT = 48;
const PAYER_LINK_HEIGHT = 28;
const ICON_BUTTON =
  "flex size-9 items-center justify-center rounded-lg bg-muted text-foreground transition-opacity hover:cursor-pointer hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50";

type Avatars = ReadonlyMap<string, string | null>;

function PersonLine({
  name,
  userId,
  currentUserId,
  avatarUrl,
  verb,
  amountPaise,
  size,
  muted = false,
}: {
  name: string | null;
  userId: string;
  currentUserId: string | null;
  avatarUrl: string | null;
  verb: readonly [self: string, other: string];
  amountPaise: number;
  size: number;
  muted?: boolean;
}) {
  const isSelf = userId === currentUserId;
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <Avatar name={name} url={avatarUrl} size={size} />
      <span
        className={cn(
          "min-w-0 flex-1 truncate font-display",
          muted ? "text-sm text-muted-foreground" : "text-base text-foreground",
        )}
      >
        {isSelf ? "You" : memberDisplayName(name)} {isSelf ? verb[0] : verb[1]}{" "}
        {formatPaise(amountPaise)}
      </span>
    </div>
  );
}

// The trunk runs down from the payer's avatar; each share branches off it and the last one
// ends the trunk.
function ShareTree({
  expense,
  currentUserId,
  avatars,
}: {
  expense: Expense;
  currentUserId: string | null;
  avatars: Avatars;
}) {
  return (
    <ul style={{ marginLeft: ROOT_AVATAR / 2 }}>
      {expense.shares.map((share, index) => {
        const last = index === expense.shares.length - 1;
        return (
          <li key={share.userId} className="flex items-center" style={{ height: SHARE_ROW_HEIGHT }}>
            <div className="relative h-full w-5 shrink-0" aria-hidden>
              <div
                className="absolute left-0 top-0 w-px bg-border"
                style={{ bottom: last ? "50%" : 0 }}
              />
              <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
            </div>
            <PersonLine
              name={share.name}
              userId={share.userId}
              amountPaise={share.sharePaise}
              currentUserId={currentUserId}
              avatarUrl={avatars.get(share.userId) ?? null}
              verb={["owe", "owes"]}
              size={26}
              muted
            />
          </li>
        );
      })}
    </ul>
  );
}

function ActorLine({
  label,
  userId,
  name,
  at,
  currentUserId,
  avatars,
}: {
  label: string;
  userId: string;
  name: string | null;
  at: string;
  currentUserId: string | null;
  avatars: Avatars;
}) {
  return (
    <div className="flex items-center gap-2">
      <Avatar name={name} url={avatars.get(userId) ?? null} size={20} />
      <p className="min-w-0 flex-1 truncate font-display text-sm text-muted-foreground">
        {label} by {userId === currentUserId ? "you" : memberDisplayName(name)} on{" "}
        {formatFullDate(new Date(at).getTime())}
      </p>
    </div>
  );
}

function ExpenseDetails({
  expense,
  currentUserId,
  avatars,
}: {
  expense: Expense;
  currentUserId: string | null;
  avatars: Avatars;
}) {
  return (
    <div className="flex flex-col gap-7">
      <div className="flex gap-4">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
          <ExpenseCategoryIcon category={expense.category} size={32} />
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <h1 className="font-display text-lg font-medium text-foreground">{expense.title}</h1>
          <p className="font-display text-[calc(28px*var(--font-scale,1))] font-medium leading-[normal] text-foreground">
            {formatPaise(expense.amountPaise)}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <ActorLine
          label="Added"
          userId={expense.createdBy}
          name={expense.createdByName}
          at={expense.createdAt}
          currentUserId={currentUserId}
          avatars={avatars}
        />
        {expense.updatedBy ? (
          <ActorLine
            label="Last edited"
            userId={expense.updatedBy}
            name={expense.updatedByName}
            at={expense.updatedAt}
            currentUserId={currentUserId}
            avatars={avatars}
          />
        ) : null}
        {expense.note ? (
          <div className="flex items-start gap-3">
            <span className="pt-0.5 text-muted-foreground">
              <NoteIcon size={18} />
            </span>
            <p className="min-w-0 flex-1 whitespace-pre-wrap font-display text-base text-foreground">
              {expense.note}
            </p>
          </div>
        ) : null}
      </div>

      <div className="my-1 h-px bg-border" />

      <div>
        {expense.payers.map((payer, index) => (
          <div key={payer.userId}>
            {index > 0 ? (
              <div
                className="flex flex-col py-2"
                style={{ height: PAYER_LINK_HEIGHT, marginLeft: ROOT_AVATAR / 2 }}
                aria-hidden
              >
                <div className="w-px flex-1 bg-border" />
              </div>
            ) : null}
            <div className="flex">
              <PersonLine
                {...payer}
                currentUserId={currentUserId}
                avatarUrl={avatars.get(payer.userId) ?? null}
                verb={["paid", "paid"]}
                size={ROOT_AVATAR}
              />
            </div>
          </div>
        ))}
        <div className="mt-2">
          <ShareTree expense={expense} currentUserId={currentUserId} avatars={avatars} />
        </div>
      </div>
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
  const screenRef = useRef<HTMLElement>(null);
  useSwipeToClose(screenRef, !closing, () => setClosing(true));
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
  const canManage = !!expense && canManageExpense(currentUserId);

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
      ref={screenRef}
      onAnimationEnd={onAnimationEnd}
      className={cn(
        "flex h-dvh flex-col overflow-hidden bg-background",
        closing ? "sheet-panel-out" : "sheet-panel-in",
      )}
    >
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col overflow-y-auto px-6 pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
        <header className="flex items-center justify-between pb-8 pt-[calc(1.25rem+env(safe-area-inset-top))]">
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
          {expense && canManage ? (
            <div className="flex gap-4">
              <button
                type="button"
                aria-label="Edit expense"
                disabled={closing}
                onClick={() => router.push(editExpensePath(expense.id))}
                className={cn(ICON_BUTTON, FOCUS_RING)}
              >
                <EditIcon size={16} />
              </button>
              <button
                type="button"
                aria-label="Delete expense"
                disabled={closing}
                onClick={() => setConfirmDelete(true)}
                className={cn(ICON_BUTTON, FOCUS_RING)}
              >
                <TrashIcon size={16} />
              </button>
            </div>
          ) : null}
        </header>

        {expense ? (
          <ExpenseDetails expense={expense} currentUserId={currentUserId} avatars={avatars} />
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
