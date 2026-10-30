import {
  MutationCache,
  onlineManager,
  QueryClient,
  type InvalidateQueryFilters,
} from "@tanstack/react-query";

import { ApiRequestError } from "../api/request";

const MAX_RETRIES = 2;

// Long enough that the last loaded data is still there to show after a day or more offline.
export const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const OFFLINE_ERROR_CODE = "OFFLINE";

// A 4xx is a definite answer from the server, so retrying only delays the error screen.
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiRequestError && error.status >= 400 && error.status < 500) return false;
  return failureCount < MAX_RETRIES;
}

// Runs before each mutation's own onMutate, so an offline write fails before any optimistic
// update paints instead of pausing and looking saved.
export function rejectWhileOffline(): void {
  if (!onlineManager.isOnline()) {
    throw new ApiRequestError("You're offline.", 0, OFFLINE_ERROR_CODE);
  }
}

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    mutationCache: new MutationCache({ onMutate: rejectWhileOffline }),
    defaultOptions: {
      queries: { retry: shouldRetry, staleTime: 30_000, gcTime: CACHE_MAX_AGE_MS },
      mutations: { retry: false },
    },
  });
}

// A write that already succeeded must not hang on its follow-up refresh when the connection drops:
// the refetch would wait for a connection indefinitely and keep the loading bar up.
export async function invalidateWhileOnline(
  queryClient: QueryClient,
  filters: InvalidateQueryFilters,
): Promise<void> {
  let stop = () => {};
  const wentOffline = new Promise<void>((resolve) => {
    if (!onlineManager.isOnline()) return resolve();
    stop = onlineManager.subscribe((online) => {
      if (!online) resolve();
    });
  });
  try {
    await Promise.race([queryClient.invalidateQueries(filters), wentOffline]);
  } finally {
    stop();
  }
}
