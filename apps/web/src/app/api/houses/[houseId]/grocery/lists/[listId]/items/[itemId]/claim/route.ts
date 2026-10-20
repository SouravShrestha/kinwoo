import { handleGroceryRequest } from "@/app/api/_lib/groceryRoute";

type Context = { params: Promise<{ houseId: string; listId: string; itemId: string }> };

export async function POST(request: Request, { params }: Context) {
  const { houseId, listId, itemId } = await params;

  return handleGroceryRequest(request, ({ service }) => service.claimItem(itemId), {
    key: "claim",
    uuids: [houseId, listId, itemId],
  });
}

export async function DELETE(request: Request, { params }: Context) {
  const { houseId, listId, itemId } = await params;

  return handleGroceryRequest(request, ({ service }) => service.unclaimItem(itemId), {
    uuids: [houseId, listId, itemId],
  });
}
