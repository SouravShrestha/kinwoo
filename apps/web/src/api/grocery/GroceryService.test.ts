import { describe, expect, it, vi } from "vitest";

import { GroceryService } from "./GroceryService";
import { GroceryRepositoryError, type IGroceryRepository } from "./IGroceryRepository";

function serviceWith(markItemsBought = vi.fn().mockResolvedValue("b1")) {
  const repository = { markItemsBought } as unknown as IGroceryRepository;
  return { service: new GroceryService(repository), markItemsBought };
}

describe("markItemsBought", () => {
  it("normalises input and returns the batch id", async () => {
    const { service, markItemsBought } = serviceWith();

    const result = await service.markItemsBought("l1", {
      itemIds: ["i1", "i2"],
      totalPaise: 45000,
      name: "  Weekly   veg ",
      store: " Market ",
      itemPricesPaise: [12000, null],
    });

    expect(result).toEqual({ ok: true, data: { batchId: "b1" } });
    expect(markItemsBought).toHaveBeenCalledWith("l1", {
      itemIds: ["i1", "i2"],
      totalPaise: 45000,
      name: "Weekly veg",
      store: "Market",
      itemPricesPaise: [12000, null],
    });
  });

  it("dedupes ids in first-seen order and keeps prices aligned", async () => {
    const { service, markItemsBought } = serviceWith();

    await service.markItemsBought("l1", {
      itemIds: ["i2", "i1", "i2"],
      totalPaise: 100,
      itemPricesPaise: [null, 50, 70],
    });

    expect(markItemsBought).toHaveBeenCalledWith("l1", {
      itemIds: ["i2", "i1"],
      totalPaise: 100,
      name: null,
      store: null,
      itemPricesPaise: [null, 50],
    });
  });

  it("drops an all-empty price list", async () => {
    const { service, markItemsBought } = serviceWith();

    await service.markItemsBought("l1", {
      itemIds: ["i1", "i2"],
      totalPaise: 100,
      itemPricesPaise: [null, null],
    });

    expect(markItemsBought.mock.calls[0]?.[1]).toMatchObject({ itemPricesPaise: undefined });
  });

  it.each([
    ["one item", { itemIds: ["i1"], totalPaise: 100 }],
    ["duplicates of one item", { itemIds: ["i1", "i1"], totalPaise: 100 }],
    ["a negative total", { itemIds: ["i1", "i2"], totalPaise: -1 }],
    ["a fractional total", { itemIds: ["i1", "i2"], totalPaise: 10.5 }],
    ["misaligned prices", { itemIds: ["i1", "i2"], totalPaise: 100, itemPricesPaise: [1] }],
    ["a negative price", { itemIds: ["i1", "i2"], totalPaise: 100, itemPricesPaise: [-1, 1] }],
    ["a long name", { itemIds: ["i1", "i2"], totalPaise: 100, name: "a".repeat(61) }],
    ["a long store", { itemIds: ["i1", "i2"], totalPaise: 100, store: "a".repeat(101) }],
  ])("rejects %s without calling the repository", async (_label, input) => {
    const { service, markItemsBought } = serviceWith();

    const result = await service.markItemsBought("l1", input);

    expect(result).toMatchObject({ ok: false, code: "INVALID_INPUT" });
    expect(markItemsBought).not.toHaveBeenCalled();
  });

  it("maps a database error code to friendly copy", async () => {
    const { service } = serviceWith(
      vi.fn().mockRejectedValue(new GroceryRepositoryError("ALREADY_BOUGHT", "ALREADY_BOUGHT")),
    );

    const result = await service.markItemsBought("l1", { itemIds: ["i1", "i2"], totalPaise: 1 });

    expect(result).toEqual({
      ok: false,
      code: "ALREADY_BOUGHT",
      message: "Someone already bought one of these items.",
    });
  });
});
