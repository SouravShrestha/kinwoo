import { useBusyWhile } from "@kinwoo/client/activity";
import { useAuth } from "@kinwoo/client/auth";
import {
  expenseErrorFromCause,
  useExpenses,
  useHouseBalances,
  useSetSimplifyDebts,
  useSettlements,
} from "@kinwoo/client/expenses";
import { useActiveHouse } from "@kinwoo/client/houses";
import { toast } from "@kinwoo/client/toast";
import { expenseFeed } from "@kinwoo/core/expenses";
import { MoreVerticalIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { useCallback, useMemo, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { BalanceSummary } from "@/components/expenses/BalanceSummary";
import { ExpenseActions } from "@/components/expenses/ExpenseActions";
import { ExpenseRow } from "@/components/expenses/ExpenseRow";
import { ExpensesMenuSheet } from "@/components/expenses/ExpensesMenuSheet";
import { PaymentRow } from "@/components/expenses/PaymentRow";
import { Fab } from "@/components/Fab";
import { EmptyItems } from "@/components/grocery/EmptyItems";
import { Pressable } from "@/components/Pressable";
import {
  openExpense,
  openNewExpense,
  openPayment,
  openPrivateSpending,
} from "@/lib/house-navigation";
import { usePullToRefresh } from "@/lib/use-pull-to-refresh";
import { useTheme } from "@/theme/ThemeProvider";

export default function BillsScreen() {
  const insets = useSafeAreaInsets();
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  const { activeHouse, ready } = useActiveHouse();
  const houseId = activeHouse?.house.id ?? null;
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;
  const [menuOpen, setMenuOpen] = useState(false);

  const {
    data: expenses,
    isLoading,
    hasNextPage,
    isFetchNextPageError,
    isFetchingNextPage,
    fetchNextPage,
    refetch: refetchExpenses,
  } = useExpenses(houseId);
  const { data: settlements, refetch: refetchSettlements } = useSettlements(houseId);
  const feed = useMemo(
    () => expenseFeed(expenses ?? [], settlements ?? [], !!hasNextPage),
    [expenses, settlements, hasNextPage],
  );
  const simplifyDebts = activeHouse?.house.simplifyDebts ?? false;
  const setSimplifyDebts = useSetSimplifyDebts(houseId ?? "");
  const {
    data: balances,
    isPlaceholderData,
    refetch: refetchBalances,
  } = useHouseBalances(houseId, simplifyDebts);
  useBusyWhile(isFetchingNextPage || isPlaceholderData);
  const refreshControl = usePullToRefresh(
    useCallback(
      () => Promise.all([refetchExpenses(), refetchSettlements(), refetchBalances()]),
      [refetchExpenses, refetchSettlements, refetchBalances],
    ),
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

  const menuButton = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Expense options"
      onPress={() => setMenuOpen(true)}
      className="-mr-3 size-10 items-center justify-center active:opacity-70"
    >
      <MoreVerticalIcon size={3.5} color={palette.foreground} />
    </Pressable>
  );

  const empty = !isLoading && feed.length === 0;

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <FlatList
        data={feed}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ paddingBottom: 96 }}
        ListHeaderComponent={
          <View className="pt-3">
            <View className="pb-4">
              <View className="items-end px-6">{menuButton}</View>
              {balances ? (
                <View className="mt-2 px-6">
                  <BalanceSummary balances={balances} />
                </View>
              ) : null}
              {balances ? (
                <View className="mt-8 mb-1">
                  <ExpenseActions />
                </View>
              ) : null}
            </View>
          </View>
        }
        renderItem={({ item }) =>
          item.kind === "expense" ? (
            <ExpenseRow
              expense={item.expense}
              currentUserId={currentUserId}
              onOpen={() => openExpense(item.id)}
            />
          ) : (
            <PaymentRow
              settlement={item.settlement}
              currentUserId={currentUserId}
              onOpen={() => openPayment(item.id)}
            />
          )
        }
        ListEmptyComponent={
          empty ? (
            <View className="py-12">
              <EmptyItems
                title="Nothing to see here"
                hint="Add rent, bills or anything you share. Split grocery purchases show up here too."
              >
                <Button label="Add expense" onPress={openNewExpense} className="px-8" />
              </EmptyItems>
            </View>
          ) : null
        }
      />

      {empty ? null : <Fab label="Add expense" onPress={openNewExpense} />}

      <ExpensesMenuSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        simplifyDebts={simplifyDebts}
        onSimplifyDebtsChange={(enabled) =>
          setSimplifyDebts.mutate(enabled, {
            onError: (error) =>
              toast.error(
                expenseErrorFromCause(error, "Couldn't change simplify debts. Try again."),
              ),
          })
        }
        onViewPrivate={() => {
          setMenuOpen(false);
          openPrivateSpending();
        }}
      />
    </View>
  );
}
