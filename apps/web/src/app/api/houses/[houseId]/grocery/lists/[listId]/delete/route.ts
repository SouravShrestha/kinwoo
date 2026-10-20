import { handleGroceryRequest } from "@/app/api/_lib/groceryRoute";

type Context = { params: Promise<{ houseId: string; listId: string }> };

export async function POST(request: Request, { params }: Context) {
  const { houseId, listId } = await params;

  return handleGroceryRequest(request, ({ service }) => service.deleteList(listId), {
    uuids: [houseId, listId],
  });
}
