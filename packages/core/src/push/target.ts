const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function notificationInboxId(data: unknown): string | null {
  if (typeof data !== "object" || data === null) return null;

  const id = (data as { notificationId?: unknown }).notificationId;
  return typeof id === "string" && UUID.test(id) ? id : null;
}

export function notificationHouseId(data: unknown): string | null {
  if (typeof data !== "object" || data === null) return null;

  const id = (data as { houseId?: unknown }).houseId;
  return typeof id === "string" && UUID.test(id) ? id : null;
}

// A notification's data comes from outside the app, so only an in-app path is followed.
// "//host" and backslashes are rejected because clients treat them as another origin.
export function notificationTarget(data: unknown): string | null {
  if (typeof data !== "object" || data === null) return null;

  const url = (data as { url?: unknown }).url;
  if (typeof url !== "string" || url.length > 200) return null;
  if (!url.startsWith("/") || url.startsWith("//") || url.includes("\\")) return null;
  for (let i = 0; i < url.length; i++) {
    const code = url.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return null;
  }

  return url;
}
