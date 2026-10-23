"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { useAuth } from "../auth/use-auth";
import { refreshAfterSubscribe } from "../grocery/realtime";
import { notificationsKey } from "./queries";

// Only inserts are watched, so other devices see a read mark on their next visit. Own marks are
// already applied optimistically.
export function NotificationsRealtime({ client }: { client: SupabaseClient }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!userId) return;

    let openedAt: number | null = Date.now();
    const channel = client
      .channel(`kinwoo:notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: notificationsKey(userId) });
        },
      )
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") return;
        refreshAfterSubscribe(queryClient, notificationsKey(userId), openedAt);
        openedAt = null;
      });

    return () => {
      void client.removeChannel(channel);
    };
  }, [client, userId, queryClient]);

  return null;
}
