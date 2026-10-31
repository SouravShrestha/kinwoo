import type { Database } from "@kinwoo/core/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { toAvatarUrl, toStoredAvatar } from "./avatarUrls";

const client = {
  storage: {
    from: (bucket: string) => ({
      getPublicUrl: (path: string) => ({
        data: { publicUrl: `https://db.test/storage/v1/object/public/${bucket}/${path}` },
      }),
      createSignedUrl: async (path: string) => ({
        data: {
          signedUrl: `https://db.test/storage/v1/object/sign/${bucket}/${path}?token=test`,
        },
        error: null,
      }),
    }),
  },
} as unknown as SupabaseClient<Database>;

describe("toAvatarUrl", () => {
  it("resolves a preset path against the public avatars bucket", async () => {
    await expect(toAvatarUrl(client, "avatar-01.png")).resolves.toBe(
      "https://db.test/storage/v1/object/public/avatars/avatar-01.png",
    );
  });

  it("resolves an upload path to a signed URL", async () => {
    await expect(toAvatarUrl(client, "user-1/abc.jpg")).resolves.toBe(
      "https://db.test/storage/v1/object/sign/uploaded_avatars/user-1/abc.jpg?token=test",
    );
  });

  it("drops an absolute URL", async () => {
    await expect(toAvatarUrl(client, "https://evil.test/pixel.png")).resolves.toBeNull();
  });
});

describe("toStoredAvatar", () => {
  it("turns public and signed URLs back into their paths", () => {
    expect(
      toStoredAvatar(client, "https://db.test/storage/v1/object/public/avatars/avatar-01.png"),
    ).toBe("avatar-01.png");
    expect(
      toStoredAvatar(
        client,
        "https://db.test/storage/v1/object/sign/uploaded_avatars/u/a.jpg?token=test",
      ),
    ).toBe("u/a.jpg");
  });

  it("leaves an external URL untouched", () => {
    expect(toStoredAvatar(client, "https://lh3.googleusercontent.com/a/x")).toBe(
      "https://lh3.googleusercontent.com/a/x",
    );
  });
});
