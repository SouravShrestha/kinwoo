import type { HouseMembership } from "@kinwoo/core/houses";

export const activeHouseStorageKey = (userId: string) => `kinwoo.activeHouse.${userId}`;

// The stored house wins while the user still belongs to it; otherwise the first one. Deriving
// this each render means losing a house needs no extra bookkeeping to fall back.
export function resolveActiveHouse(
  storedId: string | null,
  houses: readonly HouseMembership[],
): string | null {
  if (storedId && houses.some((membership) => membership.house.id === storedId)) return storedId;
  return houses[0]?.house.id ?? null;
}
