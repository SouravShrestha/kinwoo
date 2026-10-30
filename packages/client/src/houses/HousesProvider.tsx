"use client";

import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { defaultShouldDehydrateQuery, useQueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider, type Persister } from "@tanstack/react-query-persist-client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { OfflineLoadGuard } from "../activity/offline-guard";
import { useAuth } from "../auth/use-auth";
import { ActiveHouseProvider } from "./active-house-provider";
import { NotificationsRealtime } from "../notifications/NotificationsRealtime";
import { HousesRealtime } from "./HousesRealtime";
import { PendingInviteResume } from "./PendingInviteResume";
import { CACHE_MAX_AGE_MS, createAppQueryClient } from "./query-client";
import type { KeyValueStorage } from "./storage";

const QUERY_CACHE_KEY = "kinwoo.query-cache";
// Bump when a cached response shape changes, so old saved data is thrown away on upgrade.
const QUERY_CACHE_VERSION = "1";

// Drops every cached query, in memory and on disk, when the signed-in user changes. A layout
// effect, so a previous user's data is cleared before it can paint for the next one.
function ClearCacheOnUserChange({ persister }: { persister: Persister }) {
  const { user, ready } = useAuth();
  const queryClient = useQueryClient();
  const previous = useRef<string | null | undefined>(undefined);

  const userId = user?.id ?? null;

  useLayoutEffect(() => {
    if (!ready) return;
    if (previous.current !== undefined && previous.current !== userId) {
      queryClient.clear();
      void persister.removeClient();
    }
    previous.current = userId;
  }, [ready, userId, queryClient, persister]);

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
  const [persistOptions] = useState(() => ({
    persister: createAsyncStoragePersister({ storage, key: QUERY_CACHE_KEY }),
    maxAge: CACHE_MAX_AGE_MS,
    buster: QUERY_CACHE_VERSION,
    dehydrateOptions: {
      // gcTime 0 marks one-shot data such as an invite preview, which must not come back later.
      shouldDehydrateQuery: (query: Parameters<typeof defaultShouldDehydrateQuery>[0]) =>
        defaultShouldDehydrateQuery(query) && query.gcTime !== 0,
    },
  }));

  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <ClearCacheOnUserChange persister={persistOptions.persister} />
      <OfflineLoadGuard />
      <ActiveHouseProvider storage={storage}>
        {realtimeClient ? <HousesRealtime client={realtimeClient} /> : null}
        {realtimeClient ? <NotificationsRealtime client={realtimeClient} /> : null}
        <PendingInviteResume storage={storage} onResume={onPendingInvite} />
        {children}
      </ActiveHouseProvider>
    </PersistQueryClientProvider>
  );
}
