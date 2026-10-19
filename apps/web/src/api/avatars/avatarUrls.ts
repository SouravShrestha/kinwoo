import type { Database } from "@kinwoo/core/db";
import type { SupabaseClient } from "@supabase/supabase-js";

export const AVATAR_BUCKET = "avatars";

const ABSOLUTE_URL = /^https?:\/\//i;

// Preset avatars are stored as bucket paths, so the host in the URL always follows the current
// Supabase URL. Social avatars are external and stay absolute.
export function toPublicAvatarUrl(
  client: SupabaseClient<Database>,
  stored: string | null | undefined,
): string | null {
  if (!stored) return null;
  if (ABSOLUTE_URL.test(stored)) return stored;
  return client.storage.from(AVATAR_BUCKET).getPublicUrl(stored).data.publicUrl;
}

export function toStoredAvatar(client: SupabaseClient<Database>, url: string): string {
  const prefix = client.storage.from(AVATAR_BUCKET).getPublicUrl("").data.publicUrl;
  if (!url.startsWith(prefix)) return url;

  // getPublicUrl percent-encodes the path, so decode to store the real object name.
  try {
    return decodeURI(url.slice(prefix.length));
  } catch {
    return url;
  }
}
