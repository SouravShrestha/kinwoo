import { useBusyWhile } from "@kinwoo/client/activity";
import { useAuth } from "@kinwoo/client/auth";
import { useExpenses, useHouseBalances } from "@kinwoo/client/expenses";
import { useGroceryLists } from "@kinwoo/client/grocery";
import { useActiveHouse } from "@kinwoo/client/houses";
import { groupExpensesByMonth } from "@kinwoo/core/expenses";
import { hasOwnPrivateList } from "@kinwoo/core/grocery";
import { PlusCircleIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { useCallback, useMemo, useState } from "react";
import { SectionList, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { BalanceSummary } from "@/components/expenses/BalanceSummary";
import { BillsTabView, type BillsView } from "@/components/expenses/BillsTabView";
import { ExpenseRow } from "@/components/expenses/ExpenseRow";
import { PrivateSpending } from "@/components/expenses/PrivateSpending";
import { Pressable } from "@/components/Pressable";
import { openExpense, openNewExpense } from "@/lib/house-navigation";
import { useTheme } from "@/theme/ThemeProvider";

const FAB_SIZE = 48;

export default function BillsScreen() {
  const insets = useSafeAreaInsets();
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  const { activeHouse, ready } = useActiveHouse();
  const houseId = activeHouse?.house.id ?? null;
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;
  const [selectedView, setSelectedView] = useState<BillsView>("shared");
  const { data: lists } = useGroceryLists(houseId);
  const hasPrivateList = hasOwnPrivateList(lists ?? [], currentUserId);
  const view = hasPrivateList ? selectedView : "shared";

  const {
    data: expenses,
    isLoading,
    hasNextPage,
    isFetchNextPageError,
    isFetchingNextPage,
    fetchNextPage,
  } = useExpenses(houseId);
  const { data: balances } = useHouseBalances(houseId);
  useBusyWhile(isFetchingNextPage);

  const sections = useMemo(
    () =>
      groupExpensesByMonth(expenses ?? []).map((month) => ({
        key: month.key,
        title: month.label,
        data: month.expenses,
      })),
    [expenses],
  );

  const moreToFetch = hasNextPage && !isFetchNextPageError;
  const loadMore = useCallback(() => {
    if (moreToFetch && !isFetchingNextPage) void fetchNextPage();
  }, [moreToFetch, isFetchingNextPage, fetchNextPage]);

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
          Create or join a house to split bills.
        </Text>
      </View>
    );
  }

  const empty = !isLoading && sections.length === 0;

  const sharedBills = (
    <>
      <SectionList
        sections={sections}
        keyExtractor={(expense) => expense.id}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 96 }}
        ListHeaderComponent={
          balances ? (
            <View className="pb-2">
              <BalanceSummary balances={balances} />
            </View>
          ) : null
        }
        renderSectionHeader={({ section }) => (
          <Text
            accessibilityRole="header"
            className="pb-3 pt-6 font-display-medium text-sm text-muted-foreground"
          >
            {section.title}
          </Text>
        )}
        ItemSeparatorComponent={() => <View className="h-2.5" />}
        renderItem={({ item }) => (
          <ExpenseRow
            expense={item}
            currentUserId={currentUserId}
            onOpen={() => openExpense(item.id)}
          />
        )}
        ListEmptyComponent={
          empty ? (
            <View className="items-center gap-4 rounded-2xl border border-dashed border-border px-6 py-16">
              <Text className="font-display-medium text-base text-foreground">No expenses yet</Text>
              <Text className="text-center font-display-normal text-sm text-muted-foreground">
                Add rent, bills or anything you share. Split grocery purchases show up here too.
              </Text>
              <Button label="Add expense" onPress={openNewExpense} className="mt-2 px-8" />
            </View>
          ) : null
        }
      />

      {empty ? null : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add expense"
          onPress={openNewExpense}
          className="absolute bottom-6 right-6 size-12 items-center justify-center active:opacity-80"
        >
          <View className="absolute inset-2.5 rounded-full bg-primary-foreground" />
          <PlusCircleIcon size={FAB_SIZE} color={palette.primary} />
        </Pressable>
      )}
    </>
  );

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {hasPrivateList && houseId ? (
        <BillsTabView
          value={view}
          onChange={setSelectedView}
          renderPage={(page) =>
            page === "private" ? <PrivateSpending houseId={houseId} /> : sharedBills
          }
        />
      ) : (
        sharedBills
      )}
    </View>
  );
}
