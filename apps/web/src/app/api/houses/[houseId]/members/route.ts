import { handleHouseRequest } from "../../../_lib/houseRoute";

export async function GET(request: Request, { params }: { params: Promise<{ houseId: string }> }) {
  const { houseId } = await params;

  return handleHouseRequest(
    request,
    ({ service, userId }) => service.listMembers(userId, houseId),
    { key: "members", uuids: [houseId] },
  );
}
