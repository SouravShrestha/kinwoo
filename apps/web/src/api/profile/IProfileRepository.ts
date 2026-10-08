import type { Profile, ProfilePreferences, ThemePreference } from "@kinwoo/core/db";

export type { Profile, ProfilePreferences, ThemePreference };

export interface IProfileRepository {
  findById(userId: string): Promise<Profile | null>;
  updateDisplayName(userId: string, displayName: string): Promise<Profile | null>;
  updatePreferences(userId: string, preferences: ProfilePreferences): Promise<Profile | null>;
}
