"use client";

import { BottomSheet } from "@/components/BottomSheet";
import { SheetHeader } from "@/components/houses/SheetHeader";

import { useAssignToMember } from "./useAssignToMember";

export function AssignSheet({
  open,
  onClose,
  houseId,
  listId,
  itemIds,
  onAssigned,
}: {
  open: boolean;
  onClose: () => void;
  houseId: string;
  listId: string;
  itemIds: string[];
  onAssigned?: () => void;
}) {
  const { members, isLoading, assign, assigningId } = useAssignToMember({
    houseId,
    listId,
    itemIds,
    onAssigned: () => {
      onClose();
      onAssigned?.();
    },
  });

  const many = itemIds.length > 1;
  const title = many ? `Assign ${itemIds.length} items` : "Assign item";

  return (
    <BottomSheet open={open} onClose={onClose} label={title} showClose>
      <SheetHeader
        title={title}
        subtitle={
          many
            ? "Choose a housemate to buy all of these"
            : "Choose a housemate to assign this grocery item to"
        }
      />

      <div className="mt-4 space-y-2">
        {!isLoading && members.length === 0 ? (
          <p className="py-6 text-center font-display text-sm font-normal text-muted-foreground">
            No other housemates yet
          </p>
        ) : null}

        {members.map((m) => {
          const name = m.displayName ?? m.email ?? "Member";
          const isAssigning = assigningId === m.userId;

          return (
            <div
              key={m.userId}
              className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-4 py-3"
            >
              <div className="min-w-0 flex-1 pr-2">
                <span className="block truncate font-display text-base font-medium text-foreground">
                  {name}
                </span>
                {m.role ? (
                  <span className="block font-display text-xs font-normal capitalize text-muted-foreground">
                    {m.role}
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                disabled={assigningId !== null}
                onClick={() => assign(m.userId, name)}
                className="shrink-0 rounded-lg bg-primary px-3 py-1.5 font-display text-xs font-medium text-primary-foreground hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isAssigning ? "Assigning..." : "Assign"}
              </button>
            </div>
          );
        })}
      </div>
    </BottomSheet>
  );
}
