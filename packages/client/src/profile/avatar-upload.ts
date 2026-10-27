import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "uploaded_avatars";

export const AVATAR_UPLOAD_SIZE = 256;
export const AVATAR_UPLOAD_QUALITY = 0.85;

export interface UploadedAvatar {
  path: string;
  url: string;
}

// `id` must be a lowercase UUID: the storage policy only accepts `<user id>/<uuid>.jpg`, and the
// random name keeps the public URL unguessable. It is passed in because Hermes has no crypto.
export async function putAvatar(
  client: SupabaseClient,
  userId: string,
  file: ArrayBuffer | Blob,
  id: string,
): Promise<UploadedAvatar> {
  const path = `${userId}/${id}.jpg`;
  const bucket = client.storage.from(BUCKET);
  const { error } = await bucket.upload(path, file, { contentType: "image/jpeg", upsert: false });
  if (error) throw new Error(error.message);
  return { path, url: bucket.getPublicUrl(path).data.publicUrl };
}

// Keeps one file per user: removes everything in the user's folder except `keep`. Best effort,
// since a leftover file is harmless and must not fail the avatar change that triggered it.
export async function pruneAvatars(
  client: SupabaseClient,
  userId: string,
  keep: string | null,
): Promise<void> {
  try {
    const bucket = client.storage.from(BUCKET);
    const { data } = await bucket.list(userId);
    const stale = (data ?? []).map((file) => `${userId}/${file.name}`).filter((p) => p !== keep);
    if (stale.length > 0) await bucket.remove(stale);
  } catch {
    // Retried on the next avatar change.
  }
}

// The user's uploaded photo goes first. Uploads are pruned to the current avatar, so that is the
// only place one can be.
export function avatarChoices(
  profile: { id: string; avatarUrl: string | null } | null,
  presets: string[],
): string[] {
  const own = profile && ownUploadPath(profile.avatarUrl, profile.id) ? profile.avatarUrl : null;
  return own ? [own, ...presets] : presets;
}

// The bucket path of an avatar URL when it is one of the user's own uploads, else null.
export function ownUploadPath(url: string | null, userId: string): string | null {
  const marker = `/${BUCKET}/`;
  const at = url ? url.indexOf(marker) : -1;
  if (!url || at < 0) return null;
  const path = url.slice(at + marker.length);
  return path.startsWith(`${userId}/`) ? path : null;
}
