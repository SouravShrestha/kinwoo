import { displayNameErrorMessage, validateDisplayName } from "@kinwoo/core/auth";

import type { IProfileRepository, Profile, ProfilePreferences } from "./IProfileRepository";
import type { AvatarListResult, IProfileService, ProfileResult } from "./IProfileService";

const VALID_THEMES = new Set(["light", "dark", "system"]);
const LOCALE_PATTERN = /^[a-z]{2}(-[A-Za-z0-9]{2,8})?$/;

export class ProfileService implements IProfileService {
  constructor(private readonly repository: IProfileRepository) {}

  async getProfile(userId: string): Promise<ProfileResult> {
    try {
      const profile = await this.repository.findById(userId);
      if (!profile) return { status: "not-found" };

      return {
        status: "ok",
        profile: profile.avatarUrl ? profile : await this.withAvatar(profile),
      };
    } catch {
      return { status: "error" };
    }
  }

  // Never fails the profile load: without a default avatar the clients fall back to a placeholder.
  private async withAvatar(profile: Profile): Promise<Profile> {
    try {
      const avatars = await this.repository.listAvatarUrls();
      if (avatars.length === 0) return profile;

      const pick = avatars[Math.floor(Math.random() * avatars.length)];
      // Conditional on the column still being empty, so two concurrent loads settle on one avatar.
      const updated = await this.repository.setAvatarUrlIfMissing(profile.id, pick);
      return updated ?? (await this.repository.findById(profile.id)) ?? profile;
    } catch {
      return profile;
    }
  }

  async setDisplayName(userId: string, input: string): Promise<ProfileResult> {
    // Validated before the write so a name the client accepts can never be
    // rejected by the matching database constraint.
    const result = validateDisplayName(input);
    if (!result.ok) return { status: "invalid", message: displayNameErrorMessage(result.error) };

    try {
      const profile = await this.repository.updateDisplayName(userId, result.value);
      return profile ? { status: "ok", profile } : { status: "not-found" };
    } catch {
      return { status: "error" };
    }
  }

  async setPreferences(userId: string, preferences: ProfilePreferences): Promise<ProfileResult> {
    const invalid = validatePreferences(preferences);
    if (invalid) return { status: "invalid", message: invalid };

    try {
      const profile = await this.repository.updatePreferences(userId, preferences);
      return profile ? { status: "ok", profile } : { status: "not-found" };
    } catch {
      return { status: "error" };
    }
  }

  async listAvatars(): Promise<AvatarListResult> {
    try {
      return { status: "ok", avatars: await this.repository.listAvatarUrls() };
    } catch {
      return { status: "error" };
    }
  }

  async setAvatar(userId: string, avatarUrl: string): Promise<ProfileResult> {
    try {
      // Only a URL we list ourselves is stored, so a client cannot point a profile at an
      // arbitrary image.
      const avatars = await this.repository.listAvatarUrls();
      if (!avatars.includes(avatarUrl)) {
        return { status: "invalid", message: "Choose one of the available avatars." };
      }

      const profile = await this.repository.updateAvatarUrl(userId, avatarUrl);
      return profile ? { status: "ok", profile } : { status: "not-found" };
    } catch {
      return { status: "error" };
    }
  }
}

function validatePreferences(preferences: ProfilePreferences): string | null {
  if (preferences.theme !== undefined && !VALID_THEMES.has(preferences.theme)) {
    return "Choose light, dark or system.";
  }

  if (preferences.locale !== undefined && !LOCALE_PATTERN.test(preferences.locale)) {
    return "That is not a supported language code.";
  }

  if (
    preferences.notificationsEnabled !== undefined &&
    typeof preferences.notificationsEnabled !== "boolean"
  ) {
    return "Notifications must be on or off.";
  }

  return null;
}
