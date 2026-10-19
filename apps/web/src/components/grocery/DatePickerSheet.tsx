"use client";

import {
  CALENDAR_WEEKS,
  isSameLocalDay,
  monthGrid,
  monthLabel,
  startOfLocalDay,
  WEEKDAY_LABELS,
} from "@kinwoo/core/grocery";
import { ArrowRightIcon } from "@kinwoo/icons";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type WheelEvent,
} from "react";

import { BottomSheet } from "@/components/BottomSheet";
import { cn } from "@/lib/utils";

const DRAG_START_DISTANCE = 8;
const COMMIT_RATIO = 0.25;
const COMMIT_VELOCITY = 0.5;
const RUBBER_BAND = 0.25;
const WHEEL_GAP_MS = 200;
const SLIDE_MS = 260;
const SLIDE_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";
const TEXT_BUTTON =
  "px-4 py-2 font-display text-base font-medium text-foreground hover:cursor-pointer";

type View = { year: number; month: number };
type Direction = -1 | 0 | 1;

function shiftMonth({ year, month }: View, delta: -1 | 1): View {
  const next = new Date(year, month + delta, 1);
  return { year: next.getFullYear(), month: next.getMonth() };
}

function MonthPane({
  view,
  value,
  today,
  active,
  onSelect,
}: {
  view: View;
  value: Date;
  today: Date;
  active: boolean;
  onSelect: (date: Date) => void;
}) {
  const days = useMemo(() => monthGrid(view.year, view.month), [view]);

  return (
    <div
      inert={!active}
      aria-hidden={!active}
      className="grid min-w-0 flex-1 grid-cols-7"
      style={{ gridTemplateRows: `repeat(${CALENDAR_WEEKS}, 3rem)` }}
    >
      {days.map(({ date, inMonth }) => {
        if (!inMonth) return <span key={date.getTime()} />;
        const selected = isSameLocalDay(date, value);
        const isToday = isSameLocalDay(date, today);
        const future = date.getTime() > today.getTime();
        return (
          <div key={date.getTime()} className="flex items-center justify-center">
            <button
              type="button"
              aria-label={`${date.getDate()} ${monthLabel(date.getFullYear(), date.getMonth())}`}
              aria-pressed={selected}
              aria-current={isToday ? "date" : undefined}
              disabled={future}
              onClick={() => onSelect(date)}
              className={cn(
                "flex size-11 items-center justify-center rounded-full font-display text-base transition-colors hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-30",
                FOCUS_RING,
                selected
                  ? "bg-foreground text-background"
                  : cn(
                      "text-foreground",
                      isToday ? "border border-border" : "enabled:hover:bg-muted",
                    ),
              )}
            >
              {date.getDate()}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function Calendar({
  value,
  onSelect,
  onCancel,
}: {
  value: Date;
  onSelect: (date: Date) => void;
  onCancel: () => void;
}) {
  const today = useMemo(() => startOfLocalDay(new Date()), []);
  const [view, setView] = useState<View>({ year: value.getFullYear(), month: value.getMonth() });
  const atCurrentMonth = view.year === today.getFullYear() && view.month === today.getMonth();

  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const labels = useRef<(HTMLDivElement | null)[]>([null, null, null]);
  const drag = useRef<{
    x: number;
    y: number;
    active: boolean;
    lastX: number;
    lastT: number;
    vx: number;
  } | null>(null);
  const animating = useRef(false);
  const pending = useRef<Direction>(0);
  const settleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const swiped = useRef(false);
  const lastWheel = useRef(0);

  const applyOffset = useCallback((dx: number, animate: boolean) => {
    const trackEl = track.current;
    const width = viewport.current?.offsetWidth ?? 0;
    if (!trackEl || !width) return;

    const progress = Math.min(1, Math.abs(dx) / width);
    const opacities = [dx > 0 ? progress : 0, 1 - progress, dx < 0 ? progress : 0];

    trackEl.style.transition = animate ? `transform ${SLIDE_MS}ms ${SLIDE_EASING}` : "none";
    trackEl.style.transform = `translate3d(${-width + dx}px, 0, 0)`;
    labels.current.forEach((label, index) => {
      if (!label) return;
      label.style.transition = animate ? `opacity ${SLIDE_MS}ms ${SLIDE_EASING}` : "none";
      label.style.opacity = String(opacities[index]);
    });
  }, []);

  // Runs before paint so the recentred track never shows the old offset on the new month.
  useLayoutEffect(() => {
    applyOffset(0, false);
  }, [view, applyOffset]);

  useEffect(() => () => clearTimeout(settleTimer.current), []);

  const finish = useCallback(() => {
    if (!animating.current) return;
    animating.current = false;
    clearTimeout(settleTimer.current);
    const delta = pending.current;
    pending.current = 0;
    if (delta !== 0) setView((current) => shiftMonth(current, delta));
  }, []);

  const settle = useCallback(
    (delta: Direction) => {
      const width = viewport.current?.offsetWidth ?? 0;
      if (delta === 0 || !width) {
        applyOffset(0, true);
        return;
      }
      animating.current = true;
      pending.current = delta;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        applyOffset(-delta * width, false);
        finish();
        return;
      }
      applyOffset(-delta * width, true);
      settleTimer.current = setTimeout(finish, SLIDE_MS + 100);
    },
    [applyOffset, finish],
  );

  const go = (delta: -1 | 1) => {
    if (animating.current || (delta === 1 && atCurrentMonth)) return;
    settle(delta);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    swiped.current = false;
    if (animating.current) return;
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      active: false,
      lastX: event.clientX,
      lastT: event.timeStamp,
      vx: 0,
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state) return;
    const dx = event.clientX - state.x;
    const dy = event.clientY - state.y;

    if (!state.active) {
      if (Math.abs(dx) < DRAG_START_DISTANCE || Math.abs(dx) < Math.abs(dy)) return;
      state.active = true;
      swiped.current = true;
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Capture can fail for a pointer the browser already released; the drag still works.
      }
    }

    const elapsed = event.timeStamp - state.lastT;
    if (elapsed > 0) state.vx = (event.clientX - state.lastX) / elapsed;
    state.lastX = event.clientX;
    state.lastT = event.timeStamp;

    applyOffset(dx < 0 && atCurrentMonth ? dx * RUBBER_BAND : dx, false);
  };

  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    drag.current = null;
    if (!state?.active) return;

    const width = viewport.current?.offsetWidth ?? 0;
    const dx = event.clientX - state.x;
    const commits = Math.abs(dx) > width * COMMIT_RATIO || Math.abs(state.vx) > COMMIT_VELOCITY;
    const direction: Direction = !commits ? 0 : dx < 0 || (dx === 0 && state.vx < 0) ? 1 : -1;
    settle(direction === 1 && atCurrentMonth ? 0 : direction);
  };

  // A trackpad swipe streams wheel events with inertia, so only the first of a burst counts.
  const onWheel = (event: WheelEvent) => {
    if (Math.abs(event.deltaX) < 4 || Math.abs(event.deltaX) < Math.abs(event.deltaY)) return;
    const now = Date.now();
    const fresh = now - lastWheel.current > WHEEL_GAP_MS;
    lastWheel.current = now;
    if (fresh) go(event.deltaX > 0 ? 1 : -1);
  };

  const previous = shiftMonth(view, -1);
  const next = shiftMonth(view, 1);
  const headings = [
    monthLabel(previous.year, previous.month),
    monthLabel(view.year, view.month),
    atCurrentMonth ? "" : monthLabel(next.year, next.month),
  ];

  return (
    <div>
      <div className="mb-8 mt-6 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => go(-1)}
          className={cn("flex size-10 items-center justify-start hover:cursor-pointer", FOCUS_RING)}
        >
          <ArrowRightIcon size={22} className="rotate-180" />
        </button>
        <div className="relative h-6 flex-1">
          {headings.map((text, index) => (
            <div
              key={index}
              ref={(element) => {
                labels.current[index] = element;
              }}
              className="absolute inset-0 flex items-center justify-center font-display text-base font-medium text-foreground"
            >
              {index === 1 ? <h2>{text}</h2> : <span aria-hidden>{text}</span>}
            </div>
          ))}
        </div>
        <button
          type="button"
          aria-label="Next month"
          disabled={atCurrentMonth}
          onClick={() => go(1)}
          className={cn(
            "flex size-10 items-center justify-end hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-30",
            FOCUS_RING,
          )}
        >
          <ArrowRightIcon size={22} />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7" aria-hidden>
        {WEEKDAY_LABELS.map((label, index) => (
          <span key={index} className="py-1 text-center font-display text-xs text-muted-foreground">
            {label}
          </span>
        ))}
      </div>

      <div
        ref={viewport}
        className="touch-pan-y select-none overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onWheel={onWheel}
        onClickCapture={(event) => {
          if (!swiped.current) return;
          swiped.current = false;
          event.stopPropagation();
        }}
      >
        <div
          ref={track}
          className="flex w-[300%] will-change-transform"
          onTransitionEnd={(event) => {
            if (event.target === event.currentTarget && event.propertyName === "transform") {
              finish();
            }
          }}
        >
          <MonthPane
            view={previous}
            value={value}
            today={today}
            active={false}
            onSelect={onSelect}
          />
          <MonthPane view={view} value={value} today={today} active onSelect={onSelect} />
          {atCurrentMonth ? (
            <div className="min-w-0 flex-1" />
          ) : (
            <MonthPane view={next} value={value} today={today} active={false} onSelect={onSelect} />
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button type="button" onClick={onCancel} className={cn(TEXT_BUTTON, FOCUS_RING)}>
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSelect(today)}
          className={cn(TEXT_BUTTON, "underline underline-offset-4", FOCUS_RING)}
        >
          Today
        </button>
      </div>
    </div>
  );
}

export function DatePickerSheet({
  open,
  onClose,
  value,
  onSelect,
  label = "Choose the date bought",
}: {
  open: boolean;
  onClose: () => void;
  value: Date;
  onSelect: (date: Date) => void;
  label?: string;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} label={label}>
      <Calendar
        value={value}
        onCancel={onClose}
        onSelect={(date) => {
          onSelect(date);
          onClose();
        }}
      />
    </BottomSheet>
  );
}
