import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getVerifiedUser = vi.fn();
const applyCookies = vi.fn((response: unknown) => response);
const listHouses = vi.fn();
const createHouse = vi.fn();
const listMembers = vi.fn();
const removeMember = vi.fn();
const previewInvite = vi.fn();

vi.mock("@/integrations/supabase/client.route", () => ({
  createRouteClient: () => ({ supabase: {}, applyCookies }),
  getVerifiedUser: (...args: unknown[]) => getVerifiedUser(...args),
}));

vi.mock("@/api/houses/HousesRepository", () => ({ HousesRepository: class {} }));

vi.mock("@/api/houses/HousesService", () => ({
  HousesService: class {
    listHouses = listHouses;
    createHouse = createHouse;
    listMembers = listMembers;
    removeMember = removeMember;
    previewInvite = previewInvite;
  },
}));

const HOUSE_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  vi.clearAllMocks();
  applyCookies.mockImplementation((response: unknown) => response);
  getVerifiedUser.mockResolvedValue({ id: USER_ID });
});

const url = (suffix = "") => `https://kinwoo.cbsdev.me/api/houses${suffix}`;

const postJson = (body: unknown) =>
  new Request(url(), {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

describe("GET /api/houses", () => {
  it("returns the caller's houses", async () => {
    listHouses.mockResolvedValue({ ok: true, data: [{ role: "admin", house: { id: "h1" } }] });
    const { GET } = await import("./route");

    const response = await GET(new Request(url()));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      houses: [{ role: "admin", house: { id: "h1" } }],
    });
    expect(listHouses).toHaveBeenCalledWith(USER_ID);
  });

  it("401s an unverified caller and still flushes cookies", async () => {
    getVerifiedUser.mockResolvedValue(null);
    const { GET } = await import("./route");

    const response = await GET(new Request(url()));

    expect(response.status).toBe(401);
    expect(listHouses).not.toHaveBeenCalled();
    expect(applyCookies).toHaveBeenCalledOnce();
  });
});

describe("POST /api/houses", () => {
  it("creates a house and answers 201", async () => {
    createHouse.mockResolvedValue({ ok: true, data: { id: "h1", name: "Flat" } });
    const { POST } = await import("./route");

    const response = await POST(postJson({ name: "Flat", address: "12 Street" }));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ house: { id: "h1", name: "Flat" } });
    expect(createHouse).toHaveBeenCalledWith(USER_ID, {
      name: "Flat",
      address: "12 Street",
    });
  });

  it("400s a malformed body before calling the service", async () => {
    const { POST } = await import("./route");

    expect((await POST(postJson("not json"))).status).toBe(400);
    expect((await POST(postJson({}))).status).toBe(400);
    expect((await POST(postJson({ name: "Flat", address: 3 }))).status).toBe(400);
    expect(createHouse).not.toHaveBeenCalled();
  });

  it("maps HOUSE_LIMIT_REACHED to 409 with the code in the body", async () => {
    createHouse.mockResolvedValue({
      ok: false,
      code: "HOUSE_LIMIT_REACHED",
      message: "Too many houses",
    });
    const { POST } = await import("./route");

    const response = await POST(postJson({ name: "Flat" }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Too many houses",
      code: "HOUSE_LIMIT_REACHED",
    });
  });

  it("maps validation failures to 400", async () => {
    createHouse.mockResolvedValue({ ok: false, code: "INVALID_INPUT", message: "Give a name." });
    const { POST } = await import("./route");

    expect((await POST(postJson({ name: " " }))).status).toBe(400);
  });
});

describe("GET /api/houses/[houseId]/members", () => {
  it("returns 404 for a house the caller cannot see", async () => {
    listMembers.mockResolvedValue({ ok: false, code: "NOT_FOUND", message: "nope" });
    const { GET } = await import("./[houseId]/members/route");

    const response = await GET(new Request(url(`/${HOUSE_ID}/members`)), {
      params: Promise.resolve({ houseId: HOUSE_ID }),
    });

    expect(response.status).toBe(404);
  });

  it("404s a path parameter that is not a UUID without calling the service", async () => {
    const { GET } = await import("./[houseId]/members/route");

    const response = await GET(new Request(url("/nope/members")), {
      params: Promise.resolve({ houseId: "nope" }),
    });

    expect(response.status).toBe(404);
    expect(listMembers).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/houses/[houseId]/members/[userId]", () => {
  it("forwards keepDebt from the query string", async () => {
    removeMember.mockResolvedValue({ ok: true, data: null });
    const { DELETE } = await import("./[houseId]/members/[userId]/route");

    const response = await DELETE(
      new Request(url(`/${HOUSE_ID}/members/${USER_ID}?keepDebt=true`), { method: "DELETE" }),
      { params: Promise.resolve({ houseId: HOUSE_ID, userId: USER_ID }) },
    );

    expect(response.status).toBe(200);
    expect(removeMember).toHaveBeenCalledWith(HOUSE_ID, USER_ID, true);
  });

  it("maps FORBIDDEN to 403", async () => {
    removeMember.mockResolvedValue({ ok: false, code: "FORBIDDEN", message: "no" });
    const { DELETE } = await import("./[houseId]/members/[userId]/route");

    const response = await DELETE(
      new Request(url(`/${HOUSE_ID}/members/${USER_ID}`), { method: "DELETE" }),
      { params: Promise.resolve({ houseId: HOUSE_ID, userId: USER_ID }) },
    );

    expect(response.status).toBe(403);
    expect(removeMember).toHaveBeenCalledWith(HOUSE_ID, USER_ID, false);
  });
});

describe("GET /api/invites/[code]", () => {
  it("returns the preview and maps RATE_LIMITED to 429", async () => {
    const { GET } = await import("../invites/[code]/route");
    const request = () => new Request("https://kinwoo.cbsdev.me/api/invites/ABC234");

    previewInvite.mockResolvedValue({ ok: true, data: { status: "expired" } });
    const ok = await GET(request(), { params: Promise.resolve({ code: "ABC234" }) });
    expect(ok.status).toBe(200);
    await expect(ok.json()).resolves.toEqual({ preview: { status: "expired" } });

    previewInvite.mockResolvedValue({ ok: false, code: "RATE_LIMITED", message: "slow down" });
    const limited = await GET(request(), { params: Promise.resolve({ code: "ABC234" }) });
    expect(limited.status).toBe(429);
  });
});

describe("route sources", () => {
  const apiRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

  function routeFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) return routeFiles(full);
      return entry === "route.ts" ? [full] : [];
    });
  }

  const files = [
    ...routeFiles(path.join(apiRoot, "houses")),
    ...routeFiles(path.join(apiRoot, "invites")),
  ];

  it("covers every houses and invites route", () => {
    expect(files.length).toBe(10);
  });

  it("never import the service-role client", () => {
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toContain("client.server");
      expect(source, file).not.toContain("getSupabaseAdmin");
    }
  });

  it("delegate to the shared handler so cookies are always flushed", () => {
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source, file).toContain("handleHouseRequest");
      expect(source, file).not.toContain("createRouteClient");
    }
  });
});
