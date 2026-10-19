"use client";

import { toast } from "@kinwoo/client/toast";
import {
  formatPaise,
  itemCountLabel,
  TRANSACTION_UNAVAILABLE,
  type BoughtGroup,
} from "@kinwoo/core/grocery";
import { TransactionIcon, TrashIcon } from "@kinwoo/icons";
import { useRouter } from "next/navigation";

import { BottomSheet } from "@/components/BottomSheet";
import { Button } from "@/components/Button";
import { expensePath } from "@/lib/house-navigation";
import { cn } from "@/lib/utils";

import { BoughtTimeline } from "./BoughtTimeline";
import { CategoryIcon } from "./CategoryIcon";
import { FOCUS_RING, ICON_BUTTON } from "./ItemDetailsEditor";

export function BoughtGroupSheet({
  open,
  group,
  houseId,
  canDelete,
  onClose,
  onOpenItem,
  onDelete,
}: {
  open: boolean;
  group: BoughtGroup | null;
  houseId: string;
  canDelete: boolean;
  onClose: () => void;
  onOpenItem: (itemId: string) => void;
  onDelete: () => void;
}) {
  const router = useRouter();
  const lead = group?.items[0];

  const viewTransaction = () => {
    const expenseId = lead?.purchase?.expenseId;
    if (!expenseId) return toast.error(TRANSACTION_UNAVAILABLE);
    onClose();
    router.push(expensePath(expenseId));
  };

  return (
    <BottomSheet open={open && group !== null} onClose={onClose} label="Bought items" showClose>
      {group ? (
        <div className="-mx-6 space-y-12 pb-4 pt-12">
          <div className="mx-6 flex items-start gap-5">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
              <CategoryIcon name={lead?.categoryName ?? undefined} size={26} />
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <h2 className="line-clamp-2 font-display text-base font-medium text-foreground">
                {group.label}
              </h2>
              <p className="font-display text-sm text-muted-foreground">
                {itemCountLabel(group.items.length)}
              </p>
            </div>
            <div className="max-w-[45%] space-y-1 text-right">
              <p className="font-display text-base text-foreground">
                {formatPaise(group.totalPaise)}
              </p>
              {group.store ? (
                <p className="truncate font-display text-sm text-muted-foreground">{group.store}</p>
              ) : null}
            </div>
          </div>

          <ul className="flex gap-1 overflow-x-auto px-4 scrollbar-none [&::-webkit-scrollbar]:hidden">
            {group.items.map((item) => {
              return (
                <li key={item.id} className="w-22 shrink-0">
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    onClick={() => onOpenItem(item.id)}
                    className="flex w-full flex-col items-center gap-2 rounded-xl p-1 text-center hover:cursor-pointer hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                  >
                    <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-foreground">
                      <CategoryIcon name={item.categoryName ?? undefined} size={20} />
                    </span>
                    <span className="w-full space-y-0.5">
                      <span className="block truncate font-display text-sm font-medium text-foreground">
                        {item.name}
                      </span>
                      <span className="block font-display text-xs text-muted-foreground">
                        {formatPaise(item.purchase?.pricePaise ?? 0)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* The batch shares one buyer, so the lead item's history stands in for the purchase. */}
          {lead ? <BoughtTimeline item={lead} houseId={houseId} listId={lead.listId} /> : null}

          <div className="mx-6 flex items-center gap-3">
            {canDelete ? (
              <button
                type="button"
                aria-label="Delete items"
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
              onClick={viewTransaction}
              className="h-12 min-w-0 flex-1 px-3"
            />
          </div>
        </div>
      ) : null}
    </BottomSheet>
  );
}
