import { describe, expect, it, vi } from "vitest";

import type { IProfileRepository, Profile } from "./IProfileRepository";
import { ProfileService } from "./ProfileService";

const profile: Profile = {
  id: "user-1",
  displayName: "Daisy",
  avatarUrl: null,
  locale: "en",
  theme: "system",
  notificationsEnabled: true,
};

function fakeRepository(overrides: Partial<IProfileRepository> = {}): IProfileRepository {
  return {
    findById: async () => profile,
    updateDisplayName: async () => profile,
    updatePreferences: async () => profile,
    updateAvatarUrl: async () => profile,
    setAvatarUrlIfMissing: async () => profile,
    listAvatarUrls: async () => [],
    ...overrides,
  };
}

const throwing = () => {
  throw new Error("boom");
};

describe("ProfileService.getProfile", () => {
  it("returns the profile", async () => {
    await expect(new ProfileService(fakeRepository()).getProfile("user-1")).resolves.toEqual({
      status: "ok",
      profile,
    });
  });

  it("reports not-found when the row is missing", async () => {
    const service = new ProfileService(fakeRepository({ findById: async () => null }));
    await expect(service.getProfile("user-1")).resolves.toEqual({ status: "not-found" });
  });

  it("reports an error state when the repository throws", async () => {
    const service = new ProfileService(fakeRepository({ findById: throwing }));
    await expect(service.getProfile("user-1")).resolves.toEqual({ status: "error" });
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

    expect(result.status).toBe("invalid");
    expect(updateDisplayName).not.toHaveBeenCalled();
  });

  it("rejects a name longer than the database allows", async () => {
    const service = new ProfileService(fakeRepository());
    const result = await service.setDisplayName("user-1", "a".repeat(41));

    expect(result).toEqual({ status: "invalid", message: "Use 40 characters or fewer." });
  });

  it("reports an error state when the write throws", async () => {
    const service = new ProfileService(fakeRepository({ updateDisplayName: throwing }));
    await expect(service.setDisplayName("user-1", "Daisy")).resolves.toEqual({ status: "error" });
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

    expect(result.status).toBe("invalid");
  });

  it("rejects a malformed locale", async () => {
    const service = new ProfileService(fakeRepository());
    expect((await service.setPreferences("user-1", { locale: "english" })).status).toBe("invalid");
    expect((await service.setPreferences("user-1", { locale: "en-GB" })).status).toBe("ok");
  });

  it("reports an error state when the write throws", async () => {
    const service = new ProfileService(fakeRepository({ updatePreferences: throwing }));
    await expect(service.setPreferences("user-1", { theme: "light" })).resolves.toEqual({
      status: "error",
    });
  });
});
