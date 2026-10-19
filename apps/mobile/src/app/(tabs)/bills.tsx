import { useBusyWhile } from "@kinwoo/client/activity";
import { useAuth } from "@kinwoo/client/auth";
import {
  expenseErrorFromCause,
  useExpenses,
  useHouseBalances,
  useSetSimplifyDebts,
} from "@kinwoo/client/expenses";
import { useActiveHouse } from "@kinwoo/client/houses";
import { toast } from "@kinwoo/client/toast";
import { MoreVerticalIcon, PlusCircleIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { useCallback, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { BalanceSummary } from "@/components/expenses/BalanceSummary";
import { ExpenseActions } from "@/components/expenses/ExpenseActions";
import { ExpenseRow } from "@/components/expenses/ExpenseRow";
import { ExpensesMenuSheet } from "@/components/expenses/ExpensesMenuSheet";
import { Pressable } from "@/components/Pressable";
import { openExpense, openNewExpense, openPrivateSpending } from "@/lib/house-navigation";
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
  const [menuOpen, setMenuOpen] = useState(false);

  const {
    data: expenses,
    isLoading,
    hasNextPage,
    isFetchNextPageError,
    isFetchingNextPage,
    fetchNextPage,
  } = useExpenses(houseId);
  const simplifyDebts = activeHouse?.house.simplifyDebts ?? false;
  const setSimplifyDebts = useSetSimplifyDebts(houseId ?? "");
  const { data: balances, isPlaceholderData } = useHouseBalances(houseId, simplifyDebts);
  useBusyWhile(isFetchingNextPage || isPlaceholderData);

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

  const empty = !isLoading && (expenses ?? []).length === 0;

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={expenses ?? []}
        keyExtractor={(expense) => expense.id}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ paddingBottom: 96 }}
        ListHeaderComponent={
          <View style={{ paddingTop: insets.top + 12 }}>
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
        renderItem={({ item }) => (
          <ExpenseRow
            expense={item}
            currentUserId={currentUserId}
            onOpen={() => openExpense(item.id)}
          />
        )}
        ListEmptyComponent={
          empty ? (
            <View className="mx-4 mt-4 items-center gap-4 rounded-2xl border border-dashed border-border px-6 py-16">
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
          className="absolute bottom-6 right-4 size-12 items-center justify-center active:opacity-80"
        >
          <View className="absolute inset-2.5 rounded-full bg-primary-foreground" />
          <PlusCircleIcon size={FAB_SIZE} color={palette.primary} />
        </Pressable>
      )}

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
