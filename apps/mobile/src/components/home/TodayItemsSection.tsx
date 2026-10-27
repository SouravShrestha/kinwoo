import type { GroceryOverviewItem } from "@kinwoo/core/grocery";

import { ItemCarousel } from "@/components/home/ItemCarousel";

type TodayItemsSectionProps = {
  houseId: string;
  items: GroceryOverviewItem[];
  onItemPress: (item: GroceryOverviewItem) => void;
};

export function TodayItemsSection({ houseId, items, onItemPress }: TodayItemsSectionProps) {
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
