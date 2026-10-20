import { badRequest, handleGroceryRequest, readJsonObject } from "@/app/api/_lib/groceryRoute";

type Context = { params: Promise<{ houseId: string }> };

export async function GET(request: Request, { params }: Context) {
  const { houseId } = await params;

  return handleGroceryRequest(request, ({ service }) => service.listCategories(houseId), {
    key: "categories",
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

      const { name } = body;
      if (typeof name !== "string" || !name.trim()) {
        return badRequest("name must be a non-empty string");
      }

      return service.addCategory(houseId, name.trim());
    },
    { key: "category", status: 201, uuids: [houseId] },
  );
}
