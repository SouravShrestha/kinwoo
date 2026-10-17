"use client";

import { CheckIcon } from "@kinwoo/icons";
import type { ReactNode } from "react";

import { BottomSheet } from "@/components/BottomSheet";
import { cn } from "@/lib/utils";

export type SheetOption = {
  id: string;
  label: string;
  icon?: ReactNode;
  detail?: string;
  dashed?: boolean;
};

export function OptionSheet({
  open,
  onClose,
  title,
  options,
  selectedId,
  onSelect,
  columns = 1,
  showTitle = true,
  scrollable = true,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  options: readonly SheetOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  columns?: 1 | 2 | 3 | 4;
  showTitle?: boolean;
  scrollable?: boolean;
}) {
  const grid = columns > 1;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      label={title}
      className={cn(grid && "min-h-[40dvh]", !scrollable && "overflow-y-hidden")}
    >
      {showTitle ? (
        <h2 className="mb-3 font-display text-lg font-medium text-foreground">{title}</h2>
      ) : null}
      <ul
        role="listbox"
        aria-label={title}
        className={cn(
          scrollable && "max-h-[60dvh] overflow-y-auto",
          !grid && "-mx-2",
          grid && "grid gap-3 pb-4",
          columns === 2 && "grid-cols-2",
          columns === 3 && "grid-cols-3",
          columns === 4 && "grid-cols-4",
        )}
      >
        {options.map((option) => {
          const selected = option.id === selectedId;
          const chip = grid && !option.icon;
          return (
            <li key={option.id} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => onSelect(option.id)}
                className={cn(
                  "w-full rounded-xl font-display text-base transition-colors hover:cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
                  chip
                    ? cn(
                        "flex min-h-14 flex-col items-center justify-center px-1 py-2 text-base leading-6",
                        columns > 2 && "aspect-[5/4]",
                        selected
                          ? "bg-foreground text-background"
                          : "bg-muted text-muted-foreground",
                      )
                    : cn(
                        grid
                          ? "flex flex-col items-center gap-2 px-1 py-3 text-center text-sm"
                          : "flex items-center gap-3 px-2 py-3 text-left hover:bg-muted",
                        selected ? "text-foreground" : "text-muted-foreground",
                      ),
                )}
              >
                {option.icon ? (
                  <span
                    className={cn(
                      "flex shrink-0 items-center justify-center rounded-xl",
                      grid ? "size-14" : "size-10",
                      option.dashed
                        ? "border border-dashed border-muted-foreground text-foreground"
                        : grid && selected
                          ? "bg-foreground text-background"
                          : "bg-muted text-foreground",
                    )}
                  >
                    {option.icon}
                  </span>
                ) : null}
                <span className={cn("min-w-0 truncate", grid ? "max-w-full" : "flex-1")}>
                  {option.label}
                </span>
                {option.detail ? (
                  <span className="text-xs leading-5 opacity-70">({option.detail})</span>
                ) : null}
                {selected && !grid ? <CheckIcon size={14} /> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </BottomSheet>
  );
}
