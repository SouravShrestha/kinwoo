import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getVerifiedUser = vi.fn();
const applyCookies = vi.fn((response: unknown) => response);

vi.mock("@/integrations/supabase/client.route", () => ({
  createRouteClient: () => ({ supabase: { tag: "client" }, applyCookies }),
  getVerifiedUser: (...args: unknown[]) => getVerifiedUser(...args),
}));

const { createRouteHandler } = await import("./route");

type Code = "INVALID_INPUT" | "NOT_FOUND" | "UNAVAILABLE";

const makeService = vi.fn((client: unknown) => ({ client }));
const handle = createRouteHandler(makeService as never, {
  INVALID_INPUT: 400,
  NOT_FOUND: 404,
  UNAVAILABLE: 503,
} satisfies Record<Code, number>);

const request = () => new Request("https://kinwoo.test/api/thing");
const ID = "6d5f45b6-3a75-4e63-b2da-adad6fccb88d";

beforeEach(() => {
  vi.clearAllMocks();
  getVerifiedUser.mockResolvedValue({ id: "user-1", socialAvatarUrl: "https://a" });
});

describe("createRouteHandler", () => {
  it("runs with the service, user and avatar, and wraps data under the key", async () => {
    const run = vi.fn(async () => ({ ok: true as const, data: [1, 2] }));

    const response = await handle(request(), run, { key: "items", uuids: [ID] });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ items: [1, 2] });
    expect(run).toHaveBeenCalledWith({
      service: { client: { tag: "client" } },
      userId: "user-1",
      socialAvatarUrl: "https://a",
    });
  });

  it("401s an unverified caller without building the service", async () => {
    getVerifiedUser.mockResolvedValue(null);
    const run = vi.fn();

    expect((await handle(request(), run)).status).toBe(401);
    expect(run).not.toHaveBeenCalled();
    expect(makeService).not.toHaveBeenCalled();
  });

  it("404s a path id that is not a UUID", async () => {
    const run = vi.fn();

    expect((await handle(request(), run, { uuids: [ID, "1; drop"] })).status).toBe(404);
    expect(run).not.toHaveBeenCalled();
  });

  it("maps a failure code to its status and message", async () => {
    const response = await handle(request(), async () => ({
      ok: false as const,
      code: "NOT_FOUND" as const,
      message: "Gone",
    }));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Gone", code: "NOT_FOUND" });
  });

  it("passes a handler's own response through", async () => {
    const own = NextResponse.json({ custom: true }, { status: 418 });

    expect(await handle(request(), async () => own)).toBe(own);
  });

  it("flushes cookies on every exit path", async () => {
    await handle(request(), async () => ({ ok: true as const, data: null }));
    getVerifiedUser.mockResolvedValue(null);
    await handle(request(), vi.fn());
    getVerifiedUser.mockResolvedValue({ id: "user-1" });
    await handle(request(), vi.fn(), { uuids: ["bad"] });

    expect(applyCookies).toHaveBeenCalledTimes(3);
  });
});
