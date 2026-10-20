import { beforeEach, describe, expect, it, vi } from "vitest";

import { configureApiClient } from "../api/config";
import {
  addItem,
  assignItem,
  claimItem,
  createList,
  deleteItem,
  deleteList,
  fetchCategories,
  fetchItem,
  fetchItemActivity,
  fetchItems,
  fetchList,
  fetchLists,
  fetchOverview,
  markBought,
  markItemsBought,
  updateItem,
  updateList,
} from "./api";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

let fetchMock: ReturnType<typeof vi.fn>;

const lastCall = () => {
  const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
  return { url, init, headers: init.headers as Record<string, string> };
};

beforeEach(() => {
  fetchMock = vi.fn();
  configureApiClient({
    baseUrl: "https://kinwoo.cbsdev.me",
    fetch: fetchMock as unknown as typeof fetch,
    getAuthHeaders: async () => ({ Authorization: "Bearer jwt-1" }),
  });
});

describe("grocery api", () => {
  it("fetches lists for a house", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ lists: [{ id: "l1", name: "Weekly Groceries", houseId: "h1" }] }),
    );

    await expect(fetchLists("h1")).resolves.toEqual([
      { id: "l1", name: "Weekly Groceries", houseId: "h1" },
    ]);

    const { url, init } = lastCall();
    expect(url).toBe("https://kinwoo.cbsdev.me/api/houses/h1/grocery/lists");
    expect(init.method).toBe("GET");
  });

  it("fetches a single list", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ list: { id: "l1", name: "Weekly" } }));

    await expect(fetchList("h1", "l1")).resolves.toEqual({ id: "l1", name: "Weekly" });
    expect(lastCall().url).toBe("https://kinwoo.cbsdev.me/api/houses/h1/grocery/lists/l1");
  });

  it("creates a new list", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ list: { id: "l2", name: "Party Supplies" } }));

    await expect(createList("h1", { name: "Party Supplies" })).resolves.toEqual({
      id: "l2",
      name: "Party Supplies",
    });

    const { url, init } = lastCall();
    expect(url).toBe("https://kinwoo.cbsdev.me/api/houses/h1/grocery/lists");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ name: "Party Supplies" }));
  });

  it("updates an existing list", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ list: { id: "l1", name: "Updated Name" } }));

    await expect(updateList("h1", "l1", { name: "Updated Name" })).resolves.toEqual({
      id: "l1",
      name: "Updated Name",
    });

    const { url, init } = lastCall();
    expect(url).toBe("https://kinwoo.cbsdev.me/api/houses/h1/grocery/lists/l1");
    expect(init.method).toBe("PATCH");
    expect(init.body).toBe(JSON.stringify({ name: "Updated Name" }));
  });

  it("deletes a list via POST", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

    await deleteList("h1", "l1");

    const { url, init } = lastCall();
    expect(url).toBe("https://kinwoo.cbsdev.me/api/houses/h1/grocery/lists/l1/delete");
    expect(init.method).toBe("POST");
  });

  it("fetches items for a list", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ items: [{ id: "i1", name: "Apples" }] }));

    await expect(fetchItems("h1", "l1")).resolves.toEqual([{ id: "i1", name: "Apples" }]);
    expect(lastCall().url).toBe("https://kinwoo.cbsdev.me/api/houses/h1/grocery/lists/l1/items");
  });

  it("fetches a single item", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ item: { id: "i1", name: "Apples" } }));

    await expect(fetchItem("h1", "l1", "i1")).resolves.toEqual({ id: "i1", name: "Apples" });
    expect(lastCall().url).toBe("https://kinwoo.cbsdev.me/api/houses/h1/grocery/lists/l1/items/i1");
  });

  it("adds an item", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ item: { id: "i2", name: "Milk" } }));

    const input = { listId: "l1", name: "Milk", idempotencyKey: "k1" };
    await expect(addItem("h1", input)).resolves.toEqual({ id: "i2", name: "Milk" });

    const { url, init } = lastCall();
    expect(url).toBe("https://kinwoo.cbsdev.me/api/houses/h1/grocery/lists/l1/items");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify(input));
  });

  it("updates an item", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ item: { id: "i1", name: "Apples", quantity: 5 } }));

    await expect(updateItem("h1", "l1", "i1", { quantity: 5 })).resolves.toEqual({
      id: "i1",
      name: "Apples",
      quantity: 5,
    });

    const { url, init } = lastCall();
    expect(url).toBe("https://kinwoo.cbsdev.me/api/houses/h1/grocery/lists/l1/items/i1");
    expect(init.method).toBe("PATCH");
    expect(init.body).toBe(JSON.stringify({ quantity: 5 }));
  });

  it("claims an item", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ result: { claimed: true } }));
    await expect(claimItem("h1", "l1", "i1")).resolves.toEqual({ claimed: true });
    expect(lastCall().url).toBe(
      "https://kinwoo.cbsdev.me/api/houses/h1/grocery/lists/l1/items/i1/claim",
    );
    expect(lastCall().init.method).toBe("POST");

    // Also support { claim: ClaimResult } shape
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ claim: { claimed: false, claimedByName: "Bob" } }),
    );
    await expect(claimItem("h1", "l1", "i1")).resolves.toEqual({
      claimed: false,
      claimedByName: "Bob",
    });
  });

  it("marks an item as bought", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

    await markBought("h1", "l1", "i1", { pricePaise: 250 });

    const { url, init } = lastCall();
    expect(url).toBe("https://kinwoo.cbsdev.me/api/houses/h1/grocery/lists/l1/items/i1/buy");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ pricePaise: 250 }));
  });

  it("marks several items as bought in one batch", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ result: { batchId: "b1" } }));
    const input = { itemIds: ["i1", "i2"], totalPaise: 45000, itemPricesPaise: [12000, null] };

    await expect(markItemsBought("h1", "l1", input)).resolves.toEqual({ batchId: "b1" });

    const { url, init } = lastCall();
    expect(url).toBe("https://kinwoo.cbsdev.me/api/houses/h1/grocery/lists/l1/items/buy");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify(input));
  });

  it("assigns an item", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));
    await assignItem("h1", "l1", "i1", "u2");
    expect(lastCall().url).toBe(
      "https://kinwoo.cbsdev.me/api/houses/h1/grocery/lists/l1/items/i1/assign",
    );
    expect(lastCall().init.body).toBe(JSON.stringify({ assignedTo: "u2" }));
  });

  it("deletes an item", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

    await deleteItem("h1", "l1", "i1");

    const { url, init } = lastCall();
    expect(url).toBe("https://kinwoo.cbsdev.me/api/houses/h1/grocery/lists/l1/items/i1/delete");
    expect(init.method).toBe("DELETE");
  });

  it("fetches categories", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ categories: [{ id: "c1", name: "Dairy" }] }));
    await expect(fetchCategories("h1")).resolves.toEqual([{ id: "c1", name: "Dairy" }]);
    expect(lastCall().url).toBe("https://kinwoo.cbsdev.me/api/houses/h1/grocery/categories");
  });

  it("fetches overview for a house", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        overview: {
          todayItems: [],
          myToBuy: [],
        },
      }),
    );
    await expect(fetchOverview("h1")).resolves.toEqual({
      todayItems: [],
      myToBuy: [],
    });
    expect(lastCall().url).toBe("https://kinwoo.cbsdev.me/api/houses/h1/grocery/overview");
  });

  it("fetches activity log for an item", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        activity: [
          {
            id: "a1",
            actorId: "u1",
            actorName: "Daisy",
            type: "grocery_item.added",
            entityType: "grocery_item",
            entityId: "i1",
            payload: { name: "Milk" },
            createdAt: "2026-10-12T00:00:00Z",
          },
        ],
      }),
    );
    await expect(fetchItemActivity("h1", "l1", "i1")).resolves.toEqual([
      {
        id: "a1",
        actorId: "u1",
        actorName: "Daisy",
        type: "grocery_item.added",
        entityType: "grocery_item",
        entityId: "i1",
        payload: { name: "Milk" },
        createdAt: "2026-10-12T00:00:00Z",
      },
    ]);
    expect(lastCall().url).toBe(
      "https://kinwoo.cbsdev.me/api/houses/h1/grocery/lists/l1/items/i1/activity",
    );
  });
});
