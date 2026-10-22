"use client";

import { useGroceryItemActivity } from "@kinwoo/client/grocery";
import { useHouseMembers } from "@kinwoo/client/houses";
import { boughtItemTimeline, formatTimelineTime, type GroceryItem } from "@kinwoo/core/grocery";

import { Avatar } from "@/components/houses/Avatar";

const STEP_AVATAR_SIZE = 24;

export function BoughtTimeline({
  item,
  houseId,
  listId,
}: {
  item: GroceryItem;
  houseId: string;
  listId: string;
}) {
  const { data: activity } = useGroceryItemActivity(houseId, listId, item.id);
  const { data: members } = useHouseMembers(houseId);
  const steps = boughtItemTimeline(item, activity);

  return (
    <ol className="flex overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden pl-7">
      {steps.map((step, index) => {
        const member = members?.find((m) => m.userId === step.userId);
        const name = member?.displayName ?? step.name ?? "A housemate";
        const isLast = index === steps.length - 1;

        return (
          <li
            key={step.label}
            className={isLast ? "max-w-[175px] shrink-0 pr-2" : "w-[175px] shrink-0"}
          >
            <div className="mt-5 flex items-center">
              <Avatar name={name} url={member?.avatarUrl ?? null} size={STEP_AVATAR_SIZE} />
              {isLast ? null : (
                <span aria-hidden className="mx-2 h-0.5 flex-1 rounded-full bg-border" />
              )}
            </div>
            <p className="mt-4 font-display text-sm text-muted-foreground">{step.label}</p>
            <p className="mt-2 line-clamp-2 pr-3 font-display text-base font-medium text-foreground">
              {name}
            </p>
            {step.at ? (
              <time
                dateTime={step.at}
                className="mt-2 block font-display text-xs text-muted-foreground"
              >
                {formatTimelineTime(step.at)}
              </time>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
