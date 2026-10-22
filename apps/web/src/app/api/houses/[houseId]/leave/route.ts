import { handleHouseRequest, readJsonObject } from "@/app/api/_lib/houseRoute";

export async function POST(request: Request, { params }: { params: Promise<{ houseId: string }> }) {
  const { houseId } = await params;

  return handleHouseRequest(
    request,
    async ({ service }) => {
      const body = await readJsonObject(request);
      return service.leaveHouse(houseId, body?.acknowledgeDebt === true);
    },
    { uuids: [houseId] },
  );
}
