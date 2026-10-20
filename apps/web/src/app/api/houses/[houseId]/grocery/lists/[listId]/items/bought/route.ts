import { handleGroceryRequest } from "@/app/api/_lib/groceryRoute";

type Context = { params: Promise<{ houseId: string; listId: string }> };

export async function GET(request: Request, { params }: Context) {
  const { houseId, listId } = await params;
  const before = new URL(request.url).searchParams.get("before");

  return handleGroceryRequest(request, ({ service }) => service.listBoughtItems(listId, before), {
    key: "page",
    uuids: [houseId, listId],
  });
}
