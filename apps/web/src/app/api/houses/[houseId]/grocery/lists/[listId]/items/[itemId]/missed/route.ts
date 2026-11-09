import { badRequest, handleGroceryRequest, readJsonObject } from "@/app/api/_lib/groceryRoute";

type Context = { params: Promise<{ houseId: string; listId: string; itemId: string }> };

const MAX_REASON = 80;

export async function POST(request: Request, { params }: Context) {
  const { houseId, listId, itemId } = await params;

  return handleGroceryRequest(
    request,
    async ({ service }) => {
      const body = await readJsonObject(request);
      if (!body) return badRequest("Invalid JSON body");

      const { reason } = body;
      if (reason != null && (typeof reason !== "string" || reason.length > MAX_REASON)) {
        return badRequest(`reason must be a string of at most ${MAX_REASON} characters`);
      }

      return service.markMissed(itemId, reason ?? null);
    },
    { uuids: [houseId, listId, itemId] },
  );
}
