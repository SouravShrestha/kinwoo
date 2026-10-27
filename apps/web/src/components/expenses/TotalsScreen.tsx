"use client";

import { useExpenseTotals } from "@kinwoo/client/expenses";
import { useActiveHouse } from "@kinwoo/client/houses";
import {
  currentMonthKey,
  shiftMonth,
  totalsMonthLabel,
  totalsView,
  totalsChartY,
  totalsSeriesPath,
  type TotalsPoint,
  type TotalsTick,
} from "@kinwoo/core/expenses";
import { formatPaise } from "@kinwoo/core/grocery";
import { ArrowRightIcon } from "@kinwoo/icons";
import { useEffect, useId, useRef, useState, type AnimationEvent } from "react";

import { TotalsSkeleton } from "@/components/skeleton/skeletons";
import { useHouseNavigation } from "@/lib/house-navigation";
import { useSwipeToClose } from "@/lib/use-swipe-to-close";
import { cn } from "@/lib/utils";

import { PeriodFilter } from "./PeriodFilter";

const CHART_WIDTH = 320;
const CHART_HEIGHT = 220;
const AXIS_WIDTH = 40;

function TotalsChart({ points, yTicks }: { points: TotalsPoint[]; yTicks: TotalsTick[] }) {
  const total = totalsSeriesPath(
    points.map((point) => point.totalRatio),
    CHART_WIDTH,
    CHART_HEIGHT,
  );
  const share = totalsSeriesPath(
    points.map((point) => point.shareRatio),
    CHART_WIDTH,
    CHART_HEIGHT,
  );
  const fadeId = useId();

  return (
    <div className="mt-10 px-6">
      <div className="relative" style={{ marginInline: AXIS_WIDTH }}>
        <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="block w-full" aria-hidden>
          <defs>
            <linearGradient id={fadeId} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                className="text-accent"
                stopColor="currentColor"
                stopOpacity={0.35}
              />
              <stop
                offset="100%"
                className="text-accent"
                stopColor="currentColor"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          {yTicks.map((tick) => {
            const y = totalsChartY(tick.ratio, CHART_HEIGHT);
            return (
              <line
                key={tick.paise}
                x1={0}
                x2={CHART_WIDTH}
                y1={y}
                y2={y}
                className="stroke-border"
                strokeWidth={1}
                strokeDasharray="2 4"
              />
            );
          })}
          <path d={total.area} fill={`url(#${fadeId})`} />
          {[
            { path: total, stroke: "stroke-accent", fill: "fill-accent" },
            { path: share, stroke: "stroke-foreground", fill: "fill-foreground" },
          ].map(({ path, stroke, fill }) => (
            <g key={stroke}>
              <path
                d={path.line}
                className={stroke}
                fill="none"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {path.points.map((point, index) =>
                point ? (
                  <circle
                    key={points[index]?.month}
                    cx={point.x}
                    cy={point.y}
                    r={points[index]?.selected ? 6 : 4}
                    className={cn(fill, "stroke-background")}
                    strokeWidth={2}
                  />
                ) : null,
              )}
            </g>
          ))}
        </svg>
        {yTicks.map((tick) => (
          <span
            key={tick.paise}
            className="absolute text-right font-display text-xs leading-[calc(1rem*var(--font-scale,1))] text-muted-foreground"
            style={{
              left: -AXIS_WIDTH,
              width: AXIS_WIDTH - 8,
              top: `${(totalsChartY(tick.ratio, CHART_HEIGHT) / CHART_HEIGHT) * 100}%`,
              transform: "translateY(-50%)",
            }}
          >
            {tick.label}
          </span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-3" style={{ marginInline: AXIS_WIDTH }}>
        {points.map((point) => (
          <span
            key={point.month}
            className={cn(
              "text-center font-display text-sm font-medium tracking-wide",
              point.selected ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {point.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName: string;
}) {
  return (
    <div className="min-w-0 flex-1 text-center">
      <p className="font-display text-base font-medium text-foreground">{label}</p>
      <p className={cn("mt-2 font-display text-2xl", valueClassName)}>{value}</p>
    </div>
  );
}

function TotalsBody({ houseId }: { houseId: string }) {
  const { data: months } = useExpenseTotals(houseId);
  const [current] = useState(currentMonthKey);
  const [month, setMonth] = useState(current);
  const [allTime, setAllTime] = useState(false);
  const view = totalsView(months ?? [], allTime ? null : month, current);

  return (
    <>
      <div className="mt-4">
        <PeriodFilter
          label={totalsMonthLabel(month)}
          allTime={allTime}
          canGoPrevious={view.canGoPrevious}
          canGoNext={view.canGoNext}
          onToggleAllTime={() => setAllTime((value) => !value)}
          onPrevious={() => setMonth((value) => shiftMonth(value, -1))}
          onNext={() => setMonth((value) => shiftMonth(value, 1))}
        />
      </div>

      {months ? (
        <>
          {view.points.length > 0 ? (
            <TotalsChart key={month} points={view.points} yTicks={view.yTicks} />
          ) : null}
          <div className="mt-16 px-6">
            <p className="text-center font-display text-base text-muted-foreground">
              Your share is {view.sharePercent}% of the group&apos;s total spending
            </p>
            <div className="mt-6 flex gap-4">
              <Stat
                label="Total spent"
                value={formatPaise(view.totalPaise)}
                valueClassName="text-accent"
              />
              <Stat
                label="Your share"
                value={formatPaise(view.sharePaise)}
                valueClassName="text-foreground"
              />
            </div>
          </div>
        </>
      ) : (
        <TotalsSkeleton />
      )}
    </>
  );
}

export function TotalsScreen() {
  const { activeHouse, ready } = useActiveHouse();
  const houseId = activeHouse?.house.id ?? null;
  const { goBack, goHome } = useHouseNavigation();
  const [closing, setClosing] = useState(false);
  const screenRef = useRef<HTMLElement>(null);
  useSwipeToClose(screenRef, !closing, () => setClosing(true));

  useEffect(() => {
    if (ready && !activeHouse) goHome();
  }, [ready, activeHouse, goHome]);

  // Children fire their own animationend events, which bubble up here.
  const onAnimationEnd = (event: AnimationEvent<HTMLElement>) => {
    if (closing && event.target === event.currentTarget) goBack();
  };

  return (
    <main
      ref={screenRef}
      onAnimationEnd={onAnimationEnd}
      className={cn(
        "flex h-dvh flex-col overflow-hidden bg-background",
        closing ? "sheet-panel-out" : "sheet-panel-in",
      )}
    >
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col overflow-y-auto pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
        <header className="px-6 pt-[calc(1.25rem+env(safe-area-inset-top))]">
          <button
            type="button"
            aria-label="Back"
            disabled={closing}
            onClick={() => setClosing(true)}
            className="flex size-10 items-center justify-start hover:cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            <ArrowRightIcon size={28} className="rotate-90" />
          </button>
          <h1 className="sr-only">Totals</h1>
        </header>
        {houseId ? <TotalsBody houseId={houseId} /> : null}
      </div>
    </main>
  );
}
