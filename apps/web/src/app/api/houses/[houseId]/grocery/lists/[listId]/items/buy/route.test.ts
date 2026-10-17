import { beforeEach, describe, expect, it, vi } from "vitest";

const getVerifiedUser = vi.fn();
const applyCookies = vi.fn((response: unknown) => response);
const markItemsBought = vi.fn();

vi.mock("@/integrations/supabase/client.route", () => ({
  createRouteClient: () => ({ supabase: {}, applyCookies }),
  getVerifiedUser: (...args: unknown[]) => getVerifiedUser(...args),
}));

vi.mock("@/api/grocery/GroceryRepository", () => ({ GroceryRepository: class {} }));

vi.mock("@/api/grocery/GroceryService", () => ({
  GroceryService: class {
    markItemsBought = markItemsBought;
  },
}));

const HOUSE_ID = "11111111-1111-4111-8111-111111111111";
const LIST_ID = "22222222-2222-4222-8222-222222222222";
const ITEM_A = "33333333-3333-4333-8333-333333333333";
const ITEM_B = "44444444-4444-4444-8444-444444444444";

const context = { params: Promise.resolve({ houseId: HOUSE_ID, listId: LIST_ID }) };

const postJson = (body: unknown) =>
  new Request(
    `https://kinwoo.cbsdev.me/api/houses/${HOUSE_ID}/grocery/lists/${LIST_ID}/items/buy`,
    {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
    },
  );

beforeEach(() => {
  vi.clearAllMocks();
  applyCookies.mockImplementation((response: unknown) => response);
  getVerifiedUser.mockResolvedValue({ id: "u1" });
});

describe("POST .../items/buy", () => {
  it("returns the batch id", async () => {
    markItemsBought.mockResolvedValue({ ok: true, data: { batchId: "b1" } });
    const { POST } = await import("./route");

    const response = await POST(
      postJson({
        itemIds: [ITEM_A, ITEM_B],
        totalPaise: 45000,
        name: null,
        store: "Market",
        itemPricesPaise: [12000, null],
      }),
      context,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ result: { batchId: "b1" } });
    expect(markItemsBought).toHaveBeenCalledWith(LIST_ID, {
      itemIds: [ITEM_A, ITEM_B],
      totalPaise: 45000,
      name: null,
      store: "Market",
      itemPricesPaise: [12000, null],
    });
  });

  it.each([
    ["bad JSON", "{"],
    ["invalid ids", { itemIds: ["nope"], totalPaise: 1 }],
    ["a missing total", { itemIds: [ITEM_A, ITEM_B] }],
    ["a non-string name", { itemIds: [ITEM_A, ITEM_B], totalPaise: 1, name: 5 }],
    ["bad prices", { itemIds: [ITEM_A, ITEM_B], totalPaise: 1, itemPricesPaise: ["1", null] }],
  ])("400s %s", async (_label, body) => {
    const { POST } = await import("./route");

    const response = await POST(postJson(body), context);

    expect(response.status).toBe(400);
    expect(markItemsBought).not.toHaveBeenCalled();
  });

  it("409s when an item was already bought", async () => {
    markItemsBought.mockResolvedValue({
      ok: false,
      code: "ALREADY_BOUGHT",
      message: "Someone already bought one of these items.",
    });
    const { POST } = await import("./route");

    const response = await POST(postJson({ itemIds: [ITEM_A, ITEM_B], totalPaise: 1 }), context);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Someone already bought one of these items.",
      code: "ALREADY_BOUGHT",
    });
  });
});
