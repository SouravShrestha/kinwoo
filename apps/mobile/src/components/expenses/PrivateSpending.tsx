import { LOAD_FAILED_MESSAGE } from "@kinwoo/core/app";
import { usePrivatePurchases } from "@kinwoo/client/grocery";
import {
  findBoughtGroup,
  formatPaise,
  PRIVATE_SPENDING_NOTE,
  summarizePrivateSpending,
  type PrivateSpendEntry,
} from "@kinwoo/core/grocery";
import { ArrowRightIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BoughtGroupSheet } from "@/components/grocery/BoughtGroupSheet";
import { EmptyItems } from "@/components/grocery/EmptyItems";
import { ItemDetailSheet } from "@/components/grocery/ItemDetailSheet";
import { Pressable } from "@/components/Pressable";

import {
  ExpenseRowsSkeleton,
  PrivateSpendingHeaderSkeleton,
} from "@/components/skeleton/skeletons";
import { SwipeDownScreen } from "@/components/SwipeDownScreen";
import { goBack } from "@/lib/house-navigation";
import { noExpense } from "@/lib/images";
import { useSwipeDownToDismiss } from "@/lib/use-swipe-down-to-dismiss";
import { useTheme } from "@/theme/ThemeProvider";

import { PrivatePurchaseRow } from "./PrivatePurchaseRow";

export function PrivateSpending({ houseId }: { houseId: string }) {
  const insets = useSafeAreaInsets();
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  const { data: items, isError } = usePrivatePurchases(houseId);
  const spending = useMemo(() => summarizePrivateSpending(items ?? []), [items]);
  const entries = useMemo(() => spending.months.flatMap((month) => month.entries), [spending]);

  const [activeItem, setActiveItem] = useState<{ id: string; listId: string } | null>(null);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [groupSheetOpen, setGroupSheetOpen] = useState(false);
  const activeGroup = useMemo(
    () => (activeBatchId ? findBoughtGroup(items ?? [], activeBatchId) : null),
    [activeBatchId, items],
  );

  const open = (spend: PrivateSpendEntry) => {
    if (spend.entry.kind === "group") {
      setActiveBatchId(spend.entry.batchId);
      setGroupSheetOpen(true);
    } else {
      setActiveItem({ id: spend.entry.item.id, listId: spend.entry.item.listId });
    }
  };

  const loaded = items !== undefined;
  const loadFailed = isError && !loaded;
  const { pan, scrollGesture, onScroll, sheetStyle } = useSwipeDownToDismiss(goBack);

  return (
    <SwipeDownScreen pan={pan} sheetStyle={sheetStyle}>
      <GestureDetector gesture={scrollGesture}>
        <Animated.ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          // Overscroll at the top would fight the pull-down; the sheet itself gives the feedback.
          bounces={false}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 40 }}
        >
          <View className="px-6 pb-4" style={{ paddingTop: insets.top + 20 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={goBack}
              hitSlop={12}
              className="-ml-1 size-10 items-start justify-center"
            >
              <View style={{ transform: [{ rotate: "90deg" }] }}>
                <ArrowRightIcon size={28} color={palette.foreground} />
              </View>
            </Pressable>
            {loaded || loadFailed ? (
              <View className="mt-2">
                <Text
                  accessibilityRole="header"
                  className="font-display-normal text-xl text-foreground"
                >
                  You&apos;ve spent{" "}
                  <Text className="font-display-medium">{formatPaise(spending.totalPaise)}</Text>{" "}
                  privately
                </Text>
                {loaded ? (
                  <Text className="mt-2 font-display-normal text-sm text-muted-foreground">
                    {PRIVATE_SPENDING_NOTE}
                  </Text>
                ) : null}
              </View>
            ) : (
              <PrivateSpendingHeaderSkeleton />
            )}
          </View>
          {loadFailed ? (
            <View className="flex-1">
              <EmptyItems image={noExpense} title={LOAD_FAILED_MESSAGE} />
            </View>
          ) : loaded && entries.length === 0 ? (
            <View className="flex-1">
              <EmptyItems
                image={noExpense}
                title="No private purchases yet"
                hint="Things you buy from your private lists show up here."
              />
            </View>
          ) : null}

          {loaded ? (
            entries.map((spend) => (
              <PrivatePurchaseRow key={spend.key} entry={spend} onOpen={() => open(spend)} />
            ))
          ) : (
            <ExpenseRowsSkeleton count={4} />
          )}
        </Animated.ScrollView>
      </GestureDetector>

      <BoughtGroupSheet
        open={groupSheetOpen}
        group={activeGroup}
        houseId={houseId}
        canArchive={false}
        onClose={() => setGroupSheetOpen(false)}
        onOpenItem={(itemId, listId) => {
          setGroupSheetOpen(false);
          setActiveItem({ id: itemId, listId });
        }}
        onArchive={() => undefined}
      />

      <ItemDetailSheet
        open={activeItem !== null}
        onClose={() => setActiveItem(null)}
        houseId={houseId}
        listId={activeItem?.listId ?? ""}
        itemId={activeItem?.id ?? null}
      />
    </SwipeDownScreen>
  );
}
