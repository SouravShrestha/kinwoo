"use client";

import type { GroceryOverviewItem } from "@kinwoo/core/grocery";

import { ItemCarousel } from "@/components/home/ItemCarousel";

export function MyToBuySection({
  houseId,
  items,
  onItemPress,
}: {
  houseId: string;
  items: GroceryOverviewItem[];
  onItemPress: (item: GroceryOverviewItem) => void;
}) {
  return (
    <ItemCarousel
      title="I’ll Get It"
      viewAll={
        items.length > 0
          ? { label: "Everything assigned to me", view: "mine" }
          : { label: "View all assigned items", view: "assigned" }
      }
      houseId={houseId}
      items={items}
      onItemPress={onItemPress}
    />
  );
}
