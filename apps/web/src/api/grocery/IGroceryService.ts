import type {
  ActivityCursor,
  AssignItemsResult,
  GroceryActivityPage,
  GroceryErrorCode,
  GroceryOverviewItem,
  MarkItemsBoughtResult,
} from "@kinwoo/core/grocery";

import type {
  ActivityEntry,
  AddItemInput,
  ClaimResult,
  CreateListInput,
  GroceryCategory,
  GroceryItem,
  GroceryList,
  GroceryOverview,
  MarkBoughtInput,
  MarkItemsBoughtInput,
  UpdateItemInput,
  UpdateListInput,
} from "./IGroceryRepository";

export type GroceryServiceErrorCode = GroceryErrorCode | "INVALID_INPUT" | "UNAVAILABLE";

export type GroceryResult<T> =
  { ok: true; data: T } | { ok: false; code: GroceryServiceErrorCode; message: string };

export interface IGroceryService {
  listLists(houseId: string): Promise<GroceryResult<GroceryList[]>>;
  getList(listId: string): Promise<GroceryResult<GroceryList>>;
  createList(houseId: string, input: CreateListInput): Promise<GroceryResult<GroceryList>>;
  updateList(listId: string, input: UpdateListInput): Promise<GroceryResult<GroceryList>>;
  deleteList(listId: string): Promise<GroceryResult<null>>;

  listItems(listId: string): Promise<GroceryResult<GroceryItem[]>>;
  getItem(itemId: string): Promise<GroceryResult<GroceryItem>>;
  addItem(input: AddItemInput): Promise<GroceryResult<GroceryItem>>;
  updateItem(itemId: string, input: UpdateItemInput): Promise<GroceryResult<GroceryItem>>;
  deleteItem(itemId: string): Promise<GroceryResult<null>>;
  claimItem(itemId: string): Promise<GroceryResult<ClaimResult>>;
  unclaimItem(itemId: string): Promise<GroceryResult<null>>;
  assignItem(itemId: string, assignedTo: string): Promise<GroceryResult<null>>;
  unassignItem(itemId: string): Promise<GroceryResult<null>>;
  assignItems(
    listId: string,
    itemIds: string[],
    assignedTo: string,
  ): Promise<GroceryResult<AssignItemsResult>>;
  claimItems(listId: string, itemIds: string[]): Promise<GroceryResult<AssignItemsResult>>;
  respondToAssignment(itemId: string, accept: boolean): Promise<GroceryResult<null>>;
  markBought(itemId: string, input: MarkBoughtInput): Promise<GroceryResult<null>>;
  markItemsBought(
    listId: string,
    input: MarkItemsBoughtInput,
  ): Promise<GroceryResult<MarkItemsBoughtResult>>;
  moveItem(itemId: string, targetListId: string): Promise<GroceryResult<null>>;

  listCategories(houseId: string): Promise<GroceryResult<GroceryCategory[]>>;
  addCategory(houseId: string, name: string): Promise<GroceryResult<GroceryCategory>>;

  getOverview(houseId: string, userId: string): Promise<GroceryResult<GroceryOverview>>;
  listPrivatePurchases(
    houseId: string,
    userId: string,
  ): Promise<GroceryResult<GroceryOverviewItem[]>>;
  getRecentActivity(
    houseId: string,
    limit: number,
    before: ActivityCursor | null,
  ): Promise<GroceryResult<GroceryActivityPage>>;
  getItemActivity(houseId: string, itemId: string): Promise<GroceryResult<ActivityEntry[]>>;
}
