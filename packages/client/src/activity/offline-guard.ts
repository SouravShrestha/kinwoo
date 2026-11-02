"use client";

import { LOAD_FAILED_MESSAGE } from "@kinwoo/core/app";
import { TOAST_MESSAGES } from "@kinwoo/core/toast";
import { onlineManager, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { ApiRequestError } from "../api/request";
import { toast } from "../toast";

export type OfflineBlock = "unsaved" | "more";

/**
 * Offline, a first load with nothing saved would sit on its skeleton forever, so it ends as an
 * error ("unsaved"). Asking for another page of a list that cannot load ("more") is cancelled
 * while the already cached page remains visible. `onBlocked` runs once per burst, with "unsaved"
 * taking priority.
 */
export function guardOfflineLoads(
  queryClient: QueryClient,
  onBlocked: (block: OfflineBlock) => void,
): () => void {
  let pending: OfflineBlock | null = null;
  return queryClient.getQueryCache().subscribe((event) => {
    if (event.type !== "updated" || event.action.type !== "pause") return;
    if (onlineManager.isOnline()) return;
    const { query } = event;
    let block: OfflineBlock;
    if (query.state.data === undefined) {
      query.cancel();
      block = "unsaved";
    } else if (query.state.fetchMeta?.fetchMore) {
      query.cancel();
      block = "more";
    } else {
      return;
    }
    const scheduled = pending !== null;
    if (pending !== "unsaved") pending = block;
    if (scheduled) return;
    // One notice for the several queries a screen starts together.
    setTimeout(() => {
      const result = pending;
      pending = null;
      if (result) onBlocked(result);
    }, 0);
  });
}

export const SLOW_LOAD_MS = 8000;

/**
 * Reports a first load (no cached data) that fails while online, or is still running after
 * SLOW_LOAD_MS. Background refreshes are skipped: the cached data is still on screen.
 */
export function watchLoadStatus(
  queryClient: QueryClient,
  report: (status: "failed" | "slow") => void,
): () => void {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const clear = (hash: string) => {
    clearTimeout(timers.get(hash));
    timers.delete(hash);
  };
  const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
    if (event.type !== "updated") return;
    const { query, action } = event;
    const hash = query.queryHash;
    if (action.type === "fetch" && query.state.data === undefined && !timers.has(hash)) {
      timers.set(
        hash,
        setTimeout(() => {
          timers.delete(hash);
          if (query.state.fetchStatus === "fetching" && onlineManager.isOnline()) report("slow");
        }, SLOW_LOAD_MS),
      );
    } else if (action.type === "error") {
      clear(hash);
      // A 4xx is a definite answer its screen already handles (sign-in, lost access, not found),
      // and a query nothing renders leaves nothing missing on screen.
      const definite =
        action.error instanceof ApiRequestError &&
        action.error.status >= 400 &&
        action.error.status < 500;
      if (
        query.state.data === undefined &&
        !definite &&
        query.getObserversCount() > 0 &&
        onlineManager.isOnline()
      ) {
        report("failed");
      }
    } else if (action.type === "success" || action.type === "pause") {
      clear(hash);
    }
  });
  return () => {
    unsubscribe();
    for (const hash of [...timers.keys()]) clear(hash);
  };
}

/** Offline with nothing saved to show: stops the load and explains why no data is shown. */
export function OfflineLoadGuard(): null {
  const queryClient = useQueryClient();
  useEffect(
    () =>
      guardOfflineLoads(queryClient, (block) => {
        if (block === "more") return toast.warning(TOAST_MESSAGES.offline);
        toast.warning(TOAST_MESSAGES.offlineNoData);
      }),
    [queryClient],
  );
  useEffect(
    () =>
      watchLoadStatus(queryClient, (status) =>
        status === "slow" ? toast.info(TOAST_MESSAGES.loadSlow) : toast.error(LOAD_FAILED_MESSAGE),
      ),
    [queryClient],
  );
  return null;
}
