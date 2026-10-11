import type { QueryClient } from "@tanstack/react-query";
import type { House, HouseMembership } from "@kinwoo/core/houses";

import { houseKeys } from "./keys";

// Removing the ["houses", id] prefix also drops that house's members and invites, so nothing
// stale can be shown once access is gone.
export function removeHouseFromCache(queryClient: QueryClient, houseId: string): void {
  queryClient.removeQueries({ queryKey: houseKeys.detail(houseId) });
  queryClient.setQueryData<HouseMembership[]>(houseKeys.list(), (current) =>
    current?.filter((membership) => membership.house.id !== houseId),
  );
  void queryClient.invalidateQueries({ queryKey: houseKeys.list() });
}

export function addHouseToCache(queryClient: QueryClient, house: House): void {
  queryClient.setQueryData<HouseMembership[]>(houseKeys.list(), (current = []) => [
    ...current.filter((membership) => membership.house.id !== house.id),
    { role: "admin", house },
  ]);
}

export function patchHouseInCache(
  queryClient: QueryClient,
  houseId: string,
  patch: Partial<Omit<House, "id">>,
): void {
  queryClient.setQueryData<HouseMembership[]>(houseKeys.list(), (current) =>
    current?.map((membership) =>
      membership.house.id === houseId
        ? { ...membership, house: { ...membership.house, ...patch } }
        : membership,
    ),
  );
  queryClient.setQueryData<HouseMembership>(houseKeys.detail(houseId), (current) =>
    current ? { ...current, house: { ...current.house, ...patch } } : current,
  );
}

export function updateHouseInCache(queryClient: QueryClient, house: House): void {
  queryClient.setQueryData<HouseMembership[]>(houseKeys.list(), (current) =>
    current?.map((membership) =>
      membership.house.id === house.id ? { ...membership, house } : membership,
    ),
  );
}
