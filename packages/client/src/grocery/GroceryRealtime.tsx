"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import {
  applyGroceryRealtimeActions,
  groceryItemActions,
  groceryListActions,
  type GroceryItemRow,
} from "./realtime";

type Payload = { new: Record<string, unknown> };

export function GroceryRealtime({ client, houseId }: { client: SupabaseClient; houseId: string }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = client
      .channel(`kinwoo:grocery:${houseId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "grocery_lists", filter: `house_id=eq.${houseId}` },
        () => {
          applyGroceryRealtimeActions(queryClient, groceryListActions(houseId));
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "grocery_items" },
        (payload: Payload) => {
          applyGroceryRealtimeActions(
            queryClient,
            groceryItemActions(payload.new as GroceryItemRow, houseId),
          );
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void queryClient.invalidateQueries({ queryKey: ["grocery", houseId] });
        }
      });

    return () => {
      void client.removeChannel(channel);
    };
  }, [client, houseId, queryClient]);

  return null;
}
