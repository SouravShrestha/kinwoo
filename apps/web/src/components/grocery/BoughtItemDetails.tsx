"use client";

import { formatPaise, itemQuantityLabel, type GroceryItem } from "@kinwoo/core/grocery";
import { TransactionIcon, TrashIcon } from "@kinwoo/icons";

import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";

import { BoughtTimeline } from "./BoughtTimeline";
import { CategoryIcon } from "./CategoryIcon";
import { FOCUS_RING, ICON_BUTTON } from "./ItemDetailsEditor";

export function BoughtItemDetails({
  item,
  houseId,
  listId,
  canDelete,
  onDelete,
}: {
  item: GroceryItem;
  houseId: string;
  listId: string;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const quantity = itemQuantityLabel(item);
  const pricePaise = item.purchase?.pricePaise ?? null;
  const store = item.purchase?.store ?? null;

  return (
    <div className="-mx-6 space-y-12 pb-4 pt-12">
      <div className="space-y-5">
        <div className="mx-6 flex items-start gap-5">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
            <CategoryIcon name={item.categoryName ?? undefined} size={26} />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <h2 className="line-clamp-2 font-display text-base font-medium text-foreground">
              {item.name}
            </h2>
            {quantity ? (
              <p className="font-display text-sm text-muted-foreground">{quantity}</p>
            ) : null}
          </div>
          {pricePaise != null || store ? (
            <div className="max-w-[45%] space-y-1 text-right">
              {pricePaise != null ? (
                <p className="font-display text-base text-foreground">{formatPaise(pricePaise)}</p>
              ) : null}
              {store ? (
                <p className="truncate font-display text-sm text-muted-foreground">{store}</p>
              ) : null}
            </div>
          ) : null}
        </div>

        {item.note ? (
          <p className="mx-6 flex min-h-12 items-center whitespace-pre-line break-words rounded-xl bg-muted px-5 py-3 font-display text-base text-foreground">
            <span className="sr-only">Note: </span>
            {item.note}
          </p>
        ) : null}
      </div>

      <BoughtTimeline item={item} houseId={houseId} listId={listId} />

      <div className="mx-6 flex items-center gap-3">
        {canDelete ? (
          <button
            type="button"
            aria-label="Delete item"
            aria-haspopup="dialog"
            onClick={onDelete}
            className={cn(ICON_BUTTON, FOCUS_RING)}
          >
            <TrashIcon size={18} />
          </button>
        ) : null}
        <Button
          label="View transaction"
          icon={<TransactionIcon size={22} />}
          className="h-12 min-w-0 flex-1 px-3"
        />
      </div>
    </div>
  );
}
