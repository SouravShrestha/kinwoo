import type {
  ActivityCursor,
  AddItemInput,
  ClaimResult,
  CreateListInput,
  GroceryCategory,
  GroceryErrorCode,
  GroceryItem,
  GroceryList,
  GroceryOverview,
  GroceryOverviewItem,
  GroceryPurchase,
  ItemStatus,
  ItemUrgency,
  ListVisibility,
  MarkBoughtInput,
  MarkItemsBoughtInput,
  UpdateItemInput,
  UpdateListInput,
} from "@kinwoo/core/grocery";

export type {
  AddItemInput,
  ClaimResult,
  CreateListInput,
  GroceryCategory,
  GroceryItem,
  GroceryList,
  GroceryOverview,
  GroceryPurchase,
  ItemStatus,
  ItemUrgency,
  ListVisibility,
  MarkBoughtInput,
  MarkItemsBoughtInput,
  UpdateItemInput,
  UpdateListInput,
};

export class GroceryRepositoryError extends Error {
  constructor(
    message: string,
    readonly code: GroceryErrorCode | null,
  ) {
    super(message);
    this.name = "GroceryRepositoryError";
  }
}

export type ActivityEntry = {
  id: string;
  actorId: string | null;
  actorName: string | null;
  type: string;
  entityType: string | null;
  entityId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
};

export interface IGroceryRepository {
  listLists(houseId: string): Promise<GroceryList[]>;
  findList(listId: string): Promise<GroceryList | null>;
  createList(houseId: string, input: CreateListInput): Promise<GroceryList>;
  updateList(listId: string, input: UpdateListInput): Promise<GroceryList>;
  deleteList(listId: string): Promise<void>;

  listItems(listId: string, options?: { status?: ItemStatus[] }): Promise<GroceryItem[]>;
  findItem(itemId: string): Promise<GroceryItem | null>;
  addItem(input: AddItemInput): Promise<GroceryItem>;
  updateItem(itemId: string, input: UpdateItemInput): Promise<GroceryItem>;
  deleteItem(itemId: string): Promise<void>;
  claimItem(itemId: string): Promise<ClaimResult>;
  unclaimItem(itemId: string): Promise<void>;
  assignItem(itemId: string, assignedTo: string): Promise<void>;
  /** Returns a claimed or assigned item to pending. */
  unassignItem(itemId: string): Promise<void>;
  /** Returns how many items were assigned; items no longer pending are skipped. */
  assignItems(listId: string, itemIds: string[], assignedTo: string): Promise<number>;
  /** Claims for the caller; returns how many were still pending and got claimed. */
  claimItems(listId: string, itemIds: string[]): Promise<number>;
  respondToAssignment(itemId: string, accept: boolean): Promise<void>;
  markBought(itemId: string, input: MarkBoughtInput): Promise<void>;
  /** Buys every item or none; returns the new batch id. */
  markItemsBought(listId: string, input: MarkItemsBoughtInput): Promise<string>;
  moveItem(itemId: string, targetListId: string): Promise<void>;

  listCategories(houseId: string): Promise<GroceryCategory[]>;
  addCategory(houseId: string, name: string): Promise<GroceryCategory>;

  listRecentActivity(
    houseId: string,
    limit: number,
    before: ActivityCursor | null,
  ): Promise<ActivityEntry[]>;
  listItemActivity(houseId: string, itemId: string): Promise<ActivityEntry[]>;
  getOverview(houseId: string, userId: string): Promise<GroceryOverview>;
  listPrivatePurchases(houseId: string, userId: string): Promise<GroceryOverviewItem[]>;
}
