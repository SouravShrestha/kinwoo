import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { createMemoryStorage } from "../houses/storage";
import { groceryKeys } from "./keys";
import { applyGroceryRealtimeActions, groceryItemActions, groceryListActions } from "./realtime";
import { createListStorage } from "./storage";

describe("groceryKeys", () => {
  it("structures query keys with houseId prefix", () => {
    expect(groceryKeys.all("h1")).toEqual(["grocery", "h1"]);
    expect(groceryKeys.lists("h1")).toEqual(["grocery", "h1", "lists"]);
    expect(groceryKeys.list("h1", "l1")).toEqual(["grocery", "h1", "lists", "l1"]);
    expect(groceryKeys.items("h1", "l1")).toEqual(["grocery", "h1", "lists", "l1", "items"]);
    expect(groceryKeys.item("h1", "l1", "i1")).toEqual([
      "grocery",
      "h1",
      "lists",
      "l1",
      "items",
      "i1",
    ]);
    expect(groceryKeys.categories("h1")).toEqual(["grocery", "h1", "categories"]);
  });
});

describe("grocery realtime", () => {
  it("generates refresh-lists action on list update", () => {
    expect(groceryListActions("h1")).toEqual([{ type: "refresh-lists", houseId: "h1" }]);
  });

  it("generates refresh-items action for item events", () => {
    expect(groceryItemActions({ id: "i1", list_id: "l1" }, "h1")).toEqual([
      { type: "refresh-items", houseId: "h1", listId: "l1" },
    ]);
    expect(groceryItemActions({ id: "i1" }, "h1")).toEqual([
      { type: "refresh-lists", houseId: "h1" },
    ]);
  });

  it("applies realtime actions to queryClient", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(groceryKeys.lists("h1"), []);
    queryClient.setQueryData(groceryKeys.items("h1", "l1"), []);

    applyGroceryRealtimeActions(queryClient, [
      { type: "refresh-lists", houseId: "h1" },
      { type: "refresh-items", houseId: "h1", listId: "l1" },
    ]);

    expect(queryClient.getQueryState(groceryKeys.lists("h1"))?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(groceryKeys.items("h1", "l1"))?.isInvalidated).toBe(true);
  });
});

describe("grocery storage", () => {
  it("persists and loads selected list ID", async () => {
    const memory = createMemoryStorage();
    const storage = createListStorage(memory);

    expect(await storage.loadSelectedList("h1")).toBeNull();

    await storage.persistSelectedList("h1", "l1");
    expect(await storage.loadSelectedList("h1")).toBe("l1");
    expect(await memory.getItem("kinwoo.selectedList.h1")).toBe("l1");
  });
});
