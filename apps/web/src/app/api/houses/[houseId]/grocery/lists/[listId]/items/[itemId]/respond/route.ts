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

      const { accept } = body;
      if (typeof accept !== "boolean") {
        return badRequest("accept must be a boolean");
      }

      return service.respondToAssignment(itemId, accept);
    },
    { uuids: [houseId, listId, itemId] },
  );
}
