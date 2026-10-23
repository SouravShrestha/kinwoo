import type { NotificationServiceErrorCode } from "@/api/notifications/INotificationService";
import { NotificationRepository } from "@/api/notifications/NotificationRepository";
import { NotificationService } from "@/api/notifications/NotificationService";

import { createRouteHandler } from "./route";

const STATUS_BY_CODE: Record<NotificationServiceErrorCode, number> = {
  INVALID_INPUT: 400,
  UNAVAILABLE: 503,
};

export const handleNotificationRequest = createRouteHandler(
  (client) => new NotificationService(new NotificationRepository(client)),
  STATUS_BY_CODE,
);
