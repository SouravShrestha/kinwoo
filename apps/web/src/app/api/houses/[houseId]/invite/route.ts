import { handleHouseRequest } from "../../../_lib/houseRoute";

type Context = { params: Promise<{ houseId: string }> };

export async function GET(request: Request, { params }: Context) {
  const { houseId } = await params;

  return handleHouseRequest(request, ({ service, userId }) => service.getInvite(userId, houseId), {
    key: "invite",
    uuids: [houseId],
  });
}
