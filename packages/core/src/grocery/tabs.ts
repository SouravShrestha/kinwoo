import type { GroceryItem, ItemStatus } from "./types";

export type GroceryTabKey = "pending" | "assigned" | "bought";

export const DEFAULT_GROCERY_TAB: GroceryTabKey = "pending";

export const GROCERY_TABS: readonly { key: GroceryTabKey; title: string }[] = [
  { key: "pending", title: "Pending" },
  { key: "assigned", title: "Assigned" },
  { key: "bought", title: "Bought" },
];

// Claimed items sit under "Assigned": both mean someone has taken the item on.
const TAB_OF_STATUS: Partial<Record<string, GroceryTabKey>> & Record<ItemStatus, GroceryTabKey> = {
  pending: "pending",
  claimed: "assigned",
  assigned: "assigned",
  bought: "bought",
};

export type ItemAssignee = { userId: string; name: string | null };

export function itemAssignee(item: GroceryItem): ItemAssignee | null {
  if (item.status === "claimed" && item.claimedBy) {
    return { userId: item.claimedBy, name: item.claimedByName };
  }
  if (item.status === "assigned" && item.assignedTo) {
    return { userId: item.assignedTo, name: item.assignedToName };
  }
  return null;
}

export function itemBuyer(item: GroceryItem): ItemAssignee | null {
  if (item.status !== "bought" || !item.boughtBy) return null;
  return { userId: item.boughtBy, name: item.boughtByName };
}

export type GroceryEmptyCopy = { title: string; hint: string | null };

const EMPTY_TAB_TITLE: Record<GroceryTabKey, string> = {
  pending: "No pending items on this list yet",
  assigned: "Nothing claimed or assigned",
  bought: "Nothing bought yet",
};

const ADD_ITEMS_HINT = "Tap “+” below to add items";

const EMPTY_TAB_HINT: Record<GroceryTabKey, string> = {
  pending: ADD_ITEMS_HINT,
  assigned: "Items you claim or that get assigned to someone show up here",
  bought: "Items marked as bought show up here",
};

export function groceryEmptyCopy(
  tab: GroceryTabKey,
  state: { filtering: boolean; listEmpty: boolean },
): GroceryEmptyCopy {
  if (state.filtering) return { title: "No items match these filters", hint: null };
  if (state.listEmpty) {
    return {
      title: tab === "pending" ? EMPTY_TAB_TITLE.pending : "No items on this list yet",
      hint: ADD_ITEMS_HINT,
    };
  }
  return { title: EMPTY_TAB_TITLE[tab], hint: EMPTY_TAB_HINT[tab] };
}

export function groceryItemsByTab(
  items: readonly GroceryItem[],
): Record<GroceryTabKey, GroceryItem[]> {
  const byTab: Record<GroceryTabKey, GroceryItem[]> = { pending: [], assigned: [], bought: [] };
  for (const item of items) {
    // A database without the remove_item_cancel migration can still return `cancelled` rows.
    const tab = TAB_OF_STATUS[item.status];
    if (tab) byTab[tab].push(item);
  }
  return byTab;
}
