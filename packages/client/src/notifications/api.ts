import type { GroceryActivityEntry } from "@kinwoo/core/grocery";

import { apiRequest } from "../api/request";

export async function fetchNotifications(): Promise<GroceryActivityEntry[]> {
  const body = await apiRequest<{ notifications: GroceryActivityEntry[] }>("/api/notifications");

  return body.notifications;
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiRequest(`/api/notifications/${encodeURIComponent(id)}`, { method: "PATCH" });
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiRequest("/api/notifications", { method: "PATCH" });
}
