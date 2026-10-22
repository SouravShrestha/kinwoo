import { QueryClient } from "@tanstack/react-query";

import { ApiRequestError } from "../api/request";

const MAX_RETRIES = 2;

// A 4xx is a definite answer from the server, so retrying only delays the error screen.
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiRequestError && error.status >= 400 && error.status < 500) return false;
  return failureCount < MAX_RETRIES;
}

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetry, staleTime: 30_000 },
      mutations: { retry: false },
    },
  });
}
