"use client";

import { LIST_ICON_OPTIONS } from "@kinwoo/core/grocery";

import { ListIconImage } from "@/components/CategoryImages";

import { SheetHeader } from "@/components/houses/SheetHeader";
import { cn } from "@/lib/utils";

export function ListIconPicker({
  selected,
  onSelect,
  onBack,
}: {
  selected: string;
  onSelect: (icon: string) => void;
  onBack: () => void;
}) {
  return (
    <div>
      <SheetHeader onBack={onBack} />

      <ul role="listbox" aria-label="Icon" className="mt-6 grid grid-cols-3 gap-3">
        {LIST_ICON_OPTIONS.map((option) => {
          const isSelected = option.value === selected;
          return (
            <li key={option.value} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={isSelected}
                aria-label={option.label}
                onClick={() => onSelect(option.value)}
                className="flex w-full items-center justify-center rounded-xl px-1 py-3 hover:cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
              >
                <span
                  className={cn(
                    "flex size-16 items-center justify-center rounded-xl border-2 bg-muted",
                    isSelected ? "border-foreground" : "border-transparent",
                  )}
                >
                  <ListIconImage label={option.label} size={48} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
