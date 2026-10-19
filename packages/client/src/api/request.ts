import { getApiConfig } from "./config";

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | null = null,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
};

// Web relies on the session cookie; mobile sends a bearer token through the injected header
// resolver.
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const config = getApiConfig();
  const doFetch = config.fetch ?? fetch;
  const authHeaders = config.getAuthHeaders ? await config.getAuthHeaders() : {};
  const hasBody = options.body !== undefined;

  const response = await doFetch(`${config.baseUrl}${path}`, {
    method: options.method ?? "GET",
    credentials: "include",
    signal: options.signal,
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...authHeaders,
    },
    ...(hasBody ? { body: JSON.stringify(options.body) } : {}),
  });

  const body = (await response.json().catch(() => null)) as
    (T & { error?: string; code?: string }) | null;

  if (!response.ok || body === null) {
    throw new ApiRequestError(
      body?.error ?? `Request failed with status ${response.status}`,
      response.status,
      typeof body?.code === "string" ? body.code : null,
    );
  }

  return body;
}
