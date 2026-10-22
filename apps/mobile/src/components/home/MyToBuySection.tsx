import type { GroceryOverviewItem } from "@kinwoo/core/grocery";
import { Text, View } from "react-native";

import { OverviewItemRow } from "@/components/home/OverviewItemRow";
import { SectionHeader } from "@/components/home/SectionHeader";

type MyToBuySectionProps = {
  items: GroceryOverviewItem[];
  currentUserId: string;
  onItemPress: (item: GroceryOverviewItem) => void;
};

export function MyToBuySection({ items, currentUserId, onItemPress }: MyToBuySectionProps) {
  return (
    <View className="gap-3">
      <SectionHeader title="My to-buy" count={items.length} tone="primary" />
      {items.length === 0 ? (
        <View className="items-center justify-center rounded-2xl border border-dashed border-border p-4">
          <Text className="font-display-normal text-sm text-muted-foreground">
            You haven't claimed any items to buy
          </Text>
        </View>
      ) : (
        <View className="gap-2">
          {items.map((item) => (
            <OverviewItemRow
              key={item.id}
              item={item}
              badge={{
                label: item.assignedTo === currentUserId ? "Assigned" : "Claimed",
                tone: "primary",
              }}
              onPress={onItemPress}
            />
          ))}
        </View>
      )}
    </View>
  );
}
