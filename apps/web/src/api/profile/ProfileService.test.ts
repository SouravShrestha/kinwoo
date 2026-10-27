import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IProfileRepository, Profile } from "./IProfileRepository";
import { ProfileService } from "./ProfileService";

const profile: Profile = {
  id: "user-1",
  displayName: "Daisy",
  avatarUrl: null,
  locale: "en",
  theme: "system",
  notificationsEnabled: true,
  mutedPushTypes: [],
};

function fakeRepository(overrides: Partial<IProfileRepository> = {}): IProfileRepository {
  return {
    findById: async () => profile,
    updateDisplayName: async () => profile,
    updatePreferences: async () => profile,
    updateAvatarUrl: async () => profile,
    setAvatarUrlIfMissing: async () => profile,
    listAvatarUrls: async () => [],
    isOwnUpload: () => false,
    ...overrides,
  };
}

const throwing = () => {
  throw new Error("boom");
};

// fromError logs unexpected failures; keep the expected ones out of the test output.
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const unavailable = { ok: false, code: "UNAVAILABLE", message: expect.any(String) };

describe("ProfileService.getProfile", () => {
  it("returns the profile", async () => {
    await expect(new ProfileService(fakeRepository()).getProfile("user-1")).resolves.toEqual({
      ok: true,
      data: profile,
    });
  });

  it("reports not-found when the row is missing", async () => {
    const service = new ProfileService(fakeRepository({ findById: async () => null }));
    await expect(service.getProfile("user-1")).resolves.toMatchObject({
      ok: false,
      code: "NOT_FOUND",
    });
  });

  it("reports an error state when the repository throws", async () => {
    const service = new ProfileService(fakeRepository({ findById: throwing }));
    await expect(service.getProfile("user-1")).resolves.toEqual(unavailable);
  });
});

const PRESET = "https://cdn.example.com/avatars/one.png";

describe("ProfileService default avatar", () => {
  it("assigns a preset to an empty avatar", async () => {
    const setAvatarUrlIfMissing = vi.fn(async () => profile);
    const service = new ProfileService(
      fakeRepository({ setAvatarUrlIfMissing, listAvatarUrls: async () => [PRESET] }),
    );

    await service.getProfile("user-1");

    expect(setAvatarUrlIfMissing).toHaveBeenCalledWith("user-1", PRESET);
  });

  it("keeps an avatar the user already has", async () => {
    const setAvatarUrlIfMissing = vi.fn(async () => profile);
    const owned = { ...profile, avatarUrl: PRESET };
    const service = new ProfileService(
      fakeRepository({ findById: async () => owned, setAvatarUrlIfMissing }),
    );

    await expect(service.getProfile("user-1")).resolves.toEqual({
      ok: true,
      data: owned,
    });
    expect(setAvatarUrlIfMissing).not.toHaveBeenCalled();
  });

  it("lists only the presets", async () => {
    const service = new ProfileService(fakeRepository({ listAvatarUrls: async () => [PRESET] }));

    await expect(service.listAvatars()).resolves.toEqual({ ok: true, data: [PRESET] });
  });

  it("rejects an external URL", async () => {
    const updateAvatarUrl = vi.fn(async () => profile);
    const service = new ProfileService(
      fakeRepository({ updateAvatarUrl, listAvatarUrls: async () => [PRESET] }),
    );

    const result = await service.setAvatar("user-1", "https://lh3.googleusercontent.com/a/x");

    expect(result).toMatchObject({ ok: false, code: "INVALID_INPUT" });
    expect(updateAvatarUrl).not.toHaveBeenCalled();
  });
});

describe("ProfileService.setAvatar upload", () => {
  it("accepts a file from the user's own upload folder", async () => {
    const updateAvatarUrl = vi.fn(async () => profile);
    const service = new ProfileService(
      fakeRepository({ updateAvatarUrl, isOwnUpload: (id, url) => url === `${id}/x.jpg` }),
    );

    await service.setAvatar("user-1", "user-1/x.jpg");

    expect(updateAvatarUrl).toHaveBeenCalledWith("user-1", "user-1/x.jpg");
  });

  it("rejects a file outside the user's folder", async () => {
    const updateAvatarUrl = vi.fn(async () => profile);
    const service = new ProfileService(fakeRepository({ updateAvatarUrl }));

    const result = await service.setAvatar("user-1", "user-2/x.jpg");

    expect(result).toMatchObject({ ok: false, code: "INVALID_INPUT" });
    expect(updateAvatarUrl).not.toHaveBeenCalled();
  });
});

describe("ProfileService.setDisplayName", () => {
  it("writes the normalised name, not the raw input", async () => {
    const updateDisplayName = vi.fn(async () => profile);
    const service = new ProfileService(fakeRepository({ updateDisplayName }));

    await service.setDisplayName("user-1", "  Daisy   May  ");

    expect(updateDisplayName).toHaveBeenCalledWith("user-1", "Daisy May");
  });

  it("rejects an empty name without touching the repository", async () => {
    const updateDisplayName = vi.fn(async () => profile);
    const service = new ProfileService(fakeRepository({ updateDisplayName }));

    const result = await service.setDisplayName("user-1", "   ");

    expect(result).toMatchObject({ ok: false, code: "INVALID_INPUT" });
    expect(updateDisplayName).not.toHaveBeenCalled();
  });

  it("rejects a name longer than the database allows", async () => {
    const service = new ProfileService(fakeRepository());
    const result = await service.setDisplayName("user-1", "a".repeat(41));

    expect(result).toEqual({
      ok: false,
      code: "INVALID_INPUT",
      message: "Use 40 characters or fewer.",
    });
  });

  it("reports an error state when the write throws", async () => {
    const service = new ProfileService(fakeRepository({ updateDisplayName: throwing }));
    await expect(service.setDisplayName("user-1", "Daisy")).resolves.toEqual(unavailable);
  });
});

describe("ProfileService.setPreferences", () => {
  it("passes valid preferences through", async () => {
    const updatePreferences = vi.fn(async () => profile);
    const service = new ProfileService(fakeRepository({ updatePreferences }));

    await service.setPreferences("user-1", { theme: "dark" });

    expect(updatePreferences).toHaveBeenCalledWith("user-1", { theme: "dark" });
  });

  it("rejects an unknown theme", async () => {
    const service = new ProfileService(fakeRepository());
    const result = await service.setPreferences("user-1", {
      theme: "neon" as never,
    });

    expect(result).toMatchObject({ ok: false, code: "INVALID_INPUT" });
  });

  it("rejects a malformed locale", async () => {
    const service = new ProfileService(fakeRepository());
    expect((await service.setPreferences("user-1", { locale: "english" })).ok).toBe(false);
    expect((await service.setPreferences("user-1", { locale: "en-GB" })).ok).toBe(true);
    // A one-element array stringifies to a valid code, so the type is checked too.
    const array = ["en"] as unknown as string;
    expect((await service.setPreferences("user-1", { locale: array })).ok).toBe(false);
  });

  it("accepts known muted push types and rejects anything else", async () => {
    const service = new ProfileService(fakeRepository());
    expect((await service.setPreferences("user-1", { mutedPushTypes: [] })).ok).toBe(true);
    expect(
      (await service.setPreferences("user-1", { mutedPushTypes: ["join_requested"] })).ok,
    ).toBe(true);
    expect((await service.setPreferences("user-1", { mutedPushTypes: ["spam"] })).ok).toBe(false);
    const notList = "join_requested" as unknown as string[];
    expect((await service.setPreferences("user-1", { mutedPushTypes: notList })).ok).toBe(false);
  });

  it("reports an error state when the write throws", async () => {
    const service = new ProfileService(fakeRepository({ updatePreferences: throwing }));
    await expect(service.setPreferences("user-1", { theme: "light" })).resolves.toEqual(
      unavailable,
    );
  });
});
