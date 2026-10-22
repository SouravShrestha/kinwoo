import type { GroceryOverviewItem } from "@kinwoo/core/grocery";
import { Text, View } from "react-native";

import { OverviewItemRow, type OverviewBadge } from "@/components/home/OverviewItemRow";
import { SectionHeader } from "@/components/home/SectionHeader";

type TodayItemsSectionProps = {
  items: GroceryOverviewItem[];
  onItemPress: (item: GroceryOverviewItem) => void;
};

function badgeFor(item: GroceryOverviewItem): OverviewBadge {
  if (item.status === "claimed") return { label: item.claimedByName ?? "Claimed", tone: "primary" };
  if (item.status === "assigned") {
    return {
      label: item.assignedToName ? `→ ${item.assignedToName}` : "Assigned",
      tone: "primary",
    };
  }
  return { label: "Unclaimed", tone: "muted" };
}

export function TodayItemsSection({ items, onItemPress }: TodayItemsSectionProps) {
  return (
    <View className="gap-3">
      <SectionHeader title="Needs buying today" count={items.length} tone="destructive" />
      {items.length === 0 ? (
        <View className="items-center justify-center rounded-2xl border border-dashed border-border p-4">
          <Text className="font-display-normal text-sm text-muted-foreground">
            Nothing urgently needed today
          </Text>
        </View>
      ) : (
        <View className="gap-2">
          {items.map((item) => (
            <OverviewItemRow
              key={item.id}
              item={item}
              badge={badgeFor(item)}
              onPress={onItemPress}
            />
          ))}
        </View>
      )}
    </View>
  );
}
