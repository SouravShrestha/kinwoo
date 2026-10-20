import { handleGroceryRequest } from "@/app/api/_lib/groceryRoute";

type Context = { params: Promise<{ houseId: string }> };

export async function GET(request: Request, { params }: Context) {
  const { houseId } = await params;
  return handleGroceryRequest(
    request,
    ({ service, userId }) => service.listPrivatePurchases(houseId, userId),
    {
      key: "items",
      uuids: [houseId],
    },
  );
}
