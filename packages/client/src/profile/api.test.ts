import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "@kinwoo/core/db";

import { configureApiClient } from "../api/config";
import { ProfileRequestError, fetchProfile, updateDisplayName } from "./api";

const profile: Profile = {
  id: "user-1",
  displayName: "Daisy",
  avatarUrl: null,
  locale: "en",
  theme: "system",
  notificationsEnabled: true,
  mutedPushTypes: [],
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  configureApiClient({
    baseUrl: "https://kinwoo.cbsdev.me/",
    fetch: fetchMock as unknown as typeof fetch,
    getAuthHeaders: async () => ({ Authorization: "Bearer jwt-1" }),
  });
});

describe("fetchProfile", () => {
  it("unwraps the profile from the envelope", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ profile }));
    await expect(fetchProfile()).resolves.toEqual(profile);
  });

  it("strips the trailing slash from the configured base URL", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ profile }));
    await fetchProfile();

    expect(fetchMock.mock.calls[0][0]).toBe("https://kinwoo.cbsdev.me/api/profile");
  });

  it("attaches the injected auth headers", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ profile }));
    await fetchProfile();

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer jwt-1");
  });

  it("works without an auth header resolver, as web does", async () => {
    configureApiClient({
      baseUrl: "https://kinwoo.cbsdev.me",
      fetch: fetchMock as unknown as typeof fetch,
    });
    fetchMock.mockResolvedValue(jsonResponse({ profile }));

    await expect(fetchProfile()).resolves.toEqual(profile);
  });

  it("raises the server's message with its status", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "Not logged in" }, 401));

    await expect(fetchProfile()).rejects.toThrow("Not logged in");
    await expect(fetchProfile()).rejects.toMatchObject({ status: 401 });
  });

  it("raises a ProfileRequestError when the body is not JSON", async () => {
    fetchMock.mockResolvedValue(new Response("<html>502</html>", { status: 502 }));

    await expect(fetchProfile()).rejects.toBeInstanceOf(ProfileRequestError);
  });

  it("treats a 200 with no profile as a failure", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await expect(fetchProfile()).rejects.toThrow(/status 200/);
  });
});

describe("updateDisplayName", () => {
  it("PATCHes the name as JSON", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ profile }));
    await updateDisplayName("Daisy May");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://kinwoo.cbsdev.me/api/profile/display-name");
    expect(init.method).toBe("PATCH");
    expect(init.body).toBe(JSON.stringify({ displayName: "Daisy May" }));
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("surfaces a validation message from the server", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "Enter a name." }, 400));
    await expect(updateDisplayName("  ")).rejects.toThrow("Enter a name.");
  });
});
