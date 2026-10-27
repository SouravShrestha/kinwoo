import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IPushRepository } from "./IPushRepository";
import { PushService } from "./PushService";

const TOKEN = "ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]";

function fakeRepository(overrides: Partial<IPushRepository> = {}): IPushRepository {
  return { register: vi.fn(async () => {}), unregister: vi.fn(async () => {}), ...overrides };
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("PushService", () => {
  it("registers a valid token", async () => {
    const repository = fakeRepository();

    await expect(new PushService(repository).registerToken(TOKEN)).resolves.toEqual({
      ok: true,
      data: null,
    });
    expect(repository.register).toHaveBeenCalledWith(TOKEN);
  });

  it("registers a browser subscription", async () => {
    const repository = fakeRepository();
    const subscription = JSON.stringify({
      endpoint: "https://fcm.googleapis.com/fcm/send/abc",
      keys: { p256dh: "test-p256dh", auth: "test-auth" },
    });
    await expect(new PushService(repository).registerToken(subscription)).resolves.toMatchObject({
      ok: true,
    });
    expect(repository.register).toHaveBeenCalledWith(subscription);
  });

  it("rejects an invalid token without touching the repository", async () => {
    const repository = fakeRepository();
    const service = new PushService(repository);

    for (const token of ["nope", "", null, undefined, 42, `${TOKEN}x`]) {
      await expect(service.registerToken(token)).resolves.toMatchObject({
        ok: false,
        code: "INVALID_INPUT",
      });
      await expect(service.unregisterToken(token)).resolves.toMatchObject({
        ok: false,
        code: "INVALID_INPUT",
      });
    }
    expect(repository.register).not.toHaveBeenCalled();
    expect(repository.unregister).not.toHaveBeenCalled();
  });

  it("unregisters a valid token", async () => {
    const repository = fakeRepository();

    await expect(new PushService(repository).unregisterToken(TOKEN)).resolves.toMatchObject({
      ok: true,
    });
    expect(repository.unregister).toHaveBeenCalledWith(TOKEN);
  });

  it("reports UNAVAILABLE when the repository throws", async () => {
    const service = new PushService(
      fakeRepository({
        register: async () => {
          throw new Error("boom");
        },
      }),
    );

    await expect(service.registerToken(TOKEN)).resolves.toMatchObject({
      ok: false,
      code: "UNAVAILABLE",
    });
  });
});
