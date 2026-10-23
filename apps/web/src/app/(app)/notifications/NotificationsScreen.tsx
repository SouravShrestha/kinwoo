"use client";

import { useAuth } from "@kinwoo/client/auth";
import { useOpenExpense, useOpenSettlement } from "@kinwoo/client/expenses";
import { useActiveHouse, useHouseMembers } from "@kinwoo/client/houses";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@kinwoo/client/notifications";
import { toast } from "@kinwoo/client/toast";
import {
  activityExpenseId,
  activitySettlementId,
  type GroceryActivityEntry,
} from "@kinwoo/core/grocery";
import { TOAST_MESSAGES } from "@kinwoo/core/toast";
import { NotificationIcon } from "@kinwoo/icons";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { ActivityList } from "@/components/activity/ActivityList";
import { BackButton } from "@/components/BackButton";
import { expensePath, paymentPath } from "@/lib/house-navigation";

export function NotificationsScreen() {
  const router = useRouter();
  const { activeHouse } = useActiveHouse();
  const houseId = activeHouse?.house.id ?? null;
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;

  const { data: entries, isLoading } = useNotifications(currentUserId);
  const { data: members } = useHouseMembers(houseId);
  const { mutate: markRead } = useMarkNotificationRead(currentUserId);
  const { mutate: markAllRead } = useMarkAllNotificationsRead(currentUserId);

  const openExpense = useOpenExpense(houseId);
  const openSettlement = useOpenSettlement(houseId);

  const handleOpen = useCallback(
    (entry: GroceryActivityEntry) => {
      if (!entry.readAt) markRead(entry.id);

      const expenseId = activityExpenseId(entry);
      const settlementId = activitySettlementId(entry);
      if (expenseId) {
        void openExpense(expenseId, (id) => router.push(expensePath(id)));
      } else if (settlementId) {
        void openSettlement(settlementId, (id) => router.push(paymentPath(id)));
      } else {
        router.push(entry.type === "grocery_item.assigned" ? "/tasks" : "/");
      }
    },
    [markRead, openExpense, openSettlement, router],
  );

  const hasUnread = entries?.some((entry) => !entry.readAt) ?? false;
  const handleMarkAllRead = () =>
    markAllRead(undefined, { onError: () => toast.error(TOAST_MESSAGES.notificationsReadFailed) });

  return (
    <main className="flex min-h-[calc(100dvh-4rem)] flex-col px-4 pb-24 pt-[calc(0.75rem+env(safe-area-inset-top))]">
      <div className="mb-4 flex min-h-10 items-center justify-between px-2">
        <BackButton />
        {hasUnread ? (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="flex h-10 items-center gap-1.5 font-display text-xs font-medium text-foreground hover:cursor-pointer hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            Read all
          </button>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col">
        {isLoading ? null : !entries?.length ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <span className="text-muted-foreground">
              <NotificationIcon size={48} />
            </span>
            <p className="mt-4 font-display text-base font-medium text-foreground">
              No notification yet
            </p>
            <p className="mt-1 max-w-xs font-display text-sm font-normal text-muted-foreground">
              You&apos;ve got a blank slate (for now). We&apos;ll let you know when updates arrive.
            </p>
          </div>
        ) : (
          <ActivityList
            entries={entries}
            members={members ?? []}
            currentUserId={currentUserId}
            onOpenEntry={handleOpen}
          />
        )}
      </div>
    </main>
  );
}
