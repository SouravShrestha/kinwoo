import { describe, expect, it } from "vitest";

import {
  activityIconName,
  filterActivity,
  formatActivityParts,
  formatActivityTimestamp,
  formatTimelineTime,
} from "./activity";
import type { GroceryActivityEntry } from "./types";

function batchEntry(payload: Record<string, unknown>): GroceryActivityEntry {
  return {
    id: "a1",
    actorId: "u1",
    actorName: "Sourav",
    type: "grocery_batch.bought",
    entityType: "grocery_purchase_batch",
    entityId: "b1",
    payload,
    createdAt: "2026-10-15T10:00:00Z",
  };
}

describe("batch bought activity", () => {
  const entry = batchEntry({ label: "Tomato + 2 others", total_paise: 45000, item_count: 3 });

  it("reads as one sentence with the total", () => {
    expect(formatActivityParts(entry)).toEqual([
      { text: "Sourav", emphasis: true },
      { text: " bought ", emphasis: false },
      { text: "Tomato + 2 others", emphasis: true },
      { text: " for ₹450", emphasis: false },
    ]);
  });

  it("falls back when the label is missing", () => {
    expect(formatActivityParts(batchEntry({}), "u1")).toEqual([
      { text: "You", emphasis: true },
      { text: " bought ", emphasis: false },
      { text: "some items", emphasis: true },
    ]);
  });

  it("uses the bought filter and icon", () => {
    expect(filterActivity([entry], { type: ["bought"] })).toEqual([entry]);
    expect(activityIconName(entry)).toBe("bag-dollar");
  });
});

describe("expense activity", () => {
  const entry: GroceryActivityEntry = {
    ...batchEntry({ title: "Electricity", amount_paise: 240000, category: "utilities" }),
    type: "expense.created",
    entityType: "expense",
  };

  it("names the expense and its amount", () => {
    expect(formatActivityParts(entry, "u1")).toEqual([
      { text: "You", emphasis: true },
      { text: " added expense ", emphasis: false },
      { text: "Electricity", emphasis: true },
      { text: " for ₹2,400", emphasis: false },
    ]);
    expect(formatActivityParts({ ...entry, type: "expense.updated" }, "u1")).toEqual([
      { text: "You", emphasis: true },
      { text: " updated expense ", emphasis: false },
      { text: "Electricity", emphasis: true },
      { text: " to ₹2,400", emphasis: false },
    ]);
    expect(formatActivityParts({ ...entry, type: "expense.deleted", payload: {} })).toEqual([
      { text: "Sourav", emphasis: true },
      { text: " deleted expense ", emphasis: false },
      { text: "an expense", emphasis: true },
    ]);
  });

  it("uses the expenses filter and icons", () => {
    expect(filterActivity([entry], { type: ["expenses"] })).toEqual([entry]);
    expect(activityIconName(entry)).toBe("transaction");
    expect(activityIconName({ ...entry, type: "expense.deleted" })).toBe("trash");
  });
});

describe("formatActivityTimestamp", () => {
  const now = new Date(2026, 9, 17, 12, 0).getTime();
  const at = (...args: [number, number, number, number, number]) => new Date(...args).toISOString();

  it("names today and yesterday with the time", () => {
    expect(formatActivityTimestamp(at(2026, 9, 17, 22, 0), now)).toBe("Today at 10:00 PM");
    expect(formatActivityTimestamp(at(2026, 9, 16, 9, 30), now)).toBe("Yesterday at 09:30 AM");
  });

  it("shows the full date and time for older entries", () => {
    expect(formatActivityTimestamp(at(2026, 9, 15, 17, 51), now)).toBe("15 Oct, 2026 at 05:51 PM");
    expect(formatActivityTimestamp(at(2025, 11, 3, 0, 5), now)).toBe("3 Dec, 2025 at 12:05 AM");
  });

  it("returns an empty string for invalid dates", () => {
    expect(formatActivityTimestamp("nope", now)).toBe("");
  });
});

describe("formatTimelineTime", () => {
  const now = new Date(2026, 9, 17, 12, 0).getTime();
  const hoursAgo = (hours: number) => new Date(now - hours * 3_600_000).toISOString();

  it("stays relative up to two days ago", () => {
    expect(formatTimelineTime(hoursAgo(3), now)).toBe("3h ago");
    expect(formatTimelineTime(hoursAgo(50), now)).toBe("2d ago");
  });

  it("switches to the exact date from three days ago", () => {
    expect(formatTimelineTime(new Date(2026, 6, 26).toISOString(), now)).toBe("26 Jul, 2026");
    expect(formatTimelineTime(hoursAgo(72), now)).toBe("14 Oct, 2026");
  });

  it("returns an empty string for invalid dates", () => {
    expect(formatTimelineTime("nope", now)).toBe("");
  });
});

describe("simplify debts activity", () => {
  const entry = (enabled: boolean): GroceryActivityEntry => ({
    id: "s1",
    actorId: "u1",
    actorName: "Sourav",
    type: "simplify_debts_changed",
    entityType: "house",
    entityId: "h1",
    payload: { enabled },
    createdAt: "2026-10-15T10:00:00Z",
  });

  it("reads as the actor switching it on or off", () => {
    expect(formatActivityParts(entry(true), "u2")).toEqual([
      { text: "Sourav", emphasis: true },
      { text: " turned on ", emphasis: false },
      { text: "simplify debts", emphasis: true },
    ]);
    expect(formatActivityParts(entry(false), "u1")).toEqual([
      { text: "You", emphasis: true },
      { text: " turned off ", emphasis: false },
      { text: "simplify debts", emphasis: true },
    ]);
  });

  it("uses the expense icon", () => {
    expect(activityIconName(entry(true))).toBe("transaction");
  });
});
