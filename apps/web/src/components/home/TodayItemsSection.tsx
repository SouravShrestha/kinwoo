"use client";

import type { GroceryOverviewItem } from "@kinwoo/core/grocery";

import { ItemCarousel } from "@/components/home/ItemCarousel";

export function TodayItemsSection({
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
      title="Today’s Essentials"
      viewAll={
        items.length > 0
          ? { label: "All items for today", view: "today" }
          : { label: "View all pending items", view: "pending" }
      }
      houseId={houseId}
      items={items}
      onItemPress={onItemPress}
    />
  );
}
