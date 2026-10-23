import type { GroceryActivityEntry } from "@kinwoo/core/grocery";

import type { ServiceResult } from "../_shared/result";

export type NotificationServiceErrorCode = "INVALID_INPUT" | "UNAVAILABLE";

export interface INotificationService {
  list(): Promise<ServiceResult<GroceryActivityEntry[], NotificationServiceErrorCode>>;
  markRead(id: unknown): Promise<ServiceResult<null, NotificationServiceErrorCode>>;
  markAllRead(): Promise<ServiceResult<null, NotificationServiceErrorCode>>;
}
