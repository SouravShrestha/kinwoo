"use client";

import {
  activityExpenseId,
  activityIconName,
  activitySettlementId,
  formatActivityDetail,
  formatActivityParts,
  formatActivityTimestamp,
  groupActivityByDay,
  type GroceryActivityEntry,
} from "@kinwoo/core/grocery";
import type { HouseMember } from "@kinwoo/core/houses";
import { ActivityKindIcon } from "@kinwoo/icons";
import { memo, useEffect, useMemo, useRef } from "react";

import { Avatar } from "@/components/houses/Avatar";

const LOAD_MORE_MARGIN = "400px 0px";

const ACTOR_AVATAR_SIZE = 16;

function ActivityIcon({
  entry,
  actor,
}: {
  entry: GroceryActivityEntry;
  actor: HouseMember | undefined;
}) {
  return (
    <span className="relative mr-5 mt-px shrink-0">
      <span className="flex size-9 items-center justify-center rounded-lg bg-muted pt-0.5 text-foreground">
        <ActivityKindIcon name={activityIconName(entry)} size={20} />
      </span>
      {entry.actorId ? (
        <span className="absolute -bottom-1.5 -right-1.5 rounded-full bg-background p-0.5">
          <Avatar
            name={actor?.displayName ?? entry.actorName}
            url={actor?.avatarUrl ?? null}
            size={ACTOR_AVATAR_SIZE}
          />
        </span>
      ) : null}
    </span>
  );
}

function ActivityDetail({
  entry,
  currentUserId,
}: {
  entry: GroceryActivityEntry;
  currentUserId: string | null;
}) {
  const detail = formatActivityDetail(entry, currentUserId);
  if (!detail) return null;

  const color = detail.tone === "lent" ? "text-accent" : "text-destructive";

  return (
    <p
      className={`mt-1 font-display text-sm font-normal leading-[calc(1.25rem*var(--font-scale,1))] ${color}`}
    >
      {detail.struck ? (
        <del className="relative no-underline">
          {detail.text}
          <span
            aria-hidden
            className="absolute -inset-x-0.5 top-1/2 h-px -translate-y-1/2 bg-current"
          />
        </del>
      ) : (
        detail.text
      )}
    </p>
  );
}

export const ActivityList = memo(function ActivityList({
  entries,
  members,
  currentUserId,
  canLoadMore,
  onLoadMore,
  onOpenExpense,
  onOpenPayment,
}: {
  entries: GroceryActivityEntry[];
  members: HouseMember[];
  currentUserId: string | null;
  canLoadMore: boolean;
  onLoadMore: () => void;
  onOpenExpense: (expenseId: string | null) => void;
  onOpenPayment: (settlementId: string | null) => void;
}) {
  const groups = useMemo(() => groupActivityByDay(entries), [entries]);
  const membersById = useMemo(() => new Map(members.map((m) => [m.userId, m])), [members]);
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
            {group.entries.map((entry, index) => {
              const expenseId = activityExpenseId(entry);
              const settlementId = activitySettlementId(entry);
              const open = expenseId
                ? () => onOpenExpense(expenseId)
                : settlementId
                  ? () => onOpenPayment(settlementId)
                  : null;
              const className = "flex w-full items-start py-6 text-left";
              const content = (
                <>
                  <ActivityIcon entry={entry} actor={membersById.get(entry.actorId ?? "")} />
                  <div className="mr-3 min-w-0 flex-1">
                    <p className="font-display text-base font-normal leading-[calc(1.5rem*var(--font-scale,1))] text-foreground">
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
                    <ActivityDetail entry={entry} currentUserId={currentUserId} />
                    <p className="mt-3 font-display text-xs font-normal text-muted-foreground">
                      {formatActivityTimestamp(entry.createdAt)}
                    </p>
                  </div>
                </>
              );

              return (
                <li key={entry.id} className={index > 0 ? "border-t border-border" : ""}>
                  {open ? (
                    <button
                      type="button"
                      onClick={open}
                      className={`${className} hover:cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground`}
                    >
                      {content}
                    </button>
                  ) : (
                    <div className={className}>{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {canLoadMore ? <div ref={sentinelRef} aria-hidden="true" className="h-px" /> : null}
    </div>
  );
});
