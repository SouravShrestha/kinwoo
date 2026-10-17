import { ACTIVITY_PAGE_SIZE, parseActivityCursor } from "@kinwoo/core/grocery";

import { badRequest, handleGroceryRequest } from "../../../../_lib/groceryRoute";

type Context = { params: Promise<{ houseId: string }> };

export async function GET(request: Request, { params }: Context) {
  const { houseId } = await params;
  const rawCursor = new URL(request.url).searchParams.get("cursor");
  const before = rawCursor === null ? null : parseActivityCursor(rawCursor);

  return handleGroceryRequest(
    request,
    ({ service }) => {
      if (rawCursor !== null && !before) return Promise.resolve(badRequest("Invalid cursor"));
      return service.getRecentActivity(houseId, ACTIVITY_PAGE_SIZE, before);
    },
    {
      key: "page",
      uuids: [houseId],
    },
  );
}
