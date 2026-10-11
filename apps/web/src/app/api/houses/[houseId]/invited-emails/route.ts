import { badRequest, handleHouseRequest, readJsonObject } from "../../../_lib/houseRoute";

type Context = { params: Promise<{ houseId: string }> };

export async function GET(request: Request, { params }: Context) {
  const { houseId } = await params;
  return handleHouseRequest(
    request,
    ({ service, userId }) => service.listInvitedEmails(userId, houseId),
    { key: "invitedEmails", uuids: [houseId] },
  );
}

export async function POST(request: Request, { params }: Context) {
  const { houseId } = await params;
  return handleHouseRequest(
    request,
    async ({ service }) => {
      const body = await readJsonObject(request);
      if (!body || typeof body.email !== "string") return badRequest("email must be a string");
      return service.addInvitedEmail(houseId, body.email);
    },
    { key: "invitedEmail", status: 201, uuids: [houseId] },
  );
}
