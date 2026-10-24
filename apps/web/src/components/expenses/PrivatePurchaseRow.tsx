"use client";

import {
  privateSpendAccessibleLabel,
  privateSpendAmountLabel,
  privateSpendDateParts,
  privateSpendDetail,
  type PrivateSpendEntry,
} from "@kinwoo/core/grocery";
import { ItemCategoryImage } from "@/components/CategoryImages";

export function PrivatePurchaseRow({
  entry,
  onOpen,
}: {
  entry: PrivateSpendEntry;
  onOpen: () => void;
}) {
  const { month, day } = privateSpendDateParts(entry);
  const detail = privateSpendDetail(entry);
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={onOpen}
      aria-label={privateSpendAccessibleLabel(entry)}
      className="flex w-full items-center px-4 py-5 text-left transition-colors hover:cursor-pointer hover:bg-muted/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground"
    >
      <span aria-hidden className="flex w-8 shrink-0 flex-col items-center font-display">
        <span className="text-xs text-muted-foreground">{month}</span>
        <span className="text-lg leading-[calc(1.5rem*var(--font-scale,1))] text-muted-foreground">
          {day}
        </span>
      </span>
      <span
        aria-hidden
        className="ml-3 mr-4 flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground"
      >
        <ItemCategoryImage name={entry.categoryName ?? undefined} size={34} />
      </span>
      <span className="mr-3 flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-display text-base text-foreground">{entry.label}</span>
        {detail ? (
          <span className="truncate font-display text-xs text-muted-foreground">{detail}</span>
        ) : null}
      </span>
      <span
        className={
          entry.amountPaise === null
            ? "shrink-0 font-display text-base text-muted-foreground"
            : "shrink-0 font-display text-base font-medium text-foreground"
        }
      >
        {privateSpendAmountLabel(entry)}
      </span>
    </button>
  );
}
