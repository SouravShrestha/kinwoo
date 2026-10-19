import {
  badRequest,
  handleGroceryRequest,
  readJsonObject,
} from "../../../../../../../../_lib/groceryRoute";
import { readLinkedExpense } from "../../../../../../../../_lib/expenseRoute";

type Context = { params: Promise<{ houseId: string; listId: string; itemId: string }> };

export async function POST(request: Request, { params }: Context) {
  const { houseId, listId, itemId } = await params;

  return handleGroceryRequest(
    request,
    async ({ service }) => {
      const body = await readJsonObject(request);
      if (!body) return badRequest("Invalid JSON body");

      const { quantity, unit, pricePaise, store, boughtAt } = body;
      if (quantity !== undefined && quantity !== null && typeof quantity !== "number") {
        return badRequest("quantity must be a number");
      }
      if (unit !== undefined && unit !== null && typeof unit !== "string") {
        return badRequest("unit must be a string");
      }
      if (pricePaise !== undefined && pricePaise !== null && typeof pricePaise !== "number") {
        return badRequest("pricePaise must be a number");
      }
      if (store !== undefined && store !== null && typeof store !== "string") {
        return badRequest("store must be a string");
      }

      if (
        boughtAt !== undefined &&
        boughtAt !== null &&
        (typeof boughtAt !== "string" || Number.isNaN(Date.parse(boughtAt)))
      ) {
        return badRequest("boughtAt must be an ISO date string");
      }

      const expense = readLinkedExpense(body.expense);
      if (expense === "invalid") return badRequest("expense must list payers and shares");
      return service.markBought(itemId, { quantity, unit, pricePaise, store, boughtAt, expense });
    },
    { uuids: [houseId, listId, itemId] },
  );
}
