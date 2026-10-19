"use client";

import { useBusyWhile } from "@kinwoo/client/activity";
import { useAuth } from "@kinwoo/client/auth";
import { useRecentActivity } from "@kinwoo/client/grocery";
import { useActiveHouse, useHouseMembers } from "@kinwoo/client/houses";
import { countSelected, EMPTY_FILTER_SELECTION, type FilterSelection } from "@kinwoo/core/filters";
import { activityFilterGroups, filterActivity } from "@kinwoo/core/grocery";
import { useRouter } from "next/navigation";
import { useCallback, useDeferredValue, useMemo, useState } from "react";

import { ActivityList } from "@/components/activity/ActivityList";
import { Filters } from "@/components/Filters";
import { SetupHousePrompt } from "@/components/houses/SetupHousePrompt";

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
    <main className="flex min-h-[calc(100dvh-4rem)] flex-col px-6 pb-24 pt-6">
      <h1 className="pb-4 font-display text-xl font-normal text-foreground">Recent Activity</h1>

      <Filters
        groups={filterGroups}
        value={filters}
        onChange={setFilters}
        className="-mx-6 mb-6 mt-2 px-6"
      />

      <div className="flex-1">
        {!ready || isLoading ? null : filteredEntries.length === 0 && !moreToFetch ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
            <p className="font-display font-medium text-foreground">
              {countSelected(deferredFilters) > 0
                ? "No activity matches these filters"
                : "No activity yet"}
            </p>
          </div>
        ) : (
          <ActivityList
            entries={filteredEntries}
            members={members ?? []}
            currentUserId={currentUserId}
            canLoadMore={canLoadMore}
            onLoadMore={loadMore}
          />
        )}
      </div>
    </main>
  );
}
