import type { GroceryItem, ListVisibility } from "./types";

export function itemsAssignedToOthers(
  items: readonly GroceryItem[],
  ownerId: string,
): GroceryItem[] {
  return items.filter(
    (item) => item.status === "assigned" && item.assignedTo !== null && item.assignedTo !== ownerId,
  );
}
