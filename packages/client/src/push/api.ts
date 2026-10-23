import { apiRequest } from "../api/request";

export async function registerPushToken(token: string): Promise<void> {
  await apiRequest("/api/push/token", { method: "POST", body: { token } });
}

export async function unregisterPushToken(token: string): Promise<void> {
  await apiRequest("/api/push/token", { method: "DELETE", body: { token } });
}
