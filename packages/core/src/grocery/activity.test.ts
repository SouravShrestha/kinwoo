import { describe, expect, it } from "vitest";

import {
  activityIconName,
  batchBoughtTimelinePhrase,
  filterActivity,
  formatActivityParts,
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
      { text: " · ₹450", emphasis: false },
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

  it("describes the item's companions in its timeline", () => {
    expect(batchBoughtTimelinePhrase(entry)).toBe("marked this item as bought with 2 others");
    expect(batchBoughtTimelinePhrase(batchEntry({ item_count: 2 }))).toBe(
      "marked this item as bought with 1 other",
    );
    expect(batchBoughtTimelinePhrase(batchEntry({}))).toBe("marked this item as bought");
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
