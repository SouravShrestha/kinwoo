import type { QueryClient, QueryKey } from "@tanstack/react-query";

import { groceryKeys } from "./keys";

export type GroceryRealtimeAction =
  | { type: "refresh-lists"; houseId: string; listId?: string }
  | { type: "refresh-items"; houseId: string; listId: string };

export type GroceryListRow = {
  id?: string;
};

export type GroceryItemRow = {
  id?: string;
  list_id?: string;
};

// A list row also changes when one of its items is deleted (the database touches it, because
// item DELETE events carry no list id), so its items are refreshed along with the lists.
export function groceryListActions(
  houseId: string,
  row: GroceryListRow = {},
): GroceryRealtimeAction[] {
  return [{ type: "refresh-lists", houseId, ...(row.id ? { listId: row.id } : {}) }];
}

export function groceryItemActions(row: GroceryItemRow, houseId: string): GroceryRealtimeAction[] {
  if (!row.list_id) return [{ type: "refresh-lists", houseId }];
  return [{ type: "refresh-items", houseId, listId: row.list_id }];
}

type Invalidation = { queryKey: QueryKey; exact?: boolean };

function invalidationsFor(action: GroceryRealtimeAction): Invalidation[] {
  const overview = { queryKey: groceryKeys.overview(action.houseId) };
  switch (action.type) {
    case "refresh-lists": {
      // Exact: groceryKeys.lists() prefixes every list's items, which the list channel only
      // touches for the one list it names.
      const lists = { queryKey: groceryKeys.lists(action.houseId), exact: true };
      if (!action.listId) return [lists, overview];
      return [
        lists,
        { queryKey: groceryKeys.list(action.houseId, action.listId), exact: true },
        { queryKey: groceryKeys.items(action.houseId, action.listId) },
        overview,
      ];
    }
    case "refresh-items":
      return [{ queryKey: groceryKeys.items(action.houseId, action.listId) }, overview];
  }
}

export function applyGroceryRealtimeActions(
  queryClient: QueryClient,
  actions: GroceryRealtimeAction[],
): void {
  const seen = new Set<string>();
  for (const action of actions) {
    for (const invalidation of invalidationsFor(action)) {
      const id = JSON.stringify(invalidation);
      if (seen.has(id)) continue;
      seen.add(id);
      void queryClient.invalidateQueries(invalidation);
    }
  }
}

export type RealtimeBatcher = {
  push: (actions: GroceryRealtimeAction[]) => void;
  cancel: () => void;
};

// A bulk action (buy, assign or claim many) arrives as one event per row; collecting them for a
// moment turns N events into one refetch per affected query.
export function createRealtimeBatcher(
  queryClient: QueryClient,
  delayMs = 250,
  timers: {
    setTimeout: (run: () => void, ms: number) => unknown;
    clearTimeout: (handle: unknown) => void;
  } = {
    setTimeout: (run, ms) => setTimeout(run, ms),
    clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
  },
): RealtimeBatcher {
  let pending: GroceryRealtimeAction[] = [];
  let handle: unknown = null;

  const flush = () => {
    handle = null;
    const actions = pending;
    pending = [];
    applyGroceryRealtimeActions(queryClient, actions);
  };

  return {
    push(actions) {
      pending.push(...actions);
      if (handle === null) handle = timers.setTimeout(flush, delayMs);
    },
    cancel() {
      if (handle !== null) timers.clearTimeout(handle);
      handle = null;
      pending = [];
    },
  };
}

// On a channel's first subscription, only data cached before the channel opened can have missed
// events; a cold load is already fetching. Reconnects refresh everything under the key.
export function refreshAfterSubscribe(
  queryClient: QueryClient,
  queryKey: QueryKey,
  openedAt: number | null,
): void {
  void queryClient.invalidateQueries({
    queryKey,
    predicate: (query) =>
      openedAt === null || (query.state.dataUpdatedAt > 0 && query.state.dataUpdatedAt < openedAt),
  });
}
