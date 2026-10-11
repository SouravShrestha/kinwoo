import { handleHouseRequest } from "../../../_lib/houseRoute";

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  return handleHouseRequest(request, ({ service }) => service.joinHouse(code), {
    key: "result",
  });
}
