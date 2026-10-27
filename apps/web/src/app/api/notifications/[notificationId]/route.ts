import { handleNotificationRequest } from "@/app/api/_lib/notificationRoute";

type Context = { params: Promise<{ notificationId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const { notificationId } = await params;

  return handleNotificationRequest(request, ({ service }) => service.markRead(notificationId), {
    uuids: [notificationId],
  });
}
