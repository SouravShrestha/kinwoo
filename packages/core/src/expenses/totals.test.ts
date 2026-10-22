import { describe, expect, it } from "vitest";

import {
  currentMonthKey,
  formatAxisPaise,
  shiftMonth,
  totalsMonthLabel,
  totalsSeriesPath,
  totalsView,
  type MonthTotal,
} from "./index";

const months: MonthTotal[] = [
  { month: "2026-08", totalPaise: 2000, sharePaise: 500 },
  { month: "2026-10", totalPaise: 10000, sharePaise: 3000 },
];

describe("totalsView", () => {
  it("plots the month before, the selected one and the next", () => {
    const view = totalsView(months, "2026-09", "2026-10");
    expect(view.points.map((point) => [point.label, point.selected])).toEqual([
      ["AUG", false],
      ["SEP", true],
      ["OCT", false],
    ]);
    expect(view.points[2]).toMatchObject({ totalRatio: 10000 / 15000, shareRatio: 3000 / 15000 });
    expect(view.points[1]).toMatchObject({ totalRatio: 0, shareRatio: 0 });
    expect(view).toMatchObject({ totalPaise: 0, sharePaise: 0, sharePercent: 0 });
  });

  it("leaves out a month that hasn't started", () => {
    const view = totalsView(months, "2026-10", "2026-10");
    expect(view.points[2]).toMatchObject({ month: "2026-11", totalRatio: null, shareRatio: null });
    expect(view).toMatchObject({ totalPaise: 10000, sharePaise: 3000, sharePercent: 30 });
  });

  it("limits stepping to months with data and the current month", () => {
    expect(totalsView(months, "2026-10", "2026-10")).toMatchObject({
      canGoPrevious: true,
      canGoNext: false,
    });
    expect(totalsView(months, "2026-08", "2026-10")).toMatchObject({
      canGoPrevious: false,
      canGoNext: true,
    });
    expect(totalsView([], "2026-10", "2026-10").canGoPrevious).toBe(false);
  });

  it("sums every month for all time", () => {
    expect(totalsView(months, null, "2026-10")).toMatchObject({
      points: [],
      totalPaise: 12000,
      sharePaise: 3500,
      sharePercent: 29,
    });
  });

  it("handles a month with no spending", () => {
    expect(totalsView([], "2026-10", "2026-10")).toMatchObject({ totalPaise: 0, sharePercent: 0 });
  });
});

describe("month keys", () => {
  it("shifts across years and labels", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(totalsMonthLabel("2026-10")).toBe("October 2026");
    expect(currentMonthKey(new Date(2026, 9, 22))).toBe("2026-10");
  });
});

describe("totalsSeriesPath", () => {
  it("draws through the column centres and stops at a missing month", () => {
    const path = totalsSeriesPath([0, 1, null], 300, 100);
    expect(path.points[0]).toEqual({ x: 50, y: 90 });
    expect(path.points[1]).toEqual({ x: 150, y: 10 });
    expect(path.points[2]).toBeNull();
    expect(path.line).toBe("M50 90 L150 10");
    expect(path.area).toBe("M50 90 L150 10 L150 90 L50 90 Z");
  });
});

describe("y axis", () => {
  it("picks round steps that fit the largest value", () => {
    const ticks = (maxPaise: number) =>
      totalsView([{ month: "2026-10", totalPaise: maxPaise, sharePaise: 0 }], "2026-10", "2026-10")
        .yTicks;
    expect(ticks(10000).map((tick) => tick.label)).toEqual(["₹0", "₹50", "₹100", "₹150"]);
    expect(ticks(1866000).map((tick) => tick.paise)).toEqual([0, 1000000, 2000000, 3000000]);
    expect(ticks(0).map((tick) => tick.label)).toEqual(["₹0", "₹100", "₹200", "₹300"]);
  });

  it("writes compact rupee labels", () => {
    expect(formatAxisPaise(250000)).toBe("₹2.5k");
    expect(formatAxisPaise(15000000)).toBe("₹1.5L");
    expect(formatAxisPaise(5000)).toBe("₹50");
  });
});
