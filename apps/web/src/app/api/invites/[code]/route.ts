import { handleHouseRequest } from "../../_lib/houseRoute";

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  return handleHouseRequest(request, ({ service }) => service.previewInvite(code), {
    key: "preview",
  });
}
