export function unreadCountByHouse(
  notifications: readonly { houseId?: string; readAt?: string | null }[] | undefined,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const { houseId, readAt } of notifications ?? []) {
    if (houseId && !readAt) counts[houseId] = (counts[houseId] ?? 0) + 1;
  }
  return counts;
}
