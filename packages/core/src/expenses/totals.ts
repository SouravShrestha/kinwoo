import { SHORT_MONTHS } from "../grocery/bought-groups";
import { monthLabel } from "../grocery/purchase-date";
import { parseSpentOn, spentOnFor } from "./ledger";

// `month` is "YYYY-MM".
export type MonthTotal = { month: string; totalPaise: number; sharePaise: number };

// Ratios are 0..1 of the largest value in the window; null for a month that hasn't started.
export type TotalsPoint = {
  month: string;
  label: string;
  selected: boolean;
  totalRatio: number | null;
  shareRatio: number | null;
};

export type TotalsTick = { paise: number; ratio: number; label: string };

export type TotalsView = {
  points: TotalsPoint[];
  yTicks: TotalsTick[];
  totalPaise: number;
  sharePaise: number;
  sharePercent: number;
  canGoPrevious: boolean;
  canGoNext: boolean;
};

const CHART_INSET = 10;
const TICK_INTERVALS = 3;
const NICE_FACTORS = [1, 2, 2.5, 5, 10];

export function currentMonthKey(now: Date = new Date()): string {
  return spentOnFor(now).slice(0, 7);
}

export function shiftMonth(month: string, delta: number): string {
  const date = parseSpentOn(`${month}-01`);
  return spentOnFor(new Date(date.getFullYear(), date.getMonth() + delta, 1)).slice(0, 7);
}

export function totalsMonthLabel(month: string): string {
  const date = parseSpentOn(`${month}-01`);
  return monthLabel(date.getFullYear(), date.getMonth());
}

// `selected` null means all time. The chart shows the month before, the selected one and the next.
export function totalsView(
  months: readonly MonthTotal[],
  selected: string | null,
  current: string,
): TotalsView {
  const byMonth = new Map(months.map((entry) => [entry.month, entry]));
  const earliest = months.reduce<string | null>(
    (min, entry) => (min === null || entry.month < min ? entry.month : min),
    null,
  );

  if (selected === null) {
    const totalPaise = months.reduce((sum, entry) => sum + entry.totalPaise, 0);
    const sharePaise = months.reduce((sum, entry) => sum + entry.sharePaise, 0);
    return {
      points: [],
      yTicks: [],
      totalPaise,
      sharePaise,
      sharePercent: percentOf(sharePaise, totalPaise),
      canGoPrevious: false,
      canGoNext: false,
    };
  }

  const window = [-1, 0, 1].map((offset) => shiftMonth(selected, offset));
  const maxPaise = Math.max(
    0,
    ...window.flatMap((month) => [
      byMonth.get(month)?.totalPaise ?? 0,
      byMonth.get(month)?.sharePaise ?? 0,
    ]),
  );
  const step = axisStep(maxPaise);
  const axisMax = step * TICK_INTERVALS;
  const yTicks = Array.from({ length: TICK_INTERVALS + 1 }, (_, index) => ({
    paise: step * index,
    ratio: index / TICK_INTERVALS,
    label: formatAxisPaise(step * index),
  }));
  const ratio = (paise: number) => paise / axisMax;
  const points = window.map((month) => {
    const started = month <= current;
    return {
      month,
      label: (SHORT_MONTHS[Number(month.slice(5)) - 1] ?? "").toUpperCase(),
      selected: month === selected,
      totalRatio: started ? ratio(byMonth.get(month)?.totalPaise ?? 0) : null,
      shareRatio: started ? ratio(byMonth.get(month)?.sharePaise ?? 0) : null,
    };
  });

  const picked = byMonth.get(selected);
  const totalPaise = picked?.totalPaise ?? 0;
  const sharePaise = picked?.sharePaise ?? 0;
  return {
    points,
    yTicks,
    totalPaise,
    sharePaise,
    sharePercent: percentOf(sharePaise, totalPaise),
    canGoPrevious: earliest !== null && selected > earliest,
    canGoNext: selected < current,
  };
}

function percentOf(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part * 100) / whole);
}

// Smallest 1, 2, 2.5, 5 or 10 times a power of ten (at least ₹1) that fits three steps.
function axisStep(maxPaise: number): number {
  if (maxPaise <= 0) return 10000;
  const raw = maxPaise / TICK_INTERVALS;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const factor = NICE_FACTORS.find((candidate) => candidate * magnitude >= raw) ?? 10;
  return Math.max(100, factor * magnitude);
}

function compact(value: number, suffix: string): string {
  return `₹${Math.round(value * 10) / 10}${suffix}`;
}

export function formatAxisPaise(paise: number): string {
  const rupees = paise / 100;
  if (rupees < 1000) return compact(rupees, "");
  if (rupees < 100_000) return compact(rupees / 1000, "k");
  if (rupees < 10_000_000) return compact(rupees / 100_000, "L");
  return compact(rupees / 10_000_000, "Cr");
}

export function totalsChartY(ratio: number, height: number): number {
  return CHART_INSET + (1 - ratio) * (height - CHART_INSET * 2);
}

// Points sit at the centre of equal-width columns so labels in a three-column row line up.
export function totalsSeriesPath(
  ratios: readonly (number | null)[],
  width: number,
  height: number,
): { points: ({ x: number; y: number } | null)[]; line: string; area: string } {
  const points = ratios.map((value, index) =>
    value === null
      ? null
      : { x: ((index + 0.5) / ratios.length) * width, y: totalsChartY(value, height) },
  );
  const drawn = points.filter((point) => point !== null);
  const line = drawn
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`)
    .join(" ");
  const first = drawn[0];
  const last = drawn[drawn.length - 1];
  const base = totalsChartY(0, height);
  const area = first && last ? `${line} L${last.x} ${base} L${first.x} ${base} Z` : "";
  return { points, line, area };
}
