"use client";

import { useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect } from "react";

import { useAuth } from "../auth/use-auth";
import { groceryKeys } from "../grocery/keys";
import { refreshAfterSubscribe } from "../grocery/realtime";
import { useActiveHouse } from "./active-house-provider";
import { houseKeys } from "./keys";
import {
  applyRealtimeActions,
  houseMemberActions,
  houseRowActions,
  ownMembershipActions,
  type HouseRow,
  type MemberRow,
} from "./realtime";

type Payload = { new: Record<string, unknown> };

// Two channels: one for the signed-in user's own memberships (so a removal lands instantly), and
// one for whichever house is active (so the member list and house details stay live).
// Realtime only delivers rows the user can read, so RLS keeps other houses out.
export function HousesRealtime({ client }: { client: SupabaseClient }) {
  const { user } = useAuth();
  const { activeHouseId, dropHouse } = useActiveHouse();
  const queryClient = useQueryClient();

  const userId = user?.id ?? null;

  useEffect(() => {
    if (!userId) return;

    let openedAt: number | null = Date.now();
    const channel = client
      .channel(`kinwoo:user:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "house_members", filter: `user_id=eq.${userId}` },
        (payload: Payload) => {
          applyRealtimeActions(
            queryClient,
            ownMembershipActions(payload.new as MemberRow),
            dropHouse,
          );
        },
      )
      .subscribe((status) => {
        // A reconnect may have skipped events, so the list is re-read rather than trusted.
        if (status !== "SUBSCRIBED") return;
        refreshAfterSubscribe(queryClient, houseKeys.list(), openedAt);
        openedAt = null;
      });

    return () => {
      void client.removeChannel(channel);
    };
  }, [client, userId, queryClient, dropHouse]);

  useEffect(() => {
    if (!userId || !activeHouseId) return;

    const houseId = activeHouseId;
    let openedAt: number | null = Date.now();

    const channel = client
      .channel(`kinwoo:house:${houseId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "house_members", filter: `house_id=eq.${houseId}` },
        (payload: Payload) => {
          applyRealtimeActions(
            queryClient,
            houseMemberActions(payload.new as MemberRow, houseId),
            dropHouse,
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "houses", filter: `id=eq.${houseId}` },
        (payload: Payload) => {
          applyRealtimeActions(
            queryClient,
            houseRowActions(payload.new as HouseRow, houseId),
            dropHouse,
          );
          // Settings such as simplify debts log an activity entry alongside the row change.
          void queryClient.invalidateQueries({ queryKey: groceryKeys.recentActivity(houseId) });
        },
      )
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") return;
        refreshAfterSubscribe(queryClient, houseKeys.members(houseId), openedAt);
        openedAt = null;
      });

    return () => {
      void client.removeChannel(channel);
    };
  }, [client, userId, activeHouseId, queryClient, dropHouse]);

  return null;
}
