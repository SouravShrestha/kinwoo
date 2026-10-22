"use client";

import type { GroceryOverviewItem } from "@kinwoo/core/grocery";

import { OverviewItemRow } from "@/components/home/OverviewItemRow";
import { SectionHeader } from "@/components/home/SectionHeader";

export function MyToBuySection({
  items,
  currentUserId,
  onItemPress,
}: {
  items: GroceryOverviewItem[];
  currentUserId: string;
  onItemPress: (item: GroceryOverviewItem) => void;
}) {
  return (
    <div className="space-y-3">
      <SectionHeader title="My to-buy" count={items.length} tone="primary" />
      {items.length === 0 ? (
        <div className="flex items-center justify-center rounded-2xl border border-dashed border-border p-4 text-center">
          <p className="font-display text-sm font-normal text-muted-foreground">
            You haven&apos;t claimed any items to buy
          </p>
        </div>
      ) : (
        <div className="space-y-2">
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
        </div>
      )}
    </div>
  );
}
