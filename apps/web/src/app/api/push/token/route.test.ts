import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getVerifiedUser = vi.fn();
const applyCookies = vi.fn((response: unknown) => response);
const registerToken = vi.fn();
const unregisterToken = vi.fn();

vi.mock("@/integrations/supabase/client.route", () => ({
  createRouteClient: () => ({ supabase: {}, applyCookies }),
  getVerifiedUser: (...args: unknown[]) => getVerifiedUser(...args),
}));

vi.mock("@/api/push/PushRepository", () => ({ PushRepository: class {} }));

vi.mock("@/api/push/PushService", () => ({
  PushService: class {
    registerToken = registerToken;
    unregisterToken = unregisterToken;
  },
}));

const TOKEN = "ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]";

beforeEach(() => {
  vi.clearAllMocks();
  applyCookies.mockImplementation((response: unknown) => response);
});

const call = async (method: "POST" | "DELETE", body: unknown) => {
  const route = await import("./route");
  const request = new Request("https://app.kinwoo.in/api/push/token", {
    method,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  return route[method](request);
};

describe("/api/push/token", () => {
  it("registers the token for a verified caller", async () => {
    getVerifiedUser.mockResolvedValue({ id: "user-1" });
    registerToken.mockResolvedValue({ ok: true, data: null });

    const response = await call("POST", { token: TOKEN });

    expect(response.status).toBe(200);
    expect(registerToken).toHaveBeenCalledWith(TOKEN);
  });

  it("unregisters the token on DELETE", async () => {
    getVerifiedUser.mockResolvedValue({ id: "user-1" });
    unregisterToken.mockResolvedValue({ ok: true, data: null });

    expect((await call("DELETE", { token: TOKEN })).status).toBe(200);
    expect(unregisterToken).toHaveBeenCalledWith(TOKEN);
  });

  it("401s an unverified caller before reading the body", async () => {
    getVerifiedUser.mockResolvedValue(null);

    expect((await call("POST", { token: TOKEN })).status).toBe(401);
    expect((await call("DELETE", { token: TOKEN })).status).toBe(401);
    expect(registerToken).not.toHaveBeenCalled();
    expect(unregisterToken).not.toHaveBeenCalled();
  });

  it("400s a malformed body", async () => {
    getVerifiedUser.mockResolvedValue({ id: "user-1" });

    expect((await call("POST", "not json")).status).toBe(400);
    expect((await call("POST", "null")).status).toBe(400);
    expect(registerToken).not.toHaveBeenCalled();
  });

  it("surfaces the service's rejection as a 400", async () => {
    getVerifiedUser.mockResolvedValue({ id: "user-1" });
    registerToken.mockResolvedValue({ ok: false, code: "INVALID_INPUT", message: "Bad token" });

    const response = await call("POST", { token: "nope" });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Bad token", code: "INVALID_INPUT" });
  });

  it("flushes cookies on every exit path", async () => {
    getVerifiedUser.mockResolvedValue(null);
    await call("POST", { token: TOKEN });
    expect(applyCookies).toHaveBeenCalledOnce();
  });

  it("delegates to the shared handler and never uses the service-role client", () => {
    const here = path.dirname(new URL(import.meta.url).pathname);
    const source = readFileSync(path.join(here, "route.ts"), "utf8");
    expect(source).toContain("handlePushRequest");
    expect(source).not.toContain("createRouteClient");
    expect(source).not.toContain("client.server");
  });
});
