"use client";

import {
  activityIconName,
  formatActivityParts,
  formatRelativeTime,
  groupActivityByDay,
  type ActivityIconName,
  type GroceryActivityEntry,
} from "@kinwoo/core/grocery";
import {
  BagDollarIcon,
  CartCheckIcon,
  CartCrossIcon,
  CartMinusIcon,
  CartPlusIcon,
  FilePlusIcon,
  FrownIcon,
  HeartIcon,
  HousePlusIcon,
  ListSettingsIcon,
  PulseIcon,
  TrashOutlineIcon,
  UserCheckIcon,
  UserCrossIcon,
  type WebIconProps,
} from "@kinwoo/icons";
import { useEffect, useMemo, useRef, type ComponentType } from "react";

const ICONS: Record<ActivityIconName, ComponentType<WebIconProps>> = {
  "cart-plus": CartPlusIcon,
  "cart-check": CartCheckIcon,
  "cart-minus": CartMinusIcon,
  "cart-cross": CartCrossIcon,
  "bag-dollar": BagDollarIcon,
  "user-check": UserCheckIcon,
  "user-cross": UserCrossIcon,
  heart: HeartIcon,
  frown: FrownIcon,
  "file-plus": FilePlusIcon,
  "list-settings": ListSettingsIcon,
  trash: TrashOutlineIcon,
  "house-plus": HousePlusIcon,
  pulse: PulseIcon,
};

const LOAD_MORE_MARGIN = "400px 0px";

function ActivityIcon({ entry }: { entry: GroceryActivityEntry }) {
  const Icon = ICONS[activityIconName(entry)];

  return (
    <span className="mr-5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground pt-0.5">
      <Icon size={20} />
    </span>
  );
}

export function ActivityList({
  entries,
  currentUserId,
  canLoadMore,
  onLoadMore,
}: {
  entries: GroceryActivityEntry[];
  currentUserId: string | null;
  canLoadMore: boolean;
  onLoadMore: () => void;
}) {
  const groups = useMemo(() => groupActivityByDay(entries), [entries]);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Re-observing after every page makes the observer report the sentinel again, so a page that
  // still leaves it on screen (for example under an active filter) keeps loading.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !canLoadMore) return;

    const observer = new IntersectionObserver(
      (observed) => {
        if (observed.some((entry) => entry.isIntersecting)) onLoadMore();
      },
      { rootMargin: LOAD_MORE_MARGIN },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [canLoadMore, onLoadMore, entries]);

  return (
    <div>
      {groups.map((group) => (
        <section key={group.key} aria-label={group.label}>
          <h2 className="sticky top-0 z-10 bg-background py-2 font-display text-sm font-medium text-foreground">
            {group.label}
          </h2>
          <ul>
            {group.entries.map((entry, index) => (
              <li
                key={entry.id}
                className={`flex items-start py-6 ${index > 0 ? "border-t border-border" : ""}`}
              >
                <ActivityIcon entry={entry} />
                <p className="mr-3 min-w-0 flex-1 font-display text-base leading-6 text-foreground">
                  {formatActivityParts(entry, currentUserId).map((part, index) =>
                    part.emphasis ? (
                      <em key={index} className="font-medium italic">
                        {part.text}
                      </em>
                    ) : (
                      <span key={index}>{part.text}</span>
                    ),
                  )}
                </p>
                <span className="shrink-0 pt-1 font-display text-xs text-muted-foreground">
                  {formatRelativeTime(entry.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {canLoadMore ? <div ref={sentinelRef} aria-hidden="true" className="h-px" /> : null}
    </div>
  );
}
