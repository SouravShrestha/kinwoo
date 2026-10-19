import { useBusyWhile } from "@kinwoo/client/activity";
import { useAuth } from "@kinwoo/client/auth";
import { useRecentActivity } from "@kinwoo/client/grocery";
import { useActiveHouse, useHouseMembers } from "@kinwoo/client/houses";
import { countSelected, EMPTY_FILTER_SELECTION, type FilterSelection } from "@kinwoo/core/filters";
import { activityFilterGroups, filterActivity } from "@kinwoo/core/grocery";
import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ActivityList } from "@/components/activity/ActivityList";
import { Filters } from "@/components/Filters";

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
  const loadMore = useCallback(() => {
    if (moreToFetch && !isFetchingNextPage) void fetchNextPage();
  }, [moreToFetch, isFetchingNextPage, fetchNextPage]);

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
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-sm text-muted-foreground font-display-normal">
            {hasActiveFilters ? "No activity matches these filters" : "No activity yet"}
          </Text>
        </View>
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
        onEndReached={loadMore}
        header={header}
        empty={empty}
      />
    </View>
  );
}
