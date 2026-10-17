"use client";

import { TrashIcon, VerifiedIcon } from "@kinwoo/icons";

import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";

import { useSelectionBarTransition } from "./useSelectionBarTransition";

type BarProps = {
  canMarkBought: boolean;
  deleting: boolean;
  onDelete: () => void;
  onMarkBought: () => void;
};

const ICON_BUTTON =
  "flex size-12 shrink-0 items-center justify-center rounded-xl border border-border text-foreground transition-colors hover:cursor-pointer hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

// Stays mounted through the exit transition so it can fade out before unmounting.
export function AssignedSelectionBar({ visible, ...props }: BarProps & { visible: boolean }) {
  const { mounted, shown } = useSelectionBarTransition(visible);
  return mounted ? <Bar shown={shown} {...props} /> : null;
}

function Bar({
  shown,
  canMarkBought,
  deleting,
  onDelete,
  onMarkBought,
}: BarProps & { shown: boolean }) {
  return (
    <div
      inert={!shown}
      className={cn(
        "fixed bottom-[calc(4rem+1px+env(safe-area-inset-bottom))] left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-border bg-background lg:border-x",
        "transition-[translate,opacity] duration-200 ease-out motion-reduce:transition-none",
        shown ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
      )}
    >
      <div className="flex items-center gap-3 px-5 pb-5 pt-5">
        <button
          type="button"
          aria-label="Delete"
          disabled={deleting}
          onClick={onDelete}
          className={ICON_BUTTON}
        >
          <TrashIcon size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <Button
            label="Mark bought"
            icon={<VerifiedIcon size={18} />}
            disabled={!canMarkBought}
            onClick={onMarkBought}
            className="h-12 w-full"
          />
        </div>
      </div>
    </div>
  );
}
