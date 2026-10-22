// Every JSON body this API accepts is a small object, so anything larger is refused before parsing.
export const MAX_JSON_BODY_BYTES = 64 * 1024;

export async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  if (Number(request.headers.get("content-length")) > MAX_JSON_BODY_BYTES) return null;

  try {
    // A chunked body has no content-length, so the size is checked again once read.
    const text = await request.text();
    if (text.length > MAX_JSON_BODY_BYTES) return null;
    const body: unknown = JSON.parse(text);
    return typeof body === "object" && body !== null && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
