import { describe, expect, it } from "vitest";

import { expenseFeed, settlementSummary, spentOnFor, type Expense, type Settlement } from "./index";

const expense = (id: string, spentOn: string, createdAt = `${spentOn}T10:00:00.000Z`) =>
  ({ id, spentOn, createdAt }) as Expense;

// Built from a local date so the test does not depend on the machine's time zone.
const payment = (id: string, day: [number, number, number]) =>
  ({
    id,
    createdAt: new Date(day[0], day[1] - 1, day[2], 12).toISOString(),
    payerId: "a",
    payeeId: "b",
    payerName: "Asha",
    payeeName: "Rohan",
    amountPaise: 4000,
  }) as Settlement;

const ids = (items: { id: string }[]) => items.map((item) => item.id);

describe("expenseFeed", () => {
  const expenses = [expense("e3", "2026-10-20"), expense("e2", "2026-10-10")];

  it("places payments among expenses, newest first", () => {
    const feed = expenseFeed(expenses, [payment("p1", [2026, 10, 15])], false);
    expect(ids(feed)).toEqual(["e3", "p1", "e2"]);
    expect(feed[1]?.kind).toBe("payment");
  });

  it("keeps payments older than the loaded expenses until the last page", () => {
    const old = payment("p0", [2026, 9, 1]);
    expect(ids(expenseFeed(expenses, [old], true))).toEqual(["e3", "e2"]);
    expect(ids(expenseFeed(expenses, [old], false))).toEqual(["e3", "e2", "p0"]);
  });

  it("shows payments when there are no expenses, unless more pages are coming", () => {
    const only = payment("p1", [2026, 10, 15]);
    expect(ids(expenseFeed([], [only], false))).toEqual(["p1"]);
    expect(expenseFeed([], [only], true)).toEqual([]);
  });

  it("orders payments from the same day by when they were recorded", () => {
    const early = {
      ...payment("p1", [2026, 10, 15]),
      createdAt: new Date(2026, 9, 15, 9).toISOString(),
    };
    const late = {
      ...payment("p2", [2026, 10, 15]),
      createdAt: new Date(2026, 9, 15, 18).toISOString(),
    };
    expect(ids(expenseFeed([], [early, late], false))).toEqual(["p2", "p1"]);
    expect(spentOnFor(new Date(late.createdAt))).toBe("2026-10-15");
  });
});

describe("settlementSummary", () => {
  const settlement = payment("p1", [2026, 10, 15]);

  it("reads from the viewer's side", () => {
    expect(settlementSummary(settlement, "a")).toEqual({
      title: "You paid Rohan",
      amountPaise: 4000,
      tone: "lent",
    });
    expect(settlementSummary(settlement, "b")).toMatchObject({
      title: "Asha paid you",
      tone: "lent",
    });
  });

  it("is neutral for people who are not part of it", () => {
    expect(settlementSummary(settlement, "c")).toMatchObject({
      title: "Asha paid Rohan",
      tone: "neutral",
    });
  });
});
