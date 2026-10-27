import { MutationCache, onlineManager, QueryClient } from "@tanstack/react-query";

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
