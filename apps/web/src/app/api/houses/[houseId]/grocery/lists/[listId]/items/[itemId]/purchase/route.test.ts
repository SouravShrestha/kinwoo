import { beforeEach, describe, expect, it, vi } from "vitest";

const getVerifiedUser = vi.fn();
const applyCookies = vi.fn((response: unknown) => response);
const updatePrivatePurchase = vi.fn();

vi.mock("@/integrations/supabase/client.route", () => ({
  createRouteClient: () => ({ supabase: {}, applyCookies }),
  getVerifiedUser: (...args: unknown[]) => getVerifiedUser(...args),
}));

vi.mock("@/api/grocery/GroceryRepository", () => ({ GroceryRepository: class {} }));

vi.mock("@/api/grocery/GroceryService", () => ({
  GroceryService: class {
    updatePrivatePurchase = updatePrivatePurchase;
  },
}));

const HOUSE_ID = "11111111-1111-4111-8111-111111111111";
const LIST_ID = "22222222-2222-4222-8222-222222222222";
const ITEM_ID = "33333333-3333-4333-8333-333333333333";
const BOUGHT_AT = "2026-11-01T12:00:00.000Z";

const context = {
  params: Promise.resolve({ houseId: HOUSE_ID, listId: LIST_ID, itemId: ITEM_ID }),
};

const patchJson = (body: unknown) =>
  new Request(
    `https://kinwoo.cbsdev.me/api/houses/${HOUSE_ID}/grocery/lists/${LIST_ID}/items/${ITEM_ID}/purchase`,
    { method: "PATCH", body: typeof body === "string" ? body : JSON.stringify(body) },
  );

beforeEach(() => {
  vi.clearAllMocks();
  applyCookies.mockImplementation((response: unknown) => response);
  getVerifiedUser.mockResolvedValue({ id: "u1" });
});

describe("PATCH .../items/[itemId]/purchase", () => {
  it("passes the edit to the service", async () => {
    updatePrivatePurchase.mockResolvedValue({ ok: true, data: null });
    const { PATCH } = await import("./route");

    const response = await PATCH(
      patchJson({ pricePaise: 25000, store: "Market", boughtAt: BOUGHT_AT }),
      context,
    );

    expect(response.status).toBe(200);
    expect(updatePrivatePurchase).toHaveBeenCalledWith(ITEM_ID, {
      pricePaise: 25000,
      store: "Market",
      boughtAt: BOUGHT_AT,
    });
  });

  it.each([
    ["bad JSON", "{"],
    ["a missing date", { pricePaise: 1 }],
    ["a bad date", { pricePaise: 1, boughtAt: "later" }],
    ["a non-number price", { pricePaise: "1", boughtAt: BOUGHT_AT }],
    ["a non-string store", { store: 5, boughtAt: BOUGHT_AT }],
  ])("400s %s", async (_label, body) => {
    const { PATCH } = await import("./route");

    const response = await PATCH(patchJson(body), context);

    expect(response.status).toBe(400);
    expect(updatePrivatePurchase).not.toHaveBeenCalled();
  });
});
