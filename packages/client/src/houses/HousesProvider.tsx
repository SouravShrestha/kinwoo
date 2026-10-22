"use client";

import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { useAuth } from "../auth/use-auth";
import { ActiveHouseProvider } from "./active-house-provider";
import { HousesRealtime } from "./HousesRealtime";
import { PendingInviteResume } from "./PendingInviteResume";
import { createAppQueryClient } from "./query-client";
import type { KeyValueStorage } from "./storage";

// Drops every cached query when the signed-in user changes. A layout effect, so a previous
// user's data is cleared before it can paint for the next one.
function ClearCacheOnUserChange() {
  const { user, ready } = useAuth();
  const queryClient = useQueryClient();
  const previous = useRef<string | null | undefined>(undefined);

  const userId = user?.id ?? null;

  useLayoutEffect(() => {
    if (!ready) return;
    if (previous.current !== undefined && previous.current !== userId) queryClient.clear();
    previous.current = userId;
  }, [ready, userId, queryClient]);

  return null;
}

export function HousesProvider({
  storage,
  realtimeClient,
  onPendingInvite,
  children,
}: {
  storage: KeyValueStorage;
  realtimeClient?: SupabaseClient;
  onPendingInvite: (code: string) => void;
  children: ReactNode;
}) {
  const [queryClient] = useState(createAppQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ClearCacheOnUserChange />
      <ActiveHouseProvider storage={storage}>
        {realtimeClient ? <HousesRealtime client={realtimeClient} /> : null}
        <PendingInviteResume storage={storage} onResume={onPendingInvite} />
        {children}
      </ActiveHouseProvider>
    </QueryClientProvider>
  );
}
