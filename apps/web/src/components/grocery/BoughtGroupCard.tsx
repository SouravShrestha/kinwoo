"use client";

import { boughtGroupAccessibleLabel, itemCountLabel, type BoughtGroup } from "@kinwoo/core/grocery";
import { ArrowRightIcon } from "@kinwoo/icons";

import { Avatar } from "@/components/houses/Avatar";
import { cn } from "@/lib/utils";

import { CategoryIcon } from "./CategoryIcon";
import type { CardAssignee } from "./PendingItemCard";

export function BoughtGroupCard({
  group,
  buyer,
  onOpen,
}: {
  group: BoughtGroup;
  buyer?: CardAssignee;
  onOpen: () => void;
}) {
  const lead = group.items[0];

  return (
    <div className="relative rounded-2xl border border-border bg-card transition-colors hover:border-foreground/30">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={boughtGroupAccessibleLabel(group, buyer?.name ?? null)}
        onClick={onOpen}
        className="group flex w-full flex-col gap-3 rounded-2xl p-3 text-left hover:cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
      >
        <span className="flex items-center justify-between">
          <span className="flex size-6 shrink-0 items-center justify-center text-foreground">
            <CategoryIcon name={lead?.categoryName ?? undefined} size={20} />
          </span>
          <span
            aria-hidden
            className="flex size-7 shrink-0 items-center justify-center rounded-full border border-dialog-border text-foreground transition-colors group-hover:border-foreground"
          >
            <ArrowRightIcon size={16} className="-rotate-90" />
          </span>
        </span>
        <span className="flex min-w-0 flex-col-reverse gap-0.5">
          <span
            className={cn(
              "block truncate font-display text-sm font-medium text-foreground",
              buyer && "pr-8",
            )}
          >
            {group.label}
          </span>
          <span className="block min-h-4 truncate font-display text-xs text-muted-foreground">
            {itemCountLabel(group.items.length)}
          </span>
        </span>
      </button>

      {buyer ? (
        <span className="pointer-events-none absolute bottom-3 right-3">
          <Avatar name={buyer.name} url={buyer.avatarUrl} size={24} />
        </span>
      ) : null}
    </div>
  );
}
