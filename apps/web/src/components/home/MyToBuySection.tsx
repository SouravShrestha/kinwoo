"use client";

import { listIconOption, type GroceryOverviewItem } from "@kinwoo/core/grocery";

import { CategoryIcon } from "@/components/grocery/CategoryIcon";

export function MyToBuySection({
  items,
  currentUserId,
  onItemPress,
}: {
  items: GroceryOverviewItem[];
  currentUserId: string;
  onItemPress?: (item: GroceryOverviewItem) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-base font-semibold text-foreground">My to-buy</h2>
          {items.length > 0 ? (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-display font-medium text-primary">
              {items.length}
            </span>
          ) : null}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex items-center justify-center rounded-2xl border border-dashed border-border p-4 text-center">
          <p className="font-display text-sm text-muted-foreground">
            You haven&apos;t claimed any items to buy
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const isAssignedToMe = item.assignedTo === currentUserId;
            return (
              <div
                key={item.id}
                onClick={() => onItemPress?.(item)}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-3.5 transition-colors hover:border-foreground/30 hover:cursor-pointer"
              >
                <div className="mr-3 min-w-0 flex-1">
                  <span className="block truncate font-display text-base font-medium text-foreground">
                    {item.name}
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    {item.quantity ? (
                      <span className="font-display text-xs text-muted-foreground">
                        {item.quantity} {item.unit ?? ""}
                      </span>
                    ) : null}
                    <span className="flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[11px] font-display font-medium text-muted-foreground">
                      <CategoryIcon name={listIconOption(item.listIcon).label} size={12} />
                      <span className="max-w-[100px] truncate">{item.listName}</span>
                    </span>
                  </div>
                </div>

                <div className="shrink-0">
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-display font-medium text-primary">
                    {isAssignedToMe ? "Assigned" : "Claimed"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
