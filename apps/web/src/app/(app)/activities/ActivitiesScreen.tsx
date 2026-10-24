"use client";

import { useBusyWhile } from "@kinwoo/client/activity";
import { useAuth } from "@kinwoo/client/auth";
import { useOpenExpense, useOpenSettlement } from "@kinwoo/client/expenses";
import { useRecentActivity } from "@kinwoo/client/grocery";
import { useActiveHouse, useHouseMembers } from "@kinwoo/client/houses";
import { countSelected, EMPTY_FILTER_SELECTION, type FilterSelection } from "@kinwoo/core/filters";
import { ACTIVITY_EMPTY_HINT, activityFilterGroups, filterActivity } from "@kinwoo/core/grocery";
import { useRouter } from "next/navigation";
import { useCallback, useDeferredValue, useMemo, useState } from "react";

import { ActivityList } from "@/components/activity/ActivityList";
import { Filters } from "@/components/Filters";
import { EmptyItems } from "@/components/grocery/EmptyItems";
import { SetupHousePrompt } from "@/components/houses/SetupHousePrompt";
import { expensePath, paymentPath } from "@/lib/house-navigation";

export function ActivitiesScreen() {
  const router = useRouter();
  const { activeHouse, ready } = useActiveHouse();
  const houseId = activeHouse?.house.id ?? null;
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;

  const {
    data: entries,
    isLoading,
    hasNextPage,
    isFetchNextPageError,
    isFetchingNextPage,
    fetchNextPage,
  } = useRecentActivity(houseId);
  useBusyWhile(isFetchingNextPage);
  const { data: members } = useHouseMembers(houseId);
  const [filters, setFilters] = useState<FilterSelection>(EMPTY_FILTER_SELECTION);

  const filterGroups = useMemo(
    () => activityFilterGroups(entries ?? [], currentUserId),
    [entries, currentUserId],
  );
  const deferredFilters = useDeferredValue(filters);
  useBusyWhile(deferredFilters !== filters);
  const filteredEntries = useMemo(
    () => filterActivity(entries ?? [], deferredFilters, currentUserId),
    [entries, deferredFilters, currentUserId],
  );

  const moreToFetch = hasNextPage && !isFetchNextPageError;
  const canLoadMore = moreToFetch && !isFetchingNextPage;
  const loadMore = useCallback(() => void fetchNextPage(), [fetchNextPage]);

  const openExpense = useOpenExpense(houseId);
  const openSettlement = useOpenSettlement(houseId);
  const handleOpenPayment = useCallback(
    (settlementId: string | null) =>
      void openSettlement(settlementId, (id) => router.push(paymentPath(id))),
    [openSettlement, router],
  );
  const handleOpenExpense = useCallback(
    (expenseId: string | null) => void openExpense(expenseId, (id) => router.push(expensePath(id))),
    [openExpense, router],
  );

  if (ready && !activeHouse) {
    return (
      <main className="flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center p-6 text-center">
        <SetupHousePrompt
          onCreate={() => router.push("/house/create")}
          onJoin={() => router.push("/house/join")}
        />
      </main>
    );
  }

  return (
    <main className="flex min-h-[calc(100dvh-4rem)] flex-col px-4 pb-24 pt-[calc(0.75rem+env(safe-area-inset-top))]">
      <h1 className="mb-4 flex min-h-10 items-center px-2 font-display text-xl font-normal text-foreground">
        Recent Activity
      </h1>

      <Filters
        groups={filterGroups}
        value={filters}
        onChange={setFilters}
        className="-mx-4 mb-6 mt-2 px-5"
      />

      <div className="flex flex-1 flex-col">
        {!ready || isLoading ? null : filteredEntries.length === 0 && !moreToFetch ? (
          <EmptyItems
            image="activity"
            title={
              countSelected(deferredFilters) > 0
                ? "No activity matches these filters"
                : "No activity yet"
            }
            hint={countSelected(deferredFilters) > 0 ? null : ACTIVITY_EMPTY_HINT}
          />
        ) : (
          <ActivityList
            entries={filteredEntries}
            members={members ?? []}
            currentUserId={currentUserId}
            canLoadMore={canLoadMore}
            onLoadMore={loadMore}
            onOpenExpense={handleOpenExpense}
            onOpenPayment={handleOpenPayment}
          />
        )}
      </div>
    </main>
  );
}
