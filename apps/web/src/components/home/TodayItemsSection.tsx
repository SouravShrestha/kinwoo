"use client";

import type { GroceryOverviewItem } from "@kinwoo/core/grocery";

import { OverviewItemRow, type OverviewBadge } from "@/components/home/OverviewItemRow";
import { SectionHeader } from "@/components/home/SectionHeader";

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

export function TodayItemsSection({
  items,
  onItemPress,
}: {
  items: GroceryOverviewItem[];
  onItemPress: (item: GroceryOverviewItem) => void;
}) {
  return (
    <div className="space-y-3">
      <SectionHeader title="Needs buying today" count={items.length} tone="destructive" />
      {items.length === 0 ? (
        <div className="flex items-center justify-center rounded-2xl border border-dashed border-border p-4 text-center">
          <p className="font-display text-sm font-normal text-muted-foreground">
            Nothing urgently needed today
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <OverviewItemRow
              key={item.id}
              item={item}
              badge={badgeFor(item)}
              onPress={onItemPress}
            />
          ))}
        </div>
      )}
    </div>
  );
}
