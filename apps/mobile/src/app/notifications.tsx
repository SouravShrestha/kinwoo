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
import { ArrowRightIcon, NotificationIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { router } from "expo-router";
import { useCallback, useMemo } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ActivityList } from "@/components/activity/ActivityList";
import { Pressable } from "@/components/Pressable";
import {
  goBack,
  goHome,
  openExpense as openExpenseScreen,
  openPayment,
} from "@/lib/house-navigation";
import { usePullToRefresh } from "@/lib/use-pull-to-refresh";
import { useTheme } from "@/theme/ThemeProvider";

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { resolvedTheme } = useTheme();
  const { activeHouse } = useActiveHouse();
  const houseId = activeHouse?.house.id ?? null;
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;

  const { data: entries, isLoading, refetch } = useNotifications(currentUserId);
  const refreshControl = usePullToRefresh(refetch);
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
        void openExpense(expenseId, openExpenseScreen);
      } else if (settlementId) {
        void openSettlement(settlementId, openPayment);
      } else if (entry.type === "grocery_item.assigned") {
        router.dismissTo("/tasks");
      } else {
        goHome();
      }
    },
    [markRead, openExpense, openSettlement],
  );

  const hasUnread = entries?.some((entry) => !entry.readAt) ?? false;

  const header = useMemo(
    () => (
      <View className="px-6 pb-3 pt-3">
        <View className="min-h-10 flex-row items-center justify-between">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={goBack}
            hitSlop={12}
            className="size-9 items-start justify-center"
          >
            <View style={{ transform: [{ rotate: "180deg" }] }}>
              <ArrowRightIcon size={26} color={colors[resolvedTheme].foreground} />
            </View>
          </Pressable>
          {hasUnread ? (
            <Pressable
              accessibilityRole="button"
              hitSlop={12}
              onPress={() =>
                markAllRead(undefined, {
                  onError: () => toast.error(TOAST_MESSAGES.notificationsReadFailed),
                })
              }
              className="h-10 flex-row items-center gap-1.5 active:opacity-60"
            >
              <Text className="font-display-medium text-xs text-foreground">Read all</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    ),
    [hasUnread, markAllRead, resolvedTheme],
  );

  const empty = useMemo(
    () =>
      isLoading ? null : (
        <View className="flex-1 items-center justify-center px-6">
          <NotificationIcon size={48} color={colors[resolvedTheme].mutedForeground} />
          <Text className="mt-4 text-center font-display-medium text-base text-foreground">
            No notification yet
          </Text>
          <Text className="mt-1 max-w-xs text-center font-display-normal text-sm text-muted-foreground">
            You&apos;ve got a blank slate (for now). We&apos;ll let you know when updates arrive.
          </Text>
        </View>
      ),
    [isLoading, resolvedTheme],
  );

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <ActivityList
        entries={entries ?? []}
        members={members ?? []}
        currentUserId={currentUserId}
        refreshControl={refreshControl}
        onOpenEntry={handleOpen}
        header={header}
        empty={empty}
      />
    </View>
  );
}
