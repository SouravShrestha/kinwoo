"use client";

import { TABS, activeTabFor, type TabKey } from "@kinwoo/core/app";
import {
  ActivitiesActiveIcon,
  ActivitiesIcon,
  BasketOutlineIcon,
  BillFilledIcon,
  BillActiveIcon,
  BillIcon,
  CartActiveIcon,
  CartIcon,
  HomeActiveIcon,
  HomeIcon,
  type WebIconProps,
} from "@kinwoo/icons";
import { createListStorage } from "@kinwoo/client/grocery";
import { rejectHouseRequired, useActiveHouse, useHouseAccess } from "@kinwoo/client/houses";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "@/lib/router";
import { useRef, useState, type ComponentType, type PointerEvent } from "react";

import { NEW_EXPENSE_PATH } from "@/lib/house-navigation";
import { houseStorage } from "@/lib/house-storage";
import { FloatingActionButton } from "@/components/ui/floating-action-button";
import { cn } from "@/lib/utils";

const ICONS: Record<
  TabKey,
  { active: ComponentType<WebIconProps>; inactive: ComponentType<WebIconProps> }
> = {
  home: { active: HomeActiveIcon, inactive: HomeIcon },
  tasks: { active: CartActiveIcon, inactive: CartIcon },
  bills: { active: BillActiveIcon, inactive: BillIcon },
  activities: { active: ActivitiesActiveIcon, inactive: ActivitiesIcon },
};

const SIZES: Record<TabKey, number> = { home: 25, tasks: 25, bills: 24, activities: 26 };

// Horizontal space around the tabs inside the bar: px-1 plus the 1px border, per side.
// Matches the pill's inset-y-1 so its gap to the bar edge is even all round.
const BAR_INSET = 5;
const DRAG_THRESHOLD = 8;

export function TabBar() {
  const pathname = usePathname();
  const active = activeTabFor(pathname);
  const router = useRouter();
  const { hasNoHouse } = useHouseAccess();
  const { activeHouse } = useActiveHouse();

  const guard = (go: () => void) => {
    if (hasNoHouse) rejectHouseRequired(pathname, () => router.replace("/"));
    else go();
  };

  // Adds to the list last picked on Tasks; /item/new falls back to the default list.
  const addItem = () => {
    const houseId = activeHouse?.house.id;
    const target = houseId
      ? createListStorage(houseStorage).loadSelectedList(houseId)
      : Promise.resolve(null);
    void target.then((listId) =>
      router.push(listId ? `/item/new?listId=${encodeURIComponent(listId)}` : "/item/new"),
    );
  };

  // Derived during render so the first paint does not animate.
  const [seen, setSeen] = useState(active);
  const [previous, setPrevious] = useState<TabKey | null | undefined>(undefined);
  // Tab the pill was dropped on, held until the route catches up so it does not snap back first.
  const [target, setTarget] = useState<number | null>(null);
  if (seen !== active) {
    setSeen(active);
    setPrevious(seen);
    setTarget(null);
  }

  const listRef = useRef<HTMLUListElement>(null);
  const start = useRef<number | null>(null);
  // A drag ends with a click on whatever is under the pointer; this swallows it.
  const suppressClick = useRef(false);
  const [drag, setDrag] = useState<{ x: number; item: number } | null>(null);

  const activeIndex = TABS.findIndex((tab) => tab.key === active);
  const restIndex = target ?? activeIndex;
  const litIndex = drag ? Math.round(drag.x / drag.item) : restIndex;

  const onPointerDown = (event: PointerEvent<HTMLUListElement>) => {
    suppressClick.current = false;
    setTarget(null);
    start.current = event.clientX;
  };

  const onPointerMove = (event: PointerEvent<HTMLUListElement>) => {
    if (start.current === null) return;
    if (!drag && Math.abs(event.clientX - start.current) < DRAG_THRESHOLD) return;
    if (!drag) event.currentTarget.setPointerCapture(event.pointerId);
    const rect = event.currentTarget.getBoundingClientRect();
    const item = (rect.width - BAR_INSET * 2) / TABS.length;
    const x = event.clientX - rect.left - BAR_INSET - item / 2;
    setDrag({ x: Math.min(Math.max(x, 0), item * (TABS.length - 1)), item });
  };

  const endDrag = (commit: boolean) => {
    start.current = null;
    if (!drag) return;
    setDrag(null);
    if (!commit) return;
    const index = Math.round(drag.x / drag.item);
    if (index !== activeIndex) setTarget(index);
    // Reuse the link's own click, so the house guard and client navigation run as for a tap.
    listRef.current?.querySelectorAll("a")[index]?.click();
    suppressClick.current = true;
  };

  return (
    // Offset with bottom, not padding: Safari paints a solid strip behind its toolbar when a
    // full-width fixed element touches the bottom edge, instead of letting content show through.
    <nav
      aria-label="Main"
      className="pointer-events-none fixed group-has-[[data-no-tab-bar]]/app:hidden bottom-[max(1rem,calc(env(safe-area-inset-bottom)-0.5rem))] left-1/2 z-50 flex w-full max-w-md -translate-x-1/2 items-center gap-3 px-4"
    >
      <ul
        ref={listRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => endDrag(true)}
        onPointerCancel={() => endDrag(false)}
        onClickCapture={(event) => {
          if (!suppressClick.current) return;
          suppressClick.current = false;
          event.preventDefault();
          event.stopPropagation();
        }}
        className="pointer-events-auto relative flex h-16 flex-1 touch-none select-none items-stretch rounded-full border border-border bg-card/70 px-1 shadow-[0_6px_17px_color-mix(in_srgb,var(--background),black_15%)] backdrop-blur-[10px] dark:bg-card/80 [@media(prefers-reduced-transparency:reduce)]:bg-card"
      >
        <li
          aria-hidden
          role="presentation"
          className={cn(
            "pointer-events-none absolute inset-y-1 left-1 rounded-full bg-foreground/8 ease-[cubic-bezier(0.3,1.3,0.5,1)] motion-safe:duration-300",
            !drag && "motion-safe:transition-transform",
            restIndex < 0 && !drag && "opacity-0",
          )}
          style={{
            width: `calc((100% - 0.5rem) / ${TABS.length})`,
            transform: drag
              ? `translateX(${drag.x}px)`
              : `translateX(${Math.max(restIndex, 0) * 100}%)`,
          }}
        />
        {TABS.map((tab, index) => {
          const isActive = active === tab.key;
          const isLit = litIndex === index;
          const Icon = isActive ? ICONS[tab.key].active : ICONS[tab.key].inactive;

          return (
            <li key={tab.key} className="relative flex-1 py-1">
              <Link
                href={tab.href}
                prefetch
                draggable={false}
                onClick={(event) => {
                  if (!hasNoHouse || !tab.requiresHouse) return;
                  event.preventDefault();
                  rejectHouseRequired(pathname, () => router.replace("/"));
                }}
                aria-label={tab.label}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group flex h-full min-h-11 w-full items-center justify-center rounded-full transition-colors duration-200 hover:cursor-pointer",
                  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary",
                  isLit ? "text-foreground" : "text-icon-muted hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex transition-transform duration-150 ease-out group-active:scale-90",
                    isActive && previous !== undefined && "tab-icon-activate",
                    !isActive && previous === tab.key && "tab-icon-deactivate",
                  )}
                >
                  <Icon size={SIZES[tab.key]} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <FloatingActionButton
        className="pointer-events-auto"
        actions={[
          {
            label: "New Items",
            icon: <BasketOutlineIcon size={20} />,
            onSelect: () => guard(addItem),
          },
          {
            label: "New Expense",
            icon: <BillFilledIcon size={18} />,
            onSelect: () => guard(() => router.push(NEW_EXPENSE_PATH)),
          },
        ]}
      />
    </nav>
  );
}
