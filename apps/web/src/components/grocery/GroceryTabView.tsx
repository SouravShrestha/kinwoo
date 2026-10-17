"use client";

import { GROCERY_TABS, type GroceryTabKey } from "@kinwoo/core/grocery";
import {
  BadgeCheckActiveIcon,
  BadgeCheckIcon,
  PendingActiveIcon,
  PendingIcon,
  UserCircleActiveIcon,
  UserCircleIcon,
  type WebIconProps,
} from "@kinwoo/icons";
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

const TAB_ICONS: Record<
  GroceryTabKey,
  { outline: ComponentType<WebIconProps>; filled: ComponentType<WebIconProps> }
> = {
  pending: { outline: PendingIcon, filled: PendingActiveIcon },
  assigned: { outline: UserCircleIcon, filled: UserCircleActiveIcon },
  bought: { outline: BadgeCheckIcon, filled: BadgeCheckActiveIcon },
};

const TAB_ICON_SIZES: Record<GroceryTabKey, number> = { pending: 14, assigned: 17, bought: 17 };

const LAST_INDEX = GROCERY_TABS.length - 1;

const tabIndex = (key: GroceryTabKey) => GROCERY_TABS.findIndex((tab) => tab.key === key);
const tabId = (key: GroceryTabKey) => `grocery-tab-${key}`;
const panelId = (key: GroceryTabKey) => `grocery-tabpanel-${key}`;

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Tabs over a horizontally swipeable pager. The pager is a scroll-snap container, so touch
// and trackpad swipes get native momentum; the underline follows its scroll position.
export function GroceryTabView({
  value,
  onChange,
  between,
  fillActive = false,
  renderPage,
}: {
  value: GroceryTabKey;
  onChange: (value: GroceryTabKey) => void;
  between?: ReactNode;
  fillActive?: boolean;
  renderPage: (key: GroceryTabKey) => ReactNode;
}) {
  const index = tabIndex(value);

  // Derived during render so the first paint does not animate.
  const [seen, setSeen] = useState(value);
  const [previous, setPrevious] = useState<GroceryTabKey | undefined>(undefined);
  if (seen !== value) {
    setSeen(value);
    setPrevious(seen);
  }

  const indexRef = useRef(index);
  useLayoutEffect(() => {
    indexRef.current = index;
  }, [index]);

  const pagerRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  // Set while a tab press scrolls the pager, so the pages it passes over don't become active.
  const targetRef = useRef<number | null>(null);

  const placeIndicator = useCallback(() => {
    const pager = pagerRef.current;
    const indicator = indicatorRef.current;
    if (!pager || !indicator || pager.clientWidth === 0) return;
    const progress = Math.min(Math.max(pager.scrollLeft / pager.clientWidth, 0), LAST_INDEX);
    const from = Math.floor(progress);
    const to = Math.min(from + 1, LAST_INDEX);
    const a = tabRefs.current[from];
    const b = tabRefs.current[to];
    if (!a || !b) return;
    const t = progress - from;
    const x = a.offsetLeft + (b.offsetLeft - a.offsetLeft) * t;
    const width = a.offsetWidth + (b.offsetWidth - a.offsetWidth) * t;
    indicator.style.transform = `translateX(${x}px)`;
    indicator.style.width = `${width}px`;
  }, []);

  useLayoutEffect(() => {
    const pager = pagerRef.current;
    if (!pager) return;
    const observer = new ResizeObserver(() => {
      if (targetRef.current === null) {
        pager.scrollLeft = indexRef.current * pager.clientWidth;
      }
      placeIndicator();
    });
    observer.observe(pager);
    for (const tab of tabRefs.current) if (tab) observer.observe(tab);
    return () => observer.disconnect();
  }, [placeIndicator]);

  // Inactive pages may be taller; clip the pager to the active page so the screen doesn't
  // scroll into empty space below a short tab. flex-1 still lets it grow to fill the screen.
  // An active page that wants to fill (the empty state) takes the free space through the
  // pager's style prop, so server-rendered markup is already centred before hydration.
  useLayoutEffect(() => {
    const pager = pagerRef.current;
    const page = pageRefs.current[index];
    if (!pager || !page) return;
    if (fillActive) return;
    const sync = () => {
      pager.style.height = `${page.offsetHeight}px`;
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(page);
    return () => observer.disconnect();
  }, [index, fillActive]);

  const select = (key: GroceryTabKey) => {
    onChange(key);
    const pager = pagerRef.current;
    if (!pager) return;
    const left = tabIndex(key) * pager.clientWidth;
    if (Math.abs(pager.scrollLeft - left) < 1) return;
    targetRef.current = tabIndex(key);
    pager.scrollTo({ left, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

  const onScroll = () => {
    placeIndicator();
    const pager = pagerRef.current;
    if (!pager || pager.clientWidth === 0) return;
    const progress = pager.scrollLeft / pager.clientWidth;
    if (targetRef.current !== null) {
      if (Math.abs(progress - targetRef.current) < 0.01) targetRef.current = null;
      return;
    }
    const nearest = GROCERY_TABS[Math.round(progress)]?.key;
    if (nearest && nearest !== value) onChange(nearest);
  };

  const releaseTarget = () => {
    targetRef.current = null;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % GROCERY_TABS.length
        : event.key === "ArrowLeft"
          ? (index - 1 + GROCERY_TABS.length) % GROCERY_TABS.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? LAST_INDEX
              : null;
    const key = next === null ? undefined : GROCERY_TABS[next]?.key;
    if (next === null || !key) return;
    event.preventDefault();
    select(key);
    tabRefs.current[next]?.focus();
  };

  return (
    <>
      <div
        role="tablist"
        aria-label="Item status"
        onKeyDown={onKeyDown}
        className="relative -mx-6 flex justify-between border-b-[1.3px] border-border px-3"
      >
        {GROCERY_TABS.map((tab, i) => {
          const active = tab.key === value;
          const Icon = active ? TAB_ICONS[tab.key].filled : TAB_ICONS[tab.key].outline;
          return (
            <button
              key={tab.key}
              ref={(node) => {
                tabRefs.current[i] = node;
              }}
              type="button"
              role="tab"
              id={tabId(tab.key)}
              aria-selected={active}
              aria-controls={panelId(tab.key)}
              tabIndex={active ? 0 : -1}
              onClick={() => select(tab.key)}
              className={cn(
                "group flex items-center gap-2 px-3 py-3.5 font-display text-base transition-colors hover:cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "flex transition-transform duration-150 ease-out group-active:scale-90",
                  active && previous !== undefined && "tab-icon-activate",
                  !active && previous === tab.key && "tab-icon-deactivate",
                )}
              >
                <Icon size={TAB_ICON_SIZES[tab.key]} />
              </span>
              {/* The hidden medium copy reserves the wider width so tabs don't shift. */}
              <span className="grid">
                <span aria-hidden className="invisible col-start-1 row-start-1 font-medium">
                  {tab.title}
                </span>
                <span
                  className={cn(
                    "col-start-1 row-start-1 text-center",
                    active ? "font-medium" : "font-normal",
                  )}
                >
                  {tab.title}
                </span>
              </span>
            </button>
          );
        })}
        <span
          ref={indicatorRef}
          aria-hidden
          className="pointer-events-none absolute -bottom-[1.3px] left-0 h-[1.3px] w-0 bg-foreground"
        />
      </div>

      {between}

      <div
        ref={pagerRef}
        style={fillActive ? { flex: "1 1 0px", alignItems: "stretch" } : undefined}
        onScroll={onScroll}
        onPointerDown={releaseTarget}
        onTouchStart={releaseTarget}
        onWheel={releaseTarget}
        className="-mx-6 flex flex-1 snap-x snap-mandatory items-start overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {GROCERY_TABS.map((tab, i) => (
          <div
            key={tab.key}
            ref={(node) => {
              pageRefs.current[i] = node;
            }}
            role="tabpanel"
            id={panelId(tab.key)}
            aria-labelledby={tabId(tab.key)}
            inert={i !== index}
            className="w-full shrink-0 snap-start snap-always px-6 pt-4"
          >
            {renderPage(tab.key)}
          </div>
        ))}
      </div>
    </>
  );
}
