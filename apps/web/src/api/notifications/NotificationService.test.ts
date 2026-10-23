import { beforeEach, describe, expect, it, vi } from "vitest";

import type { INotificationRepository } from "./INotificationRepository";
import { NOTIFICATION_LIMIT, NotificationService } from "./NotificationService";

const ID = "00000000-0000-4000-8000-0000000000b1";

function fakeRepository(overrides: Partial<INotificationRepository> = {}): INotificationRepository {
  return {
    list: vi.fn(async () => []),
    markRead: vi.fn(async () => {}),
    markAllRead: vi.fn(async () => {}),
    ...overrides,
  };
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("NotificationService", () => {
  it("lists up to the limit", async () => {
    const repository = fakeRepository();

    await expect(new NotificationService(repository).list()).resolves.toEqual({
      ok: true,
      data: [],
    });
    expect(repository.list).toHaveBeenCalledWith(NOTIFICATION_LIMIT);
  });

  it("marks a valid id as read and rejects anything else without touching the repository", async () => {
    const repository = fakeRepository();
    const service = new NotificationService(repository);

    await expect(service.markRead(ID)).resolves.toMatchObject({ ok: true });
    expect(repository.markRead).toHaveBeenCalledWith(ID);

    for (const id of ["nope", "", null, undefined, 42]) {
      await expect(service.markRead(id)).resolves.toMatchObject({
        ok: false,
        code: "INVALID_INPUT",
      });
    }
    expect(repository.markRead).toHaveBeenCalledTimes(1);
  });

  it("marks every notification as read", async () => {
    const repository = fakeRepository();

    await expect(new NotificationService(repository).markAllRead()).resolves.toMatchObject({
      ok: true,
    });
    expect(repository.markAllRead).toHaveBeenCalledTimes(1);
  });

  it("reports UNAVAILABLE when the repository throws", async () => {
    const service = new NotificationService(
      fakeRepository({
        markAllRead: async () => {
          throw new Error("boom");
        },
      }),
    );

    await expect(service.markAllRead()).resolves.toMatchObject({ ok: false, code: "UNAVAILABLE" });
  });
});
