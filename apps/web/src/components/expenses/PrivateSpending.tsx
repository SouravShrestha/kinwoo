"use client";

import { usePrivatePurchases } from "@kinwoo/client/grocery";
import {
  findBoughtGroup,
  formatPaise,
  PRIVATE_SPENDING_NOTE,
  summarizePrivateSpending,
  type PrivateSpendEntry,
} from "@kinwoo/core/grocery";
import { useMemo, useState } from "react";

import { BoughtGroupSheet } from "@/components/grocery/BoughtGroupSheet";
import { ItemDetailSheet } from "@/components/grocery/ItemDetailSheet";

import { PrivatePurchaseRow } from "./PrivatePurchaseRow";

export function PrivateSpending({ houseId }: { houseId: string }) {
  const { data: items } = usePrivatePurchases(houseId);
  const spending = useMemo(() => summarizePrivateSpending(items ?? []), [items]);
  const entries = useMemo(() => spending.months.flatMap((month) => month.entries), [spending]);

  const [activeItem, setActiveItem] = useState<{ id: string; listId: string } | null>(null);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [groupSheetOpen, setGroupSheetOpen] = useState(false);
  const activeGroup = useMemo(
    () => (activeBatchId ? findBoughtGroup(items ?? [], activeBatchId) : null),
    [activeBatchId, items],
  );

  const open = (spend: PrivateSpendEntry) => {
    if (spend.entry.kind === "group") {
      setActiveBatchId(spend.entry.batchId);
      setGroupSheetOpen(true);
    } else {
      setActiveItem({ id: spend.entry.item.id, listId: spend.entry.item.listId });
    }
  };

  if (items === undefined) return null;

  return (
    <>
      <section aria-labelledby="private-spending-headline" className="px-2">
        <h2
          id="private-spending-headline"
          className="font-display text-xl font-normal text-foreground"
        >
          You&apos;ve spent <span className="font-medium">{formatPaise(spending.totalPaise)}</span>{" "}
          privately
        </h2>
        <p className="mt-2 font-display text-sm text-muted-foreground">{PRIVATE_SPENDING_NOTE}</p>
      </section>

      <div className="mt-6">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border px-6 py-16 text-center">
            <p className="font-display font-medium text-foreground">No private purchases yet</p>
            <p className="font-display text-sm text-muted-foreground">
              Things you buy from your private lists show up here.
            </p>
          </div>
        ) : (
          <ul className="-mx-4">
            {entries.map((spend) => (
              <li key={spend.key}>
                <PrivatePurchaseRow entry={spend} onOpen={() => open(spend)} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <BoughtGroupSheet
        open={groupSheetOpen}
        group={activeGroup}
        houseId={houseId}
        canDelete={false}
        onClose={() => setGroupSheetOpen(false)}
        onOpenItem={(itemId) => {
          const listId = activeGroup?.items.find((item) => item.id === itemId)?.listId;
          setGroupSheetOpen(false);
          if (listId) setActiveItem({ id: itemId, listId });
        }}
        onDelete={() => undefined}
      />

      <ItemDetailSheet
        open={activeItem !== null}
        onClose={() => setActiveItem(null)}
        houseId={houseId}
        listId={activeItem?.listId ?? ""}
        itemId={activeItem?.id ?? null}
      />
    </>
  );
}
