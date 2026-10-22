import { isListVisibility } from "@kinwoo/core/grocery";

import { badRequest, handleGroceryRequest, readJsonObject } from "@/app/api/_lib/groceryRoute";

type Context = { params: Promise<{ houseId: string }> };

export async function GET(request: Request, { params }: Context) {
  const { houseId } = await params;

  return handleGroceryRequest(request, ({ service }) => service.listLists(houseId), {
    key: "lists",
    uuids: [houseId],
  });
}

export async function POST(request: Request, { params }: Context) {
  const { houseId } = await params;

  return handleGroceryRequest(
    request,
    async ({ service }) => {
      const body = await readJsonObject(request);
      if (!body) return badRequest("Invalid JSON body");

      const { name, icon, visibility } = body;
      if (typeof name !== "string") return badRequest("name must be a string");
      if (icon !== undefined && typeof icon !== "string") {
        return badRequest("icon must be a string");
      }
      if (visibility !== undefined && !isListVisibility(visibility)) {
        return badRequest("visibility must be 'shared' or 'private'");
      }

      return service.createList(houseId, { name, icon, visibility });
    },
    { key: "list", status: 201, uuids: [houseId] },
  );
}
