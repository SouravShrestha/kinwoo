import { MAX_BULK_ASSIGN } from "@kinwoo/core/grocery";

import {
  badRequest,
  handleGroceryRequest,
  isItemIdList,
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

      if (!isItemIdList(body.itemIds)) {
        return badRequest(`itemIds must be 1 to ${MAX_BULK_ASSIGN} item ids`);
      }

      return service.deleteItems(listId, body.itemIds);
    },
    { key: "result", uuids: [houseId, listId] },
  );
}
