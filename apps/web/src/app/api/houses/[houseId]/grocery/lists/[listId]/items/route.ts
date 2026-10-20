import {
  badRequest,
  handleGroceryRequest,
  readItemFields,
  readJsonObject,
} from "@/app/api/_lib/groceryRoute";

type Context = { params: Promise<{ houseId: string; listId: string }> };

export async function GET(request: Request, { params }: Context) {
  const { houseId, listId } = await params;

  // Without boughtSince every item is returned, which older app builds rely on.
  const boughtSince = new URL(request.url).searchParams.get("boughtSince");

  return handleGroceryRequest(request, ({ service }) => service.listItems(listId, boughtSince), {
    key: "items",
    uuids: [houseId, listId],
  });
}

export async function POST(request: Request, { params }: Context) {
  const { houseId, listId } = await params;

  return handleGroceryRequest(
    request,
    async ({ service }) => {
      const body = await readJsonObject(request);
      if (!body) return badRequest("Invalid JSON body");

      const { name, idempotencyKey } = body;
      if (typeof name !== "string") return badRequest("name must be a string");
      if (typeof idempotencyKey !== "string" || !idempotencyKey) {
        return badRequest("idempotencyKey is required");
      }
      const fields = readItemFields(body);
      if (typeof fields === "string") return badRequest(fields);

      return service.addItem({ listId, name, idempotencyKey, ...fields });
    },
    { key: "item", status: 201, uuids: [houseId, listId] },
  );
}
