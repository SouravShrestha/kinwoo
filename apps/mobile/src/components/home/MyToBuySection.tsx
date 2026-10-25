import type { GroceryOverviewItem } from "@kinwoo/core/grocery";

import { ItemCarousel } from "@/components/home/ItemCarousel";

type MyToBuySectionProps = {
  houseId: string;
  items: GroceryOverviewItem[];
  onItemPress: (item: GroceryOverviewItem) => void;
};

export function MyToBuySection({ houseId, items, onItemPress }: MyToBuySectionProps) {
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
