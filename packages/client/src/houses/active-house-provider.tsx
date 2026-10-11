"use client";

import { useQueryClient } from "@tanstack/react-query";
import type { HouseMembership } from "@kinwoo/core/houses";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "../auth/use-auth";
import { activeHouseStorageKey, resolveActiveHouse } from "./active-house";
import { removeHouseFromCache } from "./cache";
import { lostAccessHouseId } from "./keys";
import { useMyHouses } from "./queries";
import type { KeyValueStorage } from "./storage";

export interface ActiveHouseContextValue {
  houses: HouseMembership[];
  activeHouse: HouseMembership | null;
  activeHouseId: string | null;
  ready: boolean;
  loadFailed: boolean;
  setActiveHouse: (houseId: string | null) => void;
  dropHouse: (houseId: string) => void;
  refetchHouses: () => Promise<unknown>;
}

const ActiveHouseContext = createContext<ActiveHouseContextValue | null>(null);

type StoredChoice = { userId: string | null; houseId: string | null; loaded: boolean };

const NOT_LOADED: StoredChoice = { userId: null, houseId: null, loaded: false };
const NO_HOUSES: HouseMembership[] = [];

export function ActiveHouseProvider({
  storage,
  children,
}: {
  storage: KeyValueStorage;
  children: ReactNode;
}) {
  const { user, isLoggedIn, ready: authReady } = useAuth();
  const queryClient = useQueryClient();
  const housesQuery = useMyHouses();

  const userId = user?.id ?? null;
  const [stored, setStored] = useState<StoredChoice>(NOT_LOADED);

  const storedRef = useRef(stored);
  useEffect(() => {
    storedRef.current = stored;
  }, [stored]);

  useEffect(() => {
    if (!userId) return;

    let active = true;
    storage
      .getItem(activeHouseStorageKey(userId))
      .catch(() => null)
      .then((houseId) => {
        if (active) setStored({ userId, houseId, loaded: true });
      });

    return () => {
      active = false;
    };
  }, [userId, storage]);

  const storedForUser = stored.userId === userId && stored.loaded;
  const houses = housesQuery.data ?? NO_HOUSES;
  const activeHouseId = storedForUser ? resolveActiveHouse(stored.houseId, houses) : null;
  const activeHouse = houses.find((membership) => membership.house.id === activeHouseId) ?? null;

  const setActiveHouse = useCallback(
    (houseId: string | null) => {
      if (!userId) return;
      setStored({ userId, houseId, loaded: true });

      const key = activeHouseStorageKey(userId);
      const write = houseId ? storage.setItem(key, houseId) : storage.removeItem(key);
      void write.catch(() => undefined);
    },
    [userId, storage],
  );

  const dropHouse = useCallback(
    (houseId: string) => {
      removeHouseFromCache(queryClient, houseId);

      if (storedRef.current.houseId === houseId) setActiveHouse(null);
    },
    [queryClient, setActiveHouse],
  );

  useEffect(
    () =>
      queryClient.getQueryCache().subscribe((event) => {
        if (event.type !== "updated" || event.action.type !== "error") return;

        const lost = lostAccessHouseId(event.query.queryKey, event.action.error);
        if (lost) dropHouse(lost);
      }),
    [queryClient, dropHouse],
  );

  const ready = authReady && (!isLoggedIn || (storedForUser && !housesQuery.isPending));

  const value = useMemo<ActiveHouseContextValue>(
    () => ({
      houses,
      activeHouse,
      activeHouseId,
      ready,
      loadFailed: housesQuery.isError,
      setActiveHouse,
      dropHouse,
      refetchHouses: housesQuery.refetch,
    }),
    [
      houses,
      activeHouse,
      activeHouseId,
      ready,
      housesQuery.isError,
      housesQuery.refetch,
      setActiveHouse,
      dropHouse,
    ],
  );

  return <ActiveHouseContext.Provider value={value}>{children}</ActiveHouseContext.Provider>;
}

export function useActiveHouse(): ActiveHouseContextValue {
  const value = useContext(ActiveHouseContext);
  if (!value) throw new Error("useActiveHouse must be used inside a HousesProvider.");
  return value;
}
