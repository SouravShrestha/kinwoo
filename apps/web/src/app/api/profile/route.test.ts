import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Profile } from "@/api/profile/IProfileRepository";

const getVerifiedUser = vi.fn();
const applyCookies = vi.fn((response: unknown) => response);
const getProfile = vi.fn();
const setDisplayName = vi.fn();
const setPreferences = vi.fn();

vi.mock("@/integrations/supabase/client.route", () => ({
  createRouteClient: () => ({ supabase: {}, applyCookies }),
  getVerifiedUser: (...args: unknown[]) => getVerifiedUser(...args),
}));

vi.mock("@/api/profile/ProfileRepository", () => ({
  ProfileRepository: class {},
}));

vi.mock("@/api/profile/ProfileService", () => ({
  ProfileService: class {
    getProfile = getProfile;
    setDisplayName = setDisplayName;
    setPreferences = setPreferences;
  },
}));

const profile: Profile = {
  id: "user-1",
  displayName: "Daisy",
  avatarUrl: null,
  locale: "en",
  theme: "system",
  notificationsEnabled: true,
  mutedPushTypes: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  applyCookies.mockImplementation((response: unknown) => response);
});

const get = async (request: Request) => (await import("./route")).GET(request);
const patch = async (request: Request) => (await import("./display-name/route")).PATCH(request);

const plainRequest = () => new Request("https://kinwoo.cbsdev.me/api/profile");

const jsonRequest = (body: unknown) =>
  new Request("https://kinwoo.cbsdev.me/api/profile/display-name", {
    method: "PATCH",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

describe("GET /api/profile", () => {
  it("returns the profile for a verified caller", async () => {
    getVerifiedUser.mockResolvedValue({ id: "user-1" });
    getProfile.mockResolvedValue({ ok: true, data: profile });

    const response = await get(plainRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ profile });
    expect(getProfile).toHaveBeenCalledWith("user-1", undefined);
  });

  it("401s an unverified caller without calling the service", async () => {
    getVerifiedUser.mockResolvedValue(null);

    const response = await get(plainRequest());

    expect(response.status).toBe(401);
    expect(getProfile).not.toHaveBeenCalled();
  });

  it("flushes cookies on the success path", async () => {
    getVerifiedUser.mockResolvedValue({ id: "user-1" });
    getProfile.mockResolvedValue({ ok: true, data: profile });

    await get(plainRequest());

    expect(applyCookies).toHaveBeenCalledOnce();
  });

  it("flushes cookies on the 401 path, so a refreshed session is not dropped", async () => {
    getVerifiedUser.mockResolvedValue(null);

    await get(plainRequest());

    expect(applyCookies).toHaveBeenCalledOnce();
  });

  it("maps a missing row to 404 and a repository failure to 503", async () => {
    getVerifiedUser.mockResolvedValue({ id: "user-1" });

    getProfile.mockResolvedValue({ ok: false, code: "NOT_FOUND", message: "Profile not found" });
    expect((await get(plainRequest())).status).toBe(404);

    getProfile.mockResolvedValue({ ok: false, code: "UNAVAILABLE", message: "Try again" });
    expect((await get(plainRequest())).status).toBe(503);
  });
});

describe("PATCH /api/profile/display-name", () => {
  it("passes the name to the service and returns the updated profile", async () => {
    getVerifiedUser.mockResolvedValue({ id: "user-1" });
    setDisplayName.mockResolvedValue({ ok: true, data: profile });

    const response = await patch(jsonRequest({ displayName: "Daisy" }));

    expect(response.status).toBe(200);
    expect(setDisplayName).toHaveBeenCalledWith("user-1", "Daisy");
  });

  it("401s before reading the body", async () => {
    getVerifiedUser.mockResolvedValue(null);

    expect((await patch(jsonRequest({ displayName: "Daisy" }))).status).toBe(401);
    expect(setDisplayName).not.toHaveBeenCalled();
  });

  it("400s a malformed body", async () => {
    getVerifiedUser.mockResolvedValue({ id: "user-1" });

    expect((await patch(jsonRequest("not json"))).status).toBe(400);
    expect((await patch(jsonRequest({}))).status).toBe(400);
    expect((await patch(jsonRequest({ displayName: 42 }))).status).toBe(400);
    expect(setDisplayName).not.toHaveBeenCalled();
  });

  it("surfaces the service's rejection message as a 400", async () => {
    getVerifiedUser.mockResolvedValue({ id: "user-1" });
    setDisplayName.mockResolvedValue({
      ok: false,
      code: "INVALID_INPUT",
      message: "Enter a name.",
    });

    const response = await patch(jsonRequest({ displayName: "  " }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Enter a name.",
      code: "INVALID_INPUT",
    });
  });
});

describe("PATCH /api/profile/preferences", () => {
  const patchPreferences = async (request: Request) =>
    (await import("./preferences/route")).PATCH(request);

  it("400s a JSON null body instead of throwing", async () => {
    getVerifiedUser.mockResolvedValue({ id: "user-1" });

    expect((await patchPreferences(jsonRequest("null"))).status).toBe(400);
    expect(setPreferences).not.toHaveBeenCalled();
  });

  it("passes only the fields that were sent", async () => {
    getVerifiedUser.mockResolvedValue({ id: "user-1" });
    setPreferences.mockResolvedValue({ ok: true, data: profile });

    const response = await patchPreferences(jsonRequest({ theme: "dark" }));

    expect(response.status).toBe(200);
    expect(setPreferences).toHaveBeenCalledWith("user-1", { theme: "dark" });
  });
});

describe("route sources", () => {
  const here = path.dirname(new URL(import.meta.url).pathname);
  const files = ["route.ts", "avatar/route.ts", "display-name/route.ts", "preferences/route.ts"];

  it("never import the service-role client", () => {
    for (const file of files) {
      const source = readFileSync(path.join(here, file), "utf8");
      expect(source, file).not.toContain("client.server");
      expect(source, file).not.toContain("getSupabaseAdmin");
    }
  });

  it("delegate to the shared handler so cookies are always flushed", () => {
    for (const file of [...files, "avatars/route.ts"]) {
      const source = readFileSync(path.join(here, file), "utf8");
      expect(source, file).toContain("handleProfileRequest");
      expect(source, file).not.toContain("createRouteClient");
    }
  });
});
