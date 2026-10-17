import type { QueryClient } from "@tanstack/react-query";

import { groceryKeys } from "./keys";

export type GroceryRealtimeAction =
  | { type: "refresh-lists"; houseId: string }
  | { type: "refresh-items"; houseId: string; listId: string };

export type GroceryItemRow = {
  id?: string;
  list_id?: string;
};

export function groceryListActions(houseId: string): GroceryRealtimeAction[] {
  return [{ type: "refresh-lists", houseId }];
}

export function groceryItemActions(row: GroceryItemRow, houseId: string): GroceryRealtimeAction[] {
  if (!row.list_id) return [{ type: "refresh-lists", houseId }];
  return [{ type: "refresh-items", houseId, listId: row.list_id }];
}

export function applyGroceryRealtimeActions(
  queryClient: QueryClient,
  actions: GroceryRealtimeAction[],
): void {
  for (const action of actions) {
    switch (action.type) {
      case "refresh-lists":
        void queryClient.invalidateQueries({ queryKey: groceryKeys.lists(action.houseId) });
        void queryClient.invalidateQueries({ queryKey: groceryKeys.overview(action.houseId) });
        break;
      case "refresh-items":
        void queryClient.invalidateQueries({
          queryKey: groceryKeys.items(action.houseId, action.listId),
        });
        void queryClient.invalidateQueries({ queryKey: groceryKeys.overview(action.houseId) });
        break;
    }
  }
}
