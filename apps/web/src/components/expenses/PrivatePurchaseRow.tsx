"use client";

import {
  privateSpendAccessibleLabel,
  privateSpendAmountLabel,
  privateSpendSubtitle,
  type PrivateSpendEntry,
} from "@kinwoo/core/grocery";
import { LockIcon } from "@kinwoo/icons";

import { CategoryIcon } from "@/components/grocery/CategoryIcon";

export function PrivatePurchaseRow({
  entry,
  onOpen,
}: {
  entry: PrivateSpendEntry;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={onOpen}
      aria-label={privateSpendAccessibleLabel(entry)}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:cursor-pointer hover:border-foreground/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
    >
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground"
      >
        <CategoryIcon name={entry.categoryName ?? undefined} size={22} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-display text-sm font-medium text-foreground">
          {entry.label}
        </span>
        <span className="truncate font-display text-xs text-muted-foreground">
          {privateSpendSubtitle(entry)}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-0.5">
        <span
          className={
            entry.amountPaise === null
              ? "font-display text-sm text-muted-foreground"
              : "font-display text-sm font-medium text-foreground"
          }
        >
          {privateSpendAmountLabel(entry)}
        </span>
        <span className="flex items-center gap-1 font-display text-xs text-muted-foreground">
          <LockIcon size={11} />
          Not split
        </span>
      </span>
    </button>
  );
}
