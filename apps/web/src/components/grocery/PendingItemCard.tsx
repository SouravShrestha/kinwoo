"use client";

import { itemNeededLabel, type GroceryItem } from "@kinwoo/core/grocery";
import { ArrowRightIcon, TickIcon } from "@kinwoo/icons";
import { ItemCategoryImage } from "@/components/CategoryImages";

import { Avatar } from "@/components/houses/Avatar";
import { cn } from "@/lib/utils";

const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

const ASSIGNEE_AVATAR_SIZE = 24;

export type CardAssignee = { name: string | null; avatarUrl: string | null };

export function PendingItemCard({
  item,
  selected = false,
  onToggleSelect,
  onOpen,
  assignee,
  assigneeVerb = "assigned to",
}: {
  item: GroceryItem;
  selected?: boolean;
  onToggleSelect?: () => void;
  onOpen: () => void;
  assignee?: CardAssignee;
  assigneeVerb?: string;
}) {
  const quantityUnit = [item.quantity != null ? String(item.quantity) : "", item.unit ?? ""]
    .filter(Boolean)
    .join(" ");

  const needed = itemNeededLabel(item);

  return (
    <div
      className={cn(
        "group relative rounded-2xl border transition-colors",
        selected
          ? "border-primary bg-muted"
          : "border-card-border bg-card hover:border-foreground/30",
      )}
    >
      {needed?.state === "overdue" ? (
        // Own clipping layer so the card itself doesn't clip the buttons' focus rings.
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
        >
          <span className="absolute left-[-41px] top-[9px] w-28 -rotate-45 bg-foreground py-px text-center font-display text-[7px] leading-[10px] font-semibold tracking-wide text-card">
            Overdue
          </span>
        </span>
      ) : null}
      <button
        type="button"
        {...(onToggleSelect
          ? { role: "checkbox", "aria-checked": selected }
          : { "aria-haspopup": "dialog" as const })}
        onClick={onToggleSelect ?? onOpen}
        className={cn(
          "flex w-full flex-col gap-3 rounded-2xl p-3 text-left hover:cursor-pointer",
          FOCUS_RING,
        )}
      >
        <span className="flex items-center justify-between">
          <span className="relative flex size-10 shrink-0 items-center justify-center text-foreground">
            <ItemCategoryImage name={item.categoryName ?? undefined} size={40} />
            {selected ? (
              <span
                aria-hidden
                className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground"
              >
                <TickIcon size={7} />
              </span>
            ) : null}
          </span>
          <span aria-hidden className="size-7 shrink-0" />
        </span>
        {/* Reversed visually so screen readers still announce the name before the quantity. */}
        <span className="flex min-w-0 flex-col-reverse gap-0.5">
          <span
            className={cn(
              "block truncate font-display text-sm font-medium text-foreground",
              assignee && "pr-8",
            )}
          >
            {item.name}
            {needed ? <span className="sr-only">, {needed.text}</span> : null}
            {assignee ? (
              <span className="sr-only">
                , {assigneeVerb} {assignee.name ?? "a housemate"}
              </span>
            ) : null}
          </span>
          <span className="block min-h-4 truncate font-display text-xs font-medium text-muted-foreground">
            {quantityUnit}
          </span>
        </span>
      </button>

      {assignee ? (
        <span className="pointer-events-none absolute bottom-3 right-3">
          <Avatar
            name={assignee.name}
            url={assignee.avatarUrl}
            size={ASSIGNEE_AVATAR_SIZE}
            tone={selected ? "background" : "muted"}
          />
        </span>
      ) : null}

      <button
        type="button"
        aria-label={`Open ${item.name} details`}
        aria-haspopup="dialog"
        onClick={onOpen}
        className={cn(
          "absolute right-3 top-3 flex size-7 items-center justify-center rounded-full border border-dialog-border text-muted-foreground transition-colors hover:cursor-pointer group-hover:border-foreground/30",
          FOCUS_RING,
        )}
      >
        <ArrowRightIcon size={16} className="-rotate-90" />
      </button>
    </div>
  );
}
