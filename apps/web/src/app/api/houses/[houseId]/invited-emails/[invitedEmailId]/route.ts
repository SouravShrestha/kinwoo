import { handleHouseRequest } from "@/app/api/_lib/houseRoute";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ houseId: string; invitedEmailId: string }> },
) {
  const { houseId, invitedEmailId } = await params;
  return handleHouseRequest(request, ({ service }) => service.removeInvitedEmail(invitedEmailId), {
    uuids: [houseId, invitedEmailId],
  });
}
