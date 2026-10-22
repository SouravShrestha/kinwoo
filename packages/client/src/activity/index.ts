"use client";

import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { useEffect, useSyncExternalStore } from "react";

let manualCount = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getManualCount() {
  return manualCount;
}

/** Marks the app busy for as long as `active` is true, for work that is not a query or mutation. */
export function useBusyWhile(active: boolean) {
  useEffect(() => {
    if (!active) return;
    manualCount += 1;
    emit();
    return () => {
      manualCount -= 1;
      emit();
    };
  }, [active]);
}

/** True while any first-load query, mutation or `useBusyWhile` caller is in flight. */
export function useIsBusy(): boolean {
  const fetching = useIsFetching({ predicate: (query) => query.state.status === "pending" });
  const mutating = useIsMutating();
  const manual = useSyncExternalStore(subscribe, getManualCount, () => 0);
  return fetching > 0 || mutating > 0 || manual > 0;
}
