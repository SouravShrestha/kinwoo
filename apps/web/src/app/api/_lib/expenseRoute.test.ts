import { describe, expect, it } from "vitest";

import { readItemPrices } from "./expenseRoute";

const ITEM = "00000000-0000-4000-8000-000000000001";

describe("readItemPrices", () => {
  it("reads item ids with amounts or null", () => {
    expect(readItemPrices([{ itemId: ITEM, pricePaise: 500 }])).toEqual([
      { itemId: ITEM, pricePaise: 500 },
    ]);
    expect(readItemPrices([{ itemId: ITEM, pricePaise: null }])).toEqual([
      { itemId: ITEM, pricePaise: null },
    ]);
    expect(readItemPrices(undefined)).toBeUndefined();
  });

  it("rejects bad ids and amounts", () => {
    expect(readItemPrices([{ itemId: "nope", pricePaise: 500 }])).toBeNull();
    expect(readItemPrices([{ itemId: ITEM, pricePaise: -1 }])).toBeNull();
    expect(readItemPrices("x")).toBeNull();
  });
});
