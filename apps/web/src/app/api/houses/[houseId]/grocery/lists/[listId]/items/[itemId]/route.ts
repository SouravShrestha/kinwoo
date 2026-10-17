import { ITEM_URGENCIES, isItemUrgency } from "@kinwoo/core/grocery";

import {
  badRequest,
  handleGroceryRequest,
  readJsonObject,
} from "../../../../../../../_lib/groceryRoute";

type Context = { params: Promise<{ houseId: string; listId: string; itemId: string }> };

export async function GET(request: Request, { params }: Context) {
  const { houseId, listId, itemId } = await params;

  return handleGroceryRequest(request, ({ service }) => service.getItem(itemId), {
    key: "item",
    uuids: [houseId, listId, itemId],
  });
}

export async function PATCH(request: Request, { params }: Context) {
  const { houseId, listId, itemId } = await params;

  return handleGroceryRequest(
    request,
    async ({ service }) => {
      const body = await readJsonObject(request);
      if (!body) return badRequest("Invalid JSON body");

      const { name, quantity, unit, categoryId, urgency, note } = body;
      if (name !== undefined && typeof name !== "string") {
        return badRequest("name must be a string");
      }
      if (quantity !== undefined && quantity !== null && typeof quantity !== "number") {
        return badRequest("quantity must be a number");
      }
      if (unit !== undefined && unit !== null && typeof unit !== "string") {
        return badRequest("unit must be a string");
      }
      if (categoryId !== undefined && categoryId !== null && typeof categoryId !== "string") {
        return badRequest("categoryId must be a string");
      }
      if (urgency !== undefined && !isItemUrgency(urgency)) {
        return badRequest(`urgency must be one of: ${ITEM_URGENCIES.join(", ")}`);
      }
      if (note !== undefined && note !== null && typeof note !== "string") {
        return badRequest("note must be a string");
      }

      return service.updateItem(itemId, {
        name,
        quantity,
        unit,
        categoryId,
        urgency,
        note,
      });
    },
    { key: "item", uuids: [houseId, listId, itemId] },
  );
}
