import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiRequestError } from "../api/request";
import { configureApiClient } from "../api/config";
import {
  addInvitedEmail,
  createHouse,
  fetchHouses,
  fetchInvite,
  fetchInvitedEmails,
  fetchInvitePreview,
  joinHouse,
  leaveHouse,
  removeInvitedEmail,
  removeMember,
  setMemberRole,
  updateHouse,
} from "./api";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

let fetchMock: ReturnType<typeof vi.fn>;

const lastCall = () => {
  const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
  return { url, init, headers: init.headers as Record<string, string> };
};

beforeEach(() => {
  fetchMock = vi.fn();
  configureApiClient({
    baseUrl: "https://kinwoo.cbsdev.me/",
    fetch: fetchMock as unknown as typeof fetch,
    getAuthHeaders: async () => ({ Authorization: "Bearer jwt-1" }),
  });
});

describe("houses api", () => {
  it("unwraps the list and sends auth", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ houses: [{ role: "admin", house: { id: "h1" } }] }));

    await expect(fetchHouses()).resolves.toEqual([{ role: "admin", house: { id: "h1" } }]);

    const { url, init, headers } = lastCall();
    expect(url).toBe("https://kinwoo.cbsdev.me/api/houses");
    expect(init.method).toBe("GET");
    expect(headers.Authorization).toBe("Bearer jwt-1");
    expect(headers["Content-Type"]).toBeUndefined();
  });

  it("POSTs a new house as JSON", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ house: { id: "h1" } }, 201));

    await expect(createHouse({ name: "Flat", address: "12 Street" })).resolves.toEqual({
      id: "h1",
    });

    const { init, headers } = lastCall();
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ name: "Flat", address: "12 Street" }));
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("exposes the server's message, status and code on failure", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: "You can be in up to 10 houses.", code: "HOUSE_LIMIT_REACHED" }, 409),
    );

    const error = await createHouse({ name: "Flat" }).catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error).toMatchObject({
      message: "You can be in up to 10 houses.",
      status: 409,
      code: "HOUSE_LIMIT_REACHED",
    });
  });

  it("falls back to a status message when the body is not JSON", async () => {
    fetchMock.mockResolvedValue(new Response("<html>", { status: 502 }));

    await expect(fetchHouses()).rejects.toMatchObject({
      message: "Request failed with status 502",
      status: 502,
      code: null,
    });
  });

  it("builds member and invite paths with encoded segments", async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ ok: true }));

    await setMemberRole("h1", "u1", "admin");
    expect(lastCall().url).toBe("https://kinwoo.cbsdev.me/api/houses/h1/members/u1");
    expect(lastCall().init.body).toBe(JSON.stringify({ role: "admin" }));

    await removeMember("h1", "u1", true);
    expect(lastCall().url).toBe("https://kinwoo.cbsdev.me/api/houses/h1/members/u1?keepDebt=true");
    expect(lastCall().init.method).toBe("DELETE");

    await removeMember("h1", "u1", false);
    expect(lastCall().url).toBe("https://kinwoo.cbsdev.me/api/houses/h1/members/u1");

    await leaveHouse("h1", true);
    expect(lastCall().url).toBe("https://kinwoo.cbsdev.me/api/houses/h1/leave");
    expect(lastCall().init.body).toBe(JSON.stringify({ acknowledgeDebt: true }));
  });

  it("reads the house's fixed invite code", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ invite: { id: "i1", code: "ABC234", uses: 0 } }));

    await expect(fetchInvite("h1")).resolves.toEqual({ id: "i1", code: "ABC234", uses: 0 });

    expect(lastCall().url).toBe("https://kinwoo.cbsdev.me/api/houses/h1/invite");
  });

  it("sets the join mode and manages invited emails", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ house: { id: "h1" } }));
    await updateHouse("h1", { joinMode: "invited" });
    expect(lastCall().url).toBe("https://kinwoo.cbsdev.me/api/houses/h1");
    expect(lastCall().init.body).toBe(JSON.stringify({ joinMode: "invited" }));

    fetchMock.mockResolvedValueOnce(jsonResponse({ invitedEmails: [] }));
    await expect(fetchInvitedEmails("h1")).resolves.toEqual([]);
    expect(lastCall().url).toBe("https://kinwoo.cbsdev.me/api/houses/h1/invited-emails");

    fetchMock.mockResolvedValueOnce(jsonResponse({ invitedEmail: { id: "e1" } }, 201));
    await addInvitedEmail("h1", "asha@example.com");
    expect(lastCall().init.body).toBe(JSON.stringify({ email: "asha@example.com" }));

    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));
    await removeInvitedEmail("h1", "e 1");
    expect(lastCall().url).toBe("https://kinwoo.cbsdev.me/api/houses/h1/invited-emails/e%201");
    expect(lastCall().init.method).toBe("DELETE");
  });

  it("previews and joins by code", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ preview: { status: "expired" } }));
    await expect(fetchInvitePreview("ABC234")).resolves.toEqual({ status: "expired" });
    expect(lastCall().url).toBe("https://kinwoo.cbsdev.me/api/invites/ABC234");

    fetchMock.mockResolvedValueOnce(jsonResponse({ result: { status: "joined", houseId: "h1" } }));
    await expect(joinHouse("ABC234")).resolves.toEqual({ status: "joined", houseId: "h1" });
    expect(lastCall().url).toBe("https://kinwoo.cbsdev.me/api/invites/ABC234/join");
    expect(lastCall().init.method).toBe("POST");
  });
});
