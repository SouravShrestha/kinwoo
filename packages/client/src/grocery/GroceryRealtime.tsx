"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { groceryKeys } from "./keys";
import {
  createRealtimeBatcher,
  refreshAfterSubscribe,
  groceryItemActions,
  groceryListActions,
  type GroceryItemRow,
  type GroceryListRow,
} from "./realtime";

type Payload = { new: Record<string, unknown> };

export function GroceryRealtime({ client, houseId }: { client: SupabaseClient; houseId: string }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const batcher = createRealtimeBatcher(queryClient);
    // Each channel tracks its own first subscription; see refreshAfterSubscribe.
    const onSubscribe = () => {
      let openedAt: number | null = Date.now();
      return (status: string) => {
        if (status !== "SUBSCRIBED") return;
        refreshAfterSubscribe(queryClient, groceryKeys.all(houseId), openedAt);
        openedAt = null;
      };
    };

    // Separate channels: on one channel, two bindings with the same house_id filter string only
    // delivered the first table's events.
    const lists = client
      .channel(`kinwoo:grocery-lists:${houseId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "grocery_lists", filter: `house_id=eq.${houseId}` },
        (payload: Payload) => {
          batcher.push(groceryListActions(houseId, payload.new as GroceryListRow));
        },
      )
      .subscribe(onSubscribe());

    const items = client
      .channel(`kinwoo:grocery-items:${houseId}`)
      .on(
        "postgres_changes",
        // Deletes arrive through the list channel instead; see groceryListActions.
        { event: "*", schema: "public", table: "grocery_items", filter: `house_id=eq.${houseId}` },
        (payload: Payload) => {
          batcher.push(groceryItemActions(payload.new as GroceryItemRow, houseId));
        },
      )
      .subscribe(onSubscribe());

    return () => {
      batcher.cancel();
      void client.removeChannel(lists);
      void client.removeChannel(items);
    };
  }, [client, houseId, queryClient]);

  return null;
}
