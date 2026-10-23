import type { Database } from "@kinwoo/core/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { toPublicAvatarUrl, toStoredAvatar } from "./avatarUrls";

const client = {
  storage: {
    from: (bucket: string) => ({
      getPublicUrl: (path: string) => ({
        data: { publicUrl: `https://db.test/storage/v1/object/public/${bucket}/${path}` },
      }),
    }),
  },
} as unknown as SupabaseClient<Database>;

describe("toPublicAvatarUrl", () => {
  it("resolves a preset path against the avatars bucket", () => {
    expect(toPublicAvatarUrl(client, "avatar-01.png")).toBe(
      "https://db.test/storage/v1/object/public/avatars/avatar-01.png",
    );
  });

  it("resolves an upload path against the uploaded_avatars bucket", () => {
    expect(toPublicAvatarUrl(client, "user-1/abc.jpg")).toBe(
      "https://db.test/storage/v1/object/public/uploaded_avatars/user-1/abc.jpg",
    );
  });

  it("keeps a Google avatar", () => {
    expect(toPublicAvatarUrl(client, "https://lh3.googleusercontent.com/a/x")).toBe(
      "https://lh3.googleusercontent.com/a/x",
    );
  });

  it("drops any other absolute URL", () => {
    expect(toPublicAvatarUrl(client, "https://evil.test/pixel.png")).toBeNull();
  });
});

describe("toStoredAvatar", () => {
  it("turns a public URL from either bucket back into its path", () => {
    expect(
      toStoredAvatar(client, "https://db.test/storage/v1/object/public/avatars/avatar-01.png"),
    ).toBe("avatar-01.png");
    expect(
      toStoredAvatar(client, "https://db.test/storage/v1/object/public/uploaded_avatars/u/a.jpg"),
    ).toBe("u/a.jpg");
  });

  it("leaves an external URL untouched", () => {
    expect(toStoredAvatar(client, "https://lh3.googleusercontent.com/a/x")).toBe(
      "https://lh3.googleusercontent.com/a/x",
    );
  });
});
