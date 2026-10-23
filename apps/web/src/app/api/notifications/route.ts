import { handleNotificationRequest } from "@/app/api/_lib/notificationRoute";

export async function GET(request: Request) {
  return handleNotificationRequest(request, ({ service }) => service.list(), {
    key: "notifications",
  });
}

export async function PATCH(request: Request) {
  return handleNotificationRequest(request, ({ service }) => service.markAllRead());
}
