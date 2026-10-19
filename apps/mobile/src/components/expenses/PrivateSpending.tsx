import { usePrivatePurchases } from "@kinwoo/client/grocery";
import {
  findBoughtGroup,
  formatPaise,
  PRIVATE_SPENDING_NOTE,
  summarizePrivateSpending,
  type PrivateSpendEntry,
} from "@kinwoo/core/grocery";
import { useMemo, useState } from "react";
import { SectionList, Text, View } from "react-native";

import { BoughtGroupSheet } from "@/components/grocery/BoughtGroupSheet";
import { ItemDetailSheet } from "@/components/grocery/ItemDetailSheet";

import { PrivatePurchaseRow } from "./PrivatePurchaseRow";

export function PrivateSpending({ houseId }: { houseId: string }) {
  const { data: items } = usePrivatePurchases(houseId);
  const spending = useMemo(() => summarizePrivateSpending(items ?? []), [items]);
  const sections = useMemo(
    () =>
      spending.months.map((month) => ({
        key: month.key,
        title: month.label,
        totalPaise: month.totalPaise,
        data: month.entries,
      })),
    [spending],
  );

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
      <SectionList
        sections={loaded ? sections : []}
        keyExtractor={(spend) => spend.key}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 96 }}
        ListHeaderComponent={
          loaded ? (
            <View className="rounded-2xl border border-border bg-card p-4">
              <Text
                accessibilityRole="header"
                className="font-display-medium text-lg text-foreground"
              >
                {formatPaise(spending.totalPaise)} spent privately
              </Text>
              <Text className="mt-1 font-display-normal text-sm text-muted-foreground">
                {PRIVATE_SPENDING_NOTE}
              </Text>
            </View>
          ) : null
        }
        renderSectionHeader={({ section }) => (
          <View className="flex-row items-baseline justify-between gap-3 pb-3 pt-6">
            <Text
              accessibilityRole="header"
              className="font-display-medium text-sm text-muted-foreground"
            >
              {section.title}
            </Text>
            <Text className="font-display-normal text-sm text-muted-foreground">
              {formatPaise(section.totalPaise)}
            </Text>
          </View>
        )}
        ItemSeparatorComponent={() => <View className="h-2.5" />}
        renderItem={({ item }) => <PrivatePurchaseRow entry={item} onOpen={() => open(item)} />}
        ListEmptyComponent={
          loaded ? (
            <View className="mt-6 items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-16">
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
