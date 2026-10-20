import type {
  AddItemInput,
  AssignItemsResult,
  DeleteItemsResult,
  ClaimResult,
  CreateListInput,
  GroceryActivityEntry,
  GroceryActivityPage,
  GroceryCategory,
  GroceryItem,
  GroceryList,
  GroceryOverview,
  GroceryOverviewItem,
  MarkBoughtInput,
  MarkItemsBoughtInput,
  MarkItemsBoughtResult,
  UpdateItemInput,
  UpdateListInput,
} from "@kinwoo/core/grocery";

import { apiRequest } from "../api/request";

const segment = encodeURIComponent;
const base = (houseId: string) => `/api/houses/${segment(houseId)}/grocery`;
const listBase = (houseId: string, listId: string) => `${base(houseId)}/lists/${segment(listId)}`;
const itemBase = (houseId: string, listId: string, itemId: string) =>
  `${listBase(houseId, listId)}/items/${segment(itemId)}`;

export async function fetchLists(houseId: string): Promise<GroceryList[]> {
  const body = await apiRequest<{ lists: GroceryList[] }>(`${base(houseId)}/lists`);
  return body.lists;
}

export async function fetchList(houseId: string, listId: string): Promise<GroceryList> {
  const body = await apiRequest<{ list: GroceryList }>(listBase(houseId, listId));
  return body.list;
}

export async function createList(houseId: string, input: CreateListInput): Promise<GroceryList> {
  const body = await apiRequest<{ list: GroceryList }>(`${base(houseId)}/lists`, {
    method: "POST",
    body: input,
  });
  return body.list;
}

export async function updateList(
  houseId: string,
  listId: string,
  input: UpdateListInput,
): Promise<GroceryList> {
  const body = await apiRequest<{ list: GroceryList }>(listBase(houseId, listId), {
    method: "PATCH",
    body: input,
  });
  return body.list;
}

export async function deleteList(houseId: string, listId: string): Promise<void> {
  await apiRequest(`${listBase(houseId, listId)}/delete`, {
    method: "POST",
  });
}

export async function fetchItems(houseId: string, listId: string): Promise<GroceryItem[]> {
  const body = await apiRequest<{ items: GroceryItem[] }>(`${listBase(houseId, listId)}/items`);
  return body.items;
}

export async function fetchItem(
  houseId: string,
  listId: string,
  itemId: string,
): Promise<GroceryItem> {
  const body = await apiRequest<{ item: GroceryItem }>(itemBase(houseId, listId, itemId));
  return body.item;
}

export async function addItem(houseId: string, input: AddItemInput): Promise<GroceryItem> {
  const body = await apiRequest<{ item: GroceryItem }>(`${listBase(houseId, input.listId)}/items`, {
    method: "POST",
    body: input,
  });
  return body.item;
}

export async function updateItem(
  houseId: string,
  listId: string,
  itemId: string,
  input: UpdateItemInput,
): Promise<GroceryItem> {
  const body = await apiRequest<{ item: GroceryItem }>(itemBase(houseId, listId, itemId), {
    method: "PATCH",
    body: input,
  });
  return body.item;
}

export async function claimItem(
  houseId: string,
  listId: string,
  itemId: string,
): Promise<ClaimResult> {
  const body = await apiRequest<{ result?: ClaimResult; claim?: ClaimResult }>(
    `${itemBase(houseId, listId, itemId)}/claim`,
    { method: "POST" },
  );
  return (body.result ?? body.claim)!;
}

export async function unclaimItem(houseId: string, listId: string, itemId: string): Promise<void> {
  await apiRequest(`${itemBase(houseId, listId, itemId)}/claim`, {
    method: "DELETE",
  });
}

export async function assignItem(
  houseId: string,
  listId: string,
  itemId: string,
  assignedTo: string,
): Promise<void> {
  await apiRequest(`${itemBase(houseId, listId, itemId)}/assign`, {
    method: "POST",
    body: { assignedTo },
  });
}

export async function unassignItem(houseId: string, listId: string, itemId: string): Promise<void> {
  await apiRequest(`${itemBase(houseId, listId, itemId)}/assign`, { method: "DELETE" });
}

export async function assignItems(
  houseId: string,
  listId: string,
  itemIds: string[],
  assignedTo: string,
): Promise<AssignItemsResult> {
  const body = await apiRequest<{ result: AssignItemsResult }>(
    `${listBase(houseId, listId)}/items/assign`,
    { method: "POST", body: { itemIds, assignedTo } },
  );
  return body.result;
}

export async function claimItems(
  houseId: string,
  listId: string,
  itemIds: string[],
): Promise<AssignItemsResult> {
  const body = await apiRequest<{ result: AssignItemsResult }>(
    `${listBase(houseId, listId)}/items/claim`,
    { method: "POST", body: { itemIds } },
  );
  return body.result;
}

export async function respondToAssignment(
  houseId: string,
  listId: string,
  itemId: string,
  accept: boolean,
): Promise<void> {
  await apiRequest(`${itemBase(houseId, listId, itemId)}/respond`, {
    method: "POST",
    body: { accept },
  });
}

export async function markBought(
  houseId: string,
  listId: string,
  itemId: string,
  input: MarkBoughtInput,
): Promise<void> {
  await apiRequest(`${itemBase(houseId, listId, itemId)}/buy`, {
    method: "POST",
    body: input,
  });
}

export async function markItemsBought(
  houseId: string,
  listId: string,
  input: MarkItemsBoughtInput,
): Promise<MarkItemsBoughtResult> {
  const body = await apiRequest<{ result: MarkItemsBoughtResult }>(
    `${listBase(houseId, listId)}/items/buy`,
    { method: "POST", body: input },
  );
  return body.result;
}

export async function deleteItems(
  houseId: string,
  listId: string,
  itemIds: string[],
): Promise<DeleteItemsResult> {
  const body = await apiRequest<{ result: DeleteItemsResult }>(
    `${listBase(houseId, listId)}/items/delete`,
    { method: "POST", body: { itemIds } },
  );
  return body.result;
}

export async function deleteItem(houseId: string, listId: string, itemId: string): Promise<void> {
  await apiRequest(`${itemBase(houseId, listId, itemId)}/delete`, {
    method: "DELETE",
  });
}

export async function moveItem(
  houseId: string,
  listId: string,
  itemId: string,
  targetListId: string,
): Promise<void> {
  await apiRequest(`${itemBase(houseId, listId, itemId)}/move`, {
    method: "POST",
    body: { targetListId },
  });
}

export async function fetchCategories(houseId: string): Promise<GroceryCategory[]> {
  const body = await apiRequest<{ categories: GroceryCategory[] }>(`${base(houseId)}/categories`);
  return body.categories;
}

export async function addCategory(houseId: string, name: string): Promise<GroceryCategory> {
  const body = await apiRequest<{ category: GroceryCategory }>(`${base(houseId)}/categories`, {
    method: "POST",
    body: { name },
  });
  return body.category;
}

export async function fetchOverview(houseId: string): Promise<GroceryOverview> {
  const body = await apiRequest<{ overview: GroceryOverview }>(`${base(houseId)}/overview`);
  return body.overview;
}

export async function fetchPrivatePurchases(houseId: string): Promise<GroceryOverviewItem[]> {
  const body = await apiRequest<{ items: GroceryOverviewItem[] }>(
    `${base(houseId)}/private-purchases`,
  );
  return body.items;
}

export async function fetchRecentActivity(
  houseId: string,
  cursor: string | null,
): Promise<GroceryActivityPage> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  const body = await apiRequest<{ page: GroceryActivityPage }>(`${base(houseId)}/activity${query}`);
  return body.page;
}

export async function fetchItemActivity(
  houseId: string,
  listId: string,
  itemId: string,
): Promise<GroceryActivityEntry[]> {
  const body = await apiRequest<{ activity: GroceryActivityEntry[] }>(
    `${itemBase(houseId, listId, itemId)}/activity`,
  );
  return body.activity;
}
