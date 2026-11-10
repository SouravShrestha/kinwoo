import { describe, expect, it } from "vitest";

import {
  compareNeeded,
  itemNeededLabel,
  itemNeededPrompt,
  neededByFor,
  neededState,
} from "./needed-by";

// Monday 9 Nov 2026, early morning UTC so the local day is the same everywhere it runs.
const MONDAY = "2026-11-09";
const ADDED = "2026-11-09T03:00:00.000Z";

const item = (urgency: Parameters<typeof neededByFor>[0], status = "pending" as const) => ({
  status,
  createdAt: ADDED,
  neededBy: neededByFor(urgency, MONDAY),
});

describe("neededByFor", () => {
  it("turns the picked word into a date", () => {
    expect(neededByFor("now", MONDAY)).toBe(MONDAY);
    expect(neededByFor("today", MONDAY)).toBe(MONDAY);
    expect(neededByFor("tomorrow", MONDAY)).toBe("2026-11-10");
    expect(neededByFor("this_week", "2026-12-28")).toBe("2027-01-03");
    expect(neededByFor("soon", MONDAY)).toBeNull();
    expect(neededByFor("whenever", MONDAY)).toBeNull();
  });
});

describe("neededState", () => {
  it("moves milk added for tomorrow along as the days pass", () => {
    const milk = item("tomorrow");
    expect(neededState(milk, MONDAY)).toBe("tomorrow");
    expect(neededState(milk, "2026-11-10")).toBe("today");
    expect(neededState(milk, "2026-11-11")).toBe("overdue");
    expect(itemNeededLabel(milk, "2026-11-13")?.text).toBe("overdue by 3 days");
    expect(itemNeededPrompt(milk, "2026-11-11")).toBe("Overdue by 1 day. Still need it?");
  });

  it("names the day for later dates", () => {
    expect(itemNeededLabel(item("this_week"), MONDAY)).toMatchObject({
      state: "upcoming",
      text: "needed by Sun",
    });
  });

  it("flags undated items once they have waited five days", () => {
    const foil = item("whenever");
    expect(neededState(foil, "2026-11-13")).toBe("none");
    expect(itemNeededLabel(foil, "2026-11-14")).toEqual({
      state: "stale",
      text: "added 5 days ago",
    });
  });

  it("ignores items that are no longer open", () => {
    expect(neededState({ ...item("today"), status: "bought" }, "2026-11-20")).toBe("none");
  });
});

describe("compareNeeded", () => {
  it("puts overdue first and undated last", () => {
    const list = [item("whenever"), item("this_week"), item("today"), item("now")];
    list[3] = { ...list[3], neededBy: "2026-11-08" };
    const sorted = [...list].sort((a, b) => compareNeeded(a, b, MONDAY));
    expect(sorted.map((entry) => entry.neededBy)).toEqual([
      "2026-11-08",
      MONDAY,
      "2026-11-15",
      null,
    ]);
  });
});
