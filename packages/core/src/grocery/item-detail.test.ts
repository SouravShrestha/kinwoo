import { describe, expect, it } from "vitest";

import { itemDetailFacts, itemTimelineSentence, storeSearchLinks } from "./item-detail";
import type { GroceryActivityEntry, GroceryItem } from "./types";

const NOW = new Date("2026-10-17T12:00:00Z").getTime();

function item(overrides: Partial<GroceryItem> = {}): GroceryItem {
  return {
    id: "i1",
    listId: "l1",
    name: "Milk",
    quantity: 2,
    unit: "L",
    categoryId: null,
    categoryName: "Dairy",
    urgency: "today",
    status: "pending",
    claimedBy: null,
    claimedByName: null,
    assignedTo: null,
    assignedToName: null,
    assignedBy: null,
    assignmentResponse: null,
    boughtBy: null,
    boughtByName: null,
    purchase: null,
    note: null,
    position: 0,
    createdBy: "u1",
    createdAt: "2026-10-17T10:00:00Z",
    updatedAt: "2026-10-17T10:00:00Z",
    ...overrides,
  };
}

describe("itemDetailFacts", () => {
  it("summarises an open item with an urgency tone", () => {
    expect(itemDetailFacts(item(), "u1", NOW)).toEqual([
      { label: "Status", value: "Waiting for a buyer" },
      { label: "Needed", value: "Today", tone: "destructive" },
      { label: "Quantity", value: "2 L" },
      { label: "Added", value: "2h ago" },
    ]);
  });

  it("names the viewer as You and shows the assignment response", () => {
    const facts = itemDetailFacts(
      item({ status: "assigned", assignedTo: "u1", assignmentResponse: "declined" }),
      "u1",
      NOW,
    );
    expect(facts[0]).toEqual({ label: "Assigned to", value: "You (declined)" });
  });

  it("shows purchase details for a bought item", () => {
    const facts = itemDetailFacts(
      item({
        status: "bought",
        quantity: null,
        unit: null,
        boughtBy: "u2",
        boughtByName: "Asha",
        purchase: { pricePaise: 6500, store: null, boughtAt: "2026-10-17T11:00:00Z", batch: null },
      }),
      "u1",
      NOW,
    );
    expect(facts).toEqual([
      { label: "Bought by", value: "Asha" },
      { label: "Date", value: "Today" },
      { label: "Paid", value: "₹65" },
      { label: "Store", value: "—" },
      { label: "Quantity", value: "—" },
      { label: "Added", value: "2h ago" },
    ]);
  });
});

describe("itemTimelineSentence", () => {
  it("uses You for the viewer's own actions", () => {
    const entry: GroceryActivityEntry = {
      id: "a1",
      actorId: "u1",
      actorName: "Sourav",
      type: "grocery_item.claimed",
      entityType: "grocery_item",
      entityId: "i1",
      payload: {},
      createdAt: "2026-10-17T10:00:00Z",
    };
    expect(itemTimelineSentence(entry, "u1")).toBe("You claimed this item");
    expect(itemTimelineSentence(entry, "u2")).toBe("Sourav claimed this item");
  });
});

describe("storeSearchLinks", () => {
  it("encodes the item name into each store's search", () => {
    expect(storeSearchLinks("Brown bread").map((link) => link.url)).toEqual([
      "https://blinkit.com/s/?q=Brown%20bread",
      "https://www.zeptonow.com/search?query=Brown%20bread",
      "https://www.swiggy.com/instamart/search?query=Brown%20bread",
    ]);
  });
});
