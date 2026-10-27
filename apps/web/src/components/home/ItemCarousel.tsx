"use client";

import { useHouseMembers } from "@kinwoo/client/houses";
import { itemAssignee, type GroceryOverviewItem, type TasksView } from "@kinwoo/core/grocery";
import { ArrowRightIcon } from "@kinwoo/icons";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PendingItemCard } from "@/components/grocery/PendingItemCard";
import { SectionHeader } from "@/components/home/SectionHeader";
import { cn } from "@/lib/utils";

const TRACK_WIDTH = 48;
const THUMB_WIDTH = 26;
const MAX_CARDS = 5;

export function ItemCarousel({
  title,
  viewAll,
  houseId,
  items,
  onItemPress,
}: {
  title: string;
  viewAll: { label: string; view: TasksView };
  houseId: string;
  items: GroceryOverviewItem[];
  onItemPress: (item: GroceryOverviewItem) => void;
}) {
  const { data: members } = useHouseMembers(houseId);
  const memberById = useMemo(() => new Map((members ?? []).map((m) => [m.userId, m])), [members]);
  const scrollerRef = useRef<HTMLUListElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  const sync = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const maxScroll = scroller.scrollWidth - scroller.clientWidth;
    setOverflowing(maxScroll > 1);
    if (thumbRef.current) {
      const progress = maxScroll > 0 ? Math.min(1, scroller.scrollLeft / maxScroll) : 0;
      thumbRef.current.style.transform = `translateX(${progress * (TRACK_WIDTH - THUMB_WIDTH)}px)`;
    }
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [items.length, sync]);

  return (
    <div className="space-y-4">
      <SectionHeader
        title={title}
        count={items.length}
        trailing={
          <span
            aria-hidden
            className={cn("h-1 overflow-hidden rounded-full bg-muted", !overflowing && "invisible")}
            style={{ width: TRACK_WIDTH }}
          >
            <span
              ref={thumbRef}
              className="block h-full rounded-full bg-muted-foreground"
              style={{ width: THUMB_WIDTH }}
            />
          </span>
        }
      />
      <ul
        ref={scrollerRef}
        onScroll={sync}
        className="-mx-6 flex snap-x snap-proximity scroll-px-6 gap-3 overflow-x-auto overscroll-x-contain px-6"
      >
        {items.slice(0, MAX_CARDS).map((item) => {
          const assignee = itemAssignee(item);
          const member = assignee ? memberById.get(assignee.userId) : undefined;
          return (
            <li key={item.id} className="w-[calc((100%+3rem)/2.8)] shrink-0 snap-start">
              <PendingItemCard
                item={item}
                onOpen={() => onItemPress(item)}
                assignee={
                  assignee
                    ? {
                        name: member?.displayName ?? assignee.name,
                        avatarUrl: member?.avatarUrl ?? null,
                      }
                    : undefined
                }
              />
            </li>
          );
        })}
        <li className="flex w-[calc((100%+3rem)/2.8)] shrink-0 snap-start">
          <Link
            href={`/tasks?view=${viewAll.view}`}
            aria-label={viewAll.label}
            className="flex min-h-[108px] w-full flex-col justify-between gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:border-foreground/30 hover:cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            <span className="flex justify-end">
              <span className="flex size-7 items-center justify-center rounded-full border border-dialog-border text-foreground">
                <ArrowRightIcon size={16} />
              </span>
            </span>
            <span className="font-display text-sm font-medium text-foreground">
              {viewAll.label}
            </span>
          </Link>
        </li>
      </ul>
    </div>
  );
}
