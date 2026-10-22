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
          <p className="py-6 text-center font-display text-sm text-muted-foreground">
            No other housemates yet
          </p>
        ) : null}

        {members.map((m) => {
          const name = m.displayName ?? m.email ?? "Member";
          const isAssigning = assigningId === m.userId;

          return (
            <button
              key={m.userId}
              type="button"
              disabled={assigningId !== null}
              onClick={() => assign(m.userId, name)}
              className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-3.5 text-left transition-colors hover:cursor-pointer hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-medium text-primary">
                  {name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <span className="block truncate font-display text-base font-medium text-foreground">
                    {name}
                  </span>
                  <span className="font-display text-xs text-muted-foreground">
                    {m.role === "admin" ? "Admin" : "Member"}
                  </span>
                </div>
              </div>

              <span className="shrink-0 rounded-lg bg-primary/10 px-2.5 py-1 font-display text-xs font-medium text-primary">
                {isAssigning ? "Assigning..." : "Assign"}
              </span>
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
}
