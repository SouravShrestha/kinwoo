import { isHouseJoinMode } from "@kinwoo/core/houses";

import { badRequest, handleHouseRequest, readJsonObject } from "@/app/api/_lib/houseRoute";
import { isOptional } from "@/app/api/_lib/route";

type Context = { params: Promise<{ houseId: string }> };

export async function GET(request: Request, { params }: Context) {
  const { houseId } = await params;

  return handleHouseRequest(request, ({ service, userId }) => service.getHouse(userId, houseId), {
    key: "membership",
    uuids: [houseId],
  });
}

export async function PATCH(request: Request, { params }: Context) {
  const { houseId } = await params;

  return handleHouseRequest(
    request,
    async ({ service, userId }) => {
      const body = await readJsonObject(request);
      if (!body) return badRequest("Invalid JSON body");

      const { name, address, joinMode } = body;
      if (name !== undefined && typeof name !== "string") {
        return badRequest("name must be a string");
      }
      if (!isOptional(address, "string")) {
        return badRequest("address must be a string");
      }
      if (joinMode !== undefined && !isHouseJoinMode(joinMode)) {
        return badRequest("joinMode must be 'anyone' or 'invited'");
      }

      return service.updateHouse(userId, houseId, { name, address, joinMode });
    },
    { key: "house", uuids: [houseId] },
  );
}
