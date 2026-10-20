import { MAX_BULK_ASSIGN } from "@kinwoo/core/grocery";

import {
  badRequest,
  handleGroceryRequest,
  isItemIdList,
  readJsonObject,
} from "@/app/api/_lib/groceryRoute";
import { readLinkedExpense } from "@/app/api/_lib/expenseRoute";

type Context = { params: Promise<{ houseId: string; listId: string }> };

function isOptionalString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === "string";
}

function isPriceList(value: unknown): value is (number | null)[] | undefined {
  return (
    value === undefined ||
    (Array.isArray(value) && value.every((price) => price === null || typeof price === "number"))
  );
}

export async function POST(request: Request, { params }: Context) {
  const { houseId, listId } = await params;

  return handleGroceryRequest(
    request,
    async ({ service }) => {
      const body = await readJsonObject(request);
      if (!body) return badRequest("Invalid JSON body");

      if (!isItemIdList(body.itemIds)) {
        return badRequest(`itemIds must be 1 to ${MAX_BULK_ASSIGN} item ids`);
      }
      if (typeof body.totalPaise !== "number") return badRequest("totalPaise must be a number");
      if (!isOptionalString(body.name)) return badRequest("name must be a string");
      if (!isOptionalString(body.store)) return badRequest("store must be a string");
      if (!isPriceList(body.itemPricesPaise)) {
        return badRequest("itemPricesPaise must be a list of numbers or nulls");
      }

      const expense = readLinkedExpense(body.expense);
      if (expense === "invalid") return badRequest("expense must list payers and shares");
      return service.markItemsBought(listId, {
        itemIds: body.itemIds,
        totalPaise: body.totalPaise,
        name: body.name,
        store: body.store,
        itemPricesPaise: body.itemPricesPaise,
        expense,
      });
    },
    { key: "result", uuids: [houseId, listId] },
  );
}
