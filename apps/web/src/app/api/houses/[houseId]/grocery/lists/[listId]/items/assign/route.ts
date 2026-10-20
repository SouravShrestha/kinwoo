import { MAX_BULK_ASSIGN } from "@kinwoo/core/grocery";

import {
  badRequest,
  handleGroceryRequest,
  isItemIdList,
  isUuid,
  readJsonObject,
} from "@/app/api/_lib/groceryRoute";

type Context = { params: Promise<{ houseId: string; listId: string }> };

export async function POST(request: Request, { params }: Context) {
  const { houseId, listId } = await params;

  return handleGroceryRequest(
    request,
    async ({ service }) => {
      const body = await readJsonObject(request);
      if (!body) return badRequest("Invalid JSON body");

      const { itemIds, assignedTo } = body;
      if (!isUuid(assignedTo)) return badRequest("assignedTo must be a user id");
      if (!isItemIdList(itemIds)) {
        return badRequest(`itemIds must be 1 to ${MAX_BULK_ASSIGN} item ids`);
      }

      return service.assignItems(listId, itemIds, assignedTo);
    },
    { key: "result", uuids: [houseId, listId] },
  );
}
