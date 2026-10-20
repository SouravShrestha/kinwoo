import type { Database } from "@kinwoo/core/db";
import type { LinkedExpenseInput } from "@kinwoo/core/expenses";
import {
  parseGroceryRpcError,
  type ActivityCursor,
  type GroceryOverviewItem,
} from "@kinwoo/core/grocery";
import type { SupabaseClient } from "@supabase/supabase-js";

import { toRpcParts } from "../expenses/ExpensesRepository";
import {
  GroceryRepositoryError,
  type ActivityEntry,
  type AddItemInput,
  type BoughtItemsPage,
  type ClaimResult,
  type CreateListInput,
  type GroceryCategory,
  type GroceryItem,
  type GroceryList,
  type GroceryOverview,
  type IGroceryRepository,
  type MarkBoughtInput,
  type MarkItemsBoughtInput,
  type UpdateItemInput,
  type UpdateListInput,
} from "./IGroceryRepository";

const LIST_COLUMNS =
  "id, house_id, name, icon, position, visibility, is_default, deleted_at, created_by, created_at, updated_at";
const PURCHASE_COLUMNS =
  "grocery_purchases(bought_by, bought_at, price_paise, store, batch_id, batch_position, bought_profiles:profiles!bought_by(display_name), expenses(id), grocery_purchase_batches(id, name, total_paise, expenses(id)))";
const ITEM_COLUMNS = `*, grocery_categories!left(name), claimed_profiles:profiles!claimed_by(display_name), assigned_profiles:profiles!assigned_to(display_name), ${PURCHASE_COLUMNS}`;
const OVERVIEW_ITEM_COLUMNS = `*, grocery_lists!inner(id, name, icon, house_id, deleted_at), grocery_categories!left(name), claimed_profiles:profiles!claimed_by(display_name), assigned_profiles:profiles!assigned_to(display_name), ${PURCHASE_COLUMNS}`;
const PRIVATE_PURCHASE_COLUMNS = `*, grocery_lists!inner(id, name, icon, house_id, deleted_at, visibility, created_by), grocery_categories!left(name), ${PURCHASE_COLUMNS}`;
const ACTIVITY_COLUMNS =
  "id, actor_id, type, entity_type, entity_id, payload, created_at, profiles!activity_log_actor_id_fkey(display_name)";

function toList(row: any): GroceryList {
  return {
    id: row.id,
    houseId: row.house_id ?? row.houseId,
    name: row.name,
    icon: row.icon,
    position: row.position,
    visibility: row.visibility,
    isDefault: row.is_default ?? row.isDefault ?? false,
    deletedAt: row.deleted_at ?? row.deletedAt ?? null,
    createdBy: row.created_by ?? row.createdBy,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  };
}

function toItem(row: any): GroceryItem {
  const category = Array.isArray(row.grocery_categories)
    ? row.grocery_categories[0]
    : row.grocery_categories;
  const claimed = Array.isArray(row.claimed_profiles)
    ? row.claimed_profiles[0]
    : (row.claimed_profiles ?? row.claimed_profile);
  const assigned = Array.isArray(row.assigned_profiles)
    ? row.assigned_profiles[0]
    : (row.assigned_profiles ?? row.assigned_profile);
  const purchases: any[] = Array.isArray(row.grocery_purchases) ? row.grocery_purchases : [];
  const purchase = purchases.reduce<any>(
    (latest, next) => (!latest || next.bought_at > latest.bought_at ? next : latest),
    null,
  );
  const buyer = Array.isArray(purchase?.bought_profiles)
    ? purchase.bought_profiles[0]
    : purchase?.bought_profiles;
  const batch = Array.isArray(purchase?.grocery_purchase_batches)
    ? purchase.grocery_purchase_batches[0]
    : purchase?.grocery_purchase_batches;
  const expenseId =
    [purchase?.expenses, batch?.expenses].flat().find((expense) => expense?.id)?.id ?? null;

  return {
    id: row.id,
    listId: row.list_id ?? row.listId,
    name: row.name,
    quantity: row.quantity ?? null,
    unit: row.unit ?? null,
    categoryId: row.category_id ?? row.categoryId ?? null,
    categoryName: row.category_name ?? row.categoryName ?? category?.name ?? null,
    urgency: row.urgency ?? "whenever",
    status: row.status ?? "pending",
    claimedBy: row.claimed_by ?? row.claimedBy ?? null,
    claimedByName: row.claimed_by_name ?? row.claimedByName ?? claimed?.display_name ?? null,
    assignedTo: row.assigned_to ?? row.assignedTo ?? null,
    assignedToName: row.assigned_to_name ?? row.assignedToName ?? assigned?.display_name ?? null,
    assignedBy: row.assigned_by ?? row.assignedBy ?? null,
    assignmentResponse: row.assignment_response ?? row.assignmentResponse ?? null,
    boughtBy: row.bought_by ?? row.boughtBy ?? purchase?.bought_by ?? null,
    boughtByName: row.bought_by_name ?? row.boughtByName ?? buyer?.display_name ?? null,
    purchase: purchase
      ? {
          pricePaise: purchase.price_paise ?? null,
          store: purchase.store ?? null,
          boughtAt: purchase.bought_at,
          batch: batch
            ? {
                id: batch.id,
                name: batch.name ?? null,
                totalPaise: batch.total_paise,
                position: purchase.batch_position ?? 0,
              }
            : null,
          expenseId,
        }
      : null,
    note: row.note ?? null,
    position: row.position ?? 0,
    createdBy: row.created_by ?? row.createdBy,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  };
}

function toOverviewItem(row: any): GroceryOverviewItem {
  const item = toItem(row);
  const list = Array.isArray(row.grocery_lists) ? row.grocery_lists[0] : row.grocery_lists;
  return {
    ...item,
    listName: list?.name ?? "Groceries",
    listIcon: list?.icon ?? "🛒",
  };
}

function toCategory(row: any): GroceryCategory {
  return {
    id: row.id,
    houseId: row.house_id ?? row.houseId ?? null,
    name: row.name,
    position: row.position ?? 0,
  };
}

function toClaimResult(data: any): ClaimResult {
  if (data && typeof data === "object") {
    if (data.claimed === true) {
      return { claimed: true };
    }
    return {
      claimed: false,
      claimedByName: data.claimed_by_name ?? data.claimedByName ?? null,
    };
  }
  return { claimed: false, claimedByName: null };
}

function toActivityEntry(row: any): ActivityEntry {
  const profile = row.profiles as { display_name: string | null } | null;
  return {
    id: row.id,
    actorId: row.actor_id,
    actorName: profile?.display_name ?? null,
    type: row.type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    payload: (row.payload ?? {}) as Record<string, unknown>,
    createdAt: row.created_at,
  };
}

function linkedExpenseArg(expense: LinkedExpenseInput | null | undefined) {
  return expense ? { ...toRpcParts(expense), spent_on: expense.spentOn } : null;
}

function fail(error: { message: string }): never {
  throw new GroceryRepositoryError(error.message, parseGroceryRpcError(error.message));
}

export class GroceryRepository implements IGroceryRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async listLists(houseId: string): Promise<GroceryList[]> {
    const { data, error } = await (this.client.from("grocery_lists" as any) as any)
      .select(LIST_COLUMNS)
      .eq("house_id", houseId)
      .is("deleted_at", null)
      .order("position");

    if (error) fail(error);
    return (data ?? []).map(toList);
  }

  async findList(listId: string): Promise<GroceryList | null> {
    const { data, error } = await (this.client.from("grocery_lists" as any) as any)
      .select(LIST_COLUMNS)
      .eq("id", listId)
      .maybeSingle();

    if (error) fail(error);
    return data ? toList(data) : null;
  }

  async createList(houseId: string, input: CreateListInput): Promise<GroceryList> {
    const { data, error } = await (this.client.rpc as any)("create_grocery_list", {
      p_house_id: houseId,
      p_name: input.name,
      p_icon: input.icon ?? "🛒",
      p_visibility: input.visibility ?? "shared",
    });

    if (error) fail(error);
    return toList(data);
  }

  async updateList(listId: string, input: UpdateListInput): Promise<GroceryList> {
    const { data, error } = await (this.client.rpc as any)("update_grocery_list", {
      p_list_id: listId,
      p_name: input.name ?? null,
      p_icon: input.icon ?? null,
      p_visibility: input.visibility ?? null,
      p_position: input.position ?? null,
      p_is_default: input.isDefault ?? null,
    });

    if (error) fail(error);
    return toList(data);
  }

  async deleteList(listId: string): Promise<void> {
    const { error } = await (this.client.rpc as any)("delete_grocery_list", {
      p_list_id: listId,
    });

    if (error) fail(error);
  }

  async deleteItem(itemId: string): Promise<void> {
    const { error } = await (this.client.rpc as any)("delete_grocery_item", {
      p_item_id: itemId,
    });

    if (error) fail(error);
  }

  async listItems(listId: string, options?: { boughtSince?: string }): Promise<GroceryItem[]> {
    const items = () =>
      (this.client.from("grocery_items" as any) as any)
        .select(ITEM_COLUMNS)
        .eq("list_id", listId)
        .order("position");

    if (!options?.boughtSince) {
      const { data, error } = await items();
      if (error) fail(error);
      return (data ?? []).map(toItem);
    }

    // The second embed of grocery_purchases only filters: it keeps bought items with a purchase
    // since the cutoff, while the full purchase history still comes from ITEM_COLUMNS.
    const [open, bought] = await Promise.all([
      items().neq("status", "bought"),
      (this.client.from("grocery_items" as any) as any)
        .select(`${ITEM_COLUMNS}, recent_purchase:grocery_purchases!inner(bought_at)`)
        .eq("list_id", listId)
        .eq("status", "bought")
        .gte("recent_purchase.bought_at", options.boughtSince)
        .order("position"),
    ]);
    if (open.error) fail(open.error);
    if (bought.error) fail(bought.error);

    return [...(open.data ?? []), ...(bought.data ?? [])]
      .map(toItem)
      .sort((a, b) => a.position - b.position);
  }

  async listBoughtItems(listId: string, before: string, limit: number): Promise<BoughtItemsPage> {
    const { data: page, error } = await this.client.rpc("bought_item_page", {
      p_list_id: listId,
      p_before: before,
      p_limit: limit,
    });
    if (error) fail(error);

    const rows = page ?? [];
    if (rows.length === 0) return { items: [], nextCursor: null };

    const { data, error: itemsError } = await (this.client.from("grocery_items" as any) as any)
      .select(ITEM_COLUMNS)
      .in(
        "id",
        rows.map((row) => row.item_id),
      );
    if (itemsError) fail(itemsError);

    const order = new Map(rows.map((row, index) => [row.item_id, index]));
    const items = (data ?? [])
      .map(toItem)
      .sort((a: GroceryItem, b: GroceryItem) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

    return {
      items,
      // Fewer rows than asked for means the history ends here.
      nextCursor: rows.length >= limit ? rows[rows.length - 1].bought_at : null,
    };
  }

  async findItem(itemId: string): Promise<GroceryItem | null> {
    const { data, error } = await (this.client.from("grocery_items" as any) as any)
      .select(ITEM_COLUMNS)
      .eq("id", itemId)
      .maybeSingle();

    if (error) fail(error);
    return data ? toItem(data) : null;
  }

  async addItem(input: AddItemInput): Promise<GroceryItem> {
    const { data, error } = await (this.client.rpc as any)("add_grocery_item", {
      p_list_id: input.listId,
      p_name: input.name,
      p_quantity: input.quantity ?? null,
      p_unit: input.unit ?? null,
      p_category_id: input.categoryId ?? null,
      p_urgency: input.urgency ?? "whenever",
      p_note: input.note ?? null,
      p_idempotency_key: input.idempotencyKey,
    });

    if (error) fail(error);
    return toItem(data);
  }

  async updateItem(itemId: string, input: UpdateItemInput): Promise<GroceryItem> {
    const { data, error } = await (this.client.rpc as any)("update_grocery_item", {
      p_item_id: itemId,
      p_name: input.name ?? null,
      p_quantity: input.quantity ?? null,
      p_unit: input.unit ?? null,
      p_category_id: input.categoryId ?? null,
      p_urgency: input.urgency ?? null,
      p_note: input.note ?? null,
    });

    if (error) fail(error);
    return toItem(data);
  }

  async claimItem(itemId: string): Promise<ClaimResult> {
    const { data, error } = await (this.client.rpc as any)("claim_grocery_item", {
      p_item_id: itemId,
    });

    if (error) fail(error);
    return toClaimResult(data);
  }

  async unclaimItem(itemId: string): Promise<void> {
    const { error } = await (this.client.rpc as any)("unclaim_grocery_item", {
      p_item_id: itemId,
    });

    if (error) fail(error);
  }

  async assignItem(itemId: string, assignedTo: string): Promise<void> {
    const { error } = await (this.client.rpc as any)("assign_grocery_item", {
      p_item_id: itemId,
      p_assigned_to: assignedTo,
    });

    if (error) fail(error);
  }

  async unassignItem(itemId: string): Promise<void> {
    const { error } = await (this.client.rpc as any)("unassign_grocery_item", {
      p_item_id: itemId,
    });
    if (error) fail(error);
  }

  async assignItems(listId: string, itemIds: string[], assignedTo: string): Promise<number> {
    const { data, error } = await (this.client.rpc as any)("assign_grocery_items", {
      p_list_id: listId,
      p_item_ids: itemIds,
      p_assigned_to: assignedTo,
    });

    if (error) fail(error);
    return typeof data === "number" ? data : 0;
  }

  async deleteItems(listId: string, itemIds: string[]): Promise<number> {
    const { data, error } = await this.client.rpc("delete_grocery_items", {
      p_list_id: listId,
      p_item_ids: itemIds,
    });

    if (error) fail(error);
    return typeof data === "number" ? data : 0;
  }

  async claimItems(listId: string, itemIds: string[]): Promise<number> {
    const { data, error } = await (this.client.rpc as any)("claim_grocery_items", {
      p_list_id: listId,
      p_item_ids: itemIds,
    });

    if (error) fail(error);
    return typeof data === "number" ? data : 0;
  }

  async respondToAssignment(itemId: string, accept: boolean): Promise<void> {
    const { error } = await (this.client.rpc as any)("respond_to_assignment", {
      p_item_id: itemId,
      p_accept: accept,
    });

    if (error) fail(error);
  }

  async markBought(itemId: string, input: MarkBoughtInput): Promise<void> {
    const { error } = await (this.client.rpc as any)("mark_item_bought", {
      p_item_id: itemId,
      p_quantity: input.quantity ?? null,
      p_unit: input.unit ?? null,
      p_price_paise: input.pricePaise ?? null,
      p_store: input.store ?? null,
      p_bought_at: input.boughtAt ?? null,
      p_expense: linkedExpenseArg(input.expense),
    });

    if (error) fail(error);
  }

  async markItemsBought(listId: string, input: MarkItemsBoughtInput): Promise<string> {
    const { data, error } = await (this.client.rpc as any)("mark_items_bought", {
      p_list_id: listId,
      p_item_ids: input.itemIds,
      p_total_paise: input.totalPaise,
      p_name: input.name ?? null,
      p_store: input.store ?? null,
      p_item_prices: input.itemPricesPaise ?? null,
      p_expense: linkedExpenseArg(input.expense),
    });

    if (error) fail(error);
    return data as string;
  }

  async moveItem(itemId: string, targetListId: string): Promise<void> {
    const { error } = await (this.client.rpc as any)("move_grocery_item", {
      p_item_id: itemId,
      p_target_list_id: targetListId,
    });

    if (error) fail(error);
  }

  async listCategories(houseId: string): Promise<GroceryCategory[]> {
    const { data, error } = await (this.client.from("grocery_categories" as any) as any)
      .select("id, house_id, name, position")
      .or(`house_id.is.null,house_id.eq.${houseId}`)
      .order("position");

    if (error) fail(error);
    return (data ?? []).map(toCategory);
  }

  async addCategory(houseId: string, name: string): Promise<GroceryCategory> {
    const { data, error } = await (this.client.rpc as any)("add_grocery_category", {
      p_house_id: houseId,
      p_name: name,
    });

    if (error) fail(error);
    return toCategory(data);
  }

  async listRecentActivity(
    houseId: string,
    limit: number,
    before: ActivityCursor | null,
  ): Promise<ActivityEntry[]> {
    let query = this.client.from("activity_log").select(ACTIVITY_COLUMNS).eq("house_id", houseId);

    // id breaks ties so rows sharing a timestamp are neither skipped nor repeated across pages.
    if (before) {
      query = query.or(
        `created_at.lt.${before.createdAt},and(created_at.eq.${before.createdAt},id.lt.${before.id})`,
      );
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit);

    if (error) fail(error);

    return (data ?? []).map(toActivityEntry);
  }

  async listItemActivity(houseId: string, itemId: string): Promise<ActivityEntry[]> {
    const [own, batches] = await Promise.all([
      this.client
        .from("activity_log")
        .select(ACTIVITY_COLUMNS)
        .eq("house_id", houseId)
        .eq("entity_type", "grocery_item")
        .eq("entity_id", itemId),
      // Batch buys log once per batch, so find the entries whose payload names this item.
      this.client
        .from("activity_log")
        .select(ACTIVITY_COLUMNS)
        .eq("house_id", houseId)
        .eq("type", "grocery_batch.bought")
        .contains("payload", { item_ids: [itemId] }),
    ]);

    if (own.error) fail(own.error);
    if (batches.error) fail(batches.error);

    return [...(own.data ?? []), ...(batches.data ?? [])]
      .map(toActivityEntry)
      .sort(
        (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id),
      );
  }

  async getOverview(houseId: string, userId: string): Promise<GroceryOverview> {
    // Filtering on grocery_items.house_id uses its index; the embedded list still excludes
    // deleted lists.
    const [today, mine] = await Promise.all([
      (this.client.from("grocery_items" as any) as any)
        .select(OVERVIEW_ITEM_COLUMNS)
        .eq("house_id", houseId)
        .is("grocery_lists.deleted_at", null)
        .eq("urgency", "today")
        .in("status", ["pending", "claimed", "assigned"])
        .order("created_at", { ascending: false }),
      (this.client.from("grocery_items" as any) as any)
        .select(OVERVIEW_ITEM_COLUMNS)
        .eq("house_id", houseId)
        .is("grocery_lists.deleted_at", null)
        .in("status", ["claimed", "assigned"])
        .or(`claimed_by.eq.${userId},assigned_to.eq.${userId}`)
        .order("created_at", { ascending: false }),
    ]);

    if (today.error) fail(today.error);
    if (mine.error) fail(mine.error);

    return {
      todayItems: (today.data ?? []).map(toOverviewItem),
      myToBuy: (mine.data ?? []).map(toOverviewItem),
    };
  }

  // RLS already hides other people's private lists; the creator filter keeps this to the caller's
  // own lists even for an admin.
  async listPrivatePurchases(houseId: string, userId: string): Promise<GroceryOverviewItem[]> {
    const { data, error } = await (this.client.from("grocery_items" as any) as any)
      .select(PRIVATE_PURCHASE_COLUMNS)
      .eq("house_id", houseId)
      .is("grocery_lists.deleted_at", null)
      .eq("grocery_lists.visibility", "private")
      .eq("grocery_lists.created_by", userId)
      .eq("status", "bought")
      .order("updated_at", { ascending: false });

    if (error) fail(error);

    return (data ?? []).map(toOverviewItem);
  }
}
