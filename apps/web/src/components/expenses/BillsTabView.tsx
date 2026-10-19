"use client";

import { CloudLockFilledIcon, GlobeFilledIcon, type WebIconProps } from "@kinwoo/icons";
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

export type BillsView = "shared" | "private";

const VIEWS: readonly BillsView[] = ["shared", "private"];
const LAST_INDEX = VIEWS.length - 1;
const LABELS: Record<BillsView, string> = { shared: "Shared", private: "Private" };
const ICONS: Record<
  BillsView,
  { outline: ComponentType<WebIconProps>; filled: ComponentType<WebIconProps> }
> = {
  shared: { outline: GlobeFilledIcon, filled: GlobeFilledIcon },
  private: { outline: CloudLockFilledIcon, filled: CloudLockFilledIcon },
};
const ICON_SIZES: Record<BillsView, number> = { shared: 17, private: 17 };
const INDICATOR_WIDTH_RATIO = 0.65;
const INDICATOR_INSET_RATIO = (1 - INDICATOR_WIDTH_RATIO) / 2;

const viewIndex = (view: BillsView) => VIEWS.indexOf(view);
const tabId = (view: BillsView) => `bills-tab-${view}`;
const panelId = (view: BillsView) => `bills-panel-${view}`;

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Tabs over a horizontally swipeable pager. The pager is a scroll-snap container, so touch
// and trackpad swipes get native momentum; the underline follows its scroll position.
export function BillsTabView({
  value,
  onChange,
  renderPage,
}: {
  value: BillsView;
  onChange: (value: BillsView) => void;
  renderPage: (view: BillsView) => ReactNode;
}) {
  const index = viewIndex(value);

  // Derived during render so the first paint does not animate.
  const [seen, setSeen] = useState(value);
  const [previous, setPrevious] = useState<BillsView | undefined>(undefined);
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
    const aLeft = a.offsetLeft + a.offsetWidth * INDICATOR_INSET_RATIO;
    const bLeft = b.offsetLeft + b.offsetWidth * INDICATOR_INSET_RATIO;
    const x = aLeft + (bLeft - aLeft) * t;
    const width = (a.offsetWidth + (b.offsetWidth - a.offsetWidth) * t) * INDICATOR_WIDTH_RATIO;
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
  // scroll into empty space below a short page.
  useLayoutEffect(() => {
    const pager = pagerRef.current;
    const page = pageRefs.current[index];
    if (!pager || !page) return;
    const sync = () => {
      pager.style.height = `${page.offsetHeight}px`;
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(page);
    return () => observer.disconnect();
  }, [index]);

  const select = (view: BillsView) => {
    onChange(view);
    const pager = pagerRef.current;
    if (!pager) return;
    const left = viewIndex(view) * pager.clientWidth;
    if (Math.abs(pager.scrollLeft - left) < 1) return;
    targetRef.current = viewIndex(view);
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
    const nearest = VIEWS[Math.round(progress)];
    if (nearest && nearest !== value) onChange(nearest);
  };

  const releaseTarget = () => {
    targetRef.current = null;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % VIEWS.length
        : event.key === "ArrowLeft"
          ? (index - 1 + VIEWS.length) % VIEWS.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? LAST_INDEX
              : null;
    const view = next === null ? undefined : VIEWS[next];
    if (next === null || !view) return;
    event.preventDefault();
    select(view);
    tabRefs.current[next]?.focus();
  };

  return (
    <>
      <div
        role="tablist"
        aria-label="Bills view"
        onKeyDown={onKeyDown}
        className="relative -mx-6 grid grid-cols-2 border-b-[1.3px] border-border"
      >
        {VIEWS.map((view, i) => {
          const active = view === value;
          const Icon = active ? ICONS[view].filled : ICONS[view].outline;
          return (
            <button
              key={view}
              ref={(node) => {
                tabRefs.current[i] = node;
              }}
              type="button"
              role="tab"
              id={tabId(view)}
              aria-selected={active}
              aria-controls={panelId(view)}
              tabIndex={active ? 0 : -1}
              onClick={() => select(view)}
              className={cn(
                "group flex items-center justify-center gap-2 px-3 py-3.5 font-display text-base transition-colors hover:cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "flex transition-transform duration-150 ease-out group-active:scale-90",
                  active && previous !== undefined && "tab-icon-activate",
                  !active && previous === view && "tab-icon-deactivate",
                )}
              >
                <Icon size={ICON_SIZES[view]} />
              </span>
              {/* The hidden medium copy reserves the wider width so tabs don't shift. */}
              <span className="grid">
                <span aria-hidden className="invisible col-start-1 row-start-1 font-medium">
                  {LABELS[view]}
                </span>
                <span
                  className={cn(
                    "col-start-1 row-start-1 text-center",
                    active ? "font-medium" : "font-normal",
                  )}
                >
                  {LABELS[view]}
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

      <div
        ref={pagerRef}
        onScroll={onScroll}
        onPointerDown={releaseTarget}
        onTouchStart={releaseTarget}
        onWheel={releaseTarget}
        className="-mx-6 flex flex-1 snap-x snap-mandatory items-start overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {VIEWS.map((view, i) => (
          <div
            key={view}
            ref={(node) => {
              pageRefs.current[i] = node;
            }}
            role="tabpanel"
            id={panelId(view)}
            aria-labelledby={tabId(view)}
            inert={i !== index}
            className="w-full shrink-0 snap-start snap-always px-6 pt-6"
          >
            {renderPage(view)}
          </div>
        ))}
      </div>
    </>
  );
}
