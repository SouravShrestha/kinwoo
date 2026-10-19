import { describe, expect, it } from "vitest";

import {
  privateSpendAmountLabel,
  privateSpendSubtitle,
  summarizePrivateSpending,
} from "./private-spending";
import type { GroceryOverviewItem } from "./types";

function item(
  id: string,
  overrides: {
    boughtAt?: string;
    pricePaise?: number | null;
    batch?: { id: string; name: string | null; totalPaise: number; position: number } | null;
    status?: GroceryOverviewItem["status"];
  } = {},
): GroceryOverviewItem {
  const boughtAt = overrides.boughtAt ?? "2026-10-15T10:00:00Z";
  return {
    id,
    listId: "l1",
    listName: "Personal",
    listIcon: "🔒",
    name: id,
    quantity: null,
    unit: null,
    categoryId: null,
    categoryName: "Snacks",
    urgency: "whenever",
    status: overrides.status ?? "bought",
    claimedBy: null,
    claimedByName: null,
    assignedTo: null,
    assignedToName: null,
    assignedBy: null,
    assignmentResponse: null,
    boughtBy: "u1",
    boughtByName: "Asha",
    purchase: {
      pricePaise: overrides.pricePaise ?? null,
      store: null,
      boughtAt,
      batch: overrides.batch ?? null,
    },
    note: null,
    position: 0,
    createdBy: "u1",
    createdAt: boughtAt,
    updatedAt: boughtAt,
  };
}

describe("summarizePrivateSpending", () => {
  it("returns nothing for no purchases", () => {
    expect(summarizePrivateSpending([])).toEqual({ totalPaise: 0, months: [] });
  });

  it("collapses a batch into one entry carrying the batch total and list", () => {
    const batch = { id: "b1", name: "Breakfast", totalPaise: 72000, position: 0 };
    const { months, totalPaise } = summarizePrivateSpending([
      item("Oats", { pricePaise: 32000, batch }),
      item("Honey", { pricePaise: 40000, batch: { ...batch, position: 1 } }),
    ]);

    expect(totalPaise).toBe(72000);
    expect(months).toHaveLength(1);
    expect(months[0]?.entries).toHaveLength(1);
    expect(months[0]?.entries[0]).toMatchObject({
      key: "batch:b1",
      label: "Breakfast",
      itemCount: 2,
      amountPaise: 72000,
      listName: "Personal",
      listIcon: "🔒",
    });
  });

  it("lists unpriced purchases without adding to the total", () => {
    const { months, totalPaise } = summarizePrivateSpending([
      item("Notebook"),
      item("Razor", { pricePaise: 35000 }),
    ]);

    expect(totalPaise).toBe(35000);
    expect(months[0]?.entries.map((entry) => entry.amountPaise).sort()).toEqual([35000, null]);
  });

  it("orders newest first and totals each month", () => {
    const { months } = summarizePrivateSpending([
      item("Old", { boughtAt: "2026-09-10T10:00:00Z", pricePaise: 1000 }),
      item("New", { boughtAt: "2026-10-12T10:00:00Z", pricePaise: 2000 }),
      item("Newer", { boughtAt: "2026-10-14T10:00:00Z", pricePaise: 3000 }),
    ]);

    expect(months.map((month) => [month.label, month.totalPaise])).toEqual([
      ["October 2026", 5000],
      ["September 2026", 1000],
    ]);
    expect(months[0]?.entries.map((entry) => entry.label)).toEqual(["Newer", "New"]);
  });

  it("ignores items that are not bought", () => {
    expect(
      summarizePrivateSpending([item("Milk", { status: "pending", pricePaise: 500 })]),
    ).toEqual({
      totalPaise: 0,
      months: [],
    });
  });
});

describe("private spend labels", () => {
  const now = new Date(2026, 9, 18, 12).getTime();
  const at = (day: number, hour: number) => new Date(2026, 9, day, hour).toISOString();

  it("describes a single item with its date and list", () => {
    const [month] = summarizePrivateSpending([
      item("Razor", { boughtAt: at(16, 12), pricePaise: 35000 }),
    ]).months;
    const entry = month!.entries[0]!;
    expect(privateSpendAmountLabel(entry)).toBe("₹350");
    expect(privateSpendSubtitle(entry, now)).toBe("16 Oct · 🔒 Personal");
  });

  it("adds the item count for a batch and marks unpriced items", () => {
    const batch = { id: "b1", name: null, totalPaise: 1000, position: 0 };
    const { months } = summarizePrivateSpending([
      item("Oats", { boughtAt: at(18, 9), batch }),
      item("Honey", { boughtAt: at(18, 9), batch: { ...batch, position: 1 } }),
      item("Notebook", { boughtAt: at(17, 9) }),
    ]);
    const [group, single] = months[0]!.entries;
    expect(privateSpendSubtitle(group!, now)).toBe("Today · 2 items · 🔒 Personal");
    expect(privateSpendAmountLabel(single!)).toBe("No price");
  });
});
