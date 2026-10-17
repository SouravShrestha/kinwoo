import { handleGroceryRequest } from "../../../../../../../../_lib/groceryRoute";

type Context = { params: Promise<{ houseId: string; listId: string; itemId: string }> };

export async function GET(request: Request, { params }: Context) {
  const { houseId, listId, itemId } = await params;

  return handleGroceryRequest(request, ({ service }) => service.getItemActivity(houseId, itemId), {
    key: "activity",
    uuids: [houseId, listId, itemId],
  });
}
