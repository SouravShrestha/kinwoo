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

const EMPTY_TAB_COPY: Record<GroceryTabKey, GroceryEmptyCopy> = {
  pending: {
    title: "Nothing pending. Suspiciously calm.",
    hint: "Tap “+” below and give the list something to do",
  },
  assigned: {
    title: "Nobody’s called dibs yet",
    hint: "Claim an item or hand one off, and it’ll land here",
  },
  bought: {
    title: "The cart’s feeling lonely",
    hint: "Mark items as bought and they’ll show up here",
  },
};

const EMPTY_LIST_COPY: Record<GroceryTabKey, GroceryEmptyCopy> = {
  pending: {
    title: "Nothing here but good intentions",
    hint: "Tap “+” below to add your first item",
  },
  assigned: {
    title: "This list is a blank canvas",
    hint: "Tap “+” below and start adding items",
  },
  bought: {
    title: "This list is a blank canvas",
    hint: "Tap “+” below and start adding items",
  },
};

export function groceryEmptyCopy(
  tab: GroceryTabKey,
  state: { filtering: boolean; listEmpty: boolean },
): GroceryEmptyCopy {
  if (state.filtering) return { title: "Your filters came up empty-handed", hint: null };
  return (state.listEmpty ? EMPTY_LIST_COPY : EMPTY_TAB_COPY)[tab];
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
