import {
  batchNameErrorMessage,
  encodeActivityCursor,
  groceryErrorMessage,
  isPaiseAmount,
  ITEM_STORE_MAX_LENGTH,
  itemNameErrorMessage,
  listNameErrorMessage,
  MAX_BULK_ASSIGN,
  MIN_BATCH_ITEMS,
  validateBatchName,
  validateItemName,
  validateListName,
  type ActivityCursor,
  type AssignItemsResult,
  type GroceryActivityPage,
  type MarkItemsBoughtResult,
} from "@kinwoo/core/grocery";

import {
  GroceryRepositoryError,
  type ActivityEntry,
  type AddItemInput,
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
import type { GroceryResult, GroceryServiceErrorCode, IGroceryService } from "./IGroceryService";

function ok<T>(data: T): GroceryResult<T> {
  return { ok: true, data };
}

function failure(code: GroceryServiceErrorCode, message?: string): GroceryResult<never> {
  return { ok: false, code, message: message ?? groceryErrorMessage(code) };
}

function invalidInput(message: string): GroceryResult<never> {
  return failure("INVALID_INPUT", message);
}

function fromError(cause: unknown): GroceryResult<never> {
  if (cause instanceof GroceryRepositoryError && cause.code) return failure(cause.code);
  return failure("UNAVAILABLE", "Something went wrong. Please try again.");
}

export class GroceryService implements IGroceryService {
  constructor(private readonly repository: IGroceryRepository) {}

  async listLists(houseId: string): Promise<GroceryResult<GroceryList[]>> {
    return this.run(() => this.repository.listLists(houseId));
  }

  async getList(listId: string): Promise<GroceryResult<GroceryList>> {
    try {
      const list = await this.repository.findList(listId);
      return list ? ok(list) : failure("NOT_FOUND");
    } catch (cause) {
      return fromError(cause);
    }
  }

  async createList(houseId: string, input: CreateListInput): Promise<GroceryResult<GroceryList>> {
    const name = validateListName(input.name);
    if (!name.ok) return invalidInput(listNameErrorMessage(name.error));

    return this.run(() =>
      this.repository.createList(houseId, {
        ...input,
        name: name.value,
      }),
    );
  }

  async updateList(listId: string, input: UpdateListInput): Promise<GroceryResult<GroceryList>> {
    let update = input;
    if (input.name !== undefined) {
      const name = validateListName(input.name);
      if (!name.ok) return invalidInput(listNameErrorMessage(name.error));
      update = { ...input, name: name.value };
    }

    return this.run(() => this.repository.updateList(listId, update));
  }

  async deleteList(listId: string): Promise<GroceryResult<null>> {
    return this.run(async () => {
      await this.repository.deleteList(listId);
      return null;
    });
  }

  async listItems(listId: string): Promise<GroceryResult<GroceryItem[]>> {
    return this.run(() => this.repository.listItems(listId));
  }

  async getItem(itemId: string): Promise<GroceryResult<GroceryItem>> {
    try {
      const item = await this.repository.findItem(itemId);
      return item ? ok(item) : failure("NOT_FOUND");
    } catch (cause) {
      return fromError(cause);
    }
  }

  async addItem(input: AddItemInput): Promise<GroceryResult<GroceryItem>> {
    const name = validateItemName(input.name);
    if (!name.ok) return invalidInput(itemNameErrorMessage(name.error));

    return this.run(() =>
      this.repository.addItem({
        ...input,
        name: name.value,
      }),
    );
  }

  async updateItem(itemId: string, input: UpdateItemInput): Promise<GroceryResult<GroceryItem>> {
    let update = input;
    if (input.name !== undefined) {
      const name = validateItemName(input.name);
      if (!name.ok) return invalidInput(itemNameErrorMessage(name.error));
      update = { ...input, name: name.value };
    }

    return this.run(() => this.repository.updateItem(itemId, update));
  }

  async deleteItem(itemId: string): Promise<GroceryResult<null>> {
    return this.run(async () => {
      await this.repository.deleteItem(itemId);
      return null;
    });
  }

  async claimItem(itemId: string): Promise<GroceryResult<ClaimResult>> {
    return this.run(() => this.repository.claimItem(itemId));
  }

  async unclaimItem(itemId: string): Promise<GroceryResult<null>> {
    return this.run(async () => {
      await this.repository.unclaimItem(itemId);
      return null;
    });
  }

  async assignItem(itemId: string, assignedTo: string): Promise<GroceryResult<null>> {
    return this.run(async () => {
      await this.repository.assignItem(itemId, assignedTo);
      return null;
    });
  }

  async unassignItem(itemId: string): Promise<GroceryResult<null>> {
    return this.run(async () => {
      await this.repository.unassignItem(itemId);
      return null;
    });
  }

  async assignItems(
    listId: string,
    itemIds: string[],
    assignedTo: string,
  ): Promise<GroceryResult<AssignItemsResult>> {
    return this.runBulk(itemIds, (unique) =>
      this.repository.assignItems(listId, unique, assignedTo),
    );
  }

  async claimItems(listId: string, itemIds: string[]): Promise<GroceryResult<AssignItemsResult>> {
    return this.runBulk(itemIds, (unique) => this.repository.claimItems(listId, unique));
  }

  private async runBulk(
    itemIds: string[],
    action: (unique: string[]) => Promise<number>,
  ): Promise<GroceryResult<AssignItemsResult>> {
    const unique = [...new Set(itemIds)];
    if (unique.length === 0) return invalidInput("Choose at least one item.");
    if (unique.length > MAX_BULK_ASSIGN) {
      return invalidInput(`Assign up to ${MAX_BULK_ASSIGN} items at a time.`);
    }

    return this.run(async () => ({ assigned: await action(unique), requested: unique.length }));
  }

  async respondToAssignment(itemId: string, accept: boolean): Promise<GroceryResult<null>> {
    return this.run(async () => {
      await this.repository.respondToAssignment(itemId, accept);
      return null;
    });
  }

  async markBought(itemId: string, input: MarkBoughtInput): Promise<GroceryResult<null>> {
    return this.run(async () => {
      await this.repository.markBought(itemId, input);
      return null;
    });
  }

  async markItemsBought(
    listId: string,
    input: MarkItemsBoughtInput,
  ): Promise<GroceryResult<MarkItemsBoughtResult>> {
    const prices = input.itemPricesPaise;
    if (prices && prices.length !== input.itemIds.length) {
      return invalidInput("Give one amount per item.");
    }
    if (prices?.some((price) => price !== null && !isPaiseAmount(price))) {
      return invalidInput("Item amounts must be zero or more.");
    }

    const itemIds: string[] = [];
    const itemPrices: (number | null)[] = [];
    input.itemIds.forEach((id, index) => {
      if (itemIds.includes(id)) return;
      itemIds.push(id);
      itemPrices.push(prices?.[index] ?? null);
    });

    if (itemIds.length < MIN_BATCH_ITEMS) {
      return invalidInput(`Choose at least ${MIN_BATCH_ITEMS} items.`);
    }
    if (itemIds.length > MAX_BULK_ASSIGN) {
      return invalidInput(`Buy up to ${MAX_BULK_ASSIGN} items at a time.`);
    }
    if (!isPaiseAmount(input.totalPaise)) {
      return invalidInput("Enter the total you paid.");
    }

    const name = validateBatchName(input.name);
    if (!name.ok) return invalidInput(batchNameErrorMessage(name.error));

    const store = input.store?.trim() || null;
    if (store && store.length > ITEM_STORE_MAX_LENGTH) {
      return invalidInput(`Use ${ITEM_STORE_MAX_LENGTH} characters or fewer for the store.`);
    }

    return this.run(async () => ({
      batchId: await this.repository.markItemsBought(listId, {
        itemIds,
        totalPaise: input.totalPaise,
        name: name.value,
        store,
        itemPricesPaise: itemPrices.some((price) => price !== null) ? itemPrices : undefined,
      }),
    }));
  }

  async moveItem(itemId: string, targetListId: string): Promise<GroceryResult<null>> {
    return this.run(async () => {
      await this.repository.moveItem(itemId, targetListId);
      return null;
    });
  }

  async listCategories(houseId: string): Promise<GroceryResult<GroceryCategory[]>> {
    return this.run(() => this.repository.listCategories(houseId));
  }

  async addCategory(houseId: string, name: string): Promise<GroceryResult<GroceryCategory>> {
    return this.run(() => this.repository.addCategory(houseId, name));
  }

  async getOverview(houseId: string, userId: string): Promise<GroceryResult<GroceryOverview>> {
    return this.run(() => this.repository.getOverview(houseId, userId));
  }

  async getRecentActivity(
    houseId: string,
    limit: number,
    before: ActivityCursor | null,
  ): Promise<GroceryResult<GroceryActivityPage>> {
    return this.run(async () => {
      // One extra row tells us whether another page exists without a count query.
      const rows = await this.repository.listRecentActivity(houseId, limit + 1, before);
      const entries = rows.slice(0, limit);
      const last = entries[entries.length - 1];
      return {
        entries,
        nextCursor: rows.length > limit && last ? encodeActivityCursor(last) : null,
      };
    });
  }

  async getItemActivity(houseId: string, itemId: string): Promise<GroceryResult<ActivityEntry[]>> {
    return this.run(() => this.repository.listItemActivity(houseId, itemId));
  }

  private async run<T>(action: () => Promise<T>): Promise<GroceryResult<T>> {
    try {
      return ok(await action());
    } catch (cause) {
      return fromError(cause);
    }
  }
}
