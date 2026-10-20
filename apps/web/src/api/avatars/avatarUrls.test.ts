import type { Database } from "@kinwoo/core/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { toPublicAvatarUrl } from "./avatarUrls";

const client = {
  storage: {
    from: () => ({
      getPublicUrl: (path: string) => ({
        data: { publicUrl: `https://db.test/storage/v1/object/public/avatars/${path}` },
      }),
    }),
  },
} as unknown as SupabaseClient<Database>;

describe("toPublicAvatarUrl", () => {
  it("resolves a preset path against the bucket", () => {
    expect(toPublicAvatarUrl(client, "avatar-01.png")).toBe(
      "https://db.test/storage/v1/object/public/avatars/avatar-01.png",
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
