import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { createMemoryStorage } from "../houses/storage";
import { groceryKeys } from "./keys";
import {
  applyGroceryRealtimeActions,
  createRealtimeBatcher,
  groceryItemActions,
  groceryListActions,
  refreshAfterSubscribe,
} from "./realtime";
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

  it("refreshes a touched list's items too", () => {
    expect(groceryListActions("h1", { id: "l1" })).toEqual([
      { type: "refresh-lists", houseId: "h1", listId: "l1" },
    ]);
  });

  it("does not invalidate other lists' items on a list change", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(groceryKeys.lists("h1"), []);
    queryClient.setQueryData(groceryKeys.items("h1", "l1"), []);
    queryClient.setQueryData(groceryKeys.items("h1", "l2"), []);

    applyGroceryRealtimeActions(queryClient, groceryListActions("h1", { id: "l1" }));

    expect(queryClient.getQueryState(groceryKeys.lists("h1"))?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(groceryKeys.items("h1", "l1"))?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(groceryKeys.items("h1", "l2"))?.isInvalidated).toBe(false);
  });

  it("collapses a burst of events into one invalidation per query", () => {
    const queryClient = new QueryClient();
    const calls: unknown[] = [];
    queryClient.invalidateQueries = ((filters: unknown) => {
      calls.push(filters);
      return Promise.resolve();
    }) as QueryClient["invalidateQueries"];
    let run: (() => void) | null = null;
    const batcher = createRealtimeBatcher(queryClient, 250, {
      setTimeout: (fn) => {
        run = fn;
        return 1;
      },
      clearTimeout: () => {
        run = null;
      },
    });

    for (let index = 0; index < 10; index += 1) {
      batcher.push(groceryItemActions({ id: `i${index}`, list_id: "l1" }, "h1"));
    }
    expect(calls).toHaveLength(0);

    run!();

    expect(calls).toEqual([
      { queryKey: groceryKeys.items("h1", "l1") },
      { queryKey: groceryKeys.overview("h1") },
    ]);
  });

  it("drops queued events when cancelled", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(groceryKeys.items("h1", "l1"), []);
    let run: (() => void) | null = null;
    const batcher = createRealtimeBatcher(queryClient, 250, {
      setTimeout: (fn) => {
        run = fn;
        return 1;
      },
      clearTimeout: () => {
        run = null;
      },
    });

    batcher.push(groceryItemActions({ id: "i1", list_id: "l1" }, "h1"));
    batcher.cancel();

    expect(run).toBeNull();
    expect(queryClient.getQueryState(groceryKeys.items("h1", "l1"))?.isInvalidated).toBe(false);
  });

  it("refreshes only data cached before the channel opened on first subscribe", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(groceryKeys.items("h1", "old"), [], { updatedAt: 1_000 });
    queryClient.setQueryData(groceryKeys.items("h1", "fresh"), [], { updatedAt: 5_000 });

    refreshAfterSubscribe(queryClient, groceryKeys.all("h1"), 2_000);

    expect(queryClient.getQueryState(groceryKeys.items("h1", "old"))?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(groceryKeys.items("h1", "fresh"))?.isInvalidated).toBe(false);

    refreshAfterSubscribe(queryClient, groceryKeys.all("h1"), null);
    expect(queryClient.getQueryState(groceryKeys.items("h1", "fresh"))?.isInvalidated).toBe(true);
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
