import { describe, expect, it } from "vitest";

import {
  boughtGroupAccessibleLabel,
  boughtGroupLabel,
  findBoughtGroup,
  formatBoughtDate,
  formatPaise,
  formatPickedDate,
  groupBoughtItems,
  itemCountLabel,
} from "./bought-groups";
import type { GroceryItem, GroceryPurchaseBatchRef } from "./types";

function item(
  id: string,
  name: string,
  batch: Partial<GroceryPurchaseBatchRef> | null = null,
): GroceryItem {
  return {
    id,
    listId: "l1",
    name,
    quantity: null,
    unit: null,
    categoryId: null,
    categoryName: null,
    urgency: "whenever",
    status: "bought",
    claimedBy: null,
    claimedByName: null,
    assignedTo: null,
    assignedToName: null,
    assignedBy: null,
    assignmentResponse: null,
    boughtBy: "u1",
    boughtByName: "Asha",
    purchase: {
      pricePaise: null,
      store: batch ? "Market" : null,
      boughtAt: "2026-10-15T10:00:00Z",
      batch: batch ? { id: "b1", name: null, totalPaise: 45000, position: 0, ...batch } : null,
    },
    note: null,
    position: 0,
    createdBy: "u1",
    createdAt: "2026-10-15T09:00:00Z",
    updatedAt: "2026-10-15T10:00:00Z",
  };
}

describe("boughtGroupLabel", () => {
  it("names a lone item on its own", () => {
    expect(boughtGroupLabel(["Tomato"])).toBe("Tomato");
  });

  it("uses singular and plural for the remainder", () => {
    expect(boughtGroupLabel(["Tomato", "Onion"])).toBe("Tomato + 1 other");
    expect(boughtGroupLabel(["Tomato", "Onion", "Milk"])).toBe("Tomato + 2 others");
  });

  it("returns an empty string for no names", () => {
    expect(boughtGroupLabel([])).toBe("");
  });
});

describe("groupBoughtItems", () => {
  const tomato = item("i1", "Tomato", { position: 0 });
  const onion = item("i2", "Onion", { position: 1 });
  const milk = item("i3", "Milk", { position: 2 });
  const bread = item("i4", "Bread");
  const all = [bread, milk, tomato, onion];

  it("keeps single buys as items and folds a batch into one group", () => {
    const entries = groupBoughtItems(all, all);
    expect(entries.map((e) => e.kind)).toEqual(["item", "group"]);
    const group = entries[1];
    if (group?.kind !== "group") throw new Error("expected group");
    expect(group.items.map((i) => i.id)).toEqual(["i1", "i2", "i3"]);
    expect(group.label).toBe("Tomato + 2 others");
    expect(group.totalPaise).toBe(45000);
    expect(group.store).toBe("Market");
    expect(group.buyer).toEqual({ userId: "u1", name: "Asha" });
  });

  it("places the group where its first visible item sits", () => {
    const entries = groupBoughtItems([onion, bread, tomato], all);
    expect(entries.map((e) => (e.kind === "group" ? e.batchId : e.item.id))).toEqual(["b1", "i4"]);
  });

  it("keeps the full label and count when only part of the batch is visible", () => {
    const [group] = groupBoughtItems([milk], all);
    if (group?.kind !== "group") throw new Error("expected group");
    expect(group.label).toBe("Tomato + 2 others");
    expect(group.items).toHaveLength(3);
  });

  it("prefers the custom batch name", () => {
    const named = [
      item("i1", "Tomato", { name: "Weekly veg", position: 0 }),
      item("i2", "Onion", { name: "Weekly veg", position: 1 }),
    ];
    const [group] = groupBoughtItems(named, named);
    expect(group?.kind === "group" && group.label).toBe("Weekly veg");
  });

  it("describes a group for screen readers", () => {
    const [group] = groupBoughtItems([tomato], all);
    if (group?.kind !== "group") throw new Error("expected group");
    expect(boughtGroupAccessibleLabel(group, "Asha")).toBe(
      "Tomato + 2 others, ₹450, 3 items, bought by Asha",
    );
    expect(boughtGroupAccessibleLabel(group, null)).toContain("bought by a housemate");
  });

  it("finds a group by batch id", () => {
    expect(findBoughtGroup(all, "b1")?.items).toHaveLength(3);
    expect(findBoughtGroup(all, "missing")).toBeNull();
  });
});

describe("formatPaise", () => {
  it("drops zero paise and keeps two-digit fractions", () => {
    expect(formatPaise(45000)).toBe("₹450");
    expect(formatPaise(1250)).toBe("₹12.50");
    expect(formatPaise(5)).toBe("₹0.05");
    expect(formatPaise(0)).toBe("₹0");
  });

  it("uses Indian digit grouping", () => {
    expect(formatPaise(123456_00)).toBe("₹1,23,456");
    expect(formatPaise(1234567_89)).toBe("₹12,34,567.89");
    expect(formatPaise(999_00)).toBe("₹999");
    expect(formatPaise(1000_00)).toBe("₹1,000");
  });
});

describe("formatPickedDate", () => {
  const now = new Date(2026, 9, 15, 18, 0).getTime();

  it("names today and yesterday, otherwise shows the full date", () => {
    expect(formatPickedDate(new Date(2026, 9, 15), now)).toBe("Today");
    expect(formatPickedDate(new Date(2026, 9, 14), now)).toBe("Yesterday");
    expect(formatPickedDate(new Date(2026, 6, 23), now)).toBe("23 Jul, 2026");
  });
});

describe("formatBoughtDate", () => {
  const now = new Date(2026, 9, 15, 18, 0).getTime();

  it("names today and yesterday", () => {
    expect(formatBoughtDate(new Date(2026, 9, 15, 1, 0).toISOString(), now)).toBe("Today");
    expect(formatBoughtDate(new Date(2026, 9, 14, 23, 0).toISOString(), now)).toBe("Yesterday");
  });

  it("shows day and month, adding the year only when it differs", () => {
    expect(formatBoughtDate(new Date(2026, 8, 3).toISOString(), now)).toBe("3 Sep");
    expect(formatBoughtDate(new Date(2025, 11, 31).toISOString(), now)).toBe("31 Dec 2025");
  });

  it("returns an empty string for invalid dates", () => {
    expect(formatBoughtDate("nope", now)).toBe("");
  });
});

describe("itemCountLabel", () => {
  it("pluralises the item count", () => {
    expect(itemCountLabel(3)).toBe("3 items");
    expect(itemCountLabel(1)).toBe("1 item");
  });
});
