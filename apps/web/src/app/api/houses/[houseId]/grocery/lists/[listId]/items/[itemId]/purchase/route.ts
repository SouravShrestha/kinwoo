import { badRequest, handleGroceryRequest, readJsonObject } from "@/app/api/_lib/groceryRoute";
import { isOptional } from "@/app/api/_lib/route";

type Context = { params: Promise<{ houseId: string; listId: string; itemId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const { houseId, listId, itemId } = await params;
  return handleGroceryRequest(
    request,
    async ({ service }) => {
      const body = await readJsonObject(request);
      if (!body) return badRequest("Invalid JSON body");
      const { pricePaise, store, boughtAt } = body;
      if (!isOptional(pricePaise, "number")) return badRequest("pricePaise must be a number");
      if (!isOptional(store, "string")) return badRequest("store must be a string");
      if (typeof boughtAt !== "string" || Number.isNaN(Date.parse(boughtAt))) {
        return badRequest("boughtAt must be an ISO date string");
      }
      return service.updatePrivatePurchase(itemId, {
        pricePaise: pricePaise ?? null,
        store: store ?? null,
        boughtAt,
      });
    },
    { uuids: [houseId, listId, itemId] },
  );
}
