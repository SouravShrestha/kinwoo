import type { Database, ProfileRow, ProfileUpdate } from "@kinwoo/core/db";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { IProfileRepository, Profile, ProfilePreferences } from "./IProfileRepository";

const COLUMNS = "id, display_name, avatar_url, locale, theme, notifications_enabled";
const AVATAR_BUCKET = "avatars";
const AVATAR_LIST_LIMIT = 100;
const IMAGE_FILE = /\.(png|jpe?g|webp)$/i;

function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    locale: row.locale,
    theme: row.theme,
    notificationsEnabled: row.notifications_enabled,
  };
}

// Takes the session-scoped client, not service-role, so RLS enforces ownership
// rather than a WHERE clause we could forget.
export class ProfileRepository implements IProfileRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async findById(userId: string): Promise<Profile | null> {
    const { data, error } = await this.client
      .from("profiles")
      .select(COLUMNS)
      .eq("id", userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? toProfile(data as ProfileRow) : null;
  }

  async updateDisplayName(userId: string, displayName: string): Promise<Profile | null> {
    return this.update(userId, { display_name: displayName });
  }

  async updatePreferences(
    userId: string,
    preferences: ProfilePreferences,
  ): Promise<Profile | null> {
    const patch: ProfileUpdate = {};
    if (preferences.locale !== undefined) patch.locale = preferences.locale;
    if (preferences.theme !== undefined) patch.theme = preferences.theme;
    if (preferences.notificationsEnabled !== undefined) {
      patch.notifications_enabled = preferences.notificationsEnabled;
    }

    if (Object.keys(patch).length === 0) return this.findById(userId);
    return this.update(userId, patch);
  }

  async updateAvatarUrl(userId: string, avatarUrl: string): Promise<Profile | null> {
    return this.update(userId, { avatar_url: avatarUrl });
  }

  async setAvatarUrlIfMissing(userId: string, avatarUrl: string): Promise<Profile | null> {
    const { data, error } = await this.client
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", userId)
      .is("avatar_url", null)
      .select(COLUMNS)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? toProfile(data as ProfileRow) : null;
  }

  async listAvatarUrls(): Promise<string[]> {
    const bucket = this.client.storage.from(AVATAR_BUCKET);
    const { data, error } = await bucket.list("", {
      limit: AVATAR_LIST_LIMIT,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) throw new Error(error.message);

    return data
      .filter((entry) => entry.id !== null && IMAGE_FILE.test(entry.name))
      .map((entry) => bucket.getPublicUrl(entry.name).data.publicUrl);
  }

  private async update(userId: string, patch: ProfileUpdate): Promise<Profile | null> {
    const { data, error } = await this.client
      .from("profiles")
      .update(patch)
      .eq("id", userId)
      .select(COLUMNS)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? toProfile(data as ProfileRow) : null;
  }
}
