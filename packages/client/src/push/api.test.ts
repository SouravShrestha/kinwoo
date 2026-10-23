import { beforeEach, describe, expect, it, vi } from "vitest";

import { configureApiClient } from "../api/config";
import { registerPushToken, unregisterPushToken } from "./api";

const TOKEN = "ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]";

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
  configureApiClient({
    baseUrl: "https://kinwoo.in",
    fetch: fetchMock as unknown as typeof fetch,
    getAuthHeaders: async () => ({ Authorization: "Bearer jwt-1" }),
  });
});

describe("push api", () => {
  it("POSTs the token with the bearer header", async () => {
    await registerPushToken(TOKEN);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://kinwoo.in/api/push/token");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ token: TOKEN }));
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer jwt-1");
  });

  it("DELETEs the token", async () => {
    await unregisterPushToken(TOKEN);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://kinwoo.in/api/push/token");
    expect(init.method).toBe("DELETE");
    expect(init.body).toBe(JSON.stringify({ token: TOKEN }));
  });

  it("throws when the server rejects the request", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Not logged in" }), { status: 401 }),
    );

    await expect(registerPushToken(TOKEN)).rejects.toMatchObject({ status: 401 });
  });
});
