"use client";

import { TOAST_MESSAGES } from "@kinwoo/core/toast";
import { onlineManager, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { closeAll } from "../sheets";
import { toast } from "../toast";

export type OfflineBlock = "unsaved" | "more";

/**
 * Offline, a first load with nothing saved would sit on its skeleton forever, so it ends as an
 * error ("unsaved"). Asking for another page of a list that cannot load ("more") is left waiting
 * for the connection. `onBlocked` runs once per burst, with "unsaved" taking priority.
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

/** Offline with nothing saved to show: stops the load, says so, and closes any open sheet. */
export function OfflineLoadGuard(): null {
  const queryClient = useQueryClient();
  useEffect(
    () =>
      guardOfflineLoads(queryClient, (block) => {
        if (block === "more") return toast.warning(TOAST_MESSAGES.offline);
        toast.warning(TOAST_MESSAGES.offlineNoData);
        closeAll();
      }),
    [queryClient],
  );
  return null;
}
