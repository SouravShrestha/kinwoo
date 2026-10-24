import { useBusyWhile } from "@kinwoo/client/activity";
import { useAuth } from "@kinwoo/client/auth";
import { useOpenExpense, useOpenSettlement } from "@kinwoo/client/expenses";
import { useRecentActivity } from "@kinwoo/client/grocery";
import { useActiveHouse, useHouseMembers } from "@kinwoo/client/houses";
import { countSelected, EMPTY_FILTER_SELECTION, type FilterSelection } from "@kinwoo/core/filters";
import { ACTIVITY_EMPTY_HINT, activityFilterGroups, filterActivity } from "@kinwoo/core/grocery";
import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ActivityList } from "@/components/activity/ActivityList";
import { Filters } from "@/components/Filters";
import { EmptyItems } from "@/components/grocery/EmptyItems";
import { openExpense as openExpenseScreen, openPayment } from "@/lib/house-navigation";
import { noActivity } from "@/lib/images";
import { usePullToRefresh } from "@/lib/use-pull-to-refresh";

export default function ActivitiesScreen() {
  const insets = useSafeAreaInsets();
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
    refetch,
  } = useRecentActivity(houseId);
  useBusyWhile(isFetchingNextPage);
  const refreshControl = usePullToRefresh(refetch);
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
  const loadMore = useCallback(() => {
    if (moreToFetch && !isFetchingNextPage) void fetchNextPage();
  }, [moreToFetch, isFetchingNextPage, fetchNextPage]);

  const openExpense = useOpenExpense(houseId);
  const openSettlement = useOpenSettlement(houseId);
  const handleOpenPayment = useCallback(
    (settlementId: string | null) => void openSettlement(settlementId, openPayment),
    [openSettlement],
  );
  const handleOpenExpense = useCallback(
    (expenseId: string | null) => void openExpense(expenseId, openExpenseScreen),
    [openExpense],
  );

  const showEmpty = !isLoading && filteredEntries.length === 0 && !moreToFetch;
  const hasActiveFilters = countSelected(deferredFilters) > 0;

  const header = useMemo(
    () => (
      <>
        <View className="px-6 pb-3 pt-3">
          <View className="min-h-10 justify-center">
            <Text className="font-display-normal text-xl text-foreground">Recent Activity</Text>
          </View>
        </View>
        <Filters groups={filterGroups} value={filters} onChange={setFilters} className="pb-6" />
      </>
    ),
    [filterGroups, filters],
  );

  const empty = useMemo(
    () =>
      showEmpty ? (
        <EmptyItems
          image={noActivity}
          title={hasActiveFilters ? "No activity matches these filters" : "No activity yet"}
          hint={hasActiveFilters ? null : ACTIVITY_EMPTY_HINT}
        />
      ) : null,
    [showEmpty, hasActiveFilters],
  );

  if (!ready) {
    return <View className="flex-1 bg-background" />;
  }

  if (!activeHouse) {
    return (
      <View
        className="flex-1 items-center justify-center bg-background px-6"
        style={{ paddingTop: insets.top }}
      >
        <Text className="text-center text-base text-muted-foreground font-display-medium">
          Create or join a house to view activity.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <ActivityList
        entries={filteredEntries}
        members={members ?? []}
        currentUserId={currentUserId}
        refreshControl={refreshControl}
        onEndReached={loadMore}
        onOpenExpense={handleOpenExpense}
        onOpenPayment={handleOpenPayment}
        header={header}
        empty={empty}
      />
    </View>
  );
}
