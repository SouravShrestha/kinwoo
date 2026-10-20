import { badRequest, handleGroceryRequest, readJsonObject } from "@/app/api/_lib/groceryRoute";

type Context = { params: Promise<{ houseId: string; listId: string; itemId: string }> };

export async function POST(request: Request, { params }: Context) {
  const { houseId, listId, itemId } = await params;

  return handleGroceryRequest(
    request,
    async ({ service }) => {
      const body = await readJsonObject(request);
      if (!body) return badRequest("Invalid JSON body");

      const { targetListId } = body;
      if (typeof targetListId !== "string" || !targetListId) {
        return badRequest("targetListId must be a string");
      }

      return service.moveItem(itemId, targetListId);
    },
    { uuids: [houseId, listId, itemId] },
  );
}
