import type { LinkedExpenseInput } from "../expenses/types";

export type ListVisibility = "shared" | "private";
export type ItemStatus = "pending" | "claimed" | "assigned" | "bought";
export type ItemUrgency = "now" | "soon" | "today" | "tomorrow" | "this_week" | "whenever";

export type GroceryList = {
  id: string;
  houseId: string;
  name: string;
  icon: string;
  position: number;
  visibility: ListVisibility;
  isDefault: boolean;
  deletedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type GroceryCategory = {
  id: string;
  houseId: string | null; // null = system default
  name: string;
  position: number;
};

export type GroceryItem = {
  id: string;
  listId: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  categoryId: string | null;
  categoryName: string | null;
  urgency: ItemUrgency;
  status: ItemStatus;
  claimedBy: string | null;
  claimedByName: string | null;
  assignedTo: string | null;
  assignedToName: string | null;
  assignedBy: string | null;
  assignmentResponse: "accepted" | "declined" | null;
  boughtBy: string | null;
  boughtByName: string | null;
  purchase: GroceryItemPurchase | null;
  note: string | null;
  position: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type GroceryPurchaseBatchRef = {
  id: string;
  name: string | null;
  totalPaise: number;
  position: number;
};

export type GroceryItemPurchase = {
  pricePaise: number | null;
  store: string | null;
  boughtAt: string;
  batch: GroceryPurchaseBatchRef | null;
};

export type GroceryPurchase = {
  id: string;
  itemId: string;
  boughtBy: string;
  boughtByName: string | null;
  quantity: number | null;
  unit: string | null;
  pricePaise: number | null;
  store: string | null;
  boughtAt: string;
};

export type CreateListInput = {
  name: string;
  icon?: string;
  visibility?: ListVisibility;
};

export type UpdateListInput = {
  name?: string;
  icon?: string;
  visibility?: ListVisibility;
  position?: number;
  isDefault?: boolean;
};

export type AddItemInput = {
  listId: string;
  name: string;
  quantity?: number | null;
  unit?: string | null;
  categoryId?: string | null;
  urgency?: ItemUrgency;
  note?: string | null;
  idempotencyKey: string;
};

export type UpdateItemInput = {
  name?: string;
  quantity?: number | null;
  unit?: string | null;
  categoryId?: string | null;
  urgency?: ItemUrgency;
  note?: string | null;
};

export type MarkBoughtInput = {
  quantity?: number | null;
  unit?: string | null;
  pricePaise?: number | null;
  store?: string | null;
  boughtAt?: string | null;
  expense?: LinkedExpenseInput | null;
};

export type MarkItemsBoughtInput = {
  itemIds: string[];
  totalPaise: number;
  name?: string | null;
  store?: string | null;
  itemPricesPaise?: (number | null)[];
  expense?: LinkedExpenseInput | null;
};

export type MarkItemsBoughtResult = { batchId: string };

// Mirrors the bounds in the mark_items_bought RPC.
export const MIN_BATCH_ITEMS = 2;

export type ClaimResult = { claimed: true } | { claimed: false; claimedByName: string | null };

export type AssignItemsResult = { assigned: number; requested: number };

// Mirrors the cap in the assign_grocery_items RPC.
export const MAX_BULK_ASSIGN = 200;

export type GroceryOverviewItem = GroceryItem & {
  listName: string;
  listIcon: string;
};

export type GroceryActivityEntry = {
  id: string;
  actorId: string | null;
  actorName: string | null;
  type: string;
  entityType: string | null;
  entityId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type GroceryActivityPage = {
  entries: GroceryActivityEntry[];
  nextCursor: string | null;
};

export type GroceryOverview = {
  todayItems: GroceryOverviewItem[];
  myToBuy: GroceryOverviewItem[];
};
