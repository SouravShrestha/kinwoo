import { badRequest, handleHouseRequest, readJsonObject } from "../../../../_lib/houseRoute";

type Context = { params: Promise<{ houseId: string; userId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const { houseId, userId } = await params;

  return handleHouseRequest(
    request,
    async ({ service }) => {
      const body = await readJsonObject(request);
      if (!body) return badRequest("Invalid JSON body");
      if (body.role !== "admin" && body.role !== "member") {
        return badRequest("role must be admin or member");
      }

      return service.setMemberRole(houseId, userId, body.role);
    },
    { uuids: [houseId, userId] },
  );
}

export async function DELETE(request: Request, { params }: Context) {
  const { houseId, userId } = await params;
  const keepDebt = new URL(request.url).searchParams.get("keepDebt") === "true";

  return handleHouseRequest(
    request,
    ({ service }) => service.removeMember(houseId, userId, keepDebt),
    { uuids: [houseId, userId] },
  );
}
