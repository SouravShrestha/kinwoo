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
import { FlatList, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BoughtGroupSheet } from "@/components/grocery/BoughtGroupSheet";
import { ItemDetailSheet } from "@/components/grocery/ItemDetailSheet";
import { Pressable } from "@/components/Pressable";
import { goBack } from "@/lib/house-navigation";
import { useTheme } from "@/theme/ThemeProvider";

import { PrivatePurchaseRow } from "./PrivatePurchaseRow";

export function PrivateSpending({ houseId }: { houseId: string }) {
  const insets = useSafeAreaInsets();
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  const { data: items } = usePrivatePurchases(houseId);
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

  return (
    <>
      <FlatList
        data={loaded ? entries : []}
        keyExtractor={(spend) => spend.key}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        ListHeaderComponent={
          <View className="px-6 pb-4" style={{ paddingTop: insets.top + 12 }}>
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
            {loaded ? (
              <View className="mt-2">
                <Text
                  accessibilityRole="header"
                  className="font-display-normal text-xl text-foreground"
                >
                  You&apos;ve spent{" "}
                  <Text className="font-display-medium">{formatPaise(spending.totalPaise)}</Text>{" "}
                  privately
                </Text>
                <Text className="mt-2 font-display-normal text-sm text-muted-foreground">
                  {PRIVATE_SPENDING_NOTE}
                </Text>
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => <PrivatePurchaseRow entry={item} onOpen={() => open(item)} />}
        ListEmptyComponent={
          loaded ? (
            <View className="mx-4 mt-4 items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-16">
              <Text className="font-display-medium text-base text-foreground">
                No private purchases yet
              </Text>
              <Text className="text-center font-display-normal text-sm text-muted-foreground">
                Things you buy from your private lists show up here.
              </Text>
            </View>
          ) : null
        }
      />

      <BoughtGroupSheet
        open={groupSheetOpen}
        group={activeGroup}
        houseId={houseId}
        canDelete={false}
        onClose={() => setGroupSheetOpen(false)}
        onOpenItem={(itemId, listId) => {
          setGroupSheetOpen(false);
          setActiveItem({ id: itemId, listId });
        }}
        onDelete={() => undefined}
      />

      <ItemDetailSheet
        open={activeItem !== null}
        onClose={() => setActiveItem(null)}
        houseId={houseId}
        listId={activeItem?.listId ?? ""}
        itemId={activeItem?.id ?? null}
      />
    </>
  );
}
