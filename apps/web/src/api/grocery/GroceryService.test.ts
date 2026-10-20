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
      expense: null,
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
      expense: null,
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

const SPLIT = {
  splitMethod: "equal" as const,
  spentOn: "2026-10-12",
  payers: [{ userId: "a", amountPaise: 6000 }],
  shares: [
    { userId: "a", sharePaise: 3000, weight: null },
    { userId: "b", sharePaise: 3000, weight: null },
  ],
};

describe("linked expenses", () => {
  it("forwards a valid split with a single buy", async () => {
    const markBought = vi.fn().mockResolvedValue(undefined);
    const service = new GroceryService({ markBought } as unknown as IGroceryRepository);

    const result = await service.markBought("i1", { pricePaise: 6000, expense: SPLIT });

    expect(result).toEqual({ ok: true, data: null });
    expect(markBought).toHaveBeenCalledWith("i1", { pricePaise: 6000, expense: SPLIT });
  });

  it("rejects a split that does not match the price", async () => {
    const markBought = vi.fn();
    const service = new GroceryService({ markBought } as unknown as IGroceryRepository);

    expect(await service.markBought("i1", { pricePaise: 5000, expense: SPLIT })).toMatchObject({
      ok: false,
      code: "INVALID_INPUT",
    });
    expect(await service.markBought("i1", { pricePaise: null, expense: SPLIT })).toMatchObject({
      ok: false,
      code: "INVALID_INPUT",
    });
    expect(markBought).not.toHaveBeenCalled();
  });

  it("forwards a valid split with a batch and rejects a mismatched one", async () => {
    const { service, markItemsBought } = serviceWith();

    await service.markItemsBought("l1", {
      itemIds: ["i1", "i2"],
      totalPaise: 6000,
      expense: SPLIT,
    });
    expect(markItemsBought.mock.calls[0]?.[1]).toMatchObject({ expense: SPLIT });

    const result = await service.markItemsBought("l1", {
      itemIds: ["i1", "i2"],
      totalPaise: 7000,
      expense: SPLIT,
    });
    expect(result).toMatchObject({ ok: false, code: "INVALID_INPUT" });
  });

  it("explains that private lists cannot be split", async () => {
    const { service } = serviceWith(
      vi.fn().mockRejectedValue(new GroceryRepositoryError("PRIVATE_LIST", "PRIVATE_LIST")),
    );

    const result = await service.markItemsBought("l1", {
      itemIds: ["i1", "i2"],
      totalPaise: 6000,
      expense: SPLIT,
    });

    expect(result).toEqual({
      ok: false,
      code: "PRIVATE_LIST",
      message: "Purchases from a private list can't be split.",
    });
  });
});

describe("listPrivatePurchases", () => {
  it("scopes the lookup to the caller", async () => {
    const listPrivatePurchases = vi.fn().mockResolvedValue([]);
    const service = new GroceryService({ listPrivatePurchases } as unknown as IGroceryRepository);

    expect(await service.listPrivatePurchases("h1", "u1")).toEqual({ ok: true, data: [] });
    expect(listPrivatePurchases).toHaveBeenCalledWith("h1", "u1");
  });

  it("maps repository failures to an error result", async () => {
    const listPrivatePurchases = vi
      .fn()
      .mockRejectedValue(new GroceryRepositoryError("permission denied", "FORBIDDEN"));
    const service = new GroceryService({ listPrivatePurchases } as unknown as IGroceryRepository);

    expect(await service.listPrivatePurchases("h1", "u1")).toMatchObject({
      ok: false,
      code: "FORBIDDEN",
    });
  });
});

describe("deleteItems", () => {
  const withDelete = (deleteItems = vi.fn().mockResolvedValue(2)) => ({
    service: new GroceryService({ deleteItems } as unknown as IGroceryRepository),
    deleteItems,
  });

  it("dedupes ids and reports how many were deleted", async () => {
    const { service, deleteItems } = withDelete();

    const result = await service.deleteItems("l1", ["i1", "i2", "i1", "i3"]);

    expect(result).toEqual({ ok: true, data: { deleted: 2, requested: 3 } });
    expect(deleteItems).toHaveBeenCalledWith("l1", ["i1", "i2", "i3"]);
  });

  it("rejects an empty selection without calling the repository", async () => {
    const { service, deleteItems } = withDelete();

    expect(await service.deleteItems("l1", [])).toMatchObject({ ok: false, code: "INVALID_INPUT" });
    expect(deleteItems).not.toHaveBeenCalled();
  });

  it("passes on a refusal from the database", async () => {
    const { service } = withDelete(
      vi.fn().mockRejectedValue(new GroceryRepositoryError("x", "FORBIDDEN")),
    );

    expect(await service.deleteItems("l1", ["i1"])).toMatchObject({ ok: false, code: "FORBIDDEN" });
  });
});
