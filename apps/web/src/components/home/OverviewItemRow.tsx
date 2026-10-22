import { listIconOption, type GroceryOverviewItem } from "@kinwoo/core/grocery";
import { CategoryIcon } from "@kinwoo/icons";

import { cn } from "@/lib/utils";

const BADGE = {
  primary: "bg-primary/10 text-primary",
  muted: "bg-muted text-muted-foreground",
} as const;

export type OverviewBadge = { label: string; tone: keyof typeof BADGE };

export function OverviewItemRow({
  item,
  badge,
  onPress,
}: {
  item: GroceryOverviewItem;
  badge: OverviewBadge;
  onPress: (item: GroceryOverviewItem) => void;
}) {
  const quantity = item.quantity ? `${item.quantity}${item.unit ? ` ${item.unit}` : ""}` : null;

  return (
    <button
      type="button"
      aria-label={`${item.name}, from ${item.listName}`}
      onClick={() => onPress(item)}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:border-foreground/30 hover:cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
        <CategoryIcon name={listIconOption(item.listIcon).label} size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-base font-medium text-foreground">
          {item.name}
        </span>
        <span className="mt-0.5 block truncate font-display text-xs font-normal text-muted-foreground">
          {quantity ? `${quantity} · ${item.listName}` : item.listName}
        </span>
      </span>
      <span
        className={cn(
          "max-w-[110px] shrink-0 truncate rounded-full px-2.5 py-1 font-display text-xs font-medium",
          BADGE[badge.tone],
        )}
      >
        {badge.label}
      </span>
    </button>
  );
}
