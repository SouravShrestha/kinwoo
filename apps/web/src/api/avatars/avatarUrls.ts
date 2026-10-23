import type { Database } from "@kinwoo/core/db";
import type { SupabaseClient } from "@supabase/supabase-js";

import { normaliseSocialAvatar } from "../profile/socialAvatar";

export const AVATAR_BUCKET = "avatars";
export const UPLOADED_AVATAR_BUCKET = "uploaded_avatars";

const ABSOLUTE_URL = /^https?:\/\//i;

// Presets are flat names in the avatars bucket; uploads are `<user id>/<file>` in uploaded_avatars.
// Both are stored as bucket paths, so the host in the URL always follows the current Supabase URL.
// Social avatars are external and stay absolute, but only from the trusted host: rows written
// before the database enforced this could hold any URL.
export function toPublicAvatarUrl(
  client: SupabaseClient<Database>,
  stored: string | null | undefined,
): string | null {
  if (!stored) return null;
  if (ABSOLUTE_URL.test(stored)) return normaliseSocialAvatar(stored);
  const bucket = stored.includes("/") ? UPLOADED_AVATAR_BUCKET : AVATAR_BUCKET;
  return client.storage.from(bucket).getPublicUrl(stored).data.publicUrl;
}

export function toStoredAvatar(client: SupabaseClient<Database>, url: string): string {
  for (const bucket of [AVATAR_BUCKET, UPLOADED_AVATAR_BUCKET]) {
    const prefix = client.storage.from(bucket).getPublicUrl("").data.publicUrl;
    if (!url.startsWith(prefix)) continue;

    // getPublicUrl percent-encodes the path, so decode to store the real object name.
    try {
      return decodeURI(url.slice(prefix.length));
    } catch {
      return url;
    }
  }
  return url;
}
