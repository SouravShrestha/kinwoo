import { handleGroceryRequest } from "../../../../_lib/groceryRoute";

type Context = { params: Promise<{ houseId: string }> };

export async function GET(request: Request, { params }: Context) {
  const { houseId } = await params;

  return handleGroceryRequest(
    request,
    ({ service, userId }) => service.getOverview(houseId, userId),
    {
      key: "overview",
      uuids: [houseId],
    },
  );
}
