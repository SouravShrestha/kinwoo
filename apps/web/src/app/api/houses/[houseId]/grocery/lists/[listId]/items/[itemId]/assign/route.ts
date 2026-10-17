import {
  badRequest,
  handleGroceryRequest,
  readJsonObject,
} from "../../../../../../../../_lib/groceryRoute";

type Context = { params: Promise<{ houseId: string; listId: string; itemId: string }> };

export async function POST(request: Request, { params }: Context) {
  const { houseId, listId, itemId } = await params;

  return handleGroceryRequest(
    request,
    async ({ service }) => {
      const body = await readJsonObject(request);
      if (!body) return badRequest("Invalid JSON body");

      const { assignedTo } = body;
      if (typeof assignedTo !== "string" || !assignedTo) {
        return badRequest("assignedTo must be a string");
      }

      return service.assignItem(itemId, assignedTo);
    },
    { uuids: [houseId, listId, itemId] },
  );
}

export async function DELETE(request: Request, { params }: Context) {
  const { houseId, listId, itemId } = await params;
  return handleGroceryRequest(request, ({ service }) => service.unassignItem(itemId), {
    uuids: [houseId, listId, itemId],
  });
}
