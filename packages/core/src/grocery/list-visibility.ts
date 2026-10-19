import type { GroceryItem, GroceryList } from "./types";

export function itemsAssignedToOthers(
  items: readonly GroceryItem[],
  ownerId: string,
): GroceryItem[] {
  return items.filter(
    (item) => item.status === "assigned" && item.assignedTo !== null && item.assignedTo !== ownerId,
  );
}

export function hasOwnPrivateList(lists: readonly GroceryList[], userId: string | null): boolean {
  return (
    userId !== null &&
    lists.some(
      (list) =>
        list.visibility === "private" && list.createdBy === userId && list.deletedAt === null,
    )
  );
}
