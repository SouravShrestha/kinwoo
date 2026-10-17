import { badRequest, handleGroceryRequest, readJsonObject } from "../../../../../_lib/groceryRoute";

type Context = { params: Promise<{ houseId: string; listId: string }> };

export async function GET(request: Request, { params }: Context) {
  const { houseId, listId } = await params;

  return handleGroceryRequest(request, ({ service }) => service.getList(listId), {
    key: "list",
    uuids: [houseId, listId],
  });
}

export async function PATCH(request: Request, { params }: Context) {
  const { houseId, listId } = await params;

  return handleGroceryRequest(
    request,
    async ({ service }) => {
      const body = await readJsonObject(request);
      if (!body) return badRequest("Invalid JSON body");

      const { name, icon, visibility, position, isDefault } = body;
      if (name !== undefined && typeof name !== "string") {
        return badRequest("name must be a string");
      }
      if (icon !== undefined && typeof icon !== "string") {
        return badRequest("icon must be a string");
      }
      if (visibility !== undefined && visibility !== "shared" && visibility !== "private") {
        return badRequest("visibility must be 'shared' or 'private'");
      }
      if (position !== undefined && typeof position !== "number") {
        return badRequest("position must be a number");
      }
      if (isDefault !== undefined && typeof isDefault !== "boolean") {
        return badRequest("isDefault must be a boolean");
      }

      return service.updateList(listId, { name, icon, visibility, position, isDefault });
    },
    { key: "list", uuids: [houseId, listId] },
  );
}
