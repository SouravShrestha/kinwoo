"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { groceryKeys } from "../grocery/keys";
import { refreshAfterSubscribe } from "../grocery/realtime";
import { expenseKeys } from "./keys";

// Expenses, settlements, balances, totals, and the home overview with its activity feed.
export function refreshHouseMoney(queryClient: QueryClient, houseId: string): void {
  void queryClient.invalidateQueries({ queryKey: expenseKeys.all(houseId) });
  void queryClient.invalidateQueries({ queryKey: groceryKeys.overview(houseId) });
}

// Watches activity_log rather than the expense tables: soft deletes fail RLS on the row itself,
// so their events never arrive, but each one still logs an entry here.
export function ExpensesRealtime({ client, houseId }: { client: SupabaseClient; houseId: string }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    let openedAt: number | null = Date.now();
    const channel = client
      .channel(`kinwoo:activity:${houseId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_log",
          filter: `house_id=eq.${houseId}`,
        },
        () => refreshHouseMoney(queryClient, houseId),
      )
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") return;
        refreshAfterSubscribe(queryClient, expenseKeys.all(houseId), openedAt);
        refreshAfterSubscribe(queryClient, groceryKeys.overview(houseId), openedAt);
        openedAt = null;
      });

    return () => {
      void client.removeChannel(channel);
    };
  }, [client, houseId, queryClient]);

  return null;
}
