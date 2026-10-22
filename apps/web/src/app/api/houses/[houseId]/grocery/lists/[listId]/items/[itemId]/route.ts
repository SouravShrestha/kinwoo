import {
  badRequest,
  handleGroceryRequest,
  readItemFields,
  readJsonObject,
} from "@/app/api/_lib/groceryRoute";

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

      const { name } = body;
      if (name !== undefined && typeof name !== "string") {
        return badRequest("name must be a string");
      }
      const fields = readItemFields(body);
      if (typeof fields === "string") return badRequest(fields);

      return service.updateItem(itemId, { name, ...fields });
    },
    { key: "item", uuids: [houseId, listId, itemId] },
  );
}
